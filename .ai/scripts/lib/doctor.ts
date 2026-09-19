import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OrchestratorConfig, ReviewerConfig } from './config.ts';
import { buildWorkerEnv, findForbiddenEnv } from './env.ts';
import { detectUsageLimit } from './limits.ts';
import { runProcess, type RunOptions, type RunResult } from './proc.ts';
import {
  clearUsageLimit,
  loadAvailability,
  loadQueue,
  pendingCounts,
  recordUsageLimit,
  reviewerAvailability,
} from './state.ts';
import { safeDisplay } from './text.ts';

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'info';

export interface CheckRow {
  area: string;
  status: CheckStatus;
  detail: string;
  /** A failed reviewer login is job-local; infrastructure and unsafe auth failures are global. */
  blocksDispatch?: boolean;
}

export function blocksDispatch(row: CheckRow): boolean {
  return row.status === 'fail' && row.blocksDispatch !== false;
}

export interface ClaudeAuth {
  loggedIn: boolean;
  authMethod: string | null;
  subscriptionType: string | null;
}

export type CodexLogin = 'chatgpt' | 'api_key' | 'other' | 'logged_out' | 'unknown';

export type Runner = (options: RunOptions) => Promise<RunResult>;

export interface DoctorContext {
  config: OrchestratorConfig;
  stateDir: string;
  env: NodeJS.ProcessEnv;
  now: Date;
  probe: boolean;
  nodeVersion: string;
  run?: Runner;
}

const STATUS_TIMEOUT_MS = 20_000;
const PROBE_TIMEOUT_MS = 120_000;
const MIN_NODE: readonly number[] = [22, 18, 0];
const PROBE_PROMPT = 'Reply with the single word OK.';

export function parseClaudeAuthStatus(stdout: string): ClaudeAuth | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (typeof parsed !== 'object' || parsed === null || !('loggedIn' in parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    return {
      loggedIn: record.loggedIn === true,
      authMethod: typeof record.authMethod === 'string' ? record.authMethod : null,
      subscriptionType: typeof record.subscriptionType === 'string' ? record.subscriptionType : null,
    };
  } catch {
    return null;
  }
}

export function parseCodexLoginStatus(text: string): CodexLogin {
  if (/Logged in using ChatGPT/.test(text)) {
    return 'chatgpt';
  }
  if (/Logged in using .*API key/i.test(text)) {
    return 'api_key';
  }
  if (/Logged in using/.test(text)) {
    return 'other';
  }
  if (/Not logged in/i.test(text)) {
    return 'logged_out';
  }
  return 'unknown';
}

