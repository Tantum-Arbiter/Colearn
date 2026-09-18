import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { OrchestratorConfig } from '../lib/config.ts';
import {
  codexConfigFindings,
  nodeVersionOk,
  parseClaudeAuthStatus,
  parseCodexLoginStatus,
  permissionFinding,
  runDoctor,
  type Runner,
} from '../lib/doctor.ts';
import type { RunOptions, RunResult } from '../lib/proc.ts';
import { enqueueDeferred, loadAvailability, reviewerAvailability } from '../lib/state.ts';

describe('status parsers', () => {
  it('reads claude auth status JSON without keeping the email', () => {
    const auth = parseClaudeAuthStatus(
      JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', email: 'someone@example.com', subscriptionType: 'pro' }),
    );
    assert.deepEqual(auth, { loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'pro' });
    assert.equal(parseClaudeAuthStatus('not json'), null);
  });

  it('classifies every codex login status line', () => {
    assert.equal(parseCodexLoginStatus('Logged in using ChatGPT'), 'chatgpt');
    assert.equal(parseCodexLoginStatus('Logged in using an API key - sk-proj-***abc'), 'api_key');
    assert.equal(parseCodexLoginStatus('Logged in using Amazon Bedrock API key'), 'api_key');
    assert.equal(parseCodexLoginStatus('Logged in using access token'), 'other');
    assert.equal(parseCodexLoginStatus('Not logged in'), 'logged_out');
    assert.equal(parseCodexLoginStatus(''), 'unknown');
  });

  it('flags unsafe codex profile config', () => {
    const safe = 'cli_auth_credentials_store = "keyring"\nforced_login_method = "chatgpt"\n';
    assert.deepEqual(codexConfigFindings(safe), []);
    const unsafe = '[projects."/Users/me/repo"]\ntrust_level = "trusted"\n[mcp_servers.x]\ncommand = "x"\n';
    const details = codexConfigFindings(unsafe).map((f) => f.detail);
    assert.equal(details.length, 3);
    assert.match(details[0] ?? '', /forced_login_method/);
    assert.match(details[1] ?? '', /trusts a project/);
    assert.match(details[2] ?? '', /MCP/);
  });

  it('flags group- or world-readable profile folders', () => {
    assert.equal(permissionFinding(0o40700), null);
    assert.equal(permissionFinding(0o40755)?.status, 'warn');
  });

  it('compares node versions', () => {
    assert.equal(nodeVersionOk('v22.23.1'), true);
    assert.equal(nodeVersionOk('v22.18.0'), true);
    assert.equal(nodeVersionOk('v22.17.9'), false);
    assert.equal(nodeVersionOk('v24.0.0'), true);
    assert.equal(nodeVersionOk('v20.19.0'), false);
  });
});

function result(partial: Partial<RunResult>): RunResult {
  return { exitCode: 0, signal: null, stdout: '', stderr: '', timedOut: false, truncated: false, durationMs: 5, spawnError: null, ...partial };
}

