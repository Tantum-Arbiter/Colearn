export type SkyFaceExpression = 'resting' | 'laughing';

export const SKY_FACE_RHYTHM = {
  restMinMs: 9000,
  restMaxMs: 11000,
  firstRestMinMs: 4000,
  laughMs: 1600,
  giggleDegrees: 4,
  laughBounces: 3,
  crouchEnds: 0.12,
  bouncesEnd: 0.8,
  hopPixels: 9,
  crouchDepth: 0.06,
  crouchSpread: 0.04,
  crouchSink: 2,
  stretch: 0.06,
  narrow: 0.03,
  settleBump: 0.015,
} as const;

export interface SparkleSeed {
  angle: number;
  starts: number;
}

export const SKY_FACE_SPARKLES: readonly SparkleSeed[] = [
  { angle: -62, starts: 0.14 },
  { angle: -18, starts: 0.2 },
  { angle: 28, starts: 0.26 },
  { angle: 68, starts: 0.32 },
];

export const SPARKLE_LASTS = 0.5;
export const SPARKLE_NEAR = 0.44;
export const SPARKLE_FAR = 0.66;

export function nextRestDelay(roll: number, isFirst = false): number {
  const clamped = Math.min(Math.max(roll, 0), 1);
  const min = isFirst ? SKY_FACE_RHYTHM.firstRestMinMs : SKY_FACE_RHYTHM.restMinMs;
  const span = SKY_FACE_RHYTHM.restMaxMs - min;

  return Math.round(min + clamped * span);
}

export function laughsPerMinute(averageRestMs: number): number {
  const cycle = averageRestMs + SKY_FACE_RHYTHM.laughMs;

  return 60000 / cycle;
}

function smoothstep(x: number): number {
  'worklet';
  const u = Math.min(Math.max(x, 0), 1);
  return u * u * (3 - 2 * u);
}

export interface LaughPose {
  scaleX: number;
  scaleY: number;
  rotate: number;
  lift: number;
}

export function laughPose(progress: number): LaughPose {
  'worklet';
  const u = Math.min(Math.max(progress, 0), 1);
  const {
    crouchEnds,
    bouncesEnd,
    laughBounces,
    giggleDegrees,
    hopPixels,
    crouchDepth,
    crouchSpread,
    crouchSink,
    stretch,
    narrow,
    settleBump,
  } = SKY_FACE_RHYTHM;

  const crouch = u < crouchEnds ? Math.sin((Math.PI * u) / crouchEnds) : 0;

  let bounce = 0;
  let wobble = 0;
  if (u >= crouchEnds && u <= bouncesEnd) {
    const t = (u - crouchEnds) / (bouncesEnd - crouchEnds);
    const decay = 1 - 0.55 * t;
    const phase = Math.PI * laughBounces * t;
    bounce = Math.abs(Math.sin(phase)) * decay;
    wobble = Math.sin(phase) * decay;
  }

  const settle = u > bouncesEnd ? Math.sin((Math.PI * (u - bouncesEnd)) / (1 - bouncesEnd)) : 0;

  return {
    scaleX: 1 + crouchSpread * crouch - narrow * bounce - settleBump * settle * 0.6,
    scaleY: 1 - crouchDepth * crouch + stretch * bounce + settleBump * settle,
    rotate: giggleDegrees * wobble,
    lift: crouchSink * crouch - hopPixels * bounce,
  };
}

export function laughFace(progress: number): number {
  'worklet';
  const u = Math.min(Math.max(progress, 0), 1);
  return smoothstep((u - 0.04) / 0.12) * (1 - smoothstep((u - 0.78) / 0.2));
}

export function laughGlow(progress: number): number {
  'worklet';
  const u = Math.min(Math.max(progress, 0), 1);
  return smoothstep((u - 0.06) / 0.22) * (1 - smoothstep((u - 0.62) / 0.38));
}

export interface SparklePose {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotate: number;
}

export function sparkleAt(index: number, progress: number): SparklePose {
  'worklet';
  const seed = SKY_FACE_SPARKLES[Math.min(Math.max(index, 0), SKY_FACE_SPARKLES.length - 1)];
  const u = Math.min(Math.max(progress, 0), 1);
  const t = Math.min(Math.max((u - seed.starts) / SPARKLE_LASTS, 0), 1);
  const life = t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
  const out = 1 - (1 - t) * (1 - t);
  const radius = SPARKLE_NEAR + (SPARKLE_FAR - SPARKLE_NEAR) * out;
  const rad = (seed.angle * Math.PI) / 180;

  return {
    x: 0.5 + radius * Math.sin(rad),
    y: 0.5 - radius * Math.cos(rad),
    scale: life,
    opacity: life,
    rotate: 90 * t,
  };
}
