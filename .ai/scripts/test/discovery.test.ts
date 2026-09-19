import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { claudeSessionIds, mapCodexRows, parseClaudeTranscript } from '../lib/discovery.ts';

describe('agent discovery adapters', () => {
  it('finds only resumed Claude sessions in Claude processes', () => {
    const id = '4aa8c62f-ad95-4c76-99b4-2f1cb1c61040';
    const ids = claudeSessionIds(`/usr/bin/node something\n/Applications/Claude/claude --resume=${id} --model opus\n/bin/echo --resume=11111111-1111-1111-1111-111111111111`);
    assert.deepEqual([...ids], [id]);
  });

  it('uses Claude title, project and last tool without exposing tool input', () => {
    const text = [
      { type: 'custom-title', customTitle: 'Splash animation', sessionId: '4aa8c62f-ad95-4c76-99b4-2f1cb1c61040' },
      { type: 'assistant', cwd: '/work/app', sessionId: '4aa8c62f-ad95-4c76-99b4-2f1cb1c61040', timestamp: '2026-09-19T12:00:00.000Z', message: { content: [{ type: 'tool_use', name: 'Edit', input: { secret: 'never render' } }] } },
    ].map(value => JSON.stringify(value)).join('\n');
    const agent = parseClaudeTranscript(text, '/tmp/session.jsonl');
    assert.equal(agent.title, 'Splash animation'); assert.equal(agent.project, 'app');
    assert.equal(agent.detail, 'Using Edit'); assert.ok(!JSON.stringify(agent).includes('never render'));
  });

  it('maps Codex metadata to active and completed agents', () => {
    const agents = mapCodexRows([
      { id: 'one', title: 'Build office', cwd: '/work/office', updated_at_ms: 1_000, status: 'inProgress' },
      { id: 'two', title: 'Old task', cwd: '/work/app', updated_at_ms: 2_000, status: 'completed' },
    ]);
    assert.equal(agents[0]?.status, 'active'); assert.equal(agents[0]?.project, 'office');
    assert.equal(agents[1]?.status, 'completed');
  });
});
