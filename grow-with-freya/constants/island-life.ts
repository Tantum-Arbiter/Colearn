export const ISLAND_LIFE = {
  windMs: 7000,
  tideMs: 72000,
  rippleMs: 3600,
  skyMs: 60000,
  beatMs: 640,
  fallMs: 3600,
  fallTiles: 3,
  lampMs: 7000,
  lampGlow: 0.5,
  pulseFrom: 0.25,
  pulseBright: 0.8,
  pulseLife: 0.42,
  poolRings: 3,
  rippleFrom: 0.15,
  villageBeats: 3,
  starFloor: 0.42,
  gustShare: 0.28,
  billowSwell: 0.035,
  billowBeats: 4,
  wingGlide: 10,
  wingFlap: 26,
  wingRests: 3,
} as const;

const TURN = Math.PI * 2;
const TREE_STEP = 0.37;
const BILLOW_STEP = 0.37;
const WING_STEP = 0.31;
const REST_STEP = 0.23;

function steady(value: number): boolean {
  'worklet';
  return value === value && value !== Infinity && value !== -Infinity;
}

function clamp01(value: number): number {
  'worklet';
  if (!(value > 0)) return 0;
  return value >= 1 ? 1 : value;
}

function part(value: number): number {
  'worklet';
  return value - Math.floor(value);
}

export function treeSway(wind: number, index: number, sway: number): number {
  'worklet';
  if (!(sway > 0) || !steady(wind)) return 0;

  const start = part(index * TREE_STEP);
  const breeze = Math.sin(TURN * (wind + start));
  const gust = Math.sin(TURN * (wind * 2 + start * 1.7));

  return sway * ((1 - ISLAND_LIFE.gustShare) * breeze + ISLAND_LIFE.gustShare * gust);
}

export function cloudDrift(tide: number, reach: number, beats: number, lag: number): number {
  'worklet';
  if (!steady(tide)) return 0;

  return reach * (0.5 - 0.5 * Math.cos(TURN * (tide * beats + lag)));
}

export function billowSwell(tide: number, index: number): number {
  'worklet';
  if (!steady(tide)) return 1;

  const swell = 0.5 - 0.5 * Math.cos(TURN * (tide * ISLAND_LIFE.billowBeats + index * BILLOW_STEP));

  return 1 + ISLAND_LIFE.billowSwell * swell;
}

export function waterGlow(ripple: number, sheet: number, sheets: number): number {
  'worklet';
  if (!(sheets > 0) || !steady(ripple)) return 0;

  const round = part(ripple - sheet / sheets);
  const away = round < 0.5 ? round : 1 - round;

  return Math.max(0, 1 - away * sheets);
}

export interface GullCourse {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly laps: number;
  readonly lag: number;
  readonly bob: number;
  readonly bobs: number;
  readonly size: number;
  readonly near: number;
  readonly far: number;
}

export const GULL_COURSES: readonly GullCourse[] = [
  { fromX: 1250, fromY: 590, toX: -130, toY: 470, laps: 3, lag: 0.05, bob: 10, bobs: 3, size: 40, near: 1, far: 0.8 },
  { fromX: -140, fromY: 905, toX: 1260, toY: 770, laps: 2, lag: 0.4, bob: 14, bobs: 2, size: 46, near: 1.1, far: 0.9 },
  { fromX: 1240, fromY: 1090, toX: -120, toY: 1010, laps: 3, lag: 0.62, bob: 8, bobs: 4, size: 34, near: 0.9, far: 1.05 },
  { fromX: -110, fromY: 1290, toX: 1230, toY: 1200, laps: 2, lag: 0.85, bob: 6, bobs: 3, size: 30, near: 1, far: 0.85 },
];

export const GULL_COURSES_PHONE: readonly GullCourse[] = [
  { fromX: 1060, fromY: 760, toX: -120, toY: 660, laps: 3, lag: 0.05, bob: 12, bobs: 3, size: 48, near: 1, far: 0.8 },
  { fromX: -130, fromY: 905, toX: 1070, toY: 800, laps: 2, lag: 0.4, bob: 16, bobs: 2, size: 54, near: 1.1, far: 0.9 },
  { fromX: 1050, fromY: 1040, toX: -110, toY: 975, laps: 3, lag: 0.62, bob: 10, bobs: 4, size: 40, near: 0.9, far: 1.05 },
  { fromX: -110, fromY: 1150, toX: 1050, toY: 1085, laps: 2, lag: 0.85, bob: 7, bobs: 3, size: 36, near: 1, far: 0.85 },
];

