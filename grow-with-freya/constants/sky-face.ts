export type SkyFaceExpression = 'resting' | 'laughing';

export const SKY_FACE_RHYTHM = {
  restMinMs: 19000,
  restMaxMs: 38000,
  laughMs: 1400,
  crossFadeMs: 260,
  firstRestMinMs: 8000,
} as const;

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
