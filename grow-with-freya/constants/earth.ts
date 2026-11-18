import { CLOUD_RING_ART, PLANET_ART } from '@/constants/planet-art';

export type EarthEdge = 'top' | 'bottom';

export const EARTH = {
  diameterWidthRatio: 0.92,
  diameterHeightRatio: 0.44,
  riseFraction: 0.5,
  planetHang: 1.12,
  cloudGap: { least: 0.15, most: 0.6, thin: 0.9 },
  seamOverlap: 1,
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

export interface PlanetHorizonLayout {
  width: number;
  height: number;
  left: number;
  rise: number;
  overhang: number;
}

export function planetReach(width: number, height: number, edge: EarthEdge): number {
  if (!(width > 0) || !(height > 0)) return 0;

  return earthCap(width, height, edge) * (edge === 'top' ? EARTH.planetHang : 1);
}

function paintedRoom(width: number, height: number, edge: EarthEdge): number {
  const scale = width / PLANET_ART.limbWidth;

  return (PLANET_ART.height - PLANET_ART.planetTop) * scale - planetReach(width, height, edge);
}

export function planetHorizonLayout(width: number, height: number, edge: EarthEdge = 'bottom'): PlanetHorizonLayout {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0, left: 0, rise: 0, overhang: 0 };
  const scale = width / PLANET_ART.limbWidth;
  const gap = cloudGap(width, height);
  const lean = planetReach(width, height, 'top') - planetReach(width, height, 'bottom');
  const meet = edge === 'bottom' ? (gap + lean) / 2 : (gap - lean) / 2;

  return {
    width: PLANET_ART.width * scale,
    height: PLANET_ART.height * scale,
    left: width / 2 - PLANET_ART.planetCentreX * scale,
    rise: planetReach(width, height, edge) + PLANET_ART.planetTop * scale,
    overhang: meet + EARTH.seamOverlap / 2,
  };
}

export function planetRadius(width: number): number {
  return (PLANET_ART.planetRadius * width) / PLANET_ART.limbWidth;
}

export function cloudGap(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 0;
  const wholeWorld = 2 * planetRadius(width) - planetReach(width, height, 'bottom') - planetReach(width, height, 'top');
  const bounded = Math.min(Math.max(wholeWorld, height * EARTH.cloudGap.least), height * EARTH.cloudGap.most);
  const fill = paintedRoom(width, height, 'bottom') + paintedRoom(width, height, 'top') - EARTH.seamOverlap;

  return Math.min(bounded * EARTH.cloudGap.thin, fill);
}

export interface CloudRingLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function cloudRingLayout(width: number, height: number): CloudRingLayout {
  const gap = cloudGap(width, height);
  if (!(gap > 0)) return { left: 0, top: 0, width: 0, height: 0 };
  const scale = planetRadius(width) / CLOUD_RING_ART.radius;
  const tall = CLOUD_RING_ART.height * scale;
  const squash = Math.min(1, gap / tall);
  const ringHeight = tall * squash;
  const meet = planetHorizonLayout(width, height, 'bottom').overhang;
  const top = Math.min(meet - CLOUD_RING_ART.centreY * scale * squash, gap - ringHeight);

  return {
    left: width / 2 - (CLOUD_RING_ART.width * scale) / 2,
    top,
    width: CLOUD_RING_ART.width * scale,
    height: ringHeight,
  };
}
