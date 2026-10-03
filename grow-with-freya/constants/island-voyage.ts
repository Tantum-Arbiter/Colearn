import { earthDiameter } from '@/constants/earth';

export type VoyagePhase =
  | 'home'
  | 'leaving'
  | 'crossing'
  | 'arriving'
  | 'island'
  | 'returning'
  | 'recrossing'
  | 'landing';

export type VoyagePage = 'main' | 'island';

export const VOYAGE_PAGE: Record<VoyagePhase, VoyagePage> = {
  home: 'main',
  leaving: 'main',
  crossing: 'island',
  arriving: 'island',
  island: 'island',
  returning: 'island',
  recrossing: 'main',
  landing: 'main',
};

export function isTravelling(phase: VoyagePhase): boolean {
  return phase !== 'home' && phase !== 'island';
}

export interface VoyageTiming {
  moves: boolean;
  leaveMs: number;
  cloudsInMs: number;
  crossingMinMs: number;
  crossingMaxMs: number;
  arriveMs: number;
  cloudsOutMs: number;
  returnMs: number;
  recrossingMs: number;
  landMs: number;
}

export const VOYAGE_TIMING: { full: VoyageTiming; reduced: VoyageTiming } = {
  full: {
    moves: true,
    leaveMs: 1700,
    cloudsInMs: 850,
    crossingMinMs: 80,
    crossingMaxMs: 800,
    arriveMs: 1300,
    cloudsOutMs: 800,
    returnMs: 600,
    recrossingMs: 120,
    landMs: 1300,
  },
  reduced: {
    moves: false,
    leaveMs: 260,
    cloudsInMs: 260,
    crossingMinMs: 60,
    crossingMaxMs: 800,
    arriveMs: 320,
    cloudsOutMs: 320,
    returnMs: 260,
    recrossingMs: 60,
    landMs: 320,
  },
};

export function voyageTiming(reduceMotion: boolean): VoyageTiming {
  return reduceMotion ? VOYAGE_TIMING.reduced : VOYAGE_TIMING.full;
}

export const VOYAGE_MOTION = {
  rowWindow: 0.22,
  rowStagger: 0.04,
  rowLift: 0.5,
  barWindow: 0.18,
  zoomFrom: 0.2,
  zoomOvershoot: 1.06,
  fogFrom: 0.45,
  fogClear: 0.45,
  puffFade: 0.35,
  puffHold: 1.15,
  puffClear: 0.7,
  islandPush: 0.12,
  sunRiseFrom: 0.2,
  sunSpring: 1.1,
  chromeFrom: 0.72,
} as const;

export const VOYAGE_COVER = '#F3F6FF';

export type RowExit = 'up' | 'left' | 'right';

export interface VoyageRow {
  order: number;
  exit: RowExit;
}

export const VOYAGE_ROWS = {
  chrome: { order: 0, exit: 'up' },
  greeting: { order: 0, exit: 'up' },
  story: { order: 1, exit: 'left' },
  journey: { order: 2, exit: 'right' },
  stats: { order: 3, exit: 'left' },
  plan: { order: 4, exit: 'right' },
} as const satisfies Record<string, VoyageRow>;

export interface RowPose {
  translateX: number;
  translateY: number;
  opacity: number;
}

function clamp01(value: number): number {
  'worklet';
  if (!(value > 0)) return 0;
  return value >= 1 ? 1 : value;
}

function easeIn(value: number): number {
  'worklet';
  return value * value * value;
}

function easeOut(value: number): number {
  'worklet';
  const left = 1 - value;
  return 1 - left * left * left;
}

function smooth(value: number): number {
  'worklet';
  return value * value * (3 - 2 * value);
}

export function rowPose(travel: number, order: number, exit: RowExit, width: number, height: number): RowPose {
  'worklet';
  const local = clamp01((travel - order * VOYAGE_MOTION.rowStagger) / VOYAGE_MOTION.rowWindow);
  if (local === 0) return { translateX: 0, translateY: 0, opacity: 1 };

  const gone = easeIn(local);
  const across = exit === 'left' ? -gone * width : exit === 'right' ? gone * width : 0;
  const up = exit === 'up' ? -gone * height * VOYAGE_MOTION.rowLift : 0;

  return { translateX: across, translateY: up, opacity: 1 - local };
}

