import type { OrchestratorConfig } from './config.ts';
import { formatWhen } from './doctor.ts';
import { loadAvailability, loadQueue, pendingCounts, reviewerAvailability } from './state.ts';
import { safeDisplay } from './text.ts';

export function renderStatus(config: OrchestratorConfig, stateDir: string, now: Date): string {
  const availability = loadAvailability(stateDir);
  const queue = loadQueue(stateDir);
  const pending = pendingCounts(queue);
  const width = Math.max(...config.reviewers.map((r) => r.label.length));

  const lines = ['Reviewers'];
  for (const reviewer of config.reviewers) {
    const state = reviewerAvailability(availability, reviewer.id, now);
    const queued = pending[reviewer.id] ?? 0;
    const queuedText = queued > 0 ? `, ${queued} queued` : '';
    const text = state.available
      ? `available${queuedText}`
      : `${state.resetKnown ? 'limited until' : 'limited, retry after'} ${formatWhen(state.until)}${queuedText} — ${safeDisplay(state.message, 160)}`;
    lines.push(`  ${reviewer.label.padEnd(width)}  ${text}`);
  }

  const waiting = queue.items.filter((item) => item.status === 'pending');
  lines.push('', waiting.length === 0 ? 'Deferred reviews: none' : `Deferred reviews: ${waiting.length}`);
  for (const item of waiting) {
    lines.push(`  ${item.runId}  ${item.reviewer}  ${item.reviewKind}  queued ${formatWhen(new Date(item.queuedAt))}`);
  }
  return lines.join('\n');
}
