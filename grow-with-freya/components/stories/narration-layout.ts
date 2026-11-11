import type { ViewStyle } from 'react-native';

export interface NarrationInsets {
  left: number;
  right: number;
  bottom: number;
}

/** The reader's page-turn arrows, which sit in the bottom corners in landscape. */
export const NAV_BUTTON = 50;

export const NARRATION_WIDTH_SHARE = 0.85;

export function readerEdge(inset: number): number {
  return Math.max(20, Math.round(inset * 0.45));
}

type NarrationLayout = ViewStyle & { left: number; right: number; width: number; top?: number; bottom: number; maxWidth: number; maxHeight: number };

export function narrationLayout(width: number, height: number, insets: NarrationInsets): NarrationLayout {
  const between = width - 2 * (Math.max(Math.max(insets.left, insets.right) + 20, width * 0.05) + NAV_BUTTON + 12);
  const boxWidth = between * NARRATION_WIDTH_SHARE;
  const side = (width - boxWidth) / 2;
  return {
    position: 'absolute',
    left: side,
    right: side,
    width: boxWidth,
    maxWidth: boxWidth,
    bottom: Math.max(insets.bottom, 12),
    maxHeight: height * 0.34,
    marginHorizontal: 0,
    flex: 0,
    justifyContent: 'flex-end',
  };
}
