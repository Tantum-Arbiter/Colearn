/**
 * Tests for the screen-time ring maths.
 *
 * The ring is deliberately quiet: it fills once around as the day's allowance
 * is used, and only when it is full does it become something a parent notices.
 */

import { contentMargin, journeyHeaderTop } from '@/components/child-ui/tokens';
import { glanceCloseTimeline } from '@/constants/screen-time-glance-timeline';
import {
  SCREEN_TIME_RING,
  SCREEN_TIME_GLANCE,
  isScreenTimeExceeded,
  panelBorderPath,
  dropFlight,
  splashPath,
  dropStretchAt,
  SPLASH_DROPLETS,
  ringCentre,
  ringDashOffset,
  screenTimeProgress,
  splashOpacity,
  orbSquash,
  ORB_LINE_WIDTH,
  ORB_LINE_HEIGHT,
  splashRing,
  dropHandoverScale,
  SPLASH_RING_BIRTH,
  waterTurnRamp,
  WATER_TURN_MID,
  glancePanelBounds,
} from '@/constants/screen-time-ring';
import { expectSmooth } from '../utils/motion-smoothness';

const HOUR = 3600;

describe('screenTimeProgress', () => {
  it.each([
    [0, HOUR, 0],
    [HOUR / 4, HOUR, 0.25],
    [HOUR / 2, HOUR, 0.5],
    [HOUR, HOUR, 1],
  ])('should report %i of %i seconds as %f', (usage, limit, expected) => {
    const underTest = screenTimeProgress(usage, limit);

    expect(underTest).toBeCloseTo(expected);
  });

  it('should never run past full, however far over the child goes', () => {
    const underTest = screenTimeProgress(HOUR * 4, HOUR);

    expect(underTest).toBe(1);
  });

  it.each([
    ['no limit set', HOUR, 0],
    ['a negative limit', HOUR, -HOUR],
  ])('should stay empty with %s', (_case, usage, limit) => {
    const underTest = screenTimeProgress(usage, limit);

    expect(underTest).toBe(0);
  });
});

describe('isScreenTimeExceeded', () => {
  it('should be calm below the limit', () => {
    const underTest = isScreenTimeExceeded(HOUR - 1, HOUR);

    expect(underTest).toBe(false);
  });

  it('should trip the moment the limit is reached', () => {
    const underTest = isScreenTimeExceeded(HOUR, HOUR);

    expect(underTest).toBe(true);
  });

  it('should never trip when no limit is set', () => {
    const underTest = isScreenTimeExceeded(HOUR * 10, 0);

    expect(underTest).toBe(false);
  });
});

describe('ringDashOffset', () => {
  const CIRCUMFERENCE = 100;

  it.each([
    [0, 100],
    [0.25, 75],
    [1, 0],
  ])('should offset the dash by %f to %i', (progress, expected) => {
    const underTest = ringDashOffset(progress, CIRCUMFERENCE);

    expect(underTest).toBeCloseTo(expected);
  });

  it('should clamp a progress value that overshoots', () => {
    const underTest = ringDashOffset(2.5, CIRCUMFERENCE);

    expect(underTest).toBe(0);
  });
});

describe('ringCentre', () => {
  // the ring is pinned to the middle of the bottom edge, so its centre is
  // derivable rather than something that has to be measured at runtime --
  // which is what lets the glance open from the right place on first render
  it('sits in the middle of the bottom edge', () => {
    const { x } = ringCentre(400, 800, 0);

    expect(x).toBe(200);
  });

  it("follows the screen's width rather than a fixed margin", () => {
    expect(ringCentre(400, 800, 0).x).toBe(200);
    expect(ringCentre(834, 800, 0).x).toBe(417);
  });

  it('sits above the bottom margin, clear of the safe area', () => {
    const { y } = ringCentre(400, 800, 34);

    expect(y).toBe(800 - 34 - SCREEN_TIME_RING.marginBottom - SCREEN_TIME_RING.size / 2);
  });

  it('rises as the bottom inset grows', () => {
    expect(ringCentre(400, 800, 34).y).toBeLessThan(ringCentre(400, 800, 0).y);
  });
});

