import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { TABLET_CONTENT_MAX_WIDTH } from '@/hooks/use-accessibility';

/**
 * How wide onboarding lets itself lay out.
 *
 * Every hero and grid on these pages is sized as a ratio of the page's own
 * width. On a phone that is simply the screen. On a tablet it cannot be: the
 * together hero is 941/900 of the width, so on an 834pt-wide iPad it becomes
 * 872pt tall against 420pt on a phone -- more than twice the height, on a
 * screen only a third taller. The spacer that reserves room for it grows with
 * it, and the chips underneath end up behind the footer.
 *
 * Capping the layout width fixes all of them at once, and matches the column
 * the rest of the app already constrains itself to on tablets.
 */
export const ONBOARDING_MAX_WIDTH = TABLET_CONTENT_MAX_WIDTH;

/** The shell's own horizontal padding, which the chip row has to allow for. */
export const ONBOARDING_H_PADDING = 24;

const CHIP_GAP = 10;

// each hero is sized to its own artwork's aspect so the full scene shows with
// no crop: together is 900x941, ready is 900x600, and the safety constellation
// is a cut-out shown at a fixed fraction of the width
const TOGETHER_ART_RATIO = 941 / 900;
const READY_ART_RATIO = 600 / 900;
const SAFE_ART_RATIO = 0.62;

// how far down the page each hero starts, so the headline has clear sky above
export const TOGETHER_BACKDROP_TOP = 128;
export const READY_BACKDROP_TOP = 150;
export const SAFE_BACKDROP_TOP = 160;

// how far the content below each hero rides up over its base
const TOGETHER_OVERLAP = 246;
const READY_OVERLAP = 246;
// the safety cut-out has transparent margin around the constellation, so its
// spacer reaches into the box rather than clearing it
const SAFE_OVERLAP = 197;

/** Corner the heroes take once they no longer reach the screen's edges. */
export const ONBOARDING_HERO_RADIUS = 28;

export interface OnboardingMetrics {
  /** Width the page lays out to: the screen on a phone, capped on a tablet. */
  layoutWidth: number;
  /** True when the cap bit -- the heroes no longer bleed off the screen, so
   *  they need a corner and cannot rely on their edges running off it. */
  isCapped: boolean;
  chipSize: number;
  togetherBackdropHeight: number;
  togetherSpacerHeight: number;
  readyBackdropHeight: number;
  readySpacerHeight: number;
  safeBackdropHeight: number;
  safeSpacerHeight: number;
}

/**
 * Every onboarding size that depends on how wide the page is, worked out for
 * a given screen width.
 *
 * Kept as a plain function of the width so the sizing can be reasoned about
 * and tested on its own, without a renderer or a mocked dimensions source.
 */
export function onboardingMetricsFor(width: number): OnboardingMetrics {
  const layoutWidth = Math.min(width, ONBOARDING_MAX_WIDTH);

  const togetherBackdropHeight = Math.round(layoutWidth * TOGETHER_ART_RATIO);
  const readyBackdropHeight = Math.round(layoutWidth * READY_ART_RATIO);
  const safeBackdropHeight = Math.round(layoutWidth * SAFE_ART_RATIO);

  return {
    layoutWidth,
    isCapped: layoutWidth < width,
    chipSize: Math.floor((layoutWidth - ONBOARDING_H_PADDING * 2 - CHIP_GAP * 2) / 3),
    togetherBackdropHeight,
    togetherSpacerHeight:
      togetherBackdropHeight + TOGETHER_BACKDROP_TOP - TOGETHER_OVERLAP,
    readyBackdropHeight,
    readySpacerHeight: readyBackdropHeight + READY_BACKDROP_TOP - READY_OVERLAP,
    safeBackdropHeight,
    safeSpacerHeight: safeBackdropHeight + SAFE_BACKDROP_TOP - SAFE_OVERLAP,
  };
}

/**
 * The onboarding sizes for the current screen.
 *
 * Read from `useWindowDimensions` rather than a module-level
 * `Dimensions.get`, so a tablet rotating mid-flow re-lays-out instead of
 * keeping the sizes it happened to import with. Phones are portrait-locked
 * and see no change either way.
 */
export function useOnboardingMetrics(): OnboardingMetrics {
  const { width } = useWindowDimensions();

  return useMemo(() => onboardingMetricsFor(width), [width]);
}
