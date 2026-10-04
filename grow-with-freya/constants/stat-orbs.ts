export type StatOrbKind = 'streak' | 'continue' | 'badges';

export const STAT_ORB_ORDER: readonly StatOrbKind[] = ['streak', 'continue', 'badges'];

export const STAT_ORB = {
  artScale: 1.3,
  perContentWidth: 4.4,
  smallest: 72,
  largest: 112,
  gap: 0.26,
  headroom: 0.02,
  footroom: 0.02,
  words: { top: 0.5 },
  number: { size: 0.25, width: 0.7 },
  label: { size: 0.17, width: 0.9, tuck: 0.09 },
  invite: { size: 0.17, width: 0.9, top: 0.5 },
  caption: { top: 0.69 },
  bookmark: { width: 0.36, aspect: 1.25, top: 0.15, inviting: { width: 0.28, top: 0.12 } },
  cover: { size: 0.92, centre: 0.5 },
  restingOpacity: 0.55,
  float: { rise: 0.028, scale: 1.03, ms: 3600, staggerMs: 450 },
} as const;

export const STAT_ORB_TINTS = {
  ink: '#FFFFFF',
  bookmark: ['#FFE58F', '#EFA92A'],
  bookmarkEdge: '#C9821B',
  bookmarkShine: 'rgba(255, 255, 255, 0.45)',
  bookmarkStar: '#EF6B2C',
  bookmarkShadow: 'rgba(20, 10, 60, 0.35)',
  shade: 'rgba(3, 10, 40, 0.95)',
  coverShade: ['rgba(4, 14, 60, 0)', 'rgba(4, 14, 60, 0.7)'],
} as const;

export function statOrbDiameter(contentWidth: number): number {
  const fitted = Math.round(contentWidth / STAT_ORB.perContentWidth);
  if (!(fitted > STAT_ORB.smallest)) return STAT_ORB.smallest;

  return Math.min(fitted, STAT_ORB.largest);
}

export function statOrbRowWidth(diameter: number, count: number): number {
  return diameter * count + diameter * STAT_ORB.gap * (count - 1);
}

export function statOrbRowHeight(diameter: number): number {
  return diameter * (1 + STAT_ORB.headroom + STAT_ORB.footroom);
}

export function statOrbFloatDelay(index: number): number {
  return index * STAT_ORB.float.staggerMs;
}
