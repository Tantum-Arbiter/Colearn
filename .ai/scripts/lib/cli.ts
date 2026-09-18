import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config.ts';
import { renderRows, runDoctor } from './doctor.ts';
import { resolveInside } from './fsx.ts';
import { renderStatus } from './status.ts';
import { safeDisplay } from './text.ts';

const HELP = `Usage: ai <command>

Commands:
  doctor           Check tools, logins, profile isolation and reviewer usage limits.
  doctor --probe   Also send each signed-in reviewer a one-line prompt from an empty
                   folder, recording any usage limit it reports (uses a little quota).
  status           Show reviewer availability and reviews waiting for a reviewer.
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