export function codexConfigFindings(toml: string): Array<{ status: CheckStatus; detail: string }> {
  const findings: Array<{ status: CheckStatus; detail: string }> = [];
  if (!/^\s*forced_login_method\s*=\s*"chatgpt"\s*(?:#.*)?$/m.test(toml)) {
    findings.push({ status: 'warn', detail: 'config.toml lacks forced_login_method = "chatgpt" (API-key login is not blocked)' });
  }
  if (/^\s*trust_level\s*=\s*"trusted"/m.test(toml)) {
    findings.push({ status: 'warn', detail: 'config.toml trusts a project directory; remove the [projects."…"] entry' });
  }
  if (/^\s*\[mcp_servers/m.test(toml)) {
    findings.push({ status: 'warn', detail: 'config.toml defines MCP servers; reviewers start with none' });
  }
  return findings;
}

export function permissionFinding(mode: number): { status: CheckStatus; detail: string } | null {
  if ((mode & 0o077) !== 0) {
    return { status: 'warn', detail: `profile folder is readable by other users (mode ${(mode & 0o777).toString(8)}); run chmod 700 on it` };
  }
  return null;
}

export function nodeVersionOk(version: string): boolean {
  const parts = version.replace(/^v/, '').split('.').map(Number);
  for (const [i, need] of MIN_NODE.entries()) {
    const have = parts[i] ?? 0;
    if (have !== need) {
      return have > need;
    }
  }
  return true;
}

export function formatWhen(date: Date): string {
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function firstLine(text: string): string {
  return safeDisplay(text.split('\n').find((line) => line.trim() !== '') ?? '', 200);
}

async function binaryRow(
  run: Runner,
  area: string,
  path: string,
  env: Record<string, string>,
  pin: string | null,
): Promise<CheckRow> {
  if (!existsSync(path)) {
    return { area, status: 'fail', detail: `not found at ${path}` };
  }
  const result = await run({ executable: path, args: ['--version'], cwd: tmpdir(), env, timeoutMs: STATUS_TIMEOUT_MS });
  const version = firstLine(result.stdout);
  if (result.exitCode !== 0 || version === '') {
    return { area, status: 'fail', detail: `--version failed: ${firstLine(result.stderr) || 'no output'}` };
  }
  if (pin !== null && !version.includes(pin)) {
    return { area, status: 'fail', detail: `${version}, expected pinned ${pin}` };
  }
  return { area, status: 'ok', detail: pin === null ? version : `${version} (pinned)` };
}

async function leadRow(run: Runner, config: OrchestratorConfig, env: Record<string, string>): Promise<CheckRow> {
  const area = `${config.lead.label} (lead)`;
  const result = await run({
    executable: config.binaries.claude,
    args: ['auth', 'status'],
    cwd: tmpdir(),
    env,
    timeoutMs: STATUS_TIMEOUT_MS,
  });
  const auth = parseClaudeAuthStatus(result.stdout);
  if (auth === null) {
    return { area, status: 'info', detail: 'desktop app (terminal status unreadable)' };
  }
  if (auth.loggedIn && auth.authMethod !== 'claude.ai') {
    return { area, status: 'fail', detail: `terminal CLI uses ${auth.authMethod ?? 'unknown'} auth, not a subscription login` };
  }
  if (auth.loggedIn) {
    return { area, status: 'ok', detail: `terminal CLI signed in (${auth.subscriptionType ?? 'plan unknown'})` };
  }
  return { area, status: 'info', detail: 'desktop app (terminal CLI not signed in; not needed)' };
}

async function claudeReviewerRow(run: Runner, config: OrchestratorConfig, reviewer: ReviewerConfig, env: Record<string, string>): Promise<CheckRow> {
  const result = await run({
    executable: config.binaries.claude,
    args: ['auth', 'status'],
    cwd: tmpdir(),
    env,
    timeoutMs: STATUS_TIMEOUT_MS,
  });
  const auth = parseClaudeAuthStatus(result.stdout);
  if (auth === null) {
    return { area: reviewer.label, status: 'fail', detail: `auth status unreadable: ${firstLine(result.stderr) || 'no output'}` };
  }
  if (!auth.loggedIn) {
    return {
      area: reviewer.label,
      status: 'fail',
      detail: `needs login (CLAUDE_CONFIG_DIR=${reviewer.profileDir} claude, then /login)`,
      blocksDispatch: false,
    };
  }
  if (auth.authMethod !== 'claude.ai') {
    return { area: reviewer.label, status: 'fail', detail: `uses ${auth.authMethod ?? 'unknown'} auth, not a subscription login` };
  }
  if (reviewer.expectedPlan !== null && auth.subscriptionType !== reviewer.expectedPlan) {
    return {
      area: reviewer.label,
      status: 'fail',
      detail: `signed in on plan "${auth.subscriptionType ?? 'unknown'}", expected "${reviewer.expectedPlan}" (wrong account?)`,
    };
  }
  return { area: reviewer.label, status: 'ok', detail: `authenticated (subscription: ${auth.subscriptionType ?? 'unknown'})` };
}

async function codexReviewerRows(run: Runner, config: OrchestratorConfig, reviewer: ReviewerConfig, env: Record<string, string>): Promise<CheckRow[]> {
  const result = await run({
    executable: config.binaries.codex,
    args: ['login', 'status'],
    cwd: tmpdir(),
    env,
    timeoutMs: STATUS_TIMEOUT_MS,
  });
  const login = parseCodexLoginStatus(`${result.stdout}\n${result.stderr}`);
  const rows: CheckRow[] = [];
  switch (login) {
    case 'chatgpt':
      rows.push({ area: reviewer.label, status: 'ok', detail: 'authenticated (ChatGPT subscription)' });
      break;
    case 'api_key':
      rows.push({ area: reviewer.label, status: 'fail', detail: 'signed in with an API key; run codex logout and sign in with ChatGPT' });
      break;
    case 'other':
      rows.push({ area: reviewer.label, status: 'fail', detail: 'signed in with a non-ChatGPT method' });
      break;
    case 'logged_out':
      rows.push({
        area: reviewer.label,
        status: 'fail',
        detail: `needs login (CODEX_HOME=${reviewer.profileDir} codex login)`,
        blocksDispatch: false,
      });
      break;
    case 'unknown':
      rows.push({ area: reviewer.label, status: 'fail', detail: `login status unreadable: ${firstLine(result.stderr) || firstLine(result.stdout) || 'no output'}` });
      break;
  }
  const configPath = join(reviewer.profileDir, 'config.toml');
  if (existsSync(configPath)) {
    for (const finding of codexConfigFindings(readFileSync(configPath, 'utf8'))) {
      rows.push({ area: reviewer.label, ...finding });
    }
  } else {
    rows.push({ area: reviewer.label, status: 'warn', detail: 'no config.toml; forced_login_method = "chatgpt" is not set' });
  }
  return rows;
}

function probeArgs(reviewer: ReviewerConfig): string[] {
  if (reviewer.kind === 'claude') {
    return [
      '-p',
      PROBE_PROMPT,
      '--safe-mode',
      '--output-format',
      'json',
      '--tools',
      '',
      '--no-session-persistence',
      '--model',
      'haiku',
    ];
  }
  return [
    'exec',
    '--ephemeral',
    '--sandbox',
    'read-only',
    '--skip-git-repo-check',
    '--ignore-rules',
    '-c',
    'forced_login_method="chatgpt"',
    '-c',
    'web_search="disabled"',
    '-c',
    'model_reasoning_effort="low"',
    PROBE_PROMPT,
  ];
}

async function probeRow(
  run: Runner,
  config: OrchestratorConfig,
  reviewer: ReviewerConfig,
  env: Record<string, string>,
  stateDir: string,
  now: Date,
): Promise<CheckRow> {
  const area = `${reviewer.label} probe`;
  const cwd = mkdtempSync(join(tmpdir(), 'ai-probe-'));
  try {
    const result = await run({
      executable: reviewer.kind === 'claude' ? config.binaries.claude : config.binaries.codex,
      args: probeArgs(reviewer),
      cwd,
      env,
      timeoutMs: PROBE_TIMEOUT_MS,
      maxOutputBytes: 256 * 1024,
    });
    const combined = `${result.stdout}\n${result.stderr}`;
    const limit = detectUsageLimit(combined, now);
    if (limit !== null) {
      const entry = recordUsageLimit(stateDir, reviewer.id, limit, now);
      const until = formatWhen(new Date(entry.limitedUntil));
      return {
        area,
        status: 'warn',
        detail: entry.resetKnown ? `usage limit reached; available again ${until}` : `usage limit reached; reset time unknown, retrying after ${until}`,
      };
    }
    if (result.timedOut) {
      return { area, status: 'fail', detail: `timed out after ${PROBE_TIMEOUT_MS / 1000}s` };
    }
    if (result.exitCode !== 0) {
      return { area, status: 'fail', detail: `exit ${result.exitCode ?? result.signal}: ${firstLine(result.stderr) || firstLine(result.stdout) || 'no output'}` };
    }
    clearUsageLimit(stateDir, reviewer.id);
    return { area, status: 'ok', detail: `answered in ${(result.durationMs / 1000).toFixed(1)}s` };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

export async function runDoctor(ctx: DoctorContext): Promise<CheckRow[]> {
  const run = ctx.run ?? runProcess;
  const rows: CheckRow[] = [];

  rows.push(
    nodeVersionOk(ctx.nodeVersion)
      ? { area: 'Node', status: 'ok', detail: ctx.nodeVersion }
      : { area: 'Node', status: 'fail', detail: `${ctx.nodeVersion}; need >= ${MIN_NODE.join('.')} for type stripping` },
  );

  const forbidden = findForbiddenEnv(ctx.env);
  if (forbidden.length > 0) {
    rows.push({ area: 'Environment', status: 'fail', detail: `paid-API variables set: ${forbidden.join(', ')}; workers will refuse to start` });
    return rows;
  }
  rows.push({ area: 'Environment', status: 'ok', detail: 'no API-key variables set' });

  const baseEnv = buildWorkerEnv(ctx.env, null);
  rows.push(await binaryRow(run, 'claude CLI', ctx.config.binaries.claude, baseEnv, null));
  rows.push(await binaryRow(run, 'codex CLI', ctx.config.binaries.codex, baseEnv, ctx.config.pins.codex));
  if (rows.some((row) => row.status === 'fail')) {
    return rows;
  }

  rows.push(await leadRow(run, ctx.config, baseEnv));

  const availability = loadAvailability(ctx.stateDir);
  const pending = pendingCounts(loadQueue(ctx.stateDir));

  for (const reviewer of ctx.config.reviewers) {
    if (!existsSync(reviewer.profileDir)) {
      rows.push({ area: reviewer.label, status: 'fail', detail: `profile folder ${reviewer.profileDir} does not exist` });
      continue;
    }
    const perm = permissionFinding(statSync(reviewer.profileDir).mode);
    if (perm !== null) {
      rows.push({ area: reviewer.label, ...perm });
    }
    const env = buildWorkerEnv(ctx.env, {
      name: reviewer.kind === 'claude' ? 'CLAUDE_CONFIG_DIR' : 'CODEX_HOME',
      dir: reviewer.profileDir,
    });
    const authRows =
      reviewer.kind === 'claude'
        ? [await claudeReviewerRow(run, ctx.config, reviewer, env)]
        : await codexReviewerRows(run, ctx.config, reviewer, env);
    rows.push(...authRows);

    const authenticated = authRows[0]?.status === 'ok';
    if (ctx.probe && authenticated) {
      rows.push(await probeRow(run, ctx.config, reviewer, env, ctx.stateDir, ctx.now));
    }

    const state = reviewerAvailability(loadAvailability(ctx.stateDir), reviewer.id, ctx.now);
    const queued = pending[reviewer.id] ?? 0;
    const queuedText = queued > 0 ? `; ${queued} review${queued === 1 ? '' : 's'} queued for it` : '';
    if (!state.available) {
      const when = formatWhen(state.until);
      rows.push({
        area: `${reviewer.label} usage`,
        status: 'warn',
        detail: `${state.resetKnown ? 'limited until' : 'limited, retry after'} ${when}; reviews skip it${queuedText}`,
      });
    } else if (availability.reviewers[reviewer.id] !== undefined || queued > 0) {
      rows.push({ area: `${reviewer.label} usage`, status: 'ok', detail: `available${queuedText}` });
    }
  }

  return rows;
}

export function renderRows(rows: readonly CheckRow[]): string {
  const label: Record<CheckStatus, string> = { ok: 'OK  ', warn: 'WARN', fail: 'FAIL', info: 'INFO' };
  const width = Math.max(...rows.map((row) => row.area.length));
  return rows.map((row) => `${label[row.status]}  ${row.area.padEnd(width)}  ${safeDisplay(row.detail, 400)}`).join('\n');
}
