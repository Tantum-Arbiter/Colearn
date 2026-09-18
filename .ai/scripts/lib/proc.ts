import { spawn } from 'node:child_process';

export interface RunOptions {
  executable: string;
  args: readonly string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  maxOutputBytes?: number;
  killGraceMs?: number;
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

  return new Promise((resolve) => {
    const child = spawn(options.executable, [...options.args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
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

    child.on('error', (error: Error) => {
      spawnError = error.message;
    });

    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer);
      if (killTimer !== undefined) {
        clearTimeout(killTimer);
      }
      if (timedOut) {
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
