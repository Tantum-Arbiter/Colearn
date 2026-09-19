import type { TimeOfDay } from '@/constants/home-scene';

export type SkyBody = 'sun' | 'moon';

export interface EyeSpot {
  x: number;
  y: number;
  width: number;
}

export const SLEEPING_EYES: Record<SkyBody, { left: EyeSpot; right: EyeSpot }> = {
  sun: {
    left: { x: 0.386, y: 0.529, width: 0.096 },
    right: { x: 0.645, y: 0.507, width: 0.102 },
  },
  moon: {
    left: { x: 0.361, y: 0.574, width: 0.121 },
    right: { x: 0.69, y: 0.545, width: 0.119 },
  },
};

export const SLEEP_RHYTHM = {
  breatheMs: 5600,
  breatheScale: 0.025,
  zzzMs: 4200,
  zzzCount: 3,
  peekOpenMs: 280,
  peekHoldMs: 1200,
  peekCloseMs: 360,
} as const;

export const PEEK_TOTAL_MS = SLEEP_RHYTHM.peekOpenMs + SLEEP_RHYTHM.peekHoldMs + SLEEP_RHYTHM.peekCloseMs;

export const SLEEPING_FACE_INK = '#5A2E1A';
export const SLEEPING_EYE_STROKE = 0.016;

export function sleepingBody(timeOfDay: TimeOfDay): SkyBody {
  return timeOfDay === 'day' ? 'moon' : 'sun';
}

export function peekOpenness(elapsedMs: number): number {
  'worklet';
  const { peekOpenMs, peekHoldMs, peekCloseMs } = SLEEP_RHYTHM;
  if (elapsedMs <= 0 || elapsedMs >= PEEK_TOTAL_MS) return 0;
  if (elapsedMs < peekOpenMs) return elapsedMs / peekOpenMs;
  if (elapsedMs <= peekOpenMs + peekHoldMs) return 1;
  return 1 - (elapsedMs - peekOpenMs - peekHoldMs) / peekCloseMs;
}

export interface ZzzPose {
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

export function zzzAt(index: number, progress: number): ZzzPose {
  'worklet';
  const phase = (progress + index / SLEEP_RHYTHM.zzzCount) % 1;

  return {
    x: 0.74 + 0.5 * phase,
    y: 0.16 - 0.3 * phase,
    opacity: Math.sin(Math.PI * phase),
    scale: 0.6 + 0.6 * phase,
  };
}
