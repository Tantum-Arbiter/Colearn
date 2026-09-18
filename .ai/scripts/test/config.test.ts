import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { ConfigError, parseConfig } from '../lib/config.ts';

const HOME = '/Users/tester';
const shipped: Record<string, unknown> = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'config', 'reviewers.json'), 'utf8'),
);

function withReviewers(reviewers: unknown): Record<string, unknown> {
  return { ...shipped, reviewers };
}

const pro = { id: 'claude-pro', label: 'Claude Pro', kind: 'claude', profile_dir: '~/.claude-pro', expected_plan: 'pro' };
const c1 = { id: 'codex-1', label: 'Codex 1', kind: 'codex', profile_dir: '~/.codex-1', expected_plan: null };

describe('parseConfig', () => {
  it('accepts the shipped config and expands ~', () => {
    const config = parseConfig(shipped, HOME);
    assert.deepEqual(
      config.reviewers.map((r) => [r.id, r.profileDir]),
      [
        ['claude-pro', '/Users/tester/.claude-pro'],
        ['codex-1', '/Users/tester/.codex-1'],
        ['codex-2', '/Users/tester/.codex-2'],
      ],
    );
    assert.equal(config.lead.profileDir, '/Users/tester/.claude');
    assert.equal(config.pins.codex, '0.154.0');
  });

  it('refuses a reviewer on a default profile', () => {
    assert.throws(() => parseConfig(withReviewers([{ ...pro, profile_dir: '~/.claude' }]), HOME), /default profile/);
    assert.throws(() => parseConfig(withReviewers([{ ...c1, profile_dir: '~/.codex/' }]), HOME), /default profile/);
  });

  it('refuses two reviewers sharing a profile', () => {
    assert.throws(() => parseConfig(withReviewers([c1, { ...c1, id: 'codex-2' }]), HOME), /shared/);
  });

  it('refuses paths outside home or not starting with ~/', () => {
    assert.throws(() => parseConfig(withReviewers([{ ...c1, profile_dir: '~/../other/.codex-1' }]), HOME), /inside the home/);
    assert.throws(() => parseConfig(withReviewers([{ ...c1, profile_dir: '/etc/codex' }]), HOME), /must start with ~\//);
    assert.throws(() => parseConfig(withReviewers([{ ...c1, profile_dir: '~' }]), HOME), /inside the home/);
  });

  it('refuses unknown keys, bad ids and unpinned versions', () => {
    assert.throws(() => parseConfig(withReviewers([{ ...c1, api_key: 'x' }]), HOME), ConfigError);
    assert.throws(() => parseConfig(withReviewers([{ ...c1, id: 'Codex One' }]), HOME), ConfigError);
    assert.throws(() => parseConfig(withReviewers([{ ...c1, kind: 'gemini' }]), HOME), ConfigError);
    assert.throws(() => parseConfig({ ...shipped, pins: { codex: 'latest' } }, HOME), /exact version/);
    assert.throws(() => parseConfig(withReviewers([]), HOME), ConfigError);
  });
});
