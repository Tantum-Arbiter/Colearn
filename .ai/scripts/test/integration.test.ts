import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, rmSync, appendFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { WebSocket } from 'ws';
import { writeFileAtomic } from '../lib/fsx.ts';
import { parseConfig } from '../lib/config.ts';
import { createReview, dispatchReview, reviewSummary } from '../lib/review.ts';
import type { ReviewOptions } from '../lib/review.ts';
import type { RunOptions, RunResult } from '../lib/proc.ts';
import { emitEvent, parseOfficeEvent, readEvents } from '../lib/events.ts';
import type { OfficeEvent } from '../lib/events.ts';
import { loadQueue, clearUsageLimit, recordUsageLimit } from '../lib/state.ts';
import { activityMessages, observedEvents, startOffice } from '../lib/office.ts';
import { acquireLock } from '../lib/lock.ts';
import { extractReport, validateReport } from '../lib/reports.ts';

const source = resolve(import.meta.dirname, '../..');
const result = (stdout: string, exitCode = 0): RunResult => ({ stdout, stderr: '', exitCode, signal: null, timedOut: false, truncated: false, durationMs: 10, spawnError: null });
function fixture(t: { after: (fn: () => void) => void }): ReviewOptions {
  const root = mkdtempSync(join(tmpdir(), 'ai-office-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const aiDir = join(root, '.ai'); mkdirSync(aiDir);
  for (const dir of ['schemas', 'prompts', 'config', 'office']) cpSync(join(source, dir), join(aiDir, dir), { recursive: true });
  mkdirSync(join(aiDir, 'state'));
  const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture');
  writeFileAtomic(join(root, 'math.js'), 'export const add = (a,b) => a-b;\n');
  git('add', 'math.js'); git('commit', '-qm', 'base');
  writeFileAtomic(join(root, 'math.js'), 'export const add = (a,b) => a+b;\n');
  git('add', 'math.js'); git('commit', '-qm', 'fix');
  writeFileAtomic(join(root, 'task.md'), 'Review the addition fix.');
  return { aiDir, config: parseConfig(JSON.parse(readFileSync(join(source, 'config/reviewers.json'), 'utf8')), root), env: { PATH: process.env.PATH } };
}
function goodRun(calls: RunOptions[]): (o: RunOptions) => Promise<RunResult> {
  return async o => {
    calls.push(o); o.onStdoutLine?.('{}');
    const identity = (o.input + o.args.join(' ')).match(/Set reviewer to (\S+) and review_kind to (\w+)/)!;
    const report = { reviewer: identity[1], review_kind: identity[2], summary: 'Reviewed fixture.', findings: [], limitations: ['No runtime evidence.'] };
    return result(o.env.CLAUDE_CONFIG_DIR ? JSON.stringify({ type: 'result', is_error: false, structured_output: report }) :
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(report) } }) + '\n' + JSON.stringify({ type: 'turn.completed' }));
  };
}
const event: OfficeEvent = { version: 1, timestamp: new Date().toISOString(), run_id: '20260919T120000Z-aabbcc', worker: 'codex-1', phase: 'test', event: 'started', activity: 'reviewing', duration_ms: null, available_at: null };

test('dispatch uses four fresh isolated sessions, validates reports, and replays no completed work', async t => {
  const options = fixture(t); const calls: RunOptions[] = []; options.run = goodRun(calls);
  const id = await createReview(options, 'HEAD^', 'HEAD', join(options.aiDir, '../task.md'));
  assert.equal(await dispatchReview(options, id), 0);
  assert.equal(calls.length, 4); assert.equal(new Set(calls.map(c => c.cwd)).size, 4);
  assert.match(calls[0]!.env.CLAUDE_CONFIG_DIR!, /\.claude-pro$/);
  assert.match(calls[1]!.env.CODEX_HOME!, /\.codex-1$/); assert.match(calls[3]!.env.CODEX_HOME!, /\.codex-2$/);
  assert.ok(calls[1]!.args.includes('features.shell_tool=false'));
  assert.equal(await dispatchReview(options, id), 0); assert.equal(calls.length, 4);
  assert.match(reviewSummary(options.aiDir, id), /codex-2.final: completed/);
  const events = readEvents(join(options.aiDir, 'state'));
  assert.equal(events.filter(e => e.event === 'completed').length, 4);
  assert.ok(!JSON.stringify(events).includes('math.js'));
});

