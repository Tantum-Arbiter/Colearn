import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { resolveInside } from './fsx.ts';

export const phases = ['lead', 'browser_qa', 'test', 'security', 'final', 'verify'] as const;
export type Phase = typeof phases[number];
export const eventKinds = ['started', 'progress', 'completed', 'failed', 'authentication_required', 'timed_out', 'skipped_usage_limit', 'deferred', 'resumed', 'interrupted'] as const;
export type EventKind = typeof eventKinds[number];
export interface OfficeEvent {
  version: 1; timestamp: string; run_id: string; worker: string;
  event: EventKind; phase: Phase; activity: 'reviewing' | 'reading' | 'testing' | 'waiting';
  duration_ms: number | null; available_at: string | null;
}

// This is deliberately an allowlist. No worker output, paths, task text or reports
// enter the office feed. Disk append and replay use the same validator.
export function parseOfficeEvent(raw: unknown): OfficeEvent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid office event');
  const v = raw as Record<string, unknown>;
  const keys = ['version', 'timestamp', 'run_id', 'worker', 'event', 'phase', 'activity', 'duration_ms', 'available_at'];
  if (Object.keys(v).length !== keys.length || Object.keys(v).some(k => !keys.includes(k)) ||
      v.version !== 1 || !isTimestamp(v.timestamp) ||
      typeof v.run_id !== 'string' || !/^\d{8}T\d{6}Z-[0-9a-f]{6}$/.test(v.run_id) ||
      typeof v.worker !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(v.worker) ||
      !eventKinds.includes(v.event as EventKind) || !phases.includes(v.phase as Phase) ||
      !['reviewing', 'reading', 'testing', 'waiting'].includes(v.activity as string) ||
      !(v.duration_ms === null || Number.isSafeInteger(v.duration_ms) && Number(v.duration_ms) >= 0) ||
      !(v.available_at === null || isTimestamp(v.available_at))) {
    throw new Error('Invalid office event');
  }
  return v as unknown as OfficeEvent;
}

function isTimestamp(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value));
}

export function emitEvent(stateDir: string, event: OfficeEvent): void {
  appendFileSync(resolveInside(stateDir, 'events.jsonl'), JSON.stringify(parseOfficeEvent(event)) + '\n', { mode: 0o600 });
}

export function readEvents(stateDir: string): OfficeEvent[] {
  const path = resolveInside(stateDir, 'events.jsonl');
  if (!existsSync(path)) return [];
  if (statSync(path).size > 32 * 1024 * 1024) throw new Error('Event log exceeds 32 MB; archive it while dispatchers are stopped');
  const lines = readFileSync(path, 'utf8').split('\n');
  // Ignore only an incomplete final append; reject corrupt complete records.
  lines.pop();
  return lines.filter(Boolean).map(line => parseOfficeEvent(JSON.parse(line)));
}
