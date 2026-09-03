export type EarthEdge = 'top' | 'bottom';

export const EARTH = {
  overhang: 1.18,
  maxDiameterRatio: 2.2,
  rise: { widthRatio: 0.34, heightRatio: 0.17 },
  hang: { widthRatio: 0.24, heightRatio: 0.12 },
} as const;

export interface EarthLayout {
  diameter: number;
  cap: number;
  left: number;
  top: number;
}

export function earthCap(width: number, height: number, edge: EarthEdge): number {
  const ratios = edge === 'bottom' ? EARTH.rise : EARTH.hang;

  return Math.round(Math.min(width * ratios.widthRatio, height * ratios.heightRatio));
}

export function earthDiameter(width: number, height: number): number {
  const cap = earthCap(width, height, 'bottom');
  const halfChord = (width * EARTH.overhang) / 2;
  const radius = (halfChord * halfChord + cap * cap) / (2 * cap);

  return Math.round(Math.min(radius * 2, width * EARTH.maxDiameterRatio));
}

export function earthChord(diameter: number, cap: number): number {
  const radius = diameter / 2;
  const depth = Math.min(cap, diameter);
  const halfChordSquared = radius * radius - (radius - depth) * (radius - depth);

  return 2 * Math.sqrt(Math.max(halfChordSquared, 0));
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
