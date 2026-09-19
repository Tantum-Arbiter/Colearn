import { spawn } from 'node:child_process';

export interface RunOptions {
  executable: string;
  args: readonly string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  maxOutputBytes?: number;
  killGraceMs?: number;
  input?: string;
  onStdoutLine?: (line: string) => void;
  signal?: AbortSignal;
}

export interface RunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
  spawnError: string | null;
}

const DEFAULT_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export function runProcess(options: RunOptions): Promise<RunResult> {
  const maxBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const graceMs = options.killGraceMs ?? 2000;
  const started = Date.now();
  if (options.signal?.aborted) return Promise.resolve({ exitCode: null, signal: 'SIGTERM', stdout: '', stderr: '', timedOut: false, truncated: false, durationMs: 0, spawnError: 'aborted before launch' });

  return new Promise((resolve) => {
    const child = spawn(options.executable, [...options.args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
      shell: false,
    });

    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let outBytes = 0;
    let errBytes = 0;
    let truncated = false;
    let timedOut = false;
    let spawnError: string | null = null;
    let killTimer: NodeJS.Timeout | undefined;
    let pending = '';
    child.stdin.on('error', () => { /* child may exit before consuming input */ });
    child.stdin.end(options.input ?? '');

    const collect = (chunks: Buffer[], size: number, chunk: Buffer): number => {
      const room = maxBytes - size;
      if (room <= 0) {
        truncated = true;
        return size;
      }
      const piece = chunk.length > room ? chunk.subarray(0, room) : chunk;
      if (piece.length < chunk.length) {
        truncated = true;
      }
      chunks.push(piece);
      return size + piece.length;
    };

    child.stdout.on('data', (chunk: Buffer) => {
      outBytes = collect(out, outBytes, chunk);
      if (options.onStdoutLine) {
        pending += chunk.toString('utf8');
        const lines = pending.split('\n');
        pending = (lines.pop() ?? '').slice(-maxBytes);
        for (const line of lines) {
          try { options.onStdoutLine(line); }
          catch { spawnError = 'output callback failed'; abort(); break; }
        }
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      errBytes = collect(err, errBytes, chunk);
    });

    const killGroup = (signal: NodeJS.Signals): void => {
      if (child.pid === undefined) {
        return;
      }
      try {
        process.kill(-child.pid, signal);
      } catch {
        return;
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killGroup('SIGTERM');
      killTimer = setTimeout(() => killGroup('SIGKILL'), graceMs);
    }, options.timeoutMs);
    const abort = (): void => {
      killGroup('SIGTERM');
      if (killTimer !== undefined) clearTimeout(killTimer);
      killTimer = setTimeout(() => killGroup('SIGKILL'), graceMs);
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();

    child.on('error', (error: Error) => {
      spawnError = error.message;
    });

    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      if (killTimer !== undefined) {
        clearTimeout(killTimer);
      }
      if (timedOut || options.signal?.aborted || spawnError === 'output callback failed') {
        killGroup('SIGKILL');
      }
      resolve({
        exitCode: code,
        signal,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
        timedOut,
        truncated,
        durationMs: Date.now() - started,
        spawnError,
      });
    });
  });
}
