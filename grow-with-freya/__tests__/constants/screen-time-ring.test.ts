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
