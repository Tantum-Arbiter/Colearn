import type { ScreenFrame } from '@/components/experience/engines/place/place-geometry';
import type { ChallengeStateAfter, LearningChallenge } from '@/types/story';

export const MASTER_ASPECT = 4 / 3;
export const FOCUS_MARGIN = 24;

const EMPTY: ScreenFrame = { left: 0, top: 0, width: 0, height: 0 };

export function coverFrame(screen: { width: number; height: number }, aspect: number = MASTER_ASPECT): ScreenFrame {
  if (!(screen.width > 0) || !(screen.height > 0) || !(aspect > 0)) return EMPTY;
  const height = Math.max(screen.width / aspect, screen.height);
  const width = height * aspect;
  return { left: (screen.width - width) / 2, top: (screen.height - height) / 2, width, height };
}

export function patchFrame(patch: Pick<ChallengeStateAfter, 'position' | 'size'>, frame: ScreenFrame): ScreenFrame {
  return {
    left: frame.left + patch.position.x * frame.width,
    top: frame.top + patch.position.y * frame.height,
    width: patch.size.width * frame.width,
    height: patch.size.height * frame.height,
  };
}

export function coversMaster(patch: Pick<ChallengeStateAfter, 'position' | 'size'>): boolean {
  return patch.position.x === 0 && patch.position.y === 0 && patch.size.width === 1 && patch.size.height === 1;
}

export interface ArtFocus {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function challengeFocus(challenge: LearningChallenge | undefined): ArtFocus | null {
  if (!challenge) return null;
  const shown = new Set(Object.values(challenge.byAge ?? {}).flatMap((band) => band?.items ?? []));
  return (challenge.items ?? []).reduce<ArtFocus | null>((focus, item) => {
    if (!item.hotspot || !shown.has(item.id)) return focus;
    const { position, size } = item.hotspot;
    return {
      left: Math.min(focus?.left ?? 1, position.x),
      top: Math.min(focus?.top ?? 1, position.y),
      right: Math.max(focus?.right ?? 0, position.x + size.width),
      bottom: Math.max(focus?.bottom ?? 0, position.y + size.height),
    };
  }, null);
}

function settle(start: number, length: number, view: number, from: number, to: number): number {
  const least = view - length;
  if (least >= 0) return start;
  const low = Math.max(least, FOCUS_MARGIN - from * length);
  const high = Math.min(0, view - FOCUS_MARGIN - to * length);
  if (low > high) return Math.min(0, Math.max(least, view / 2 - ((from + to) / 2) * length));
  return Math.min(high, Math.max(low, start));
}

export function focusFrame(screen: { width: number; height: number }, focus: ArtFocus | null, aspect: number = MASTER_ASPECT): ScreenFrame {
  const frame = coverFrame(screen, aspect);
  if (!focus) return frame;
  return {
    ...frame,
    left: settle(frame.left, frame.width, screen.width, focus.left, focus.right),
    top: settle(frame.top, frame.height, screen.height, focus.top, focus.bottom),
  };
}

export function containFrame(screen: { width: number; height: number }, aspect: number = MASTER_ASPECT): ScreenFrame {
  if (!(screen.width > 0) || !(screen.height > 0) || !(aspect > 0)) return EMPTY;
  const width = Math.min(screen.width, screen.height * aspect);
  const height = width / aspect;
  return { left: (screen.width - width) / 2, top: (screen.height - height) / 2, width, height };
}

export function readerArtFrame(screen: { width: number; height: number }, focus: ArtFocus | null, isTablet: boolean): ScreenFrame {
  if (isTablet && screen.height > screen.width) return containFrame(screen);
  return focusFrame(screen, focus);
}

