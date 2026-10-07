import { checkpointSize } from '@/components/island/plan-checkpoint';
import { PLAN_CARD, planCardTop } from '@/components/island/plan-panel';
import { ISLAND_ART } from '@/constants/island-art';
import { ISLAND_ART_PHONE } from '@/constants/island-art-phone';
import { GULL_COURSES, GULL_COURSES_PHONE } from '@/constants/island-life';
import { PHONE_ISLAND, TABLET_ISLAND, islandMapFor, type IslandMap } from '@/constants/island-map';
import { artPoint, islandLayout } from '@/constants/island-scene';
import { PLAN_STEPS_PER_WEEK } from '@/constants/learning-plan';
import {
  CHECKPOINT_LABEL_CLEARANCE,
  CHECKPOINT_LABEL_GAP,
  CHECKPOINT_SHAPE,
  checkpointReachAbove,
  ISLAND_TRAIL,
  ISLAND_TRAIL_PHONE,
  ISLAND_TRAIL_VIA,
  ISLAND_TRAIL_VIA_PHONE,
  TRAIL_DASH,
  TRAIL_DASH_PHONE,
  checkpointLabelTop,
  trailDashes,
  trailPath,
  type TrailPoint,
} from '@/constants/island-trail';

const BRIDGE = { left: 205, right: 370, top: 935, bottom: 1000 };
const TOP_RIGHT_ISLET = { left: 850, right: 990, top: 395, bottom: 465 };
const PHONE_BRIDGE = { left: 140, right: 310, top: 1150, bottom: 1215 };
const PHONE_TOP_RIGHT_ISLET = { left: 700, right: 835, top: 640, bottom: 715 };
const PHONE_LANDMARKS = [
  { name: 'the lighthouse', left: 812, right: 860, top: 776, bottom: 895 },
  { name: 'the cottage by the mountain', left: 478, right: 535, top: 800, bottom: 850 },
  { name: 'the cottage by the flowers', left: 452, right: 522, top: 982, bottom: 1040 },
];

type Screen = { width: number; height: number; topInset: number; bottomInset: number };
type Box = { left: number; right: number; top: number; bottom: number };

const TABLETS: Record<string, Screen> = {
  'an iPad mini': { width: 744, height: 1133, topInset: 24, bottomInset: 20 },
  'an iPad Air 11': { width: 820, height: 1180, topInset: 24, bottomInset: 20 },
  'an iPad Pro 11': { width: 834, height: 1210, topInset: 24, bottomInset: 20 },
  'an iPad Pro 13': { width: 1032, height: 1376, topInset: 24, bottomInset: 20 },
};
const PHONES: Record<string, Screen> = {
  'an iPhone SE': { width: 375, height: 667, topInset: 20, bottomInset: 0 },
  'an iPhone 16e': { width: 390, height: 844, topInset: 47, bottomInset: 34 },
  'an iPhone 16 Pro': { width: 402, height: 874, topInset: 62, bottomInset: 34 },
  'an iPhone 16 Pro Max': { width: 440, height: 956, topInset: 62, bottomInset: 34 },
  'a 412-point Android phone': { width: 412, height: 915, topInset: 24, bottomInset: 24 },
  'a 360-point Android phone': { width: 360, height: 800, topInset: 24, bottomInset: 16 },
};
const PLACES = ['Story Time', 'Word Garden', 'Maths Meadow', 'Feelings Cove', 'Music Grove', 'Story Corner', 'Story Bridge'];
const apart = (a: Box, b: Box) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;

function mapOn(screen: Screen, map: IslandMap, isTablet: boolean) {
  const layout = islandLayout(screen, map.art);
  const { diameter, font } = checkpointSize(isTablet, screen.height);
  const radius = diameter / 2;
  const labelHeight = Math.round(font * 1.25 + 8);
  const cardTop = planCardTop(screen.height, screen.bottomInset, isTablet ? PLAN_CARD.tabletHeight : PLAN_CARD.phoneHeight);
  const floor = cardTop - CHECKPOINT_LABEL_CLEARANCE;
  const boxes = map.trail.map((point, index) => {
    const centre = artPoint(point.x, point.y, layout);
    const width = Math.round(PLACES[index].length * font * 0.56 + 28);
    const left = Math.min(Math.max(centre.x - width / 2, 8), screen.width - 8 - width);
    const label = checkpointLabelTop(centre.y, diameter, labelHeight, floor);
    return {
      centre,
      disc: { left: centre.x - radius, right: centre.x + radius, top: centre.y - checkpointReachAbove(diameter), bottom: centre.y + radius },
      label: { left, right: left + width, top: label.top, bottom: label.top + labelHeight },
    };
  });
  const badge = (diameter * CHECKPOINT_SHAPE.badge) / 2;
  const legs = new Map<number, { shown: number; all: number }>();
  const dashes = trailDashes(map.trail, map.dash, map.via).map((dash) => artPoint(dash.x, dash.y, layout));
  trailDashes(map.trail, map.dash, map.via).forEach((dash, index) => {
    const at = dashes[index];
    const hidden = boxes.some(
      (box) =>
        Math.hypot(at.x - box.centre.x, at.y - box.centre.y) <= radius + 4 ||
        Math.hypot(at.x - box.centre.x, at.y - (box.centre.y - radius - diameter * CHECKPOINT_SHAPE.badgeRise)) <= badge + 4 ||
        (at.x >= box.label.left - 4 && at.x <= box.label.right + 4 && at.y >= box.label.top - 4 && at.y <= box.label.bottom + 4)
    );
    const leg = legs.get(dash.leg) ?? { shown: 0, all: 0 };
    legs.set(dash.leg, { shown: leg.shown + (hidden ? 0 : 1), all: leg.all + 1 });
  });
  return { layout, cardTop, radius, boxes, dashes, legs: [...legs.values()] };
}

