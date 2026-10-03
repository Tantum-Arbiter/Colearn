import { CHECKPOINT_DIAMETER_PHONE, CHECKPOINT_DIAMETER_TABLET } from '@/components/island/plan-checkpoint';
import { PLAN_CARD, planCardTop } from '@/components/island/plan-panel';
import { ISLAND_ART } from '@/constants/island-art';
import { artPoint, islandLayout } from '@/constants/island-scene';
import { PLAN_STEPS_PER_WEEK } from '@/constants/learning-plan';
import {
  CHECKPOINT_LABEL_CLEARANCE,
  CHECKPOINT_LABEL_GAP,
  CHECKPOINT_SHAPE,
  checkpointReachAbove,
  ISLAND_TRAIL,
  ISLAND_TRAIL_VIA,
  TRAIL_DASH,
  checkpointLabelTop,
  trailDashes,
  trailPath,
  type TrailPoint,
} from '@/constants/island-trail';

const BRIDGE = { left: 205, right: 370, top: 935, bottom: 1000 };
const TOP_RIGHT_ISLET = { left: 850, right: 990, top: 395, bottom: 465 };
const PHONE_SEES = { left: 300, right: 940 };
const PHONE = { width: 390, height: 844, topInset: 59, bottomInset: 34 };

describe('the trail across the island', () => {
  it('has one checkpoint for each day of the week', () => {
    expect(ISLAND_TRAIL).toHaveLength(PLAN_STEPS_PER_WEEK);
  });

  it('starts on the islet at the top right and ends at the bridge', () => {
    const first = ISLAND_TRAIL[0];
    const last = ISLAND_TRAIL[ISLAND_TRAIL.length - 1];

    expect(first.x).toBeGreaterThanOrEqual(TOP_RIGHT_ISLET.left);
    expect(first.x).toBeLessThanOrEqual(TOP_RIGHT_ISLET.right);
    expect(first.y).toBeGreaterThanOrEqual(TOP_RIGHT_ISLET.top);
    expect(first.y).toBeLessThanOrEqual(TOP_RIGHT_ISLET.bottom);
    expect(last.x).toBeGreaterThanOrEqual(BRIDGE.right - 20);
    expect(last.x).toBeLessThanOrEqual(BRIDGE.right + 30);
    expect(last.y).toBeGreaterThanOrEqual(BRIDGE.top);
    expect(last.y).toBeLessThanOrEqual(BRIDGE.bottom);
  });

  it('trails down the island, each checkpoint lower than the one before it, until the bridge', () => {
    for (let index = 1; index < ISLAND_TRAIL.length - 1; index += 1) {
      expect(ISLAND_TRAIL[index].y).toBeGreaterThan(ISLAND_TRAIL[index - 1].y);
    }
  });

  it('winds from side to side rather than running straight', () => {
    const turns = ISLAND_TRAIL.slice(2).filter((point, index) => {
      const before = ISLAND_TRAIL[index + 1].x - ISLAND_TRAIL[index].x;
      const after = point.x - ISLAND_TRAIL[index + 1].x;
      return Math.sign(before) !== Math.sign(after);
    });

    expect(turns.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps every checkpoint within the painting, and within what a phone can show', () => {
    ISLAND_TRAIL.forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(PHONE_SEES.left);
      expect(point.x).toBeLessThanOrEqual(PHONE_SEES.right);
      expect(point.y).toBeGreaterThan(ISLAND_ART.seaLine);
      expect(point.y).toBeLessThan(ISLAND_ART.height * 0.76);
    });
  });

  const PLACES = ['Story Time', 'Word Garden', 'Maths Meadow', 'Feelings Cove', 'Music Grove', 'Story Corner', 'Story Bridge'];
  const LABEL_HEIGHT = 24;
  type Box = { left: number; right: number; top: number; bottom: number };
  const apart = (a: Box, b: Box) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;

  function phoneMap() {
    const layout = islandLayout(PHONE);
    const cardTop = planCardTop(PHONE.height, PHONE.bottomInset, PLAN_CARD.phoneHeight);
    const radius = CHECKPOINT_DIAMETER_PHONE / 2;
    const boxes = ISLAND_TRAIL.map((point, index) => {
      const centre = artPoint(point.x, point.y, layout);
      const width = Math.round(PLACES[index].length * 11 * 0.56 + 28);
      const left = Math.min(Math.max(centre.x - width / 2, 8), PHONE.width - 8 - width);
      const label = checkpointLabelTop(centre.y, CHECKPOINT_DIAMETER_PHONE, LABEL_HEIGHT, cardTop - CHECKPOINT_LABEL_CLEARANCE);
      return {
        centre,
        above: label.above,
        disc: { left: centre.x - radius, right: centre.x + radius, top: centre.y - checkpointReachAbove(CHECKPOINT_DIAMETER_PHONE), bottom: centre.y + radius },
        label: { left, right: left + width, top: label.top, bottom: label.top + LABEL_HEIGHT },
      };
    });
    return { cardTop, boxes };
  }

  it('keeps every disc and every label clear of the step card, and every disc clear of the edges, on a phone', () => {
    const { cardTop, boxes } = phoneMap();
    const sideRoom = CHECKPOINT_DIAMETER_PHONE / 2 + 8;

    boxes.forEach((box) => {
      expect(box.disc.bottom).toBeLessThanOrEqual(cardTop - 4);
      expect(box.label.bottom).toBeLessThanOrEqual(cardTop - 4);
      expect(box.centre.x).toBeGreaterThanOrEqual(sideRoom);
      expect(box.centre.x).toBeLessThanOrEqual(PHONE.width - sideRoom);
    });
  });

  it('lifts the names of the last two checkpoints above their circles on a phone, and no others', () => {
    const { boxes } = phoneMap();

    expect(boxes.map((box) => box.above)).toEqual([false, false, false, false, false, true, true]);
  });

  function dashesSeenOn(screen: { width: number; height: number; topInset: number; bottomInset: number }, diameter: number, font: number, cardHeight: number) {
    const layout = islandLayout(screen);
    const radius = diameter / 2;
    const labelHeight = Math.round(font * 1.25 + 8);
    const floor = planCardTop(screen.height, screen.bottomInset, cardHeight) - CHECKPOINT_LABEL_CLEARANCE;
    const badge = (diameter * CHECKPOINT_SHAPE.badge) / 2;
    const circles = ISLAND_TRAIL.flatMap((point) => {
      const centre = artPoint(point.x, point.y, layout);
      return [
        { x: centre.x, y: centre.y, r: radius },
        { x: centre.x, y: centre.y - radius - diameter * CHECKPOINT_SHAPE.badgeRise, r: badge },
      ];
    });
    const labels: Box[] = ISLAND_TRAIL.map((point, index) => {
      const centre = artPoint(point.x, point.y, layout);
      const width = Math.round(PLACES[index].length * font * 0.56 + 28);
      const left = Math.min(Math.max(centre.x - width / 2, 8), screen.width - 8 - width);
      const top = checkpointLabelTop(centre.y, diameter, labelHeight, floor).top;
      return { left, right: left + width, top, bottom: top + labelHeight };
    });
    const seen = new Map<number, { shown: number; all: number }>();
    trailDashes(ISLAND_TRAIL, TRAIL_DASH, ISLAND_TRAIL_VIA).forEach((dash) => {
      const at = artPoint(dash.x, dash.y, layout);
      const hidden =
        circles.some((circle) => Math.hypot(at.x - circle.x, at.y - circle.y) <= circle.r + 4) ||
        labels.some((box) => at.x >= box.left - 4 && at.x <= box.right + 4 && at.y >= box.top - 4 && at.y <= box.bottom + 4);
      const leg = seen.get(dash.leg) ?? { shown: 0, all: 0 };
      seen.set(dash.leg, { shown: leg.shown + (hidden ? 0 : 1), all: leg.all + 1 });
    });
    return [...seen.values()];
  }

  it('shows every leg of the trail on a phone, wound round the names rather than under them', () => {
    const legs = dashesSeenOn(PHONE, CHECKPOINT_DIAMETER_PHONE, 11, PLAN_CARD.phoneHeight);

    expect(legs).toHaveLength(ISLAND_TRAIL.length - 1);
    legs.forEach((leg) => {
      expect(leg.shown).toBeGreaterThanOrEqual(4);
      expect(leg.shown).toBe(leg.all);
    });
  });

  it('shows every dash of the trail on a tablet', () => {
    const legs = dashesSeenOn({ width: 834, height: 1210, topInset: 24, bottomInset: 20 }, CHECKPOINT_DIAMETER_TABLET, 13, PLAN_CARD.tabletHeight);

    legs.forEach((leg) => expect(leg.shown).toBe(leg.all));
  });

  it('keeps every dash above the step card on a phone', () => {
    const layout = islandLayout(PHONE);
    const cardTop = planCardTop(PHONE.height, PHONE.bottomInset, PLAN_CARD.phoneHeight);

    trailDashes(ISLAND_TRAIL, TRAIL_DASH, ISLAND_TRAIL_VIA).forEach((dash) => {
      expect(artPoint(dash.x, dash.y, layout).y).toBeLessThan(cardTop - 12);
    });
  });

  it('keeps every label clear of every other disc and label on a phone', () => {
    const { boxes } = phoneMap();

    boxes.forEach((box, index) => {
      boxes.forEach((other, otherIndex) => {
        if (index === otherIndex) return;
        expect(apart(box.label, other.disc)).toBe(true);
        expect(apart(box.label, other.label)).toBe(true);
        expect(apart(box.disc, other.disc)).toBe(true);
      });
    });
  });

  it('keeps the checkpoints well apart', () => {
    ISLAND_TRAIL.forEach((point, index) => {
      ISLAND_TRAIL.slice(index + 1).forEach((other) => {
        expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeGreaterThan(110);
      });
    });
  });
});

