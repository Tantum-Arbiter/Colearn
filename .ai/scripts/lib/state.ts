import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveInside, writeFileAtomic } from './fsx.ts';
import type { UsageLimit } from './limits.ts';

export const REVIEW_KINDS = ['browser_qa', 'test', 'security', 'architecture', 'final'] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const UNKNOWN_RESET_BACKOFF_MS = 60 * 60 * 1000;

const REVIEWER_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const RUN_ID = /^\d{8}T\d{6}Z-[0-9a-f]{6}$/;
const COMMIT = /^[0-9a-f]{40}$/;

export interface ReviewerLimit {
  limitedUntil: string;
  resetKnown: boolean;
  message: string;
  recordedAt: string;
}

export interface AvailabilityState {
  version: 1;
  reviewers: Record<string, ReviewerLimit>;
}

export type Availability =
  | { available: true }
  | { available: false; until: Date; resetKnown: boolean; message: string };

export type DeferredStatus = 'pending' | 'completed' | 'abandoned';

export interface DeferredReview {
  id: string;
  reviewer: string;
  reviewKind: ReviewKind;
  runId: string;
  headCommit: string;
  reason: string;
  queuedAt: string;
  status: DeferredStatus;
  settledAt: string | null;
}

export interface QueueState {
  version: 1;
  items: DeferredReview[];
}

export class StateFileError extends Error {
  constructor(path: string, problem: string) {
    super(`State file ${path} is invalid (${problem}). Move it aside and rerun; it will be recreated.`);
    this.name = 'StateFileError';
  }
}

const statePath = (dir: string, file: string): string => existsSync(dir) ? resolveInside(dir, file) : join(dir, file);
const availabilityPath = (dir: string): string => statePath(dir, 'availability.json');
const queuePath = (dir: string): string => statePath(dir, 'deferred-reviews.json');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, i) => key === expected[i]);
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new StateFileError(path, error instanceof Error ? error.message : 'unreadable');
  }
}

function assertReviewerId(reviewer: string): void {
  if (!REVIEWER_ID.test(reviewer)) {
    throw new Error(`Invalid reviewer id: ${JSON.stringify(reviewer)}`);
  }
}

export function loadAvailability(dir: string): AvailabilityState {
  const path = availabilityPath(dir);
  if (!existsSync(path)) {
    return { version: 1, reviewers: {} };
  }
  const raw = readJson(path);
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.reviewers) || !hasExactKeys(raw, ['version', 'reviewers'])) {
    throw new StateFileError(path, 'unexpected shape');
  }
  const reviewers: Record<string, ReviewerLimit> = {};
  for (const [id, entry] of Object.entries(raw.reviewers)) {
    if (
      !REVIEWER_ID.test(id) ||
      !isRecord(entry) ||
      !hasExactKeys(entry, ['limitedUntil', 'resetKnown', 'message', 'recordedAt']) ||
      !isIsoDate(entry.limitedUntil) ||
      typeof entry.resetKnown !== 'boolean' ||
      typeof entry.message !== 'string' ||
      !isIsoDate(entry.recordedAt)
    ) {
      throw new StateFileError(path, `bad entry for ${JSON.stringify(id)}`);
    }
    reviewers[id] = {
      limitedUntil: entry.limitedUntil,
      resetKnown: entry.resetKnown,
      message: entry.message,
      recordedAt: entry.recordedAt,
    };
  }
  return { version: 1, reviewers };
}

export function recordUsageLimit(dir: string, reviewer: string, limit: UsageLimit, now: Date): ReviewerLimit {
  assertReviewerId(reviewer);
  const state = loadAvailability(dir);
  const resetKnown = limit.resetAt !== null && limit.resetAt.getTime() > now.getTime();
  const until = resetKnown && limit.resetAt !== null ? limit.resetAt : new Date(now.getTime() + UNKNOWN_RESET_BACKOFF_MS);
  const entry: ReviewerLimit = {
    limitedUntil: until.toISOString(),
    resetKnown,
    message: limit.message.slice(0, 300),
    recordedAt: now.toISOString(),
  };
  state.reviewers[reviewer] = entry;
  writeFileAtomic(availabilityPath(dir), `${JSON.stringify(state, null, 2)}\n`);
  return entry;
}

export function clearUsageLimit(dir: string, reviewer: string): boolean {
  assertReviewerId(reviewer);
  const state = loadAvailability(dir);
  if (state.reviewers[reviewer] === undefined) {
    return false;
  }
  delete state.reviewers[reviewer];
  writeFileAtomic(availabilityPath(dir), `${JSON.stringify(state, null, 2)}\n`);
  return true;
}