describe('panelBorderPath', () => {
  // the open animation draws the border as a dash-offset sweep, so the
  // reported length must match the geometry of the path it emits -- a
  // mismatch leaves the border under- or over-drawn when the sweep finishes
  const BOUNDS = { left: 14, top: 73, right: 388, bottom: 812, radius: 28 };

  const CENTRE = (BOUNDS.left + BOUNDS.right) / 2;

  it('starts on the bottom edge, directly below the ring it opens from', () => {
    // the ring sits at the bottom centre of the screen, so that is where the
    // line the orb becomes lands -- starting at the bottom-left corner made
    // a vertical line slide the width of the screen to get there
    const { d } = panelBorderPath(BOUNDS);

    expect(d.startsWith(`M ${CENTRE} ${BOUNDS.bottom}`)).toBe(true);
  });

  it('runs along the bottom first, then up the left edge', () => {
    const { d } = panelBorderPath(BOUNDS);

    expect(d.startsWith(`M ${CENTRE} ${BOUNDS.bottom} L ${BOUNDS.left + BOUNDS.radius} ${BOUNDS.bottom}`)).toBe(true);
    // and having turned the bottom-left corner it climbs to the top-left
    expect(d).toContain(`L ${BOUNDS.left} ${BOUNDS.top + BOUNDS.radius}`);
  });

  it('closes back where it started', () => {
    const { d } = panelBorderPath(BOUNDS);

    expect(d.endsWith(`L ${CENTRE} ${BOUNDS.bottom}`)).toBe(true);
  });

  it('reports the true perimeter of the rounded rect', () => {
    const { length } = panelBorderPath(BOUNDS);
    const w = BOUNDS.right - BOUNDS.left;
    const h = BOUNDS.bottom - BOUNDS.top;

    // four straight runs shortened by the corners, plus one full circle of arc
    expect(length).toBeCloseTo(2 * (w - 2 * BOUNDS.radius) + 2 * (h - 2 * BOUNDS.radius) + 2 * Math.PI * BOUNDS.radius);
  });

  it('rounds every corner with the radius it was given', () => {
    const { d } = panelBorderPath(BOUNDS);

    expect(d.match(/A 28 28/g)).toHaveLength(4);
  });
});

describe('dropFlight', () => {
  // the panel is inset from a 402x874 phone; the ring sits in the bottom-left
  const BOUNDS = { left: 14, top: 14, right: 388, bottom: 860 };
  const RING = { x: 33, y: 811 };

  it('carries the drop from the panel it condenses out of back to the ring', () => {
    const { dx, dy } = dropFlight(BOUNDS, RING);

    expect((BOUNDS.left + BOUNDS.right) / 2 + dx).toBeCloseTo(RING.x);
    expect((BOUNDS.top + BOUNDS.bottom) / 2 + dy).toBeCloseTo(RING.y);
  });

  it('heads down and to the left, towards the corner the glance opened from', () => {
    // the close is the open run backwards -- the drop returns to the ring
    // rather than falling off the bottom of the screen, which is what it
    // used to do
    const { dx, dy } = dropFlight(BOUNDS, RING);

    expect(dx).toBeLessThan(0);
    expect(dy).toBeGreaterThan(0);
  });

  it('lands exactly on the ring wherever the ring is', () => {
    for (const ring of [
      { x: 33, y: 811 },
      { x: 33, y: 1152 },
      { x: 200, y: 400 },
    ]) {
      const { dx, dy } = dropFlight(BOUNDS, ring);

      expect((BOUNDS.left + BOUNDS.right) / 2 + dx).toBeCloseTo(ring.x);
      expect((BOUNDS.top + BOUNDS.bottom) / 2 + dy).toBeCloseTo(ring.y);
    }
  });
});