describe('checkpointLabelTop', () => {
  const DIAMETER = 56;
  const tucked = (centreY: number) => centreY + DIAMETER / 2 - DIAMETER * CHECKPOINT_SHAPE.labelOverlap;

  it('tucks a label over the foot of its circle when there is room above the floor', () => {
    const label = checkpointLabelTop(100, DIAMETER, 24, 200);

    expect(label.above).toBe(false);
    expect(label.top).toBeCloseTo(tucked(100), 6);
    expect(label.top).toBeLessThan(100 + DIAMETER / 2);
  });

  it('sets it over the number badge when tucking it would cross the floor', () => {
    const label = checkpointLabelTop(180, DIAMETER, 24, 200);

    expect(label.above).toBe(true);
    expect(label.top + 24).toBeCloseTo(180 - checkpointReachAbove(DIAMETER) - CHECKPOINT_LABEL_GAP, 6);
  });

  it('tucks it under when it ends exactly on the floor', () => {
    expect(checkpointLabelTop(100, DIAMETER, 24, tucked(100) + 24).above).toBe(false);
  });

  it('tucks it under when there is no floor', () => {
    expect(checkpointLabelTop(800, DIAMETER, 24, Number.POSITIVE_INFINITY)).toEqual({ top: tucked(800), above: false });
  });
});

