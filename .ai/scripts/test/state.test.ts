import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  clearUsageLimit,
  dueDeferred,
  enqueueDeferred,
  loadAvailability,
  loadQueue,
  pendingCounts,
  recordUsageLimit,
  reviewerAvailability,
  settleDeferred,
  StateFileError,
  UNKNOWN_RESET_BACKOFF_MS,
} from '../lib/state.ts';

const NOW = new Date('2026-09-18T14:00:00Z');
const RUN = '20260918T140000Z-abc123';
const COMMIT = 'df3c9652f2b0cb5bcb38be1cedd2f6286da86212';

describe('reviewer availability', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ai-state-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('is available when nothing is recorded', () => {
    assert.deepEqual(reviewerAvailability(loadAvailability(dir), 'claude-pro', NOW), { available: true });
  });

  it('is unavailable until the reported reset, then available again', () => {
    const reset = new Date('2026-09-19T16:00:00Z');
    recordUsageLimit(dir, 'claude-pro', { resetAt: reset, message: "You've hit your weekly limit" }, NOW);
    const during = reviewerAvailability(loadAvailability(dir), 'claude-pro', new Date('2026-09-19T15:59:59Z'));
    assert.equal(during.available, false);
    assert.equal(!during.available && during.until.toISOString(), reset.toISOString());
    assert.equal(!during.available && during.resetKnown, true);
    assert.deepEqual(reviewerAvailability(loadAvailability(dir), 'claude-pro', reset), { available: true });
    assert.deepEqual(reviewerAvailability(loadAvailability(dir), 'codex-1', NOW), { available: true });
  });

  it('backs off for an hour when the reset time is unknown or already past', () => {
    for (const resetAt of [null, new Date(NOW.getTime() - 1000)]) {
      const entry = recordUsageLimit(dir, 'codex-1', { resetAt, message: 'limit' }, NOW);
      assert.equal(entry.resetKnown, false);
      assert.equal(Date.parse(entry.limitedUntil), NOW.getTime() + UNKNOWN_RESET_BACKOFF_MS);
    }
  });

  it('clears a recorded limit', () => {
    recordUsageLimit(dir, 'codex-2', { resetAt: null, message: 'limit' }, NOW);
    assert.equal(clearUsageLimit(dir, 'codex-2'), true);
    assert.equal(clearUsageLimit(dir, 'codex-2'), false);
    assert.deepEqual(reviewerAvailability(loadAvailability(dir), 'codex-2', NOW), { available: true });
  });

  it('writes private files and leaves no temp files behind', () => {
    recordUsageLimit(dir, 'claude-pro', { resetAt: null, message: 'limit' }, NOW);
    assert.deepEqual(readdirSync(dir), ['availability.json']);
    assert.equal(statSync(join(dir, 'availability.json')).mode & 0o077, 0);
  });

  it('rejects a reviewer id that could escape a path', () => {
    assert.throws(() => recordUsageLimit(dir, '../x', { resetAt: null, message: 'm' }, NOW));
  });

  it('refuses a corrupt or tampered state file instead of resetting it', () => {
    writeFileSync(join(dir, 'availability.json'), '{not json');
    assert.throws(() => loadAvailability(dir), StateFileError);
    writeFileSync(join(dir, 'availability.json'), JSON.stringify({ version: 1, reviewers: {}, extra: true }));
    assert.throws(() => loadAvailability(dir), StateFileError);
  });
});

describe('deferred review queue', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'ai-queue-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const request = { reviewer: 'claude-pro', reviewKind: 'browser_qa' as const, runId: RUN, headCommit: COMMIT, reason: 'weekly limit' };

  it('queues once per run, reviewer and kind', () => {
    const first = enqueueDeferred(dir, request, NOW);
    const second = enqueueDeferred(dir, request, new Date(NOW.getTime() + 1000));
    assert.equal(first.id, second.id);
    assert.equal(loadQueue(dir).items.length, 1);
    assert.deepEqual(pendingCounts(loadQueue(dir)), { 'claude-pro': 1 });
  });

  it('holds reviews until the reviewer is available, oldest first', () => {
    recordUsageLimit(dir, 'claude-pro', { resetAt: new Date('2026-09-19T16:00:00Z'), message: 'limit' }, NOW);
    enqueueDeferred(dir, request, NOW);
    enqueueDeferred(dir, { ...request, reviewKind: 'test', runId: '20260918T130000Z-000000' }, new Date(NOW.getTime() - 60_000));
    assert.deepEqual(dueDeferred(loadQueue(dir), loadAvailability(dir), NOW), []);
    const due = dueDeferred(loadQueue(dir), loadAvailability(dir), new Date('2026-09-19T16:00:00Z'));
    assert.deepEqual(
      due.map((item) => item.reviewKind),
      ['test', 'browser_qa'],
    );
  });

  it('settles a review once', () => {
    const item = enqueueDeferred(dir, request, NOW);
    const done = settleDeferred(dir, item.id, 'completed', NOW);
    assert.equal(done.status, 'completed');
    assert.equal(done.settledAt, NOW.toISOString());
    assert.deepEqual(pendingCounts(loadQueue(dir)), {});
    assert.throws(() => settleDeferred(dir, item.id, 'abandoned', NOW));
    assert.throws(() => settleDeferred(dir, 'missing', 'completed', NOW));
  });

  it('validates what it queues', () => {
    assert.throws(() => enqueueDeferred(dir, { ...request, runId: 'rm -rf' }, NOW));
    assert.throws(() => enqueueDeferred(dir, { ...request, headCommit: 'HEAD' }, NOW));
    assert.throws(() => enqueueDeferred(dir, { ...request, reviewKind: 'deploy' as never }, NOW));
    assert.throws(() => enqueueDeferred(dir, { ...request, reviewer: 'Codex 1' }, NOW));
  });

  it('refuses a tampered queue file', () => {
    writeFileSync(
      join(dir, 'deferred-reviews.json'),
      JSON.stringify({ version: 1, items: [{ id: 'x', reviewer: 'codex-1', reviewKind: 'test', runId: RUN, headCommit: 'HEAD', reason: '', queuedAt: NOW.toISOString(), status: 'pending', settledAt: null }] }),
    );
    assert.throws(() => loadQueue(dir), StateFileError);
  });
});