export function barSink(travel: number): number {
  'worklet';
  return easeIn(clamp01(travel / VOYAGE_MOTION.barWindow));
}

export function voyageMaxZoom(width: number, height: number): number {
  const radius = earthDiameter(width, height) / 2;
  if (!(radius > 0) || !Number.isFinite(radius)) return 1;

  return (Math.hypot(width / 2, height) / radius) * VOYAGE_MOTION.zoomOvershoot;
}

export function zoomScale(travel: number, maxZoom: number): number {
  'worklet';
  const local = clamp01((travel - VOYAGE_MOTION.zoomFrom) / (1 - VOYAGE_MOTION.zoomFrom));

  return 1 + (maxZoom - 1) * local * local;
}

export interface CloudPuff {
  x: number;
  y: number;
  size: number;
  lag: number;
}

export const CLOUD_PUFFS: readonly CloudPuff[] = [
  { x: -0.34, y: -0.3, size: 0.62, lag: 0 },
  { x: 0.36, y: -0.24, size: 0.58, lag: 0.08 },
  { x: -0.4, y: 0.06, size: 0.7, lag: 0.04 },
  { x: 0.42, y: 0.12, size: 0.66, lag: 0.12 },
  { x: -0.22, y: 0.36, size: 0.74, lag: 0.02 },
  { x: 0.26, y: 0.4, size: 0.72, lag: 0.1 },
  { x: 0.02, y: -0.44, size: 0.6, lag: 0.06 },
  { x: -0.02, y: 0.16, size: 0.8, lag: 0.14 },
];

export interface PuffPose {
  translateX: number;
  translateY: number;
  scale: number;
  opacity: number;
}

export function puffPose(clouds: number, index: number, width: number, height: number): PuffPose {
  'worklet';
  const puff = CLOUD_PUFFS[index];
  if (!puff) return { translateX: 0, translateY: 0, scale: 1, opacity: 0 };

  const through = clouds > 0 ? (clouds >= 2 ? 2 : clouds) : 0;
  const entering = through <= 1;
  const reach = entering ? 0.3 + 0.7 * through : 1 + 1.3 * (through - 1);
  const scale = entering ? 0.4 + 0.9 * through : 1.3 + 1.5 * (through - 1);
  const opacity = entering
    ? clamp01((through - puff.lag) / VOYAGE_MOTION.puffFade)
    : 1 - clamp01((through - VOYAGE_MOTION.puffHold) / VOYAGE_MOTION.puffClear);

  return { translateX: puff.x * width * reach, translateY: puff.y * height * reach, scale, opacity };
}

export function fogOpacity(clouds: number): number {
  'worklet';
  if (!(clouds > 0)) return 0;
  if (clouds <= 1) return smooth(clamp01((clouds - VOYAGE_MOTION.fogFrom) / (1 - VOYAGE_MOTION.fogFrom)));

  return 1 - smooth(clamp01((clouds - 1) / VOYAGE_MOTION.fogClear));
}

export function islandScale(arrival: number): number {
  'worklet';
  return 1 + VOYAGE_MOTION.islandPush * (1 - easeOut(clamp01(arrival)));
}

export function sunRise(arrival: number, riseFrom: number): number {
  'worklet';
  const local = clamp01((arrival - VOYAGE_MOTION.sunRiseFrom) / (1 - VOYAGE_MOTION.sunRiseFrom));
  const back = local - 1;
  const risen = 1 + (VOYAGE_MOTION.sunSpring + 1) * back * back * back + VOYAGE_MOTION.sunSpring * back * back;

  return riseFrom * (1 - risen);
}

export const CHROME_TRACE = 0.01;

export function chromeOpacity(arrival: number): number {
  'worklet';
  return Math.max(CHROME_TRACE, clamp01((arrival - VOYAGE_MOTION.chromeFrom) / (1 - VOYAGE_MOTION.chromeFrom)));
}
