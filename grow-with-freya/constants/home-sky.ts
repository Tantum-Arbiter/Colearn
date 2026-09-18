import type { TimeOfDay } from '@/constants/home-scene';

export const HERO_SKY = {
  sunTopInset: 8,
  sunSizeRatio: 0.24,
  welcomeGap: 10,
  welcomeBlock: 84,
  cardBridge: 130,
  haloRatio: 2.6,
  twinkleMinMs: 2500,
  twinkleMaxMs: 6000,
  blinkMs: 420,
  blinkFloor: 0.42,
  gentleFloor: 0.82,
  sunBreatheLift: 2,
  sunBreatheMs: 4500,
  welcomeGlow: 'rgba(140,150,255,0.55)',
} as const;

export const HERO_HALO = {
  day: '#FFD36B',
  night: '#B9C8FF',
} as const satisfies Record<TimeOfDay, string>;

export const HERO_HALO_OPACITY = {
  day: 0.4,
  night: 0.3,
} as const satisfies Record<TimeOfDay, number>;

/**
 * The frame every home panel wears: a vivid blue-violet fill, a bright
 * lavender rim, and a tight light-blue bloom just outside it -- the rim
 * reads as lit, the way a neon edge does, rather than the panel sitting in a
 * wide pale wash. The sheen and inner rim stay faint, and nothing else on it
 * glows: no lit corners, no halo round the arrow. The stroke and the bloom
 * are the whole of its light.
 */
export const HERO_CARD = {
  radius: 22,
  strokeWidth: 1.5,
  bloomSpread: 20,
  bloomBlur: 9,
  fillTop: '#5E6CF6',
  fillBottom: '#4652E2',
  strokeTop: 'rgba(230,236,255,0.98)',
  strokeSide: 'rgba(176,196,255,0.78)',
  strokeBottom: 'rgba(150,172,255,0.58)',
  innerRim: 'rgba(255,255,255,0.10)',
  sheen: 'rgba(255,255,255,0.08)',
  hairlineLeft: 'rgba(255,255,255,0.42)',
  hairlineRight: 'rgba(255,255,255,0.14)',
  bloomTop: 'rgba(150,182,255,0.72)',
  bloomBottom: 'rgba(118,150,255,0.48)',
  depthShadow: '#04091F',
  progressTrack: 'rgba(10,22,80,0.42)',
  progressFrom: '#7FEBC8',
  progressTo: '#66C9FF',
  progressSheen: 'rgba(255,255,255,0.45)',
  arrowTop: '#FFE27A',
  arrowBottom: '#FFC533',
  arrowInk: '#4A2E00',
  arrowHighlight: '#FFFFFF',
  pressScale: 0.975,
  pressInMs: 110,
  pressOutMs: 260,
  arrowPressScale: 0.9,
} as const;

export type HeroStarKind = 'star-large' | 'star-medium' | 'star-small' | 'sparkle-large' | 'sparkle-small' | 'sparkle-dots';

export const HERO_ART_ASPECT = {
  'star-large': 283 / 274,
  'star-medium': 211 / 208,
  'star-small': 153 / 148,
  'sparkle-large': 174 / 190,
  'sparkle-small': 115 / 125,
  'sparkle-dots': 130 / 127,
} as const satisfies Record<HeroStarKind, number>;

export type HeroMotionMode = 'full' | 'gentle' | 'off';

export function heroMotionMode(settled: boolean, reduceMotion: boolean): HeroMotionMode {
  if (!settled) {
    return 'off';
  }

  return reduceMotion ? 'gentle' : 'full';
}

export interface SunFrame {
  centreX: number;
  centreY: number;
  top: number;
  size: number;
}

export function sunFrame(width: number, topInset: number, height: number = width, sizeScale: number = 1): SunFrame {
  // Size off the shorter axis so a wide tablet landscape doesn't blow the
  // sun up to portrait-width proportions -- it stays the size it would be
  // if the device were upright. `sizeScale` is the one further knob callers
  // get: a tablet in portrait has height to spare that this ratio alone
  // doesn't spend, and a plain phone-sized sun on that much canvas reads as
  // small rather than deliberate.
  const sizeBasis = Math.min(width, height);
  const size = Math.round(sizeBasis * HERO_SKY.sunSizeRatio * sizeScale);
  const top = topInset + HERO_SKY.sunTopInset;

  return { centreX: width / 2, centreY: top + size / 2, top, size };
}

export function heroContentTop(topInset: number, sunSize: number): number {
  return topInset + HERO_SKY.sunTopInset + sunSize + HERO_SKY.welcomeGap;
}

