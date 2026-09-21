export type EarthEdge = 'top' | 'bottom';

export const EARTH = {
  diameterWidthRatio: 0.92,
  diameterHeightRatio: 0.44,
  riseFraction: 0.5,
} as const;

export const EARTH_CLOUDS = {
  aspect: 616 / 531,
  mistRatio: 0.55,
} as const;

export interface CloudLayout {
  width: number;
  height: number;
  mistHeight: number;
}

/**
 * The cloud banks belong to the globe, so they are measured from the slice of
 * globe on show rather than from the screen. Sized any other way they run far
 * past the earth they are meant to be weather for -- most of the way down a
 * landscape tablet, at the widths this used to use.
 */
export function cloudLayout(cap: number): CloudLayout {
  return {
    width: Math.round(cap / EARTH_CLOUDS.aspect),
    height: cap,
    mistHeight: Math.round(cap * EARTH_CLOUDS.mistRatio),
  };
}

export interface EarthLayout {
  diameter: number;
  cap: number;
  left: number;
  top: number;
}

export function earthDiameter(width: number, height: number): number {
  return Math.floor(Math.min(width * EARTH.diameterWidthRatio, height * EARTH.diameterHeightRatio));
}

export function earthCap(width: number, height: number, edge: EarthEdge): number {
  const diameter = earthDiameter(width, height);
  const rise = Math.round(diameter * EARTH.riseFraction);

  return edge === 'bottom' ? rise : diameter - rise;
}

export function earthLayout(width: number, height: number, edge: EarthEdge): EarthLayout {
  const diameter = earthDiameter(width, height);
  const cap = earthCap(width, height, edge);

  return {
    diameter,
    cap,
    left: Math.round((width - diameter) / 2),
    top: edge === 'bottom' ? 0 : cap - diameter,
  };
}
