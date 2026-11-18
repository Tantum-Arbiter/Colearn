import { STAT_ORB, type StatOrbKind } from './stat-orbs';

export interface SpringShape {
  damping: number;
  stiffness: number;
  mass: number;
}

export interface StatPillRow {
  x: number;
  y: number;
  width: number;
}

export interface StatPillFrame {
  from: number;
  left: number;
  width: number;
  centreY: number;
}

export interface StatPillEdge {
  rim: string;
  glow: string;
  inner: string;
}

export const STAT_PILL = {
  barHeight: 0.88,
  squash: 0.72,
  squashMs: 120,
  panel: { gap: 0.1, height: 0.72, radius: 0.26, padding: 0.13 },
  eyebrow: 0.175,
  title: 0.27,
  titleShrink: 0.7,
  tag: { size: 0.17, height: 0.34, padding: 0.18, gap: 0.1 },
  medallion: 0.58,
  chevron: { size: 0.3, slot: 0.6 },
  rim: 2,
  glow: 14,
  glowTuck: 4,
  innerGlow: [2.5, 5, 8],
  jelly: {
    edges: { damping: 20, stiffness: 170, mass: 1 },
    height: { damping: 9, stiffness: 120, mass: 1 },
    fold: { damping: 24, stiffness: 200, mass: 1 },
  },
  appearMs: 90,
  coverMs: 180,
  foldSettleMs: 200,
  vanishMs: 80,
  contentDelayMs: 200,
  contentInMs: 200,
  contentOutMs: 100,
  reducedMs: 200,
} as const;

const EDGES: Record<StatOrbKind, StatPillEdge> = {
  streak: { rim: 'rgba(255, 198, 100, 0.9)', glow: '#FFA733', inner: 'rgba(255, 196, 110, 0.1)' },
  continue: { rim: 'rgba(124, 186, 255, 0.9)', glow: '#3B8CFF', inner: 'rgba(150, 200, 255, 0.1)' },
  badges: { rim: 'rgba(192, 158, 255, 0.9)', glow: '#9466FF', inner: 'rgba(196, 170, 255, 0.1)' },
};

export const STAT_PILL_TINTS = {
  fill: ['#2E6BCC', '#1B55B5', '#123FA0', '#164AAE', '#1D58C0'],
  fillStops: [0, 0.16, 0.5, 0.86, 1],
  gloss: ['rgba(255, 255, 255, 0.28)', 'rgba(255, 255, 255, 0)'],
  panel: 'rgba(6, 22, 84, 0.3)',
  panelEdge: 'rgba(170, 200, 255, 0.14)',
  eyebrow: '#FFD24A',
  title: '#FFFFFF',
  shade: 'rgba(4, 14, 60, 0.45)',
  tag: 'rgba(110, 160, 255, 0.22)',
  tagEdge: 'rgba(170, 205, 255, 0.32)',
  tagText: '#D4E3FF',
  chevron: '#FFFFFF',
  backdrop: 'rgba(3, 12, 40, 0.28)',
  edges: EDGES,
} as const;

export function dampingRatio(spring: SpringShape): number {
  return spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
}

export function springOvershoot(spring: SpringShape): number {
  const ratio = dampingRatio(spring);

  return ratio >= 1 ? 0 : Math.exp((-Math.PI * ratio) / Math.sqrt(1 - ratio * ratio));
}

export function statPillFrame(row: StatPillRow, index: number, diameter: number, width: number): StatPillFrame {
  return {
    from: row.x + index * (1 + STAT_ORB.gap) * diameter,
    left: row.x + (row.width - width) / 2,
    width,
    centreY: row.y + diameter * STAT_ORB.headroom + diameter / 2,
  };
}
