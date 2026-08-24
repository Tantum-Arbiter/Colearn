/**
 * Tests for the screen-time ring maths.
 *
 * The ring is deliberately quiet: it fills once around as the day's allowance
 * is used, and only when it is full does it become something a parent notices.
 */

import {
  SCREEN_TIME_RING,
  isScreenTimeExceeded,
  revealDiameter,
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

describe('revealDiameter', () => {
  // a circle opening from the ring has to reach the furthest corner of the
  // screen, or the reveal leaves an uncovered wedge behind it
  it('reaches the opposite corner from a bottom-left origin', () => {
    const origin = { x: 0, y: 800 };

    const underTest = revealDiameter(origin, 400, 800);

    // furthest corner is top-right: hypot(400, 800)
    expect(underTest).toBeCloseTo(2 * Math.hypot(400, 800));
  });

  it('reaches the furthest corner from the middle of the screen', () => {
    const underTest = revealDiameter({ x: 200, y: 400 }, 400, 800);

    expect(underTest).toBeCloseTo(2 * Math.hypot(200, 400));
  });

  it('covers the screen from any origin inside it', () => {
    const width = 400;
    const height = 800;

    for (const origin of [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height },
      { x: 137, y: 613 },
    ]) {
      const radius = revealDiameter(origin, width, height) / 2;
      const corners = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: 0, y: height },
        { x: width, y: height },
      ];

      for (const corner of corners) {
        expect(Math.hypot(corner.x - origin.x, corner.y - origin.y)).toBeLessThanOrEqual(radius + 1e-9);
      }
    }
  });
});
