import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { runProcess } from '../lib/proc.ts';

const env = { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: tmpdir() };

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

describe('runProcess', () => {
  it('passes arguments without shell interpretation', async () => {
    const res = await runProcess({
      executable: process.execPath,
      args: ['-e', 'process.stdout.write(process.argv[1])', '$(echo injected); `id`'],
      cwd: tmpdir(),
      env,
      timeoutMs: 10_000,
    });
    assert.equal(res.exitCode, 0);
    assert.equal(res.stdout, '$(echo injected); `id`');
  });

  it('passes only the given environment', async () => {
    const res = await runProcess({
      executable: process.execPath,
      args: ['-e', 'process.stdout.write(Object.keys(process.env).sort().join(","))'],
      cwd: tmpdir(),
      env: { ...env, ONLY_THIS: '1' },
      timeoutMs: 10_000,
    });
    assert.deepEqual(res.stdout.split(',').filter((k) => !k.startsWith('__CF')), ['HOME', 'ONLY_THIS', 'PATH']);
  });

  it('caps captured output', async () => {
    const res = await runProcess({
      executable: process.execPath,
      args: ['-e', 'process.stdout.write("x".repeat(100000))'],
      cwd: tmpdir(),
      env,
      timeoutMs: 10_000,
      maxOutputBytes: 1000,
    });
    assert.equal(res.stdout.length, 1000);
    assert.equal(res.truncated, true);
  });

  it('kills the whole process group on timeout', async () => {
    const script =
      "const {spawn}=require('node:child_process');" +
      "const c=spawn('sleep',['30'],{stdio:'ignore'});" +
      "process.stdout.write(String(c.pid)+'\\n');" +
      'setInterval(()=>{},1000);';
    const res = await runProcess({ executable: process.execPath, args: ['-e', script], cwd: tmpdir(), env, timeoutMs: 800, killGraceMs: 200 });
    assert.equal(res.timedOut, true);
    const grandchild = Number(res.stdout.trim());
    assert.ok(grandchild > 0);
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(alive(grandchild), false);
  });

  it('reports a missing executable instead of throwing', async () => {
    const res = await runProcess({ executable: '/nonexistent/binary', args: [], cwd: tmpdir(), env, timeoutMs: 1000 });
    assert.notEqual(res.spawnError, null);
    assert.notEqual(res.exitCode, 0);
  });
});
