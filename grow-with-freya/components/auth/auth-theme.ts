import { useMemo } from 'react';
import { Dimensions, useWindowDimensions } from 'react-native';

import { TABLET_CONTENT_MAX_WIDTH } from '@/hooks/use-accessibility';
import { SKY_GRADIENT_QUIET } from '@/constants/night-palette';

const { width, height } = Dimensions.get('window');

export const IS_TABLET = width >= 768;

/** Night sky behind every auth screen. */
export const AUTH_GRADIENT = SKY_GRADIENT_QUIET;

export const CREAM = '#F6E7C8';
export const INK = '#1B2050';
export const PANEL_BG = 'rgba(12, 17, 48, 0.55)';
export const PANEL_BORDER = 'rgba(160, 178, 232, 0.28)';

/**
 * The storybook card: a rounded panel inset from the device edges that holds
 * the whole of an auth screen.
 */
export const CARD_INSET = IS_TABLET ? 40 : 16;
export const CARD_PADDING = IS_TABLET ? 40 : 22;
export const CARD_V_PADDING = IS_TABLET ? 32 : height < 700 ? 12 : 18;
export const CARD_RADIUS = 34;

/**
 * How wide the card's contents are allowed to get.
 *
 * The card used to be whatever the screen was minus its inset, which on a
 * tablet made the sign-in buttons 674pt of pill -- a phone layout stretched
 * rather than a tablet one. Capping to the column the rest of the app uses
 * keeps the stack the size it is meant to be and centres it.
 */
export const CONTENT_MAX_WIDTH = TABLET_CONTENT_MAX_WIDTH;

/**
 * Card and content widths for a given screen width.
 *
 * A plain function of the width so it can be reasoned about and tested on its
 * own. The vertical paddings stay static: they key off IS_TABLET, and a
 * tablet stays a tablet whichever way it is turned.
 */
/**
 * Tallest the card gets once its width is capped.
 *
 * The card lays out with `space-between`, so on a tall tablet the spare
 * height is dealt out as gaps and the blocks drift apart. Capping the height
 * keeps it a panel. It is well clear of what the content actually needs, so
 * nothing is squeezed or clipped -- it only takes back the stretch.
 */
const CARD_MAX_HEIGHT = 1000;

/** Rhythm between a compact card's blocks, in place of stretched-out space. */
export const CARD_BLOCK_GAP = 24;

export interface AuthLayout {
  cardWidth: number;
  contentWidth: number;
  /** Undefined on a phone, where the card is meant to fill the screen. */
  cardMaxHeight: number | undefined;
  /** True once the width cap has bitten -- i.e. this is a tablet. */
  isCapped: boolean;
}

export function authLayoutFor(screenWidth: number): AuthLayout {
  const available = screenWidth - (CARD_INSET + CARD_PADDING) * 2;
  const contentWidth = Math.min(available, CONTENT_MAX_WIDTH);
  const isCapped = contentWidth < available;

  return {
    contentWidth,
    cardWidth: contentWidth + CARD_PADDING * 2,
    cardMaxHeight: isCapped ? CARD_MAX_HEIGHT : undefined,
    isCapped,
  };
}

/** The live card sizes, so a rotating tablet re-lays-out. */
export function useAuthLayout(): AuthLayout {
  const { width: screenWidth } = useWindowDimensions();

  return useMemo(() => authLayoutFor(screenWidth), [screenWidth]);
}

/** Static fallback for styles that cannot read the hook. Capped the same way. */
export const CONTENT_WIDTH = authLayoutFor(width).contentWidth;

export const STAR_COUNT = 34;
const STAR_SIZE = 3;

export interface AuthStar {
  id: number;
  left: number;
  top: number;
  size: number;
  opacity: number;
}

/**
 * Deterministic starfield -- seeded so the sky doesn't reshuffle when a screen
 * re-renders or when the guest overlay slides over the login screen.
 */
export function generateStars(count: number = STAR_COUNT, seedOffset = 0): AuthStar[] {
  const seededRandom = (seed: number) => {
    const x = Math.sin((seed + seedOffset) * 9999) * 10000;
    return x - Math.floor(x);
  };

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: seededRandom(i * 1.3) * (width - 20) + 10,
    top: seededRandom(i * 2.7) * height + 20,
    size: seededRandom(i * 5.1) > 0.78 ? STAR_SIZE + 1 : STAR_SIZE - 1,
    opacity: 0.3 + seededRandom(i * 3.5) * 0.5,
  }));
}