describe('splashPath', () => {
  const CENTRE = 75;
  const SPREAD = 44;
  const GRAVITY = 52;
  const RADIUS = 4.5;

  const splash = (progress: number) =>
    splashPath(progress, CENTRE, SPREAD, GRAVITY, RADIUS);

  /** Each droplet is one subpath, so counting moves counts droplets. */
  const dropletCount = (d: string) => (d.match(/M/g) ?? []).length;

  it('throws every droplet it is given', () => {
    expect(dropletCount(splash(0.2))).toBe(SPLASH_DROPLETS);
  });

  it('starts them all at the point of impact', () => {
    // at rest the droplets are stacked on the landing point -- the splash has
    // not happened yet
    const d = splash(0);
    const coords = d.match(/M (-?[\d.]+) (-?[\d.]+)/g) ?? [];

    for (const move of coords) {
      const [, x, y] = move.match(/M (-?[\d.]+) (-?[\d.]+)/)!;
      // x is offset by the droplet's own radius, y is not
      expect(Math.abs(Number(x) - (CENTRE - RADIUS))).toBeLessThan(0.05);
      expect(Math.abs(Number(y) - CENTRE)).toBeLessThan(0.05);
    }
  });

  it('fans them upward, against the fall that brought the drop in', () => {
    // early on, before gravity takes over, the droplets are above the impact
    const ys = (splash(0.25).match(/M -?[\d.]+ (-?[\d.]+)/g) ?? []).map((m) =>
      Number(m.split(' ')[2])
    );

    expect(Math.min(...ys)).toBeLessThan(CENTRE);
  });

  it('pulls them back down as the splash finishes', () => {
    const highest = (progress: number) =>
      Math.min(
        ...(splash(progress).match(/M -?[\d.]+ (-?[\d.]+)/g) ?? []).map((m) =>
          Number(m.split(' ')[2])
        )
      );

    // gravity grows with the square of the progress, so what went up comes
    // back down rather than drifting off the top
    expect(highest(1)).toBeGreaterThan(highest(0.35));
  });

  it('shrinks the droplets as they travel', () => {
    const radiusOf = (d: string) => Number(d.match(/a ([\d.]+) /)![1]);

    expect(radiusOf(splash(0.6))).toBeLessThan(radiusOf(splash(0.1)));
  });

  it('keeps drawing them to the end -- the caller fades them out', () => {
    // they shrink but never vanish on their own: the component fades the
    // whole path, so the splash ends by dissolving rather than blinking out
    expect(dropletCount(splash(1))).toBe(SPLASH_DROPLETS);
  });

  it('emits nothing at all once a droplet would be sub-pixel', () => {
    // the guard is on size, not on progress -- a path full of invisible
    // arcs is just work the UI thread does for nothing
    const tiny = splashPath(1, CENTRE, SPREAD, GRAVITY, 0.5);

    expect(dropletCount(tiny)).toBe(0);
  });
});

describe('dropStretchAt', () => {
  it('is unstretched at both ends of the flight', () => {
    expect(dropStretchAt(0)).toBeCloseTo(1);
  });

  it('is drawn out by the fall', () => {
    expect(dropStretchAt(0.4)).toBeGreaterThan(1);
  });

  it('squashes as it lands', () => {
    expect(dropStretchAt(1)).toBeLessThan(1);
  });

  it('never reverses direction abruptly', () => {
    // the two-beat sequence it replaces flipped from stretching to squashing
    // at its join, which showed as a snap
    expectSmooth(dropStretchAt, { steps: 300 });
  });
});

describe('splashOpacity', () => {
  it('is invisible at rest, not only at the end of the splash', () => {
    // The defect this pins: the splash faded only on the way out, so at
    // progress zero its droplets sat stacked on the ring at full strength --
    // a blue dot parked on the home screen whenever nothing was happening.
    expect(splashOpacity(0)).toBe(0);
    expect(splashOpacity(1)).toBe(0);
  });

  it('is fully up within a frame or two of impact', () => {
    // the rise is deliberately near-instant: the splash has to exist on the
    // frame the drop lands, not fade in over the flight
    expect(splashOpacity(0.12)).toBeGreaterThan(0.9);
  });

  it('fades away over the flight', () => {
    expect(splashOpacity(0.8)).toBeLessThan(splashOpacity(0.4));
  });

  it('clamps outside its own range', () => {
    expect(splashOpacity(-1)).toBe(0);
    expect(splashOpacity(2)).toBe(0);
  });

  it('moves smoothly once it is up', () => {
    // The rise is deliberately near-instant -- the splash has to be there on
    // the frame of impact -- so it is excluded and asserted separately above
    // rather than hidden behind a loose tolerance. Everything after it is
    // held to the same bar as every other curve here.
    expectSmooth(splashOpacity, { from: 0.1, to: 1 });
  });
});

