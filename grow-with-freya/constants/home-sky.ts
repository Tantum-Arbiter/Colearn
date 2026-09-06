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
  twinkleFloor: 0.75,
  twinkleScale: 1.04,
  gentleFloor: 0.9,
  cloudDriftMinPx: 2,
  cloudDriftMaxPx: 6,
  cloudDriftMinMs: 9000,
  cloudDriftMaxMs: 15000,
  shootingEveryMinMs: 12000,
  shootingEveryMaxMs: 20000,
  shootingFlightMs: 1600,
  shootingRestOpacity: 0.7,
  shootingIdleOpacity: 0.3,
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

export const HERO_CARD = {
  radius: 22,
  strokeWidth: 1.5,
  bloomSpread: 22,
  bloomBlur: 9,
  fillTop: '#6272EC',
  fillBottom: '#3A49C2',
  strokeTop: 'rgba(216,208,255,0.95)',
  strokeSide: 'rgba(150,178,255,0.55)',
  strokeBottom: 'rgba(120,140,235,0.32)',
  innerRim: 'rgba(255,255,255,0.16)',
  sheen: 'rgba(255,255,255,0.14)',
  hairlineLeft: 'rgba(255,255,255,0.62)',
  hairlineRight: 'rgba(255,255,255,0.22)',
  cornerBloomTop: 'rgba(228,224,255,0.16)',
  cornerBloomBottom: 'rgba(176,194,255,0.06)',
  bloomTop: 'rgba(160,170,255,0.62)',
  bloomBottom: 'rgba(112,128,238,0.30)',
  depthShadow: '#04091F',
  progressTrack: 'rgba(10,22,80,0.42)',
  progressFrom: '#7FEBC8',
  progressTo: '#66C9FF',
  progressSheen: 'rgba(255,255,255,0.45)',
  arrowTop: '#FFE27A',
  arrowBottom: '#FFC533',
  arrowInk: '#4A2E00',
  arrowGlow: 'rgba(255,214,77,0.55)',
  arrowHighlight: '#FFFFFF',
  pressScale: 0.975,
  pressInMs: 110,
  pressOutMs: 260,
  arrowPressScale: 0.9,
  arrowGlowRest: 0.55,
  arrowGlowPressed: 1,
} as const;

export type HeroStarKind = 'star-large' | 'star-medium' | 'star-small' | 'sparkle-large' | 'sparkle-small' | 'sparkle-dots';
export type HeroCloudKind = 'cloud-large' | 'cloud-medium' | 'cloud-small' | 'cloud-edge' | 'cloud-bridge';

export const HERO_ART_ASPECT = {
  'star-large': 283 / 274,
  'star-medium': 211 / 208,
  'star-small': 153 / 148,
  'sparkle-large': 174 / 190,
  'sparkle-small': 115 / 125,
  'sparkle-dots': 130 / 127,
  'shooting-star': 347 / 197,
  'cloud-large': 511 / 256,
  'cloud-medium': 389 / 205,
  'cloud-small': 290 / 162,
  'cloud-edge': 486 / 180,
  'cloud-bridge': 513 / 186,
} as const satisfies Record<HeroStarKind | HeroCloudKind | 'shooting-star', number>;

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

export function sunFrame(width: number, topInset: number): SunFrame {
  const size = Math.round(width * HERO_SKY.sunSizeRatio);
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

export interface HeroCloudSeed {
  id: string;
  kind: HeroCloudKind;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  mirrored: boolean;
  driftX: number;
  driftY: number;
  driftMs: number;
}

export interface HeroShootingStarSeed {
  x: number;
  y: number;
  width: number;
  height: number;
  travelX: number;
  travelY: number;
  everyMs: number;
  flightMs: number;
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
  clouds: HeroCloudSeed[];
  shootingStar: HeroShootingStarSeed;
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

interface CloudPlacement {
  id: string;
  kind: HeroCloudKind;
  x: number;
  dy: number;
  width: number;
  opacity: number;
  mirrored: boolean;
  driftX: number;
  driftY: number;
  driftMs: number;
}

const CLOUD_PLACEMENTS: readonly CloudPlacement[] = [
  { id: 'top-left', kind: 'cloud-edge', x: -0.05, dy: -0.42, width: 0.44, opacity: 0.9, mirrored: false, driftX: 3, driftY: 0, driftMs: 12000 },
  { id: 'top-right', kind: 'cloud-medium', x: 0.66, dy: -0.2, width: 0.38, opacity: 0.85, mirrored: true, driftX: -2, driftY: 1, driftMs: 14000 },
  { id: 'left-low', kind: 'cloud-small', x: -0.04, dy: 0.85, width: 0.3, opacity: 0.8, mirrored: false, driftX: 2, driftY: -1, driftMs: 11000 },
  { id: 'right-bridge', kind: 'cloud-bridge', x: 0.55, dy: 1.05, width: 0.5, opacity: 0.75, mirrored: true, driftX: -3, driftY: 0, driftMs: 15000 },
  { id: 'left-bridge', kind: 'cloud-large', x: -0.18, dy: 1.55, width: 0.55, opacity: 0.5, mirrored: false, driftX: 2, driftY: 1, driftMs: 13000 },
];

const SHOOTING_STAR = {
  x: 0.62,
  dy: -0.4,
  width: 0.28,
  travelX: -26,
  travelY: 15,
  everyMs: 16000,
} as const;

export function buildHeroSky(width: number, sun: SunFrame): HeroSkyLayout {
  const height = heroContentTop(sun.top - HERO_SKY.sunTopInset, sun.size) + HERO_SKY.welcomeBlock + HERO_SKY.cardBridge;

  const stars = STAR_PLACEMENTS.map((placement) => {
    const size = placement.size * sun.size;
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

  const clouds = CLOUD_PLACEMENTS.map((placement) => {
    const cloudWidth = placement.width * width;

    return {
      id: placement.id,
      kind: placement.kind,
      x: placement.x * width,
      y: sun.centreY + placement.dy * sun.size,
      width: cloudWidth,
      height: cloudWidth / HERO_ART_ASPECT[placement.kind],
      opacity: placement.opacity,
      mirrored: placement.mirrored,
      driftX: placement.driftX,
      driftY: placement.driftY,
      driftMs: placement.driftMs,
    };
  });

  const shootingWidth = SHOOTING_STAR.width * width;
  const haloSize = sun.size * HERO_SKY.haloRatio;

  return {
    height,
    halo: { x: sun.centreX - haloSize / 2, y: sun.centreY - haloSize / 2, size: haloSize },
    stars,
    clouds,
    shootingStar: {
      x: SHOOTING_STAR.x * width,
      y: sun.centreY + SHOOTING_STAR.dy * sun.size,
      width: shootingWidth,
      height: shootingWidth / HERO_ART_ASPECT['shooting-star'],
      travelX: SHOOTING_STAR.travelX,
      travelY: SHOOTING_STAR.travelY,
      everyMs: SHOOTING_STAR.everyMs,
      flightMs: HERO_SKY.shootingFlightMs,
    },
  };
}