test('quota waits are queued and retry reuses the immutable snapshot', async t => {
  const options = fixture(t); const calls: RunOptions[] = []; const good = goodRun(calls);
  options.run = async o => o.env.CLAUDE_CONFIG_DIR ? result(JSON.stringify({ type: 'result', is_error: true, result: "You've hit your limit · resets 11pm" }), 1) : good(o);
  const id = await createReview(options, 'HEAD^', 'HEAD', join(options.aiDir, '../task.md'));
  assert.equal(await dispatchReview(options, id), 3);
  assert.equal(loadQueue(join(options.aiDir, 'state')).items[0]?.status, 'pending');
  assert.equal(await dispatchReview(options, id), 3);
  clearUsageLimit(join(options.aiDir, 'state'), 'claude-pro');
  options.run = good;
  assert.equal(await dispatchReview(options, id), 0);
  assert.equal(calls.length, 4);
  assert.equal(loadQueue(join(options.aiDir, 'state')).items[0]?.status, 'completed');
  assert.ok(readEvents(join(options.aiDir, 'state')).some(e => e.event === 'resumed'));
});

test('all-limited run is incomplete without launching workers', async t => {
  const options = fixture(t);
  for (const r of options.config.reviewers) recordUsageLimit(join(options.aiDir, 'state'), r.id, { resetAt: new Date(Date.now() + 60_000), message: 'limit' }, new Date());
  options.run = async () => { throw new Error('must not launch'); };
  const id = await createReview(options, 'HEAD^', 'HEAD', join(options.aiDir, '../task.md'));
  assert.equal(await dispatchReview(options, id), 3);
  assert.equal(loadQueue(join(options.aiDir, 'state')).items.length, 4);
});

test('invalid reports fail closed; explicit retry repairs failures', async t => {
  const options = fixture(t); options.run = async () => result('{}');
  const id = await createReview(options, 'HEAD^', 'HEAD', join(options.aiDir, '../task.md'));
  assert.equal(await dispatchReview(options, id), 1);
  const calls: RunOptions[] = []; options.run = goodRun(calls);
  assert.equal(await dispatchReview(options, id), 1); assert.equal(calls.length, 0);
  assert.equal(await dispatchReview(options, id, true), 0); assert.equal(calls.length, 4);
});

test('expired reviewer authentication is explicit and healthy reviewers still finish', async t => {
  const options = fixture(t); const calls: RunOptions[] = []; const good = goodRun(calls);
  options.run = async o => {
    if (o.env.CLAUDE_CONFIG_DIR) {
      calls.push(o);
      return result([
        JSON.stringify({ type: 'assistant', error: 'authentication_failed', message: { content: [{ type: 'text', text: 'OAuth session expired and could not be refreshed' }] } }),
        JSON.stringify({ type: 'result', is_error: true, result: 'Failed to authenticate: OAuth session expired and could not be refreshed' }),
      ].join('\n'), 1);
    }
    return good(o);
  };
  const id = await createReview(options, 'HEAD^', 'HEAD', join(options.aiDir, '../task.md'));
  assert.equal(await dispatchReview(options, id), 1);
  assert.equal(calls.length, 4);
  assert.match(reviewSummary(options.aiDir, id), /claude-pro\.browser_qa: failed \(authentication_required\)/);
  assert.match(reviewSummary(options.aiDir, id), /codex-2\.final: completed/);
  assert.ok(readEvents(join(options.aiDir, 'state')).some(e => e.worker === 'claude-pro' && e.event === 'authentication_required'));
});

