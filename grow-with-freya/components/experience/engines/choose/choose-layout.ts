import { SPACE_3 } from '@/components/child-ui/tokens';
import type { ScreenFrame } from '@/components/experience/engines/place/place-geometry';

export const SAFE_ZONE = { left: 0.28, right: 0.72, top: 0.23, bottom: 0.6 } as const;

export const CARD_GAP = SPACE_3;

export type ChooseOutcome = 'complete' | 'repair';

export interface TrayBounds {
  top?: number;
  bottom?: number;
}

export interface ArtFrame {
  left?: number;
  top?: number;
  width: number;
  height: number;
}

export function trayFrame(art: ArtFrame, bounds: TrayBounds = {}): ScreenFrame {
  const artLeft = art.left ?? 0;
  const artTop = art.top ?? 0;
  const top = Math.max(artTop + art.height * SAFE_ZONE.top, bounds.top ?? 0);
  const bottom = Math.max(top, bounds.bottom ?? artTop + art.height * SAFE_ZONE.bottom);
  return {
    left: artLeft + art.width * SAFE_ZONE.left,
    top,
    width: art.width * (SAFE_ZONE.right - SAFE_ZONE.left),
    height: bottom - top,
  };
}

export function cardFrames(count: number, tray: ScreenFrame, gap: number = CARD_GAP): ScreenFrame[] {
  if (count <= 0) return [];
  const side = Math.min(tray.height, (tray.width - gap * (count - 1)) / count);
  const rowWidth = side * count + gap * (count - 1);
  const left = tray.left + (tray.width - rowWidth) / 2;
  const top = tray.top + (tray.height - side) / 2;
  return Array.from({ length: count }, (_, index) => ({ left: left + index * (side + gap), top, width: side, height: side }));
}

export function chooseOutcome(target: string, choice: string): ChooseOutcome {
  return target === '' || target === choice ? 'complete' : 'repair';
}