describe('runDoctor', () => {
  let home: string;
  let stateDir: string;
  let config: OrchestratorConfig;
  let calls: RunOptions[];
  const NOW = new Date('2026-09-18T14:00:00Z');

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'ai-doctor-'));
    stateDir = join(home, 'state');
    for (const dir of ['.claude-pro', '.codex-1', 'bin']) {
      mkdirSync(join(home, dir), { mode: 0o700 });
    }
    writeFileSync(join(home, '.codex-1', 'config.toml'), 'forced_login_method = "chatgpt"\n');
    writeFileSync(join(home, 'bin', 'claude'), '');
    writeFileSync(join(home, 'bin', 'codex'), '');
    config = {
      lead: { label: 'Claude Max', profileDir: join(home, '.claude') },
      reviewers: [
        { id: 'claude-pro', label: 'Claude Pro', kind: 'claude', profileDir: join(home, '.claude-pro'), expectedPlan: 'pro' },
        { id: 'codex-1', label: 'Codex 1', kind: 'codex', profileDir: join(home, '.codex-1'), expectedPlan: null },
      ],
      binaries: { claude: join(home, 'bin', 'claude'), codex: join(home, 'bin', 'codex') },
      pins: { codex: '0.154.0' },
    };
    calls = [];
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  function fakeRunner(overrides: (options: RunOptions) => RunResult | undefined): Runner {
    return async (options) => {
      calls.push(options);
      const custom = overrides(options);
      if (custom !== undefined) {
        return custom;
      }
      const args = options.args.join(' ');
      if (args === '--version') {
        return result({ stdout: options.executable.endsWith('codex') ? 'codex-cli 0.154.0\n' : '2.1.276 (Claude Code)\n' });
      }
      if (args === 'auth status') {
        return options.env.CLAUDE_CONFIG_DIR === undefined
          ? result({ stdout: JSON.stringify({ loggedIn: false, authMethod: 'none' }), exitCode: 1 })
          : result({ stdout: JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'pro', email: 'x@example.com' }) });
      }
      if (args === 'login status') {
        return result({ stdout: 'Logged in using ChatGPT\n' });
      }
      return result({ stdout: 'OK' });
    };
  }

  const baseEnv = { HOME: '/h', USER: 'u', PATH: '/usr/bin', ANTHROPIC_BASE_URL: 'http://127.0.0.1:1' };

  it('reports a healthy setup without probing or leaking identity', async () => {
    const rows = await runDoctor({ config, stateDir, env: baseEnv, now: NOW, probe: false, nodeVersion: 'v22.23.1', run: fakeRunner(() => undefined) });
    assert.deepEqual(
      rows.map((r) => [r.area, r.status]),
      [
        ['Node', 'ok'],
        ['Environment', 'ok'],
        ['claude CLI', 'ok'],
        ['codex CLI', 'ok'],
        ['Claude Max (lead)', 'info'],
        ['Claude Pro', 'ok'],
        ['Codex 1', 'ok'],
      ],
    );
    assert.ok(rows.every((r) => !r.detail.includes('example.com')));
    assert.ok(calls.every((c) => c.env.ANTHROPIC_BASE_URL === undefined));
    assert.equal(calls.find((c) => c.args.join(' ') === 'login status')?.env.CODEX_HOME, join(home, '.codex-1'));
    assert.ok(calls.every((c) => c.args[0] !== '-p' && c.args[0] !== 'exec'));
  });

  it('stops before launching anything when an API key is set', async () => {
    const rows = await runDoctor({
      config,
      stateDir,
      env: { ...baseEnv, OPENAI_API_KEY: 'sk-live-secret' },
      now: NOW,
      probe: true,
      nodeVersion: 'v22.23.1',
      run: fakeRunner(() => undefined),
    });
    assert.equal(calls.length, 0);
    assert.equal(rows.at(-1)?.status, 'fail');
    assert.match(rows.at(-1)?.detail ?? '', /OPENAI_API_KEY/);
    assert.ok(rows.every((r) => !r.detail.includes('sk-live-secret')));
  });

  it('fails an unpinned codex and a reviewer signed in to the wrong plan or with an API key', async () => {
    const rows = await runDoctor({
      config,
      stateDir,
      env: baseEnv,
      now: NOW,
      probe: false,
      nodeVersion: 'v22.23.1',
      run: fakeRunner((o) => (o.args.join(' ') === '--version' && o.executable.endsWith('codex') ? result({ stdout: 'codex-cli 0.200.0' }) : undefined)),
    });
    assert.equal(rows.find((r) => r.area === 'codex CLI')?.status, 'fail');

    calls = [];
    const wrong = await runDoctor({
      config,
      stateDir,
      env: baseEnv,
      now: NOW,
      probe: false,
      nodeVersion: 'v22.23.1',
      run: fakeRunner((o) => {
        if (o.args.join(' ') === 'auth status' && o.env.CLAUDE_CONFIG_DIR !== undefined) {
          return result({ stdout: JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'max' }) });
        }
        if (o.args.join(' ') === 'login status') {
          return result({ stdout: 'Logged in using an API key - sk-***' });
        }
        return undefined;
      }),
    });
    assert.match(wrong.find((r) => r.area === 'Claude Pro')?.detail ?? '', /expected "pro"/);
    assert.equal(wrong.find((r) => r.area === 'Codex 1')?.status, 'fail');
  });

  it('records a usage limit from a probe and shows queued reviews', async () => {
    enqueueDeferred(
      stateDir,
      { reviewer: 'claude-pro', reviewKind: 'browser_qa', runId: '20260918T140000Z-abc123', headCommit: 'a'.repeat(40), reason: 'limit' },
      NOW,
    );
    const rows = await runDoctor({
      config,
      stateDir,
      env: baseEnv,
      now: NOW,
      probe: true,
      nodeVersion: 'v22.23.1',
      run: fakeRunner((o) =>
        o.args[0] === '-p'
          ? result({
              exitCode: 1,
              stdout: JSON.stringify({ is_error: true, result: "You've hit your weekly limit · resets Sep 19 at 5pm (Europe/London)" }),
            })
          : undefined,
      ),
    });
    const probe = calls.find((c) => c.args[0] === '-p');
    assert.ok(probe);
    assert.notEqual(probe.cwd, process.cwd());
    assert.ok(probe.args.includes('--safe-mode'));
    assert.ok(!probe.args.includes('--bare'));
    const codexProbe = calls.find((c) => c.args[0] === 'exec');
    assert.ok(codexProbe?.args.includes('read-only'));
    assert.ok(codexProbe?.args.includes('forced_login_method="chatgpt"'));

    assert.equal(rows.find((r) => r.area === 'Claude Pro probe')?.status, 'warn');
    assert.equal(rows.find((r) => r.area === 'Codex 1 probe')?.status, 'ok');
    const usage = rows.find((r) => r.area === 'Claude Pro usage');
    assert.equal(usage?.status, 'warn');
    assert.match(usage?.detail ?? '', /limited until .*1 review queued/);
    const availability = reviewerAvailability(loadAvailability(stateDir), 'claude-pro', NOW);
    assert.equal(!availability.available && availability.until.toISOString(), '2026-09-19T16:00:00.000Z');
  });

  it('clears a stale limit when a probe succeeds', async () => {
    const limited = fakeRunner((o) => (o.args[0] === 'exec' ? result({ exitCode: 1, stderr: "You've hit your usage limit." }) : undefined));
    await runDoctor({ config, stateDir, env: baseEnv, now: NOW, probe: true, nodeVersion: 'v22.23.1', run: limited });
    assert.equal(reviewerAvailability(loadAvailability(stateDir), 'codex-1', NOW).available, false);
    await runDoctor({ config, stateDir, env: baseEnv, now: NOW, probe: true, nodeVersion: 'v22.23.1', run: fakeRunner(() => undefined) });
    assert.equal(reviewerAvailability(loadAvailability(stateDir), 'codex-1', NOW).available, true);
  });
});