function staysClear(name: string, screen: Screen, map: IslandMap, isTablet: boolean) {
  it(`keeps every circle and name clear of each other, of the step card and of the edges on ${name}`, () => {
    const { cardTop, radius, boxes } = mapOn(screen, map, isTablet);

    boxes.forEach((box, index) => {
      expect(box.disc.bottom).toBeLessThanOrEqual(cardTop - 4);
      expect(box.label.bottom).toBeLessThanOrEqual(cardTop - 4);
      expect(box.centre.x).toBeGreaterThanOrEqual(radius + 8);
      expect(box.centre.x).toBeLessThanOrEqual(screen.width - radius - 8);
      expect(box.disc.top).toBeGreaterThanOrEqual(screen.topInset + 64);
      boxes.slice(index + 1).forEach((other) => {
        expect(apart(box.disc, other.disc)).toBe(true);
        expect(apart(box.disc, other.label)).toBe(true);
        expect(apart(box.label, other.disc)).toBe(true);
        expect(apart(box.label, other.label)).toBe(true);
      });
    });
  });

  it(`keeps every dash above the step card on ${name}`, () => {
    const { cardTop, dashes } = mapOn(screen, map, isTablet);

    dashes.forEach((dash) => expect(dash.y).toBeLessThan(cardTop - 12));
  });
}

describe('the tablet trail', () => {
  it('is the trail a tablet is given, on its own painting', () => {
    expect(islandMapFor(true).trail).toBe(ISLAND_TRAIL);
    expect(islandMapFor(true).art).toBe(ISLAND_ART);
  });

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

  it('keeps every checkpoint below the sea line and above the foot of the painting', () => {
    ISLAND_TRAIL.forEach((point) => {
      expect(point.y).toBeGreaterThan(ISLAND_ART.seaLine);
      expect(point.y).toBeLessThan(ISLAND_ART.height * 0.76);
    });
  });

  it('keeps the checkpoints well apart', () => {
    ISLAND_TRAIL.forEach((point, index) => {
      ISLAND_TRAIL.slice(index + 1).forEach((other) => {
        expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeGreaterThan(110);
      });
    });
  });

  Object.entries(TABLETS).forEach(([name, screen]) => {
    staysClear(name, screen, TABLET_ISLAND, true);

    it(`shows every leg of the trail on ${name}`, () => {
      const { legs } = mapOn(screen, TABLET_ISLAND, true);

      expect(legs).toHaveLength(ISLAND_TRAIL.length - 1);
      legs.forEach((leg) => expect(leg.shown).toBeGreaterThanOrEqual(4));
    });
  });

  it('shows every dash of the trail on an iPad Pro 11', () => {
    mapOn(TABLETS['an iPad Pro 11'], TABLET_ISLAND, true).legs.forEach((leg) => expect(leg.shown).toBe(leg.all));
  });
});

