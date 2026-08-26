/**
 * Tests for the screen-time ring maths.
 *
 * The ring is deliberately quiet: it fills once around as the day's allowance
 * is used, and only when it is full does it become something a parent notices.
 */

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
  splashRing,
  dropHandoverScale,
  SPLASH_RING_BIRTH,
  spiralArmPath,
  SPIRAL_STEPS,
  SPIRAL_TURNS,
  SPIRAL_LINE_HALF,
  SPIRAL_RADIUS,
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

describe('spiralArmPath', () => {
  const CENTRE = 30;
  // the real reach, so the line it lays down (SPIRAL_LINE_HALF) sits inside
  // it as it does on screen
  const RADIUS = SPIRAL_RADIUS;

  function points(d: string) {
    return d
      .split(/(?=[ML])/)
      .filter(Boolean)
      .map((cmd) => cmd.trim().slice(1).trim().split(' ').map(Number))
      .map(([x, y]) => ({ x, y }));
  }

  const reach = (p: { x: number; y: number }) =>
    Math.hypot(p.x - CENTRE, p.y - CENTRE);

  // the path rounds its coordinates to two decimals, so reach is only good to
  // about a hundredth -- assert to one rather than pretending otherwise
  const PLACES = 1;

  // the arm before any of it has been pulled straight
  const arm = (grow: number, straighten = 0) =>
    spiralArmPath(CENTRE, RADIUS, grow, straighten, SPIRAL_LINE_HALF);

  it('reaches clear of the orb it is swept out of', () => {
    // The defect this pins, and the one that killed the previous spiral: at
    // the ring echo's own radius the entire arm sat inside the solid core
    // dot, in the same colour, and could not be seen at all. It has to clear
    // both the filled core and the arc around it.
    expect(SPIRAL_RADIUS).toBeGreaterThan(SCREEN_TIME_RING.size / 2);
    expect(SPIRAL_RADIUS).toBeGreaterThan(SCREEN_TIME_GLANCE.spinnerRadius);
  });

  it('keeps its turns far enough apart to read as separate', () => {
    // an Archimedean arm's turns are evenly spaced; if that spacing closes on
    // the stroke width the spiral reads as a blob
    const spacing = SPIRAL_RADIUS / SPIRAL_TURNS;

    expect(spacing).toBeGreaterThan(SCREEN_TIME_GLANCE.spinnerStroke * 2);
  });

  it('is nothing at all when it has not been wound out', () => {
    // an animated element must be invisible at rest, not only at the end of
    // the range you were thinking about
    expect(arm(0)).toBe('');
    expect(arm(-1)).toBe('');
  });

  it('starts at the core and reaches its full radius when fully wound out', () => {
    const p = points(arm(1));

    expect(reach(p[0])).toBeCloseTo(0);
    expect(reach(p[p.length - 1])).toBeCloseTo(RADIUS, PLACES);
  });

  it('scales its whole reach with the grow, so it grows out of a point', () => {
    const half = points(arm(0.5));

    expect(reach(half[half.length - 1])).toBeCloseTo(RADIUS / 2, PLACES);
  });

  it('winds outward the whole way, never doubling back on itself', () => {
    const p = points(arm(1));

    for (let i = 1; i < p.length; i++) {
      expect(reach(p[i])).toBeGreaterThan(reach(p[i - 1]));
    }
  });

  it('turns as many times as it says it does', () => {
    const p = points(arm(1));
    let turned = 0;
    let previous = Math.atan2(p[1].y - CENTRE, p[1].x - CENTRE);

    for (let i = 2; i < p.length; i++) {
      const angle = Math.atan2(p[i].y - CENTRE, p[i].x - CENTRE);
      let step = angle - previous;
      if (step < -Math.PI) step += 2 * Math.PI;
      if (step > Math.PI) step -= 2 * Math.PI;
      turned += step;
      previous = angle;
    }

    expect(Math.abs(turned) / (2 * Math.PI)).toBeCloseTo(SPIRAL_TURNS, 1);
  });

  it('emits one point per step, plus the one that closes it', () => {
    expect(points(arm(1))).toHaveLength(SPIRAL_STEPS + 1);
  });

  it('clamps outside its own range rather than running away', () => {
    expect(arm(2)).toBe(arm(1));
  });

  describe('laying itself down as the line', () => {
    const onLine = (p: { x: number; y: number }) => Math.abs(p.y - CENTRE);

    it('is still the spiral before the wave reaches it', () => {
      expect(arm(1, 0)).toBe(arm(1));
    });

    it('is a straight line once the wave has passed the whole arm', () => {
      const p = points(arm(1, 1));

      p.forEach((point) => expect(onLine(point)).toBeLessThan(0.05));
    });

    it('lays the line down at the length it is told to', () => {
      const p = points(arm(1, 1));
      const xs = p.map((point) => point.x);

      expect(Math.min(...xs)).toBeCloseTo(CENTRE - SPIRAL_LINE_HALF, PLACES);
      expect(Math.max(...xs)).toBeCloseTo(CENTRE + SPIRAL_LINE_HALF, PLACES);
    });

    it('straightens from the outer end inward, not all at once', () => {
      // The defect this pins: pulling every point toward the line at the same
      // rate crumples the spiral in on itself. The wave has to arrive at the
      // outer end first and travel in, so the tip is already lying flat while
      // the core end is still coiled.
      const p = points(arm(1, 0.5));
      const inner = p.slice(0, Math.floor(p.length / 2));

      const tipOffLine = onLine(p[p.length - 1]);
      const innerOffLine = Math.max(...inner.map(onLine));

      expect(tipOffLine).toBeLessThan(innerOffLine / 2);
    });

    it('keeps every point within reach of the arm and the line', () => {
      // not a tight bound, a sanity one: nothing should fly off while the
      // wave passes, which is what a crumpling unroll looks like numerically
      const span = RADIUS + SPIRAL_LINE_HALF + 1;

      for (const straighten of [0.2, 0.4, 0.6, 0.8]) {
        points(arm(1, straighten)).forEach((point) => {
          expect(Math.abs(point.x - CENTRE)).toBeLessThanOrEqual(span);
          expect(Math.abs(point.y - CENTRE)).toBeLessThanOrEqual(span);
        });
      }
    });

    it('unrolls smoothly, with no crumple at any point', () => {
      // measured on how far the arm still is from the line overall: a wave
      // that stalls or snaps shows up as a step in that distance
      expectSmooth((straighten) => {
        const p = points(arm(1, straighten));
        return p.reduce((sum, point) => sum + onLine(point), 0) / p.length;
      });
    });
  });

  it('grows smoothly, with no jump at any point', () => {
    // the arm takes its character from whatever drives it, so the one thing
    // that has to hold here is that the reach itself has no step in it
    expectSmooth((grow) => {
      const p = points(arm(Math.max(grow, 1e-6)));
      return reach(p[p.length - 1]);
    });
  });
});
