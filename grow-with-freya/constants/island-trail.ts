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

export const CHECKPOINT_LABEL_GAP = 4;
export const CHECKPOINT_LABEL_CLEARANCE = 8;

export function checkpointLabelTop(centreY: number, radius: number, labelHeight: number, floor: number): { top: number; above: boolean } {
  const below = centreY + radius + CHECKPOINT_LABEL_GAP;
  if (below + labelHeight <= floor) return { top: below, above: false };
  return { top: centreY - radius - CHECKPOINT_LABEL_GAP - labelHeight, above: true };
}

export const TRAIL_DASH: DashSpacing = { length: 26, gap: 16, inset: 40 };

const SAMPLES_PER_LEG = 40;

function catmullRom(before: TrailPoint, from: TrailPoint, to: TrailPoint, after: TrailPoint, t: number): TrailPoint {
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: 0.5 * (2 * from.x + (-before.x + to.x) * t + (2 * before.x - 5 * from.x + 4 * to.x - after.x) * t2 + (-before.x + 3 * from.x - 3 * to.x + after.x) * t3),
    y: 0.5 * (2 * from.y + (-before.y + to.y) * t + (2 * before.y - 5 * from.y + 4 * to.y - after.y) * t2 + (-before.y + 3 * from.y - 3 * to.y + after.y) * t3),
  };
}

export function trailPath(points: readonly TrailPoint[], samplesPerLeg: number = SAMPLES_PER_LEG): TrailPoint[] {
  if (points.length < 2) return [];

  const path: TrailPoint[] = [];
  for (let leg = 0; leg < points.length - 1; leg += 1) {
    const before = points[leg - 1] ?? points[leg];
    const from = points[leg];
    const to = points[leg + 1];
    const after = points[leg + 2] ?? to;
    for (let sample = 0; sample < samplesPerLeg; sample += 1) {
      path.push(sample === 0 ? from : catmullRom(before, from, to, after, sample / samplesPerLeg));
    }
  }
  path.push(points[points.length - 1]);

  return path;
}

interface LegOfPath {
  start: number;
  end: number;
}

export function trailDashes(points: readonly TrailPoint[], spacing: DashSpacing): TrailDash[] {
  const path = trailPath(points);
  if (path.length === 0) return [];

  const along: number[] = [0];
  for (let index = 1; index < path.length; index += 1) {
    along.push(along[index - 1] + Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y));
  }

  const legs: LegOfPath[] = [];
  for (let leg = 0; leg < points.length - 1; leg += 1) {
    legs.push({ start: along[leg * SAMPLES_PER_LEG], end: along[(leg + 1) * SAMPLES_PER_LEG] });
  }

  const dashes: TrailDash[] = [];
  legs.forEach(({ start, end }, leg) => {
    const room = end - start - spacing.inset * 2;
    if (room < spacing.length) return;

    const count = Math.floor((room - spacing.length) / (spacing.length + spacing.gap)) + 1;
    const slack = (room - (count * spacing.length + (count - 1) * spacing.gap)) / 2;
    for (let dash = 0; dash < count; dash += 1) {
      const centre = start + spacing.inset + slack + spacing.length / 2 + dash * (spacing.length + spacing.gap);
      dashes.push({ ...placeAlong(path, along, centre), leg });
    }
  });

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
