import type { ScreenFrame } from '@/components/experience/engines/place/place-geometry';
import { patchFrame } from '@/components/stories/page-frame';
import type { ChallengeHotspot } from '@/types/story';

export type SceneMode = 'count' | 'every' | 'find';

export type SceneEvent =
  | { type: 'first-action-shown' }
  | { type: 'counted'; id: string; count: number }
  | { type: 'repair'; id: string }
  | { type: 'complete'; choice: string };

export const MIN_SPOT = 56;

export function sceneMode(adapter: string): SceneMode {
  if (adapter === 'multi_tap_count') return 'count';
  if (adapter === 'difference_find') return 'every';
  return 'find';
}

export function spotFrame(hotspot: ChallengeHotspot, art: ScreenFrame): ScreenFrame {
  const drawn = patchFrame(hotspot, art);
  const width = Math.max(drawn.width, MIN_SPOT);
  const height = Math.max(drawn.height, MIN_SPOT);
  return {
    left: drawn.left + (drawn.width - width) / 2,
    top: drawn.top + (drawn.height - height) / 2,
    width,
    height,
  };
}

export interface SceneTapResult {
  found: string[];
  event: Exclude<SceneEvent, { type: 'first-action-shown' }> | null;
}

export function sceneTap(mode: SceneMode, ids: readonly string[], target: string, found: readonly string[], id: string): SceneTapResult {
  if (!ids.includes(id)) return { found: [...found], event: null };
  if (mode === 'find') {
    if (target !== '' && id !== target) return { found: [...found], event: { type: 'repair', id } };
    return { found: [id], event: { type: 'complete', choice: id } };
  }
  if (found.includes(id)) return { found: [...found], event: { type: 'repair', id } };
  const next = [...found, id];
  if (ids.every((each) => next.includes(each))) return { found: next, event: { type: 'complete', choice: '' } };
  return { found: next, event: { type: 'counted', id, count: next.length } };
}
