import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildWorkerEnv, findForbiddenEnv, ForbiddenEnvError } from '../lib/env.ts';

describe('findForbiddenEnv', () => {
  it('names every paid-API variable that has a value', () => {
    const env = {
      ANTHROPIC_API_KEY: 'x',
      OPENAI_API_KEY: 'y',
      CODEX_API_KEY: 'z',
      ANTHROPIC_AUTH_TOKEN: 't',
      CLAUDE_CODE_USE_BEDROCK: '1',
      ANTHROPIC_FOO_API_KEY: 'k',
      HOME: '/h',
    };
    assert.deepEqual(findForbiddenEnv(env), [
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_FOO_API_KEY',
      'CLAUDE_CODE_USE_BEDROCK',
      'CODEX_API_KEY',
      'OPENAI_API_KEY',
    ]);
  });

  it('ignores empty values and subscription-side variables', () => {
    const env = {
      ANTHROPIC_API_KEY: '',
      CLAUDE_CODE_OAUTH_TOKEN: 'subscription',
      CLAUDE_CODE_MESSAGING_TOKEN: 'm',
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:1',
    };
    assert.deepEqual(findForbiddenEnv(env), []);
  });
});

describe('buildWorkerEnv', () => {
  const parent = {
    HOME: '/Users/me',
    USER: 'me',
    LOGNAME: 'me',
    PATH: '/usr/bin:/bin',
    TMPDIR: '/tmp/x',
    LANG: 'en_GB.UTF-8',
    ANTHROPIC_BASE_URL: 'http://127.0.0.1:9',
    CLAUDE_CODE_OAUTH_TOKEN: 'secret-subscription-token',
    CLAUDE_CODE_MESSAGING_TOKEN: 'secret',
    GITHUB_TOKEN: 'ghp_secret',
    AWS_SECRET_ACCESS_KEY: 'aws',
    CODEX_HOME: '/Users/me/.codex',
    CLAUDE_CONFIG_DIR: '/Users/me/.claude',
  };

  it('keeps only the allowlist plus the reviewer profile', () => {
    const env = buildWorkerEnv(parent, { name: 'CODEX_HOME', dir: '/Users/me/.codex-1' });
    assert.deepEqual(env, {
      HOME: '/Users/me',
      USER: 'me',
      LOGNAME: 'me',
      PATH: '/usr/bin:/bin',
      TMPDIR: '/tmp/x',
      LANG: 'en_GB.UTF-8',
      TERM: 'dumb',
      NO_COLOR: '1',
      CODEX_HOME: '/Users/me/.codex-1',
    });
  });

  it('drops an inherited profile variable when no profile is given', () => {
    const env = buildWorkerEnv(parent, null);
    assert.equal(env.CODEX_HOME, undefined);
    assert.equal(env.CLAUDE_CONFIG_DIR, undefined);
    assert.equal(env.ANTHROPIC_BASE_URL, undefined);
  });

  it('refuses to build an environment when an API key is present', () => {
    assert.throws(
      () => buildWorkerEnv({ ...parent, OPENAI_API_KEY: 'sk-live' }, { name: 'CODEX_HOME', dir: '/x' }),
      (error: unknown) => error instanceof ForbiddenEnvError && error.names.includes('OPENAI_API_KEY') && !error.message.includes('sk-live'),
    );
  });
});
