import { SPACE_2, SPACE_3, SPACE_6 } from '@/components/child-ui/tokens';

export const CATALOGUE_CHOOSER = {
  clearance: SPACE_2,
  fade: SPACE_3,
  headingFade: SPACE_6,
} as const;

export interface ChooserStopInput {
  rest: number;
  rowBottom: number;
  wordsBottom: number;
  themeBarTop: number;
}

export interface ChooserStop {
  rest: number;
  stop: number;
  travel: number;
}

export interface ChooserRange {
  inputRange: [number, number];
  outputRange: [number, number];
}

export function chooserStop({ rest, rowBottom, wordsBottom, themeBarTop }: ChooserStopInput): ChooserStop {
  const reached = Math.max(
    rowBottom + CATALOGUE_CHOOSER.clearance,
    wordsBottom + CATALOGUE_CHOOSER.clearance - themeBarTop
  );
  const stop = Number.isFinite(reached) ? Math.min(reached, rest) : rest;

  return { rest, stop, travel: rest - stop };
}

export function chooserLift({ rest, stop, travel }: ChooserStop): ChooserRange {
  return { inputRange: [0, travel], outputRange: [rest, stop] };
}

export function chooserBandFade({ travel }: ChooserStop): ChooserRange {
  return { inputRange: [travel, travel + CATALOGUE_CHOOSER.fade], outputRange: [0, 1] };
}

export function chooserHeadingFade({ travel }: ChooserStop): ChooserRange {
  return { inputRange: [travel - CATALOGUE_CHOOSER.headingFade, travel], outputRange: [1, 0] };
}
