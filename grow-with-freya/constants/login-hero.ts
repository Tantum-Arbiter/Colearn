import hero from '@/assets/images/login/hero-animals.json';

export type HeroAnimal = 'bear' | 'bunny' | 'fox';

export const HERO_ANIMALS: readonly HeroAnimal[] = ['bear', 'bunny', 'fox'];

export interface HeroFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const HERO_CANVAS = hero.canvas;
export const HERO_FOREGROUND: HeroFrame = hero.foreground;
export const HERO_HAS_LAUGHING: boolean = hero.laughing;
export const HERO_FRAMES: Record<HeroAnimal, HeroFrame> = {
  bear: hero.animals.bear.frame,
  bunny: hero.animals.bunny.frame,
  fox: hero.animals.fox.frame,
};

export interface HeroRhythm {
  swayMs: number;
  swayDeg: number;
  swayPhase: number;
  breatheMs: number;
  laughEveryMs: number;
  laughsAtMs: number[];
}

export const HERO_LOOP_MS = 120000;

export const HERO_RHYTHM: Record<HeroAnimal, HeroRhythm> = {
  bear: { swayMs: 6000, swayDeg: 1.2, swayPhase: 0, breatheMs: 4800, laughEveryMs: 12000, laughsAtMs: [2000, 7600] },
  bunny: { swayMs: 4800, swayDeg: 0.9, swayPhase: 0.5, breatheMs: 4000, laughEveryMs: 10000, laughsAtMs: [4200] },
  fox: { swayMs: 5000, swayDeg: 1.1, swayPhase: 0, breatheMs: 4800, laughEveryMs: 15000, laughsAtMs: [600, 10200] },
};

export const HERO_MOTION = {
  laughMs: 2400,
  laughFadeInEnds: 0.16,
  laughFadeOutStarts: 0.72,
  breatheScale: 0.012,
} as const;

function within(elapsedMs: number, periodMs: number): number {
  'worklet';
  return ((elapsedMs % periodMs) + periodMs) % periodMs;
}

function smooth(time: number): number {
  'worklet';
  const clamped = Math.min(Math.max(time, 0), 1);

  return clamped * clamped * (3 - 2 * clamped);
}

export interface SwayPose {
  rotateDeg: number;
  scaleY: number;
}

export function swayPose(elapsedMs: number, animal: HeroAnimal): SwayPose {
  'worklet';
  const rhythm = HERO_RHYTHM[animal];
  const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * elapsedMs) / rhythm.breatheMs);

  return {
    rotateDeg: rhythm.swayDeg * Math.sin(2 * Math.PI * (elapsedMs / rhythm.swayMs + rhythm.swayPhase)),
    scaleY: 1 + HERO_MOTION.breatheScale * breath,
  };
}

export function laughFace(progress: number): number {
  'worklet';
  if (progress <= 0 || progress >= 1) return 0;
  const fadeIn = smooth(progress / HERO_MOTION.laughFadeInEnds);
  const fadeOut = 1 - smooth((progress - HERO_MOTION.laughFadeOutStarts) / (1 - HERO_MOTION.laughFadeOutStarts));

  return fadeIn * fadeOut;
}

export function laughAmount(elapsedMs: number, animal: HeroAnimal): number {
  'worklet';
  const rhythm = HERO_RHYTHM[animal];
  const at = within(elapsedMs, rhythm.laughEveryMs);
  for (let index = 0; index < rhythm.laughsAtMs.length; index += 1) {
    const amount = laughFace((at - rhythm.laughsAtMs[index]) / HERO_MOTION.laughMs);
    if (amount > 0) return amount;
  }

  return 0;
}

export interface PlacedFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function heroFrame(frame: HeroFrame, width: number, height: number): PlacedFrame {
  return {
    left: frame.x * width,
    top: frame.y * height,
    width: frame.width * width,
    height: frame.height * height,
  };
}
