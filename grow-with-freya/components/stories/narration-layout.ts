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

export const PHONE_READER = {
  width: 874,
  height: 402,
  insets: { top: 0, left: 62, right: 62, bottom: 21 },
} as const;

export function readerScale(width: number, height: number, isTablet: boolean): number {
  if (!isTablet) return 1;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  return Math.max(1, Math.min(long / PHONE_READER.width, short / PHONE_READER.height));
}

function betweenArrows(width: number, insets: NarrationInsets): number {
  return width - 2 * (Math.max(Math.max(insets.left, insets.right) + 20, width * 0.05) + NAV_BUTTON + 12);
}

const PHONE_CAPTION_WIDTH = betweenArrows(PHONE_READER.width, PHONE_READER.insets) * NARRATION_WIDTH_SHARE;

export function captionScale(width: number, height: number, insets: NarrationInsets, isTablet: boolean): number {
  if (!isTablet) return 1;
  return Math.min(readerScale(width, height, isTablet), betweenArrows(width, insets) / PHONE_CAPTION_WIDTH);
}

export function narrationLayout(width: number, height: number, insets: NarrationInsets, isTablet: boolean = false): NarrationLayout {
  const boxWidth = isTablet
    ? PHONE_CAPTION_WIDTH * captionScale(width, height, insets, isTablet)
    : betweenArrows(width, insets) * NARRATION_WIDTH_SHARE;
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