describe('splashRing', () => {
  it('is invisible at both ends of its range', () => {
    expect(splashRing(0).opacity).toBe(0);
    expect(splashRing(1).opacity).toBe(0);
  });

  it('is born at roughly the drop’s own width rather than at a point', () => {
    // A ring starting from nothing where a whole drop had just been is a
    // visible jump -- the same fault as a thing appearing at full size, run
    // backwards.
    expect(splashRing(0).r).toBe(SPLASH_RING_BIRTH);
    expect(splashRing(0).r).toBeGreaterThan(SCREEN_TIME_RING.size / 3);
  });

  it('is fully up within a frame or two of impact', () => {
    expect(splashRing(0.12).opacity).toBeGreaterThan(0.7);
  });

  it('spreads and thins as it goes', () => {
    expect(splashRing(1).r).toBeGreaterThan(splashRing(0).r);
    expect(splashRing(1).strokeWidth).toBeLessThan(splashRing(0).strokeWidth);
  });

  it('keeps a stroke wide enough to render at the very end', () => {
    expect(splashRing(1).strokeWidth).toBeGreaterThan(0);
  });

  it('moves smoothly once it is up', () => {
    // same deliberate near-instant rise as the droplets, for the same reason
    expectSmooth(splashRing, { from: 0.1, to: 1 });
  });
});

describe('dropHandoverScale', () => {
  it('grows out of the gathered panel rather than appearing at full size', () => {
    expect(dropHandoverScale(0)).toBeLessThan(1);
    expect(dropHandoverScale(1)).toBe(1);
  });

  it('is tied to opacity, so it cannot vanish in mid-air at full size', () => {
    // both ends of the flight popped when these were animated separately
    expect(dropHandoverScale(0.5)).toBeGreaterThan(dropHandoverScale(0));
    expect(dropHandoverScale(0.5)).toBeLessThan(dropHandoverScale(1));
  });

  it('clamps outside its own range', () => {
    expect(dropHandoverScale(-1)).toBe(dropHandoverScale(0));
    expect(dropHandoverScale(2)).toBe(dropHandoverScale(1));
  });
});

describe('the ring and the border it opens into', () => {
  // The defect this pins: the ring moved to the bottom centre of the screen
  // but the border kept starting at the bottom-left corner, so the line the
  // orb becomes slid half the width of the screen to reach it -- and did so
  // standing upright, at right angles to the stroke it was about to draw.
  const SCREEN = { width: 402, height: 874, insetBottom: 34 };

  function borderStart() {
    const inset = SCREEN_TIME_GLANCE.panelInset;
    const { d } = panelBorderPath({
      left: inset,
      top: 59 + inset,
      right: SCREEN.width - inset,
      bottom: SCREEN.height - SCREEN.insetBottom - inset,
      radius: SCREEN_TIME_GLANCE.panelRadius,
    });
    const [x, y] = d.slice(2, d.indexOf(' L ')).split(' ').map(Number);

    return { x, y };
  }

  it('starts the border directly below the ring, not off to one side', () => {
    const ring = ringCentre(SCREEN.width, SCREEN.height, SCREEN.insetBottom);

    expect(borderStart().x).toBe(ring.x);
  });

  it('leaves the line only a short settle onto the frame', () => {
    const ring = ringCentre(SCREEN.width, SCREEN.height, SCREEN.insetBottom);
    const drop = borderStart().y - ring.y;

    expect(drop).toBeGreaterThan(0);
    expect(drop).toBeLessThan(SCREEN_TIME_RING.size);
  });
});

describe('orbSquash', () => {
  it('starts as the circle it is', () => {
    expect(orbSquash(0).x).toBeCloseTo(1);
    expect(orbSquash(0).y).toBeCloseTo(1);
  });

  it('ends as the line the border grows from', () => {
    expect(orbSquash(1).x).toBeCloseTo(ORB_LINE_WIDTH);
    expect(orbSquash(1).y).toBeCloseTo(ORB_LINE_HEIGHT);
  });

  it('ends lying along the bottom edge it is about to draw', () => {
    // the border now starts on the bottom edge, so the line has to be
    // horizontal: a vertical line at that point is at right angles to the
    // stroke it hands over to
    expect(orbSquash(1).x).toBeGreaterThan(1);
    expect(orbSquash(1).y).toBeLessThan(1);
  });

  it('draws itself up narrower and taller before it throws itself flat', () => {
    // the anticipation: early on the orb is narrower and higher than it
    // started, which is what sells the change of shape
    const early = orbSquash(0.25);

    expect(early.x).toBeLessThan(1);
    expect(early.y).toBeGreaterThan(1);
  });

  it('has committed to the line by the time it is done anticipating', () => {
    expect(orbSquash(0.7).x).toBeGreaterThan(orbSquash(0.25).x);
    expect(orbSquash(0.7).y).toBeLessThan(orbSquash(0.25).y);
  });

  it('moves smoothly the whole way, with no step at any point', () => {
    // The failure this replaces: three sequenced animations stopped dead at
    // every join. `expectSmooth` measures against the distance actually
    // travelled -- the orb doubles back, so its path is longer than its net
    // range -- and a pause and a jump blow straight through it.
    expectSmooth(orbSquash);
  });

  it('resolves to a line that can actually be seen', () => {
    // The failure this pins: the orb flattened to a pair of hairline caps
    // and there was nothing visible travelling to the border at all. Applied
    // to the ring's own dot, the finished shape has to be a stroke with real
    // width -- and several times taller than it is wide, or it is a dot.
    const dot = SCREEN_TIME_RING.size;
    const width = dot * orbSquash(1).x;
    const height = dot * orbSquash(1).y;

    expect(height).toBeGreaterThan(2);
    expect(width / height).toBeGreaterThan(10);
  });

  it('clamps outside its own range rather than running away', () => {
    expect(orbSquash(-1).x).toBeCloseTo(1);
    expect(orbSquash(2).x).toBeCloseTo(ORB_LINE_WIDTH);
  });
});


