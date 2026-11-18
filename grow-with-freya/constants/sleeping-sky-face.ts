import faces from '@/assets/images/ui-elements/sleeping-faces.json';
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
  breatheScale: 0.03,
  breatheSquash: 0.012,
  breatheRise: 0.012,
  swayMs: 7400,
  swayDeg: 1.6,
  glowPulse: 0.35,
  flutterEveryMs: 5200,
  flutterMs: 260,
  flutterSqueeze: 0.7,
  lidScrunch: 0.12,
  lidLift: 0.008,
  zzzMs: 4200,
  zzzCount: 3,
  zzzWobble: 0.035,
  zzzTiltDeg: 12,
} as const;

export const WAKE = {
  openMs: 280,
  closeMs: 360,
  blinkMs: 150,
  gazeKeys: [
    { atMs: 280, x: 0, y: 0 },
    { atMs: 600, x: -1, y: 0.1 },
    { atMs: 900, x: -1, y: 0.1 },
    { atMs: 1250, x: 1, y: 0.1 },
    { atMs: 1550, x: 1, y: 0.1 },
    { atMs: 1850, x: 0, y: -0.7 },
    { atMs: 2150, x: 0, y: -0.7 },
    { atMs: 2350, x: 0, y: 0 },
  ],
  blinkAtMs: 1600,
  settleMs: 2350,
  lineBelowOpen: 0.35,
} as const;

export const WAKE_TOTAL_MS = WAKE.settleMs + WAKE.closeMs;

export interface MouthSpot {
  x: number;
  y: number;
  width: number;
  depth: number;
  stroke: number;
}

export const SLEEPING_MOUTH: Record<SkyBody, MouthSpot> = {
  sun: faces.sun.mouth,
  moon: faces.moon.mouth,
};

export function mouthDepth(open: number): number {
  'worklet';
  return 1 - Math.min(Math.max(open, 0), 1);
}

export const SLEEPING_FACE_INK = '#5A2E1A';
export const SLEEPING_EYE_STROKE = 0.016;

export function sleepingBody(timeOfDay: TimeOfDay): SkyBody {
  return timeOfDay === 'day' ? 'moon' : 'sun';
}

function smooth(time: number): number {
  'worklet';
  const clamped = Math.min(Math.max(time, 0), 1);

  return clamped * clamped * (3 - 2 * clamped);
}

export function lidsOpenness(elapsedMs: number): number {
  'worklet';
  if (elapsedMs <= 0 || elapsedMs >= WAKE_TOTAL_MS) return 0;
  if (elapsedMs < WAKE.openMs) return smooth(elapsedMs / WAKE.openMs);
  if (elapsedMs >= WAKE.settleMs) return 1 - smooth((elapsedMs - WAKE.settleMs) / WAKE.closeMs);
  const blink = Math.abs(elapsedMs - WAKE.blinkAtMs) / (WAKE.blinkMs / 2);

  return blink < 1 ? Math.max(1 - (1 - blink) * 1.15, 0) : 1;
}

export function shutLineOpacity(open: number): number {
  'worklet';
  return Math.min(Math.max((WAKE.lineBelowOpen - open) / WAKE.lineBelowOpen, 0), 1);
}

export interface Gaze {
  x: number;
  y: number;
}

export function gazeAt(elapsedMs: number): Gaze {
  'worklet';
  const keys = WAKE.gazeKeys;
  if (elapsedMs <= keys[0].atMs) return { x: keys[0].x, y: keys[0].y };
  for (let index = 1; index < keys.length; index += 1) {
    const from = keys[index - 1];
    const to = keys[index];
    if (elapsedMs <= to.atMs) {
      const time = smooth((elapsedMs - from.atMs) / (to.atMs - from.atMs));

      return { x: from.x + (to.x - from.x) * time, y: from.y + (to.y - from.y) * time };
    }
  }
  const last = keys[keys.length - 1];

  return { x: last.x, y: last.y };
}

export interface BreathPose {
  scaleX: number;
  scaleY: number;
  rise: number;
  glow: number;
}

export function breathPose(breath: number, size: number): BreathPose {
  'worklet';
  const b = Math.min(Math.max(breath, 0), 1);

  return {
    scaleX: 1 + SLEEP_RHYTHM.breatheSquash * b,
    scaleY: 1 + SLEEP_RHYTHM.breatheScale * b,
    rise: -SLEEP_RHYTHM.breatheRise * size * b + 0,
    glow: 1 - SLEEP_RHYTHM.glowPulse * (1 - b),
  };
}

export interface LidPose {
  depth: number;
  lift: number;
}

export function lidBreath(breath: number, size: number): LidPose {
  'worklet';
  const b = Math.min(Math.max(breath, 0), 1);

  return { depth: 1 + SLEEP_RHYTHM.lidScrunch * b, lift: -SLEEP_RHYTHM.lidLift * size * b + 0 };
}

export function swayDeg(sway: number): number {
  'worklet';
  return SLEEP_RHYTHM.swayDeg * Math.sin(2 * Math.PI * sway);
}

export function flutterSqueeze(progress: number, eyeOffset: number): number {
  'worklet';
  const period = SLEEP_RHYTHM.flutterEveryMs;
  const at = (((progress + eyeOffset) % 1) + 1) % 1;
  const withinMs = at * period;
  if (withinMs >= SLEEP_RHYTHM.flutterMs) return 1;
  const dip = Math.sin(Math.PI * (withinMs / SLEEP_RHYTHM.flutterMs));

  return 1 - (1 - SLEEP_RHYTHM.flutterSqueeze) * dip;
}

export interface ZzzPose {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  tiltDeg: number;
}

export function zzzAt(index: number, progress: number): ZzzPose {
  'worklet';
  const phase = (progress + index / SLEEP_RHYTHM.zzzCount) % 1;
  const wobble = Math.sin(2 * Math.PI * 2 * phase);

  return {
    x: 0.74 + 0.5 * phase + SLEEP_RHYTHM.zzzWobble * wobble,
    y: 0.16 - 0.3 * phase,
    opacity: Math.sin(Math.PI * phase),
    scale: 0.6 + 0.6 * phase,
    tiltDeg: SLEEP_RHYTHM.zzzTiltDeg * wobble,
  };
}