describe('checkpointReachAbove', () => {
  it('reaches from the centre to the top of the number badge, which sits on the circle`s top edge', () => {
    const DIAMETER = 56;

    expect(checkpointReachAbove(DIAMETER)).toBeCloseTo(
      DIAMETER / 2 + DIAMETER * CHECKPOINT_SHAPE.badgeRise + (DIAMETER * CHECKPOINT_SHAPE.badge) / 2,
      6
    );
    expect(checkpointReachAbove(DIAMETER)).toBeGreaterThan(DIAMETER / 2);
  });
});

describe('trailPath', () => {
  const SQUARE: TrailPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];

  it('passes through every checkpoint, in order', () => {
    const path = trailPath(SQUARE, 20);

    SQUARE.forEach((point, index) => {
      expect(path[index * 20]).toEqual(point);
    });
    expect(path).toHaveLength(3 * 20 + 1);
  });

  it('runs straight from checkpoint to checkpoint where no guide point bends it', () => {
    const path = trailPath(SQUARE, 20);

    path.slice(0, 21).forEach((point) => expect(point.y).toBeCloseTo(0, 6));
  });

  it('bends through the guide points between two checkpoints', () => {
    const path = trailPath([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10, [[{ x: 50, y: 30 }]]);

    expect(path[10]).toEqual({ x: 50, y: 30 });
    expect(path[5].y).toBeGreaterThan(0);
    expect(path[15].y).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 100, y: 0 });
    expect(path).toHaveLength(2 * 10 + 1);
  });

  it('sets off from a checkpoint heading for the leg`s first guide point', () => {
    const path = trailPath([{ x: 0, y: 0 }, { x: 100, y: 100 }], 10, [[{ x: 100, y: 0 }]]);

    const heading = (Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x) * 180) / Math.PI;

    expect(Math.abs(heading)).toBeLessThan(6);
    expect(path[1].x).toBeGreaterThan(5);
  });

  it('lets each leg set off on its own, so turning back at a checkpoint does not swing the next leg past it', () => {
    const path = trailPath([{ x: 100, y: 0 }, { x: 0, y: 0 }, { x: 50, y: 40 }], 20);

    path.slice(20).forEach((point) => expect(point.x).toBeGreaterThanOrEqual(-1e-9));
  });

  it('is a straight line between two checkpoints', () => {
    const path = trailPath([{ x: 0, y: 0 }, { x: 100, y: 50 }], 10);

    path.forEach((point) => expect(point.y).toBeCloseTo(point.x / 2, 6));
  });

  it('has nothing to draw for one checkpoint or none', () => {
    expect(trailPath([{ x: 5, y: 5 }], 10)).toEqual([]);
    expect(trailPath([], 10)).toEqual([]);
  });
});