describe('waterTurnRamp', () => {
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));

  /** How far the least colourful point on a ramp falls. */
  function lowestSaturation(stops: string[]) {
    let lowest = 1;

    for (let i = 0; i < stops.length - 1; i++) {
      const from = rgb(stops[i]);
      const to = rgb(stops[i + 1]);

      for (let step = 0; step <= 20; step++) {
        const c = from.map((v, k) => v + (to[k] - v) * (step / 20));
        lowest = Math.min(lowest, (Math.max(...c) - Math.min(...c)) / Math.max(...c));
      }
    }

    return lowest;
  }

  it('routes the exceeded turn through a colour, not through mud', () => {
    // The defect this pins: red to blue interpolated straight in RGB passes
    // through rgb(154,120,144) -- saturation 0.22, a mauve grey. The turn read
    // as red, mud, blue rather than as a turn.
    const direct = lowestSaturation([SCREEN_TIME_GLANCE.exceededDraw, SCREEN_TIME_GLANCE.drawWater]);
    const routed = lowestSaturation(waterTurnRamp(SCREEN_TIME_GLANCE.exceededDraw, true).output);

    expect(direct).toBeLessThan(0.25);
    expect(routed).toBeGreaterThan(0.35);
  });

  it('leaves the calm turn alone, which never leaves the blues', () => {
    const ramp = waterTurnRamp(SCREEN_TIME_GLANCE.calmDraw, false);

    expect(ramp.output).toEqual([SCREEN_TIME_GLANCE.calmDraw, SCREEN_TIME_GLANCE.drawWater]);
    expect(ramp.input).toEqual([0, 1]);
  });

  it('keeps its stops and its stations in step', () => {
    // interpolateColor throws if these are different lengths
    for (const exceeded of [true, false]) {
      const ramp = waterTurnRamp(SCREEN_TIME_GLANCE.exceededDraw, exceeded);

      expect(ramp.input).toHaveLength(ramp.output.length);
    }
  });

  it('starts where it is told and always ends at the water', () => {
    const ramp = waterTurnRamp(SCREEN_TIME_GLANCE.exceededDraw, true);

    expect(ramp.output[0]).toBe(SCREEN_TIME_GLANCE.exceededDraw);
    expect(ramp.output[ramp.output.length - 1]).toBe(SCREEN_TIME_GLANCE.drawWater);
    expect(ramp.output).toContain(WATER_TURN_MID);
  });
});

describe('the mark returning to the ring', () => {
  it('should arrive over a longer beat than the ring steps aside in', () => {
    expect(SCREEN_TIME_RING.guardFade).toBeGreaterThan(SCREEN_TIME_RING.presenceFade);
  });

  it('should wait for the splash to land before it starts', () => {
    const timeline = glanceCloseTimeline();

    expect(timeline.total).toBeGreaterThanOrEqual(timeline.splash.ends);
  });

  it('should hold off briefly, but never longer than it takes to arrive', () => {
    expect(SCREEN_TIME_RING.guardFadeDelay).toBeGreaterThan(0);
    expect(SCREEN_TIME_RING.guardFadeDelay).toBeLessThan(SCREEN_TIME_RING.guardFade);
  });
});