export function reviewerAvailability(state: AvailabilityState, reviewer: string, now: Date): Availability {
  const entry = state.reviewers[reviewer];
  if (entry === undefined) {
    return { available: true };
  }
  const until = new Date(entry.limitedUntil);
  if (until.getTime() <= now.getTime()) {
    return { available: true };
  }
  return { available: false, until, resetKnown: entry.resetKnown, message: entry.message };
}

export function loadQueue(dir: string): QueueState {
  const path = queuePath(dir);
  if (!existsSync(path)) {
    return { version: 1, items: [] };
  }
  const raw = readJson(path);
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.items) || !hasExactKeys(raw, ['version', 'items'])) {
    throw new StateFileError(path, 'unexpected shape');
  }
  const items: DeferredReview[] = raw.items.map((item: unknown, index: number) => {
    if (
      !isRecord(item) ||
      !hasExactKeys(item, ['id', 'reviewer', 'reviewKind', 'runId', 'headCommit', 'reason', 'queuedAt', 'status', 'settledAt']) ||
      typeof item.id !== 'string' ||
      typeof item.reviewer !== 'string' ||
      !REVIEWER_ID.test(item.reviewer) ||
      !REVIEW_KINDS.includes(item.reviewKind as ReviewKind) ||
      typeof item.runId !== 'string' ||
      !RUN_ID.test(item.runId) ||
      typeof item.headCommit !== 'string' ||
      !COMMIT.test(item.headCommit) ||
      typeof item.reason !== 'string' ||
      !isIsoDate(item.queuedAt) ||
      !['pending', 'completed', 'abandoned'].includes(item.status as string) ||
      !(item.settledAt === null || isIsoDate(item.settledAt))
    ) {
      throw new StateFileError(path, `bad item at index ${index}`);
    }
    return {
      id: item.id,
      reviewer: item.reviewer,
      reviewKind: item.reviewKind as ReviewKind,
      runId: item.runId,
      headCommit: item.headCommit,
      reason: item.reason,
      queuedAt: item.queuedAt,
      status: item.status as DeferredStatus,
      settledAt: item.settledAt as string | null,
    };
  });
  return { version: 1, items };
}

function saveQueue(dir: string, queue: QueueState): void {
  writeFileAtomic(queuePath(dir), `${JSON.stringify(queue, null, 2)}\n`);
}

export interface DeferRequest {
  reviewer: string;
  reviewKind: ReviewKind;
  runId: string;
  headCommit: string;
  reason: string;
}

export function enqueueDeferred(dir: string, request: DeferRequest, now: Date): DeferredReview {
  assertReviewerId(request.reviewer);
  if (!REVIEW_KINDS.includes(request.reviewKind)) {
    throw new Error(`Invalid review kind: ${JSON.stringify(request.reviewKind)}`);
  }
  if (!RUN_ID.test(request.runId)) {
    throw new Error(`Invalid run id: ${JSON.stringify(request.runId)}`);
  }
  if (!COMMIT.test(request.headCommit)) {
    throw new Error(`Invalid commit: ${JSON.stringify(request.headCommit)}`);
  }
  const queue = loadQueue(dir);
  const id = `${request.runId}.${request.reviewer}.${request.reviewKind}`;
  const existing = queue.items.find((item) => item.id === id);
  if (existing !== undefined) {
    return existing;
  }
  const item: DeferredReview = {
    id,
    reviewer: request.reviewer,
    reviewKind: request.reviewKind,
    runId: request.runId,
    headCommit: request.headCommit,
    reason: request.reason.slice(0, 300),
    queuedAt: now.toISOString(),
    status: 'pending',
    settledAt: null,
  };
  queue.items.push(item);
  saveQueue(dir, queue);
  return item;
}

export function dueDeferred(queue: QueueState, availability: AvailabilityState, now: Date): DeferredReview[] {
  return queue.items
    .filter((item) => item.status === 'pending')
    .filter((item) => reviewerAvailability(availability, item.reviewer, now).available)
    .sort((a, b) => Date.parse(a.queuedAt) - Date.parse(b.queuedAt));
}

export function settleDeferred(dir: string, id: string, status: Exclude<DeferredStatus, 'pending'>, now: Date): DeferredReview {
  const queue = loadQueue(dir);
  const item = queue.items.find((candidate) => candidate.id === id);
  if (item === undefined) {
    throw new Error(`No deferred review with id ${JSON.stringify(id)}`);
  }
  if (item.status !== 'pending') {
    throw new Error(`Deferred review ${id} is already ${item.status}`);
  }
  item.status = status;
  item.settledAt = now.toISOString();
  saveQueue(dir, queue);
  return item;
}

export function pendingCounts(queue: QueueState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of queue.items) {
    if (item.status === 'pending') {
      counts[item.reviewer] = (counts[item.reviewer] ?? 0) + 1;
    }
  }
  return counts;
}
