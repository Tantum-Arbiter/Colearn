import { earthLayout } from '@/constants/earth';
import { HERO_HALO } from '@/constants/home-sky';
import { SPLASH_TIMELINE, layerFrame } from '@/constants/splash-logo';

export const SPLASH_GLOW = {
  colour: HERO_HALO.night,
  sizeRatio: 1.7,
  centreYRatio: 0.37,
  peakOpacity: 0.46,
  restOpacity: 0.32,
  bloomMs: SPLASH_TIMELINE.glowMs,
  breatheMs: 3200,
} as const;

export const SPLASH_MOTES = {
  count: 6,
  colour: '#F4D58A',
  firstDelayMs: SPLASH_TIMELINE.stem.delayMs + 150,
  everyMs: 230,
  minDurationMs: 2600,
  maxDurationMs: 3400,
} as const;

export const SHOOTING_STAR = {
  delayMs: SPLASH_TIMELINE.stem.delayMs + SPLASH_TIMELINE.stem.durationMs + 100,
  durationMs: 650,
  lengthPx: 90,
  thicknessPx: 2,
  peakOpacity: 0.6,
  from: { x: 0.86, y: 0.09 },
  to: { x: 0.42, y: 0.2 },
} as const;

export const STAR_DRIFT = {
  risePx: 14,
  durationMs: SPLASH_TIMELINE.exitAtMs + SPLASH_TIMELINE.exitMs,
} as const;

const TAGLINE_CLEARANCE_PX = 28;

export interface GlowFrame {
  left: number;
  top: number;
  size: number;
}

export interface MoteSeed {
  x: number;
  startY: number;
  risePx: number;
  driftPx: number;
  size: number;
  peakOpacity: number;
  delayMs: number;
  durationMs: number;
}

export interface ShootingStarPath {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  angleDeg: number;
}

export function glowFrame(logoLeft: number, logoTop: number, logoSize: number): GlowFrame {
  const size = logoSize * SPLASH_GLOW.sizeRatio;

  return {
    left: logoLeft + logoSize / 2 - size / 2,
    top: logoTop + logoSize * SPLASH_GLOW.centreYRatio - size / 2,
    size,
  };
}

export function taglineBottom(width: number, height: number): number {
  return earthLayout(width, height, 'bottom').cap + TAGLINE_CLEARANCE_PX;
}

export function buildMotes(logoSize: number): MoteSeed[] {
  const book = layerFrame('book', logoSize);
  const durationSpan = SPLASH_MOTES.maxDurationMs - SPLASH_MOTES.minDurationMs;

  return Array.from({ length: SPLASH_MOTES.count }, (_, index) => {
    const across = ((index * 37) % 11) / 11;
    const depth = ((index * 53) % 7) / 7;
    const vigour = ((index * 71) % 13) / 13;

    return {
      x: book.left + book.width * (0.22 + 0.56 * across),
      startY: book.top + book.height * (0.08 + 0.32 * depth),
      risePx: logoSize * (0.22 + 0.16 * vigour),
      driftPx: logoSize * 0.03 * (index % 2 === 0 ? 1 : -1),
      size: 2 + 1.6 * depth,
      peakOpacity: 0.34 + 0.22 * vigour,
      delayMs: SPLASH_MOTES.firstDelayMs + index * SPLASH_MOTES.everyMs,
      durationMs: SPLASH_MOTES.minDurationMs + durationSpan * across,
    };
  });
}

export function moteOpacity(progress: number, peakOpacity: number): number {
  'worklet';
  if (progress <= 0 || progress >= 1) {
    return 0;
  }

  return Math.sin(progress * Math.PI) * peakOpacity;
}

export function shootingStarPath(width: number, height: number): ShootingStarPath {
  const fromX = width * SHOOTING_STAR.from.x;
  const fromY = height * SHOOTING_STAR.from.y;
  const toX = width * SHOOTING_STAR.to.x;
  const toY = height * SHOOTING_STAR.to.y;

  return {
    fromX,
    fromY,
    toX,
    toY,
    angleDeg: (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI,
  };
}