describe('the frame the glance draws over the home scene', () => {
  const PHONE = { width: 390, height: 844 };
  const INSETS = { top: 59, bottom: 34 };
  const half = SCREEN_TIME_GLANCE.panelBorderWidth / 2;

  const frame = () =>
    glancePanelBounds(PHONE.width, PHONE.height, INSETS.top, INSETS.bottom);

  it('should run outside the home content rather than through it', () => {
    const underTest = frame();

    expect(underTest.left + half).toBeLessThan(contentMargin(false));
    expect(underTest.right - half).toBeGreaterThan(
      PHONE.width - contentMargin(false)
    );
  });

  it('should start no lower than the row the speaker sits in, so no corner control stands above it', () => {
    const underTest = frame();

    expect(underTest.top).toBeLessThanOrEqual(journeyHeaderTop(INSETS.top, false));
  });

  it('should stay inside the safe area it is drawn in', () => {
    const underTest = frame();

    expect(underTest.top - half).toBeGreaterThanOrEqual(0);
    expect(underTest.bottom + half).toBeLessThanOrEqual(PHONE.height);
  });
});

describe('glancePanelBounds', () => {
  const PHONE = { width: 390, height: 844 };
  const TABLET = { width: 834, height: 1194 };
  const INSETS = { top: 59, bottom: 34 };

  // the window is inset from the sides and runs along the safe area top and
  // bottom, so the border drawn on it passes outside the home scene's own
  // chrome rather than through it
  it('insets the window from the sides on a phone', () => {
    const underTest = glancePanelBounds(PHONE.width, PHONE.height, INSETS.top, INSETS.bottom);

    expect(underTest.left).toBe(SCREEN_TIME_GLANCE.panelInset);
    expect(underTest.right).toBe(PHONE.width - SCREEN_TIME_GLANCE.panelInset);
  });

  it('runs along the safe area top and bottom on a phone', () => {
    const underTest = glancePanelBounds(PHONE.width, PHONE.height, INSETS.top, INSETS.bottom);

    expect(underTest.top).toBe(INSETS.top);
    expect(underTest.bottom).toBe(PHONE.height - INSETS.bottom);
  });

  it('caps the window on a tablet instead of filling the screen', () => {
    const underTest = glancePanelBounds(TABLET.width, TABLET.height, INSETS.top, INSETS.bottom);

    expect(underTest.right - underTest.left).toBe(SCREEN_TIME_GLANCE.panelMaxWidth);
    expect(underTest.bottom - underTest.top).toBe(SCREEN_TIME_GLANCE.panelMaxHeight);
  });

  it('keeps the capped window centred, so it still sits over the ring', () => {
    const underTest = glancePanelBounds(TABLET.width, TABLET.height, INSETS.top, INSETS.bottom);

    expect((underTest.left + underTest.right) / 2).toBe(TABLET.width / 2);
    const safeTop = INSETS.top + SCREEN_TIME_GLANCE.panelInset;
    const safeBottom = TABLET.height - INSETS.bottom - SCREEN_TIME_GLANCE.panelInset;
    expect(underTest.top - safeTop).toBeCloseTo(safeBottom - underTest.bottom);
  });

  it('is wide enough for the tablet content column it holds', () => {
    expect(SCREEN_TIME_GLANCE.panelMaxWidth).toBeGreaterThan(500);
  });

  it.each([
    ['phone portrait', 390, 844],
    ['phone landscape', 844, 390],
    ['tablet portrait', 834, 1194],
    ['tablet landscape', 1194, 834],
    ['small phone', 320, 568],
  ])('never escapes the safe area on a %s', (_case, width, height) => {
    const underTest = glancePanelBounds(width, height, INSETS.top, INSETS.bottom);

    expect(underTest.left).toBeGreaterThanOrEqual(0);
    expect(underTest.top).toBeGreaterThanOrEqual(INSETS.top);
    expect(underTest.right).toBeLessThanOrEqual(width);
    expect(underTest.bottom).toBeLessThanOrEqual(height - INSETS.bottom);
    expect(underTest.right - underTest.left).toBeGreaterThan(0);
    expect(underTest.bottom - underTest.top).toBeGreaterThan(0);
  });

  it('carries the panel radius the border is drawn with', () => {
    const underTest = glancePanelBounds(PHONE.width, PHONE.height, 0, 0);

    expect(underTest.radius).toBe(SCREEN_TIME_GLANCE.panelRadius);
  });
});
