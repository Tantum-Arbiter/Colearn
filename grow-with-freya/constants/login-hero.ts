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
}

export const HERO_LOOP_MS = 120000;

export const HERO_RHYTHM: Record<HeroAnimal, HeroRhythm> = {
  bear: { swayMs: 6000, swayDeg: 1.2, swayPhase: 0, breatheMs: 4800 },
  bunny: { swayMs: 4800, swayDeg: 0.9, swayPhase: 0.5, breatheMs: 4000 },
  fox: { swayMs: 5000, swayDeg: 1.1, swayPhase: 0, breatheMs: 4800 },
};

export const HERO_MOTION = {
  breatheScale: 0.012,
} as const;

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
