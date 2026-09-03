export type EarthEdge = 'top' | 'bottom';

export const EARTH = {
  diameterWidthRatio: 0.92,
  diameterHeightRatio: 0.44,
  riseFraction: 0.5,
} as const;

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
