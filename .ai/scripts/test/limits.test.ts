import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectUsageLimit, wallTimeToInstant } from '../lib/limits.ts';

const NOW = new Date('2026-09-18T14:00:00Z');

describe('detectUsageLimit: Claude', () => {
  it('parses the real Claude Pro weekly-limit result', () => {
    const output = JSON.stringify({
      type: 'result',
      is_error: true,
      api_error_status: 429,
      result: "You've hit your weekly limit · resets Sep 19 at 5pm (Europe/London)",
      total_cost_usd: 0,
    });
    const limit = detectUsageLimit(output, NOW);
    assert.ok(limit);
    assert.equal(limit.resetAt?.toISOString(), '2026-09-19T16:00:00.000Z');
    assert.equal(limit.message, "You've hit your weekly limit · resets Sep 19 at 5pm (Europe/London)");
  });

  it('keeps only the limit sentence from a Codex error line', () => {
    const limit = detectUsageLimit("2026-09-18 ERROR codex: You've hit your usage limit. Try again at 3:04 PM.\nnext line", NOW);
    assert.equal(limit?.message, "You've hit your usage limit. Try again at 3:04 PM.");
  });

  it('parses the desktop-app wording with minutes', () => {
    const limit = detectUsageLimit('Weekly limit reached. Your weekly limit resets Sep 19 at 5:00 PM (Europe/London).', NOW);
    assert.equal(limit?.resetAt?.toISOString(), '2026-09-19T16:00:00.000Z');
  });

  it('rolls a time-only reset forward to the next occurrence', () => {
    const later = detectUsageLimit("You've hit your session limit · resets 5pm (Europe/London)", NOW);
    assert.equal(later?.resetAt?.toISOString(), '2026-09-18T16:00:00.000Z');
    const afterReset = detectUsageLimit("You've hit your session limit · resets 5pm (Europe/London)", new Date('2026-09-18T17:30:00Z'));
    assert.equal(afterReset?.resetAt?.toISOString(), '2026-09-19T16:00:00.000Z');
  });

  it('rolls a dated reset into next year across new year', () => {
    const limit = detectUsageLimit("You've hit your weekly limit · resets Jan 2 at 9am (UTC)", new Date('2026-12-31T12:00:00Z'));
    assert.equal(limit?.resetAt?.toISOString(), '2027-01-02T09:00:00.000Z');
  });

  it('handles both sides of the October clock change', () => {
    const before = detectUsageLimit("You've hit your weekly limit · resets Oct 24 at 1:30am (Europe/London)", NOW);
    assert.equal(before?.resetAt?.toISOString(), '2026-10-24T00:30:00.000Z');
    const after = detectUsageLimit("You've hit your weekly limit · resets Oct 26 at 1:30am (Europe/London)", NOW);
    assert.equal(after?.resetAt?.toISOString(), '2026-10-26T01:30:00.000Z');
  });

  it('treats 12am and 12pm correctly', () => {
    assert.equal(
      detectUsageLimit("You've hit your weekly limit · resets Sep 20 at 12am (UTC)", NOW)?.resetAt?.toISOString(),
      '2026-09-20T00:00:00.000Z',
    );
    assert.equal(
      detectUsageLimit("You've hit your weekly limit · resets Sep 20 at 12pm (UTC)", NOW)?.resetAt?.toISOString(),
      '2026-09-20T12:00:00.000Z',
    );
  });

  it('falls back to local time for an unknown zone', () => {
    const limit = detectUsageLimit("You've hit your weekly limit · resets Sep 19 at 5pm (Mars/Olympus)", NOW);
    assert.equal(limit?.resetAt?.getTime(), new Date(2026, 8, 19, 17, 0).getTime());
  });
});

describe('detectUsageLimit: Codex', () => {
  it('parses a dated try-again-at in local time', () => {
    const limit = detectUsageLimit(
      "ERROR: You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), or try again at Sep 20, 2026 3:04 PM.",
      NOW,
    );
    assert.equal(limit?.resetAt?.getTime(), new Date(2026, 8, 20, 15, 4).getTime());
  });

  it('parses the model-specific wording with a time only', () => {
    const now = new Date(2026, 8, 18, 10, 0);
    const limit = detectUsageLimit("You've hit your usage limit for gpt-6-astra. Switch to another model now, or try again at 3:04 PM.", now);
    assert.equal(limit?.resetAt?.getTime(), new Date(2026, 8, 18, 15, 4).getTime());
  });

  it('parses a relative try-again-in', () => {
    const limit = detectUsageLimit("You've hit your usage limit. Upgrade to Plus, or try again in 2 days 3 hours 5 minutes.", NOW);
    assert.equal(limit?.resetAt?.getTime(), NOW.getTime() + ((2 * 24 + 3) * 60 + 5) * 60_000);
  });

  it('detects a limit with no reset time', () => {
    const limit = detectUsageLimit("You've hit your usage limit. Upgrade to Plus to continue using Codex (https://chatgpt.com/explore/plus)", NOW);
    assert.ok(limit);
    assert.equal(limit.resetAt, null);
  });

  it('detects the structured error code', () => {
    const limit = detectUsageLimit('{"type":"error","codex_error_info":"usage_limit_reached"}', NOW);
    assert.ok(limit);
  });
});

describe('detectUsageLimit: not a usage limit', () => {
  for (const text of [
    'OK',
    'stream error: 429 Too Many Requests; retrying, try again in 1.5s',
    'Rate limit reached for requests. Please try again in 20s.',
    'The context limit was exceeded.',
    '',
  ]) {
    it(`ignores ${JSON.stringify(text)}`, () => {
      assert.equal(detectUsageLimit(text, NOW), null);
    });
  }

  it('does not echo control characters from the message', () => {
    const limit = detectUsageLimit("\u001b[31mYou've hit your usage limit.\u001b[0m\u202e", NOW);
    assert.equal(limit?.message, "You've hit your usage limit.");
  });
});

describe('wallTimeToInstant', () => {
  it('converts a zoned wall time', () => {
    assert.equal(new Date(wallTimeToInstant(2026, 0, 15, 9, 0, 'America/New_York')).toISOString(), '2026-01-15T14:00:00.000Z');
  });

  it('lands on the right side of a clock change behind UTC', () => {
    assert.equal(new Date(wallTimeToInstant(2026, 2, 8, 3, 30, 'America/New_York')).toISOString(), '2026-03-08T07:30:00.000Z');
  });
});
