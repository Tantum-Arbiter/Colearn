export const TABLET_MIN_WIDTH = 768;

export const STAR_FIELD = {
  count: 54,
  skyFraction: 0.74,
  columns: 8,
  smallRadius: 1.1,
  largeRadius: 1.9,
  largeEvery: 6,
  smallOpacity: 0.52,
  largeOpacity: 0.9,
  twinkleMinMs: 2600,
  twinkleMaxMs: 5200,
  twinkleFloor: 0.42,
} as const;

export const CLOUD_LAYER = {
  topRatio: 0.5,
  featherHeight: 64,
} as const;

export function cloudBandTop(height: number): number {
  return Math.round(height * CLOUD_LAYER.topRatio);
}

export function isWideScreen(width: number): boolean {
  return width >= TABLET_MIN_WIDTH;
}

export interface StarSeed {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleMs: number;
  delayMs: number;
}

export function buildStarField(width: number, height: number): StarSeed[] {
  const seeds: StarSeed[] = [];
  const sky = height * STAR_FIELD.skyFraction;
  const rows = Math.ceil(STAR_FIELD.count / STAR_FIELD.columns);

  for (let index = 0; index < STAR_FIELD.count; index += 1) {
    const column = index % STAR_FIELD.columns;
    const row = Math.floor(index / STAR_FIELD.columns);
    const jitterX = ((index * 37) % 29) / 29;
    const jitterY = ((index * 53) % 23) / 23;
    const isLarge = index % STAR_FIELD.largeEvery === 0;
    const twinkleSpan = STAR_FIELD.twinkleMaxMs - STAR_FIELD.twinkleMinMs;

    seeds.push({
      x: ((column + jitterX) / STAR_FIELD.columns) * width,
      y: ((row + jitterY) / rows) * sky,
      radius: isLarge ? STAR_FIELD.largeRadius : STAR_FIELD.smallRadius,
      opacity: isLarge ? STAR_FIELD.largeOpacity : STAR_FIELD.smallOpacity,
      twinkleMs: STAR_FIELD.twinkleMinMs + (((index * 71) % 17) / 17) * twinkleSpan,
      delayMs: ((index * 97) % 31) * 180,
    });
  }

  return seeds;
}