describe('trailDashes', () => {
  const LINE: TrailPoint[] = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 600, y: 0 }];

  it('lays dashes along the trail, a dash and a gap apart, set evenly within each leg', () => {
    const dashes = trailDashes(LINE, { length: 30, gap: 20, inset: 0 });
    const firstLeg = dashes.filter((dash) => dash.leg === 0);

    expect(firstLeg).toHaveLength(6);
    firstLeg.slice(1).forEach((dash, index) => expect(dash.x - firstLeg[index].x).toBeCloseTo(50, 6));
    expect(firstLeg[0].x + firstLeg[firstLeg.length - 1].x).toBeCloseTo(300, 6);
    expect(firstLeg[0].x).toBeGreaterThanOrEqual(15);
    expect(dashes.every((dash) => Math.abs(dash.y) < 1e-6)).toBe(true);
    expect(dashes.every((dash) => Math.abs(dash.angle) < 1e-6)).toBe(true);
  });

  it('lies each dash along the way it is going', () => {
    const dashes = trailDashes([{ x: 0, y: 0 }, { x: 0, y: 300 }], { length: 30, gap: 20, inset: 0 });

    expect(dashes[0].angle).toBeCloseTo(90, 3);
  });

  it('leaves room at each checkpoint, so no dash sits under a marker', () => {
    const dashes = trailDashes(LINE, { length: 30, gap: 20, inset: 40 });

    dashes.forEach((dash) => {
      LINE.forEach((point) => {
        expect(Math.abs(dash.x - point.x)).toBeGreaterThanOrEqual(40 + 15 - 1e-6);
      });
    });
    expect(dashes.length).toBeGreaterThan(4);
  });

  it('says which leg of the trail each dash is on', () => {
    const dashes = trailDashes(LINE, { length: 30, gap: 20, inset: 0 });

    expect(dashes.filter((dash) => dash.leg === 0).every((dash) => dash.x < 300)).toBe(true);
    expect(dashes.filter((dash) => dash.leg === 1).every((dash) => dash.x > 300)).toBe(true);
    expect(new Set(dashes.map((dash) => dash.leg))).toEqual(new Set([0, 1]));
  });

  it('draws nothing for a trail with nowhere to go', () => {
    expect(trailDashes([{ x: 0, y: 0 }], { length: 30, gap: 20, inset: 0 })).toEqual([]);
    expect(trailDashes([{ x: 0, y: 0 }, { x: 10, y: 0 }], { length: 30, gap: 20, inset: 40 })).toEqual([]);
  });

  it('follows the guide points, numbering its dashes by the checkpoints they run between', () => {
    const LINE_WITH_BEND: TrailPoint[] = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 600, y: 0 }];
    const dashes = trailDashes(LINE_WITH_BEND, { length: 30, gap: 20, inset: 0 }, [[{ x: 150, y: 60 }], []]);

    expect(dashes.some((dash) => dash.leg === 0 && dash.y > 30)).toBe(true);
    expect(dashes.filter((dash) => dash.leg === 1).every((dash) => Math.abs(dash.y) < 1e-6)).toBe(true);
  });

  it('has one list of guide points for each leg of the island`s trail', () => {
    expect(ISLAND_TRAIL_VIA).toHaveLength(ISLAND_TRAIL.length - 1);
  });

  it('is the same dash every time for the island itself', () => {
    const once = trailDashes(ISLAND_TRAIL, TRAIL_DASH, ISLAND_TRAIL_VIA);
    const again = trailDashes(ISLAND_TRAIL, TRAIL_DASH, ISLAND_TRAIL_VIA);

    expect(again).toEqual(once);
    expect(once.length).toBeGreaterThanOrEqual(14);
    expect(once.length).toBeLessThan(80);
    expect(new Set(once.map((dash) => dash.leg)).size).toBe(ISLAND_TRAIL.length - 1);
  });
});
