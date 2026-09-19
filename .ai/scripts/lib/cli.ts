import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config.ts';
import { blocksDispatch, renderRows, runDoctor } from './doctor.ts';
import { resolveInside } from './fsx.ts';
import { renderStatus } from './status.ts';
import { safeDisplay } from './text.ts';
import { createReview, dispatchReview, reviewSummary } from './review.ts';
import { startOffice } from './office.ts';
import { loadAvailability, loadQueue, reviewerAvailability } from './state.ts';
import { setTimeout as delay } from 'node:timers/promises';
import { verify } from './verify.ts';

const HELP = `Usage: ai <command>

Commands:
  doctor           Check tools, logins, profile isolation and reviewer usage limits.
  doctor --probe   Also send each signed-in reviewer a one-line prompt from an empty
                   folder, recording any usage limit it reports (uses a little quota).
  status           Show reviewer availability and reviews waiting for a reviewer.
  review --base REF --task FILE [--head REF]
                   Review an immutable committed diff (head defaults to HEAD).
                   Optional --evidence FILE attaches matching verification evidence.
  verify -- COMMAND [ARGS]
                   Execute your explicit check and save evidence for review.
  resume RUN_ID [--retry-failed]
                   Retry available deferred/interrupted jobs on the same snapshot.
  resume --watch   Keep a foreground quota-aware retry loop running (Ctrl-C stops).
  report RUN_ID    Show completion state and paths to validated review reports.
  office [--port N] Start the read-only Pixel Agents office on 127.0.0.1:4317.
  help             Show this message.`;

export async function main(argv: readonly string[], aiDir: string): Promise<number> {
  const [command, ...rest] = argv;
  if (command === undefined || command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(`${HELP}\n`);
    return command === undefined ? 1 : 0;
  }

  try {
    const home = homedir();
    const config = loadConfig(aiDir, home);
    mkdirSync(join(aiDir, 'state'), { recursive: true, mode: 0o700 });
    const stateDir = resolveInside(aiDir, 'state');

    if (command === 'verify') {
      if (rest[0] !== '--') throw new Error('Usage: ai verify -- COMMAND [ARGS]');
      const controller = new AbortController();
      const stop = (): void => controller.abort();
      process.once('SIGINT', stop); process.once('SIGTERM', stop);
      try { return await verify(aiDir, rest.slice(1), controller.signal); }
      finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
    }

    if (command === 'office') {
      if (rest.length && (rest.length !== 2 || rest[0] !== '--port' || !/^\d+$/.test(rest[1] ?? ''))) throw new Error('Usage: ai office [--port N]');
      const office = await startOffice(aiDir, rest[1] ? Number(rest[1]) : 4317);
      process.stdout.write(`Read-only agent office: ${office.url}\nCtrl-C to stop.\n`);
      await new Promise<void>(resolve => {
        const stop = (): void => { process.off('SIGINT', stop); process.off('SIGTERM', stop); resolve(); };
        process.once('SIGINT', stop); process.once('SIGTERM', stop);
      });
      await office.close(); return 0;
    }

    if (command === 'report') {
      if (rest.length !== 1) throw new Error('Usage: ai report RUN_ID');
      process.stdout.write(`${reviewSummary(aiDir, rest[0]!)}\n`); return 0;
    }

    if (command === 'review' || command === 'resume') {
      const health = await runDoctor({ config, stateDir, env: process.env, now: new Date(), nodeVersion: process.version, probe: false });
      if (health.some(blocksDispatch)) {
        process.stderr.write(`${renderRows(health)}\n`);
        throw new Error('Worker preflight failed; fix doctor failures before dispatching');
      }
      const controller = new AbortController();
      const stop = (): void => controller.abort();
      process.once('SIGINT', stop); process.once('SIGTERM', stop);
      const options = { aiDir, config, env: process.env, signal: controller.signal };
      try {
        if (command === 'resume' && rest.length === 1 && rest[0] === '--watch') {
          process.stdout.write('Watching deferred reviews. Ctrl-C stops; no background service is installed.\n');
          while (!controller.signal.aborted) {
            const now = new Date();
            const availability = loadAvailability(stateDir);
            const ids = new Set(loadQueue(stateDir).items.filter(q => q.status === 'pending' && reviewerAvailability(availability, q.reviewer, now).available).map(q => q.runId));
            for (const id of ids) {
              if (controller.signal.aborted) break;
              await dispatchReview(options, id);
              process.stdout.write(`${reviewSummary(aiDir, id)}\n`);
            }
            await delay(30_000, undefined, { signal: controller.signal }).catch(() => {});
          }
          return 130;
        }
        let id: string;
        if (command === 'review') {
          const flags = new Map<string, string>();
          for (let i = 0; i < rest.length; i += 2) {
            const key = rest[i]!; const value = rest[i + 1];
            if (!['--base', '--head', '--task', '--evidence'].includes(key) || !value || flags.has(key)) throw new Error('Usage: ai review --base REF --task FILE [--head REF] [--evidence FILE]');
            flags.set(key, value);
          }
          if (!flags.has('--base') || !flags.has('--task')) throw new Error('Review requires --base and --task');
          id = await createReview(options, flags.get('--base')!, flags.get('--head') ?? 'HEAD', flags.get('--task')!, flags.get('--evidence'));
          process.stdout.write(`Created review ${id}\n`);
        } else {
          if (!rest[0] || rest.length > 2 || rest.length === 2 && rest[1] !== '--retry-failed') throw new Error('Usage: ai resume RUN_ID [--retry-failed]');
          id = rest[0];
        }
        const code = await dispatchReview(options, id, rest.includes('--retry-failed'));
        process.stdout.write(`${reviewSummary(aiDir, id)}\n`);
        return controller.signal.aborted ? 130 : code;
      } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
    }

    if (command === 'doctor') {
      const unknown = rest.filter((arg) => arg !== '--probe');
      if (unknown.length > 0) {
        process.stderr.write(`Unknown option: ${safeDisplay(unknown[0] ?? '', 80)}\n`);
        return 2;
      }
      const rows = await runDoctor({
        config,
        stateDir,
        env: process.env,
        now: new Date(),
        probe: rest.includes('--probe'),
        nodeVersion: process.version,
      });
      process.stdout.write(`${renderRows(rows)}\n`);
      return rows.some((row) => row.status === 'fail') ? 1 : 0;
    }

    if (command === 'status') {
      if (rest.length > 0) {
        process.stderr.write(`Unknown option: ${safeDisplay(rest[0] ?? '', 80)}\n`);
        return 2;
      }
      process.stdout.write(`${renderStatus(config, stateDir, new Date())}\n`);
      return 0;
    }

    process.stderr.write(`Unknown command: ${safeDisplay(command, 80)}\n\n${HELP}\n`);
    return 2;
  } catch (error) {
    process.stderr.write(`ai: ${safeDisplay(error instanceof Error ? error.message : String(error), 1000)}\n`);
    return 1;
  }
}
