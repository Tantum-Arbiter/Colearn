import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** One dispatcher per checkout prevents duplicate jobs and lost queue updates. */
export function acquireLock(stateDir: string): () => void {
  const path = join(stateDir, 'dispatcher.lock');
  try { mkdirSync(path, { mode: 0o700 }); }
  catch {
    let pid = 0;
    try { pid = Number(readFileSync(join(path, 'pid'), 'utf8')); } catch { /* incomplete lock */ }
    if (!Number.isSafeInteger(pid) || pid < 1) throw new Error('Dispatcher lock is incomplete; inspect .ai/state/dispatcher.lock');
    try { process.kill(pid, 0); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      rmSync(path, { recursive: true });
      return acquireLock(stateDir);
    }
    throw new Error(`Another dispatcher is active (PID ${pid})`);
  }
  writeFileSync(join(path, 'pid'), String(process.pid), { mode: 0o600 });
  return () => rmSync(path, { recursive: true, force: true });
}
