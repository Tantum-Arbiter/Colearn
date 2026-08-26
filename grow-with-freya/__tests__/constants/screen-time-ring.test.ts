/**
 * Tests for the screen-time ring maths.
 *
 * The ring is deliberately quiet: it fills once around as the day's allowance
 * is used, and only when it is full does it become something a parent notices.
 */

import {
  SCREEN_TIME_RING,
  isScreenTimeExceeded,
  panelBorderPath,
  dropFlight,
  splashPath,
  orbSquash,
  dropStretchAt,
  ORB_LINE_WIDTH,
  ORB_LINE_HEIGHT,
  SPLASH_DROPLETS,
  ringCentre,
  ringDashOffset,
  screenTimeProgress,
  splashOpacity,
  splashRing,
  dropHandoverScale,
  SPLASH_RING_BIRTH,
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

  it('starts just above the bottom-left corner, nearest the ring', () => {
    const { d } = panelBorderPath(BOUNDS);

    expect(d.startsWith(`M ${BOUNDS.left} ${BOUNDS.bottom - BOUNDS.radius}`)).toBe(true);
  });

  it('closes back where it started', () => {
    const { d } = panelBorderPath(BOUNDS);

    expect(d.endsWith(`${BOUNDS.left} ${BOUNDS.bottom - BOUNDS.radius}`)).toBe(true);
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

describe('orbSquash', () => {
  it('starts as the circle it is', () => {
    expect(orbSquash(0).x).toBeCloseTo(1);
    expect(orbSquash(0).y).toBeCloseTo(1);
  });

  it('ends as the line the border grows from', () => {
    expect(orbSquash(1).x).toBeCloseTo(ORB_LINE_WIDTH);
    expect(orbSquash(1).y).toBeCloseTo(ORB_LINE_HEIGHT);
  });

  it('squats wider and shorter before it throws itself thin', () => {
    // the anticipation: early on the orb is broader and lower than it
    // started, which is what sells the change of shape
    const early = orbSquash(0.25);

    expect(early.x).toBeGreaterThan(1);
    expect(early.y).toBeLessThan(1);
  });

  it('has committed to the line by the time it is done anticipating', () => {
    expect(orbSquash(0.7).x).toBeLessThan(orbSquash(0.25).x);
    expect(orbSquash(0.7).y).toBeGreaterThan(orbSquash(0.25).y);
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

    expect(width).toBeGreaterThan(2);
    expect(height / width).toBeGreaterThan(10);
  });

  it('clamps outside its own range rather than running away', () => {
    expect(orbSquash(-1).x).toBeCloseTo(1);
    expect(orbSquash(2).x).toBeCloseTo(ORB_LINE_WIDTH);
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
