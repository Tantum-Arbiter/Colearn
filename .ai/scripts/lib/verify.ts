import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildWorkerEnv } from './env.ts';
import { emitEvent } from './events.ts';
import { resolveInside, writeFileAtomic } from './fsx.ts';
import { runProcess } from './proc.ts';
import { safeDisplay } from './text.ts';

/** Run only the command explicitly supplied by the user, never report suggestions. */
export async function verify(aiDir: string, argv: readonly string[], signal: AbortSignal): Promise<number> {
  if (!argv.length) throw new Error('Usage: ai verify -- COMMAND [ARGUMENTS]');
  const cwd = dirname(aiDir);
  const env = buildWorkerEnv(process.env, null);
  const head = await runProcess({ executable: 'git', args: ['rev-parse', 'HEAD'], cwd, env, timeoutMs: 10_000 });
  if (head.exitCode !== 0) throw new Error('Cannot identify verification commit');
  const before = await runProcess({ executable: 'git', args: ['diff', '--quiet', 'HEAD', '--'], cwd, env, timeoutMs: 10_000 });
  const id = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}-${randomBytes(3).toString('hex')}`;
  const state = resolveInside(aiDir, 'state'); mkdirSync(state, { recursive: true, mode: 0o700 });
  const event = (kind: 'started' | 'completed' | 'failed' | 'timed_out' | 'interrupted', duration: number | null): void =>
    emitEvent(state, { version: 1, timestamp: new Date().toISOString(), run_id: id, worker: 'verification', phase: 'verify', event: kind,
      activity: kind === 'started' ? 'testing' : 'waiting', duration_ms: duration, available_at: null });
  event('started', null);
  const result = await runProcess({ executable: argv[0]!, args: argv.slice(1), cwd, env, timeoutMs: 15 * 60_000, maxOutputBytes: 60_000, signal });
  const after = await runProcess({ executable: 'git', args: ['diff', '--quiet', 'HEAD', '--'], cwd, env, timeoutMs: 10_000 });
  const evidence = { version: 1, run_id: id, head: head.stdout.trim(), timestamp: new Date().toISOString(),
    working_tree_dirty: before.exitCode !== 0 || after.exitCode !== 0,
    exit_code: result.exitCode, timed_out: result.timedOut, truncated: result.truncated,
    stdout: safeDisplay(result.stdout, 60_000), stderr: safeDisplay(result.stderr, 60_000),
    limitation: 'Executed in the working checkout, not a hermetic snapshot; untracked files and external services may affect results.' };
  const path = resolveInside(aiDir, `reports/${id}.evidence.json`);
  writeFileAtomic(path, JSON.stringify(evidence, null, 2));
  const okay = !signal.aborted && !result.timedOut && !result.truncated && result.exitCode === 0;
  event(signal.aborted ? 'interrupted' : result.timedOut ? 'timed_out' : okay ? 'completed' : 'failed', result.durationMs);
  process.stdout.write(`Verification ${okay ? 'passed' : 'failed or incomplete'}\nEvidence: ${path}\n`);
  return signal.aborted ? 130 : okay ? 0 : 1;
}
