export interface TrailPoint {
  readonly x: number;
  readonly y: number;
}

export interface TrailDash {
  x: number;
  y: number;
  angle: number;
  leg: number;
}

export interface DashSpacing {
  readonly length: number;
  readonly gap: number;
  readonly inset: number;
}

export const ISLAND_TRAIL: readonly TrailPoint[] = [
  { x: 852, y: 432 },
  { x: 800, y: 580 },
  { x: 530, y: 640 },
  { x: 680, y: 750 },
  { x: 834, y: 875 },
  { x: 622, y: 938 },
  { x: 374, y: 938 },
];

export const ISLAND_TRAIL_VIA: readonly (readonly TrailPoint[])[] = [
  [{ x: 752, y: 474 }],
  [{ x: 663, y: 608 }],
  [{ x: 615, y: 657 }],
  [{ x: 779, y: 774 }],
  [{ x: 726, y: 898 }],
  [{ x: 496, y: 936 }],
];

export const CHECKPOINT_LABEL_GAP = 4;
export const CHECKPOINT_LABEL_CLEARANCE = 8;

export const CHECKPOINT_SHAPE = {
  badge: 0.42,
  badgeRise: 0.04,
  labelOverlap: 0.22,
  lockWidth: 0.27,
} as const;

export function checkpointReachAbove(diameter: number): number {
  return diameter / 2 + diameter * CHECKPOINT_SHAPE.badgeRise + (diameter * CHECKPOINT_SHAPE.badge) / 2;
}

export function checkpointLabelTop(centreY: number, diameter: number, labelHeight: number, floor: number): { top: number; above: boolean } {
  const tucked = centreY + diameter / 2 - diameter * CHECKPOINT_SHAPE.labelOverlap;
  if (tucked + labelHeight <= floor) return { top: tucked, above: false };
  return { top: centreY - checkpointReachAbove(diameter) - CHECKPOINT_LABEL_GAP - labelHeight, above: true };
}

export const TRAIL_DASH: DashSpacing = { length: 13, gap: 10, inset: 52 };

const SAMPLES_PER_LEG = 40;

function catmullRom(before: TrailPoint, from: TrailPoint, to: TrailPoint, after: TrailPoint, t: number): TrailPoint {
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: 0.5 * (2 * from.x + (-before.x + to.x) * t + (2 * before.x - 5 * from.x + 4 * to.x - after.x) * t2 + (-before.x + 3 * from.x - 3 * to.x + after.x) * t3),
    y: 0.5 * (2 * from.y + (-before.y + to.y) * t + (2 * before.y - 5 * from.y + 4 * to.y - after.y) * t2 + (-before.y + 3 * from.y - 3 * to.y + after.y) * t3),
  };
}

function legPath(knots: readonly TrailPoint[], samplesPerKnot: number): TrailPoint[] {
  const path: TrailPoint[] = [];
  for (let index = 0; index < knots.length - 1; index += 1) {
    const before = knots[index - 1] ?? knots[index];
    const from = knots[index];
    const to = knots[index + 1];
    const after = knots[index + 2] ?? to;
    for (let sample = 0; sample < samplesPerKnot; sample += 1) {
      path.push(sample === 0 ? from : catmullRom(before, from, to, after, sample / samplesPerKnot));
    }
  }
  path.push(knots[knots.length - 1]);

  return path;
}

function legKnots(points: readonly TrailPoint[], vias: readonly (readonly TrailPoint[])[], leg: number): TrailPoint[] {
  return [points[leg], ...(vias[leg] ?? []), points[leg + 1]];
}

export function trailPath(
  points: readonly TrailPoint[],
  samplesPerKnot: number = SAMPLES_PER_LEG,
  vias: readonly (readonly TrailPoint[])[] = []
): TrailPoint[] {
  if (points.length < 2) return [];

  const path: TrailPoint[] = [];
  for (let leg = 0; leg < points.length - 1; leg += 1) {
    path.push(...legPath(legKnots(points, vias, leg), samplesPerKnot).slice(0, -1));
  }
  path.push(points[points.length - 1]);

  return path;
}

export function trailDashes(
  points: readonly TrailPoint[],
  spacing: DashSpacing,
  vias: readonly (readonly TrailPoint[])[] = []
): TrailDash[] {
  const dashes: TrailDash[] = [];

  for (let leg = 0; leg < points.length - 1; leg += 1) {
    const path = legPath(legKnots(points, vias, leg), SAMPLES_PER_LEG);
    const along: number[] = [0];
    for (let index = 1; index < path.length; index += 1) {
      along.push(along[index - 1] + Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y));
    }

    const room = along[along.length - 1] - spacing.inset * 2;
    if (room < spacing.length) continue;

    const count = Math.floor((room - spacing.length) / (spacing.length + spacing.gap)) + 1;
    const slack = (room - (count * spacing.length + (count - 1) * spacing.gap)) / 2;
    for (let dash = 0; dash < count; dash += 1) {
      const centre = spacing.inset + slack + spacing.length / 2 + dash * (spacing.length + spacing.gap);
      dashes.push({ ...placeAlong(path, along, centre), leg });
    }
  }

  return dashes;
}

function placeAlong(path: TrailPoint[], along: number[], distance: number): Omit<TrailDash, 'leg'> {
  let index = 1;
  while (index < along.length - 1 && along[index] < distance) index += 1;

  const from = path[index - 1];
  const to = path[index];
  const span = along[index] - along[index - 1];
  const part = span > 0 ? (distance - along[index - 1]) / span : 0;

  return {
    x: from.x + (to.x - from.x) * part,
    y: from.y + (to.y - from.y) * part,
    angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
  };
}
