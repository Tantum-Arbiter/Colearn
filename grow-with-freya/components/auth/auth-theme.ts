import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const IS_TABLET = width >= 768;

/** Night sky behind every auth screen. */
export const AUTH_GRADIENT: [string, string, string] = ['#080A28', '#0A0F2C', '#161B4A'];

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
export const CONTENT_WIDTH = width - (CARD_INSET + CARD_PADDING) * 2;

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