describe('the phone trail', () => {
  it('is the trail a phone is given, on the painting made for a tall screen', () => {
    expect(islandMapFor(false).trail).toBe(ISLAND_TRAIL_PHONE);
    expect(islandMapFor(false).art).toBe(ISLAND_ART_PHONE);
    expect(ISLAND_ART_PHONE.width / ISLAND_ART_PHONE.height).toBeLessThan(ISLAND_ART.width / ISLAND_ART.height);
  });

  it('flies the phone painting`s own gulls, and the tablet the tablet`s', () => {
    expect(PHONE_ISLAND.gulls).toBe(GULL_COURSES_PHONE);
    expect(TABLET_ISLAND.gulls).toBe(GULL_COURSES);
  });

  it('has one checkpoint for each day of the week, and one list of guide points for each leg', () => {
    expect(ISLAND_TRAIL_PHONE).toHaveLength(PLAN_STEPS_PER_WEEK);
    expect(ISLAND_TRAIL_VIA_PHONE).toHaveLength(PLAN_STEPS_PER_WEEK - 1);
  });

  it('starts on the islet at the top right and ends at the head of the bridge, above it', () => {
    const first = ISLAND_TRAIL_PHONE[0];
    const last = ISLAND_TRAIL_PHONE[ISLAND_TRAIL_PHONE.length - 1];

    expect(first.x).toBeGreaterThanOrEqual(PHONE_TOP_RIGHT_ISLET.left);
    expect(first.x).toBeLessThanOrEqual(PHONE_TOP_RIGHT_ISLET.right);
    expect(first.y).toBeGreaterThanOrEqual(PHONE_TOP_RIGHT_ISLET.top);
    expect(first.y).toBeLessThanOrEqual(PHONE_TOP_RIGHT_ISLET.bottom);
    expect(last.x).toBeGreaterThanOrEqual(PHONE_BRIDGE.left);
    expect(last.x).toBeLessThanOrEqual(PHONE_BRIDGE.right);
    expect(last.y).toBeLessThan(PHONE_BRIDGE.top);
    expect(last.y).toBeGreaterThan(PHONE_BRIDGE.top - 150);
  });

  it('snakes down the island: along the top, back across the middle, and home along the foot', () => {
    const [one, two, three, four, five, six, seven] = ISLAND_TRAIL_PHONE;

    expect(two.x).toBeLessThan(one.x);
    expect(three.x).toBeLessThan(two.x);
    expect(four.x).toBeGreaterThan(three.x);
    expect(five.x).toBeGreaterThan(four.x);
    expect(six.x).toBeLessThan(five.x);
    expect(seven.x).toBeLessThan(six.x);
    expect(Math.max(one.y, two.y, three.y)).toBeLessThan(Math.min(four.y, five.y, six.y, seven.y));
  });

  it('keeps every checkpoint below the horizon and off the lighthouse and the cottages', () => {
    ISLAND_TRAIL_PHONE.forEach((point) => {
      expect(point.y).toBeGreaterThan(ISLAND_ART_PHONE.seaLine + 40);
      PHONE_LANDMARKS.forEach((landmark) => {
        const away = Math.hypot(
          Math.max(landmark.left - point.x, 0, point.x - landmark.right),
          Math.max(landmark.top - point.y, 0, point.y - landmark.bottom)
        );
        expect(away).toBeGreaterThan(50);
      });
    });
  });

  it('sizes its dashes for the phone painting, so they look as big on a phone as the tablet trail did', () => {
    expect(PHONE_ISLAND.trailScale).toBeCloseTo(1.2, 6);
    expect(TRAIL_DASH_PHONE.length / TRAIL_DASH.length).toBeCloseTo(PHONE_ISLAND.trailScale, 0);
    expect(TRAIL_DASH_PHONE.gap / TRAIL_DASH.gap).toBeCloseTo(PHONE_ISLAND.trailScale, 1);
  });

  Object.entries(PHONES).forEach(([name, screen]) => {
    staysClear(name, screen, PHONE_ISLAND, false);

    it(`starts each leg clear of the circles on ${name}`, () => {
      const { layout, radius } = mapOn(screen, PHONE_ISLAND, false);

      expect(TRAIL_DASH_PHONE.inset * layout.scale).toBeGreaterThanOrEqual(radius + 4);
    });

    it(`shows every leg of the trail on ${name}, at least three dashes of each`, () => {
      const { legs } = mapOn(screen, PHONE_ISLAND, false);

      expect(legs).toHaveLength(ISLAND_TRAIL_PHONE.length - 1);
      legs.forEach((leg) => expect(leg.shown).toBeGreaterThanOrEqual(3));
    });
  });

  it.each(Object.keys(PHONES).filter((name) => name !== 'an iPhone SE'))('shows every dash of the trail on %s', (name) => {
    mapOn(PHONES[name], PHONE_ISLAND, false).legs.forEach((leg) => expect(leg.shown).toBe(leg.all));
  });

  it('keeps its circles inside what the narrowest phone shows of the painting', () => {
    const narrowest = islandLayout(PHONES['a 360-point Android phone'], ISLAND_ART_PHONE);
    const { diameter } = checkpointSize(false, PHONES['a 360-point Android phone'].height);

    ISLAND_TRAIL_PHONE.forEach((point) => {
      const x = artPoint(point.x, point.y, narrowest).x;
      expect(x).toBeGreaterThanOrEqual(diameter / 2 + 8);
      expect(x).toBeLessThanOrEqual(360 - diameter / 2 - 8);
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