test('tampered packet and simultaneous dispatcher are rejected', async t => {
  const options = fixture(t);
  const id = await createReview(options, 'HEAD^', 'HEAD', join(options.aiDir, '../task.md'));
  const release = acquireLock(join(options.aiDir, 'state'));
  await assert.rejects(dispatchReview(options, id), /Another dispatcher/); release();
  appendFileSync(join(options.aiDir, 'runs', id, 'packet.json'), ' ');
  await assert.rejects(dispatchReview(options, id), /snapshot is invalid/);
});

test('events enforce strict allowlist, tolerate incomplete append, and reject symlink escape', t => {
  const options = fixture(t); const state = join(options.aiDir, 'state');
  assert.throws(() => parseOfficeEvent({ ...event, prompt: 'secret' }));
  assert.throws(() => parseOfficeEvent({ ...event, worker: '../secret' }));
  emitEvent(state, event); appendFileSync(join(state, 'events.jsonl'), '{"partial":');
  assert.equal(readEvents(state).length, 1);
  const escaped = join(options.aiDir, 'escaped'); mkdirSync(escaped);
  symlinkSync(join(state, 'events.jsonl'), join(escaped, 'events.jsonl'));
  assert.throws(() => emitEvent(escaped, event), /symlink/);
});

test('office is local, rejects writes and cross-origin sockets, and replays real events', async t => {
  const options = fixture(t); mkdirSync(join(options.aiDir, 'office-dist'));
  writeFileAtomic(join(options.aiDir, 'office-dist/assets.json'), JSON.stringify({ messages: [], layout: {} }));
  emitEvent(join(options.aiDir, 'state'), event);
  assert.equal(observedEvents([event], join(options.aiDir, 'state'))[0]?.event, 'interrupted');
  const release = acquireLock(join(options.aiDir, 'state')); t.after(release);
  const office = await startOffice(options.aiDir, 0, () => []); t.after(() => { void office.close(); });
  assert.equal((await fetch(office.url + '/api/status', { method: 'POST' })).status, 405);
  assert.equal((await fetch(office.url + '/api/status', { headers: { Origin: 'https://evil.invalid' } })).status, 403);
  assert.equal((await fetch(office.url + '/pixel/%2e%2e%2f%2e%2e%2fconfig/reviewers.json')).status, 404);
  const response = await (await fetch(office.url + '/api/status')).json() as { agents: Array<{ key: string }> };
  assert.equal(response.agents[0]?.key, 'review:codex-1');
  for (let i = 0; i < 2; i++) {
    await new Promise<void>((resolvePromise, reject) => {
      const socket = new WebSocket(office.url.replace('http:', 'ws:') + '/ws', { origin: office.url });
      socket.on('error', reject); socket.on('open', () => socket.send(JSON.stringify({ type: 'webviewReady' })));
      socket.on('message', data => { const m = JSON.parse(data.toString()) as Record<string, unknown>; if (m.type === 'agentToolStart') { assert.equal(m.id, 1); socket.close(); resolvePromise(); } });
    });
  }
  assert.equal(activityMessages({ ...event, event: 'deferred' }).length, 2);
});

test('report parser does not accept failed turns, wrong identity or extra fields', () => {
  assert.throws(() => extractReport('codex', JSON.stringify({ type: 'turn.failed' })));
  assert.throws(() => extractReport('claude', JSON.stringify({ type: 'result', is_error: true })));
  const r = { reviewer: 'codex-1', review_kind: 'test', summary: '', findings: [], limitations: [] };
  assert.throws(() => validateReport(source, r, 'codex-2', 'test'), /identity/);
  assert.throws(() => validateReport(source, { ...r, secret: 'no' }, 'codex-1', 'test'), /schema/);
});