export function gullProgress(sky: number, course: GullCourse): number {
  'worklet';
  if (!steady(sky)) return 0;

  return part(sky * course.laps + course.lag);
}

export interface GullPlace {
  x: number;
  y: number;
  scale: number;
}

export function gullPlace(progress: number, course: GullCourse): GullPlace {
  'worklet';
  const along = clamp01(progress);

  return {
    x: course.fromX + (course.toX - course.fromX) * along,
    y: course.fromY + (course.toY - course.fromY) * along + course.bob * Math.sin(TURN * course.bobs * along),
    scale: course.near + (course.far - course.near) * along,
  };
}

export function wingLift(beat: number, progress: number, index: number): number {
  'worklet';
  if (!steady(beat) || !steady(progress)) return ISLAND_LIFE.wingGlide;

  const effort = clamp01(0.5 + 1.4 * Math.sin(TURN * (progress * ISLAND_LIFE.wingRests + index * REST_STEP)));
  if (effort === 0) return ISLAND_LIFE.wingGlide;

  return ISLAND_LIFE.wingGlide + ISLAND_LIFE.wingFlap * effort * Math.sin(TURN * (beat + index * WING_STEP));
}

export function fallShift(fall: number, tile: number): number {
  'worklet';
  if (!(tile > 0)) return 0;
  if (!steady(fall)) return -tile;

  return -tile + part(fall * ISLAND_LIFE.fallTiles) * tile;
}

export interface SprayPose {
  scale: number;
  opacity: number;
}

export function sprayPose(fall: number, puff: number): SprayPose {
  'worklet';
  const age = steady(fall) ? part(fall + puff * 0.5) : part(puff * 0.5);

  return { scale: 0.7 + 0.65 * age, opacity: 0.75 * (1 - age) };
}

export function beamReach(lamp: number): number {
  'worklet';
  if (!steady(lamp)) return 1;

  return Math.cos(TURN * lamp);
}

export function lampFlare(lamp: number): number {
  'worklet';
  const through = Math.sin(TURN * lamp);
  if (!steady(through)) return ISLAND_LIFE.lampGlow;

  const square = through * through;
  const sharp = square * square * square * square;

  return ISLAND_LIFE.lampGlow + (1 - ISLAND_LIFE.lampGlow) * sharp * sharp;
}

export interface RingPose {
  scale: number;
  opacity: number;
}

export function pulseRing(lamp: number): RingPose {
  'worklet';
  if (!steady(lamp)) return { scale: 1, opacity: 0 };

  const sinceFlash = part(lamp * 2 - 0.5);
  if (sinceFlash >= ISLAND_LIFE.pulseLife) return { scale: 1, opacity: 0 };

  const age = sinceFlash / ISLAND_LIFE.pulseLife;
  const left = 1 - age;

  return {
    scale: ISLAND_LIFE.pulseFrom + (1 - ISLAND_LIFE.pulseFrom) * (1 - left * left * left),
    opacity: ISLAND_LIFE.pulseBright * left * left,
  };
}

export function poolRing(fall: number, ring: number): RingPose {
  'worklet';
  const age = part((steady(fall) ? fall : 0) + ring / ISLAND_LIFE.poolRings);
  const rising = age * 6;

  return {
    scale: ISLAND_LIFE.rippleFrom + (1 - ISLAND_LIFE.rippleFrom) * age,
    opacity: 0.9 * (rising >= 1 ? 1 : rising) * (1 - age),
  };
}

export function villageGlow(lamp: number, sheet: number): number {
  'worklet';
  const turn = steady(lamp) ? lamp : 0;

  return 0.82 + 0.18 * Math.sin(TURN * (turn * ISLAND_LIFE.villageBeats + sheet * 0.5));
}

export function starGlow(lamp: number, sheet: number, sheets: number): number {
  'worklet';
  const turn = steady(lamp) ? lamp : 0;
  const round = sheets > 0 ? sheet / sheets : 0;
  const bright = 0.5 + 0.5 * Math.cos(TURN * (turn - round));

  return ISLAND_LIFE.starFloor + (1 - ISLAND_LIFE.starFloor) * bright;
}

