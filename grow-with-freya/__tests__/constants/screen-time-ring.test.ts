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
  spiralToLinePath,
  SPIRAL_STEPS,
  SPIRAL_TURNS,
  SPIRAL_UNROLL_BAND,
  ringCentre,
  ringDashOffset,
  screenTimeProgress,
} from '@/constants/screen-time-ring';

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
  // the ring is pinned to the bottom-left corner, so its centre is derivable
  // rather than something that has to be measured at runtime
  it('sits half a ring in from the left edge', () => {
    const { x } = ringCentre(800, 0);

    expect(x).toBe(SCREEN_TIME_RING.marginHorizontal + SCREEN_TIME_RING.size / 2);
  });

  it('sits above the bottom margin, clear of the safe area', () => {
    const { y } = ringCentre(800, 34);

    expect(y).toBe(800 - 34 - SCREEN_TIME_RING.marginBottom - SCREEN_TIME_RING.size / 2);
  });

  it('rises as the bottom inset grows', () => {
    expect(ringCentre(800, 34).y).toBeLessThan(ringCentre(800, 0).y);
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

describe('spiralToLinePath', () => {
  const CENTRE = 28;
  const RADIUS = 24;
  const HALF = 24;

  const points = (d: string) =>
    d
      .split(/(?=[ML])/)
      .map((seg) => seg.trim().slice(1).trim().split(/\s+/).map(Number))
      .filter((p) => p.length === 2 && p.every((n) => Number.isFinite(n)))
      .map(([x, y]) => ({ x, y }));

  const radiusOf = (p: { x: number; y: number }) =>
    Math.hypot(p.x - CENTRE, p.y - CENTRE);

  it('draws every step it promises, as one continuous stroke', () => {
    const d = spiralToLinePath(1, 0, CENTRE, RADIUS, HALF);

    expect(points(d)).toHaveLength(SPIRAL_STEPS + 1);
    // one move, then nothing but lines -- a broken stroke would read as
    // separate fragments rather than a single arm
    expect(d.match(/M/g)).toHaveLength(1);
  });

  it('sweeps outward from the core to the rim', () => {
    const p = points(spiralToLinePath(1, 0, CENTRE, RADIUS, HALF));

    expect(radiusOf(p[0])).toBeCloseTo(0);
    expect(radiusOf(p[p.length - 1])).toBeCloseTo(RADIUS);
  });

  it('grows outward monotonically -- this is what makes it a spiral', () => {
    // a squashed circle oscillates between the same two radii; a spiral only
    // ever gets further from its centre
    const p = points(spiralToLinePath(1, 0, CENTRE, RADIUS, HALF));

    for (let i = 1; i < p.length; i++) {
      expect(radiusOf(p[i])).toBeGreaterThan(radiusOf(p[i - 1]) - 1e-6);
    }
  });

  it('winds through every turn it is given rather than one pass', () => {
    const p = points(spiralToLinePath(1, 0, CENTRE, RADIUS, HALF));

    // count sign changes of (y - centre): a full turn crosses the centre
    // line twice, so 2.5 turns must cross it at least four times
    let crossings = 0;
    for (let i = 1; i < p.length; i++) {
      const before = p[i - 1].y - CENTRE;
      const after = p[i].y - CENTRE;
      if (before !== 0 && after !== 0 && Math.sign(before) !== Math.sign(after)) {
        crossings++;
      }
    }

    expect(crossings).toBeGreaterThanOrEqual(Math.floor(SPIRAL_TURNS * 2) - 1);
  });

  it('collapses onto the vertical once straightened', () => {
    const p = points(spiralToLinePath(1, 1, CENTRE, RADIUS, HALF));

    for (const point of p) {
      expect(point.x).toBeCloseTo(CENTRE);
    }
    expect(p[0].y).toBeCloseTo(CENTRE - HALF);
    expect(p[p.length - 1].y).toBeCloseTo(CENTRE + HALF);
  });

  it('keeps the traced order when it straightens, so the curve unwinds', () => {
    // every point lands further down the line than the one before it -- the
    // spiral is pulled straight, not re-sorted into a line
    const p = points(spiralToLinePath(1, 1, CENTRE, RADIUS, HALF));

    for (let i = 1; i < p.length; i++) {
      expect(p[i].y).toBeGreaterThan(p[i - 1].y);
    }
  });

  it('unrolls from the loose outer end inward, not all at once', () => {
    // mid-unroll the arm is part line, part curve: the outer end has already
    // been pulled onto the vertical while the core is still coiled. If every
    // point straightened together the whole curve would rush at its own
    // centre, which is what made this beat look wrong.
    const p = points(spiralToLinePath(1, 0.5, CENTRE, RADIUS, HALF));

    const outer = p[p.length - 1];
    const inner = p[Math.round(p.length * 0.25)];

    expect(Math.abs(outer.x - CENTRE)).toBeLessThan(Math.abs(inner.x - CENTRE));
  });

  it('leaves the core still coiled while the outer end is already straight', () => {
    const p = points(spiralToLinePath(1, 0.35, CENTRE, RADIUS, HALF));
    const stillCurved = p.filter((point) => Math.abs(point.x - CENTRE) > 1);

    // some of the arm is off the vertical -- it is mid-unroll, not done
    expect(stillCurved.length).toBeGreaterThan(0);
    expect(stillCurved.length).toBeLessThan(p.length);
  });

  it('finishes the unroll exactly as the wave clears the arm', () => {
    // the wave travels a band further than the arm's own length, so a
    // straighten of 1 has to leave nothing behind
    expect(SPIRAL_UNROLL_BAND).toBeGreaterThan(0);

    const p = points(spiralToLinePath(1, 1, CENTRE, RADIUS, HALF));

    for (const point of p) {
      expect(point.x).toBeCloseTo(CENTRE);
    }
  });

  it('is nothing at all before it starts unwinding', () => {
    const p = points(spiralToLinePath(0, 0, CENTRE, RADIUS, HALF));

    for (const point of p) {
      expect(radiusOf(point)).toBeCloseTo(0);
    }
  });
});
