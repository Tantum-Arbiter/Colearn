// Explicit live integration check: sends only a tiny synthetic diff, consumes subscription quota.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { main } from './lib/cli.ts';
import { loadConfig } from './lib/config.ts';
import { writeFileAtomic } from './lib/fsx.ts';
import { createReview } from './lib/review.ts';

const aiDir = resolve(import.meta.dirname, '..');
const scratch = mkdtempSync(join(tmpdir(), 'colearn-live-review-'));
try {
  const fixtureAi = join(scratch, '.ai'); mkdirSync(fixtureAi);
  const git = (...args: string[]): void => { execFileSync('git', args, { cwd: scratch, stdio: 'ignore' }); };
  git('init', '-q'); git('config', 'user.name', 'Local integration fixture'); git('config', 'user.email', 'fixture@example.invalid');
  writeFileAtomic(join(scratch, 'add.js'), 'export const add = (a, b) => a - b;\n');
  git('add', 'add.js'); git('commit', '-qm', 'fixture baseline');
  writeFileAtomic(join(scratch, 'add.js'), 'export const add = (a, b) => a + b;\n');
  git('add', 'add.js'); git('commit', '-qm', 'correct addition');
  const task = join(scratch, 'task.md');
  writeFileAtomic(task, 'Integration fixture: review this one-line correction of addition. Inputs are numbers. No UI or runtime evidence is available; record those limitations.');
  const id = await createReview({ aiDir: fixtureAi, config: loadConfig(aiDir, homedir()), env: process.env }, 'HEAD^', 'HEAD', task);
  mkdirSync(join(aiDir, 'runs'), { recursive: true, mode: 0o700 });
  cpSync(join(fixtureAi, 'runs', id), join(aiDir, 'runs', id), { recursive: true });
  console.log(`Live fixture run: ${id}`);
  process.exitCode = await main(['resume', id], aiDir);
} finally { rmSync(scratch, { recursive: true, force: true }); }