export interface HeroStarSeed {
  id: string;
  kind: HeroStarKind;
  x: number;
  y: number;
  size: number;
  twinkleMs: number;
  delayMs: number;
}

export interface HeroHalo {
  x: number;
  y: number;
  size: number;
}

export interface HeroSkyLayout {
  height: number;
  halo: HeroHalo;
  stars: HeroStarSeed[];
}

interface StarPlacement {
  id: string;
  kind: HeroStarKind;
  anchor: 'sun' | 'edge';
  x: number;
  dy: number;
  size: number;
  twinkleMs: number;
  delayMs: number;
}

const STAR_PLACEMENTS: readonly StarPlacement[] = [
  { id: 'left-large', kind: 'star-large', anchor: 'sun', x: -0.92, dy: 0.1, size: 0.3, twinkleMs: 4200, delayMs: 300 },
  { id: 'right-medium', kind: 'star-medium', anchor: 'sun', x: 0.88, dy: 0.28, size: 0.22, twinkleMs: 3400, delayMs: 1100 },
  { id: 'upper-right-small', kind: 'star-small', anchor: 'sun', x: 0.66, dy: -0.5, size: 0.15, twinkleMs: 2800, delayMs: 700 },
  { id: 'lower-left-small', kind: 'star-small', anchor: 'sun', x: -0.6, dy: 0.62, size: 0.13, twinkleMs: 5200, delayMs: 1900 },
  { id: 'far-left-medium', kind: 'star-medium', anchor: 'edge', x: 0.09, dy: 0.95, size: 0.2, twinkleMs: 4800, delayMs: 2500 },
  { id: 'far-right-small', kind: 'star-small', anchor: 'edge', x: 0.91, dy: 1.15, size: 0.16, twinkleMs: 3700, delayMs: 400 },
  { id: 'top-left-tiny', kind: 'star-small', anchor: 'edge', x: 0.33, dy: 0.02, size: 0.11, twinkleMs: 5800, delayMs: 1500 },
  { id: 'top-right-tiny', kind: 'star-small', anchor: 'edge', x: 0.8, dy: -0.3, size: 0.12, twinkleMs: 3100, delayMs: 2200 },
  { id: 'left-sparkle', kind: 'sparkle-large', anchor: 'sun', x: -1.35, dy: 0.55, size: 0.24, twinkleMs: 4500, delayMs: 900 },
  { id: 'right-sparkle', kind: 'sparkle-small', anchor: 'sun', x: 1.3, dy: -0.12, size: 0.16, twinkleMs: 3900, delayMs: 2800 },
  { id: 'right-dots', kind: 'sparkle-dots', anchor: 'edge', x: 0.93, dy: 0.72, size: 0.15, twinkleMs: 5500, delayMs: 1300 },
  { id: 'left-low-sparkle', kind: 'sparkle-small', anchor: 'edge', x: 0.06, dy: 1.3, size: 0.14, twinkleMs: 2600, delayMs: 3100 },
];

/**
 * How large the stars are allowed to be sized off.
 *
 * The stars are the texture around the hero, not the hero. Sized
 * point-for-point off the sun they grow with it twice over on a tablet --
 * once because the sun scales with the screen, again because portrait gives
 * it a `sizeScale` boost -- and a scatter of small lights becomes a handful
 * of blobs. Past a little over a phone-sized sun they stop keeping pace.
 */
export const STAR_BASIS_CAP = 132;

/** The sun size the stars are drawn from: its unboosted size, capped. */
export function starBasis(sunSize: number, sizeScale: number = 1): number {
  return Math.min(sunSize / sizeScale, STAR_BASIS_CAP);
}

export function buildHeroSky(width: number, sun: SunFrame, starSizeBasis: number = sun.size): HeroSkyLayout {
  const height = heroContentTop(sun.top - HERO_SKY.sunTopInset, sun.size) + HERO_SKY.welcomeBlock + HERO_SKY.cardBridge;

  const stars = STAR_PLACEMENTS.map((placement) => {
    const size = placement.size * starSizeBasis;
    const centreX = placement.anchor === 'sun' ? sun.centreX + placement.x * sun.size : placement.x * width;
    const centreY = sun.centreY + placement.dy * sun.size;

    return {
      id: placement.id,
      kind: placement.kind,
      x: centreX - size / 2,
      y: centreY - size / 2,
      size,
      twinkleMs: placement.twinkleMs,
      delayMs: placement.delayMs,
    };
  });

  const haloSize = sun.size * HERO_SKY.haloRatio;

  return {
    height,
    halo: { x: sun.centreX - haloSize / 2, y: sun.centreY - haloSize / 2, size: haloSize },
    stars,
  };
}
