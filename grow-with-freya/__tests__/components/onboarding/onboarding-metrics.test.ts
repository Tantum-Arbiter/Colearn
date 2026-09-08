/**
 * Tests for the onboarding layout metrics.
 *
 * Onboarding sizes every hero and grid as a ratio of the page's own width.
 * Left uncapped that is a bug on a tablet, not a feature: the together hero
 * is 941/900 of the width, so on an 834pt iPad it becomes more than twice as
 * tall as it is on a phone, on a screen only a third taller -- and the
 * spacer that reserves room for it grows with it until the chips underneath
 * end up behind the footer. These tests pin the cap that prevents that.
 */

import {
  READY_BACKDROP_TOP,
  onboardingMetricsFor as metricsAt,
  onboardingLift,
  swipeIntent,
  ONBOARDING_MAX_WIDTH,
} from '@/components/onboarding/onboarding-metrics';

// the widest iPhone is still well inside the cap, so no phone should see any
// change at all from it
const PHONE_WIDTH = 402;
const LARGE_PHONE_WIDTH = 440;
const TABLET_WIDTH = 834;

describe('onboardingMetricsFor', () => {
  it('lays out to the full width on a phone', () => {
    const m = metricsAt(PHONE_WIDTH);

    expect(m.layoutWidth).toBe(PHONE_WIDTH);
    expect(m.isCapped).toBe(false);
  });

  it('leaves even the largest phone uncapped', () => {
    const m = metricsAt(LARGE_PHONE_WIDTH);

    expect(m.layoutWidth).toBe(LARGE_PHONE_WIDTH);
    expect(m.isCapped).toBe(false);
  });

  it('caps the layout width on a tablet', () => {
    const m = metricsAt(TABLET_WIDTH);

    expect(m.layoutWidth).toBe(ONBOARDING_MAX_WIDTH);
    expect(m.isCapped).toBe(true);
  });

  it('keeps the tablet hero close to its phone height rather than doubling it', () => {
    const phone = metricsAt(PHONE_WIDTH);
    const tablet = metricsAt(TABLET_WIDTH);

    // this is the whole point: uncapped, 834 * 941/900 would be 872pt against
    // the phone's 420pt
    expect(tablet.togetherBackdropHeight).toBeLessThan(
      phone.togetherBackdropHeight * 1.5
    );
    expect(tablet.togetherBackdropHeight).toBeLessThan(600);
  });

  it('keeps every spacer clear of a tablet page', () => {
    const m = metricsAt(TABLET_WIDTH);

    // an iPad Pro 11 is 1210pt tall and the footer plus header take roughly
    // 300 of it; a spacer past ~600 starts pushing content behind the footer
    for (const spacer of [m.togetherSpacerHeight, m.readySpacerHeight, m.safeSpacerHeight]) {
      expect(spacer).toBeGreaterThan(0);
      expect(spacer).toBeLessThan(600);
    }
  });

  /**
   * The safety constellation and the ready scene were asked to be bigger, and
   * the ready cards to sit lower under theirs. Ready's art is 3:2, so it
   * grows by scaling past that ratio and cropping its curtain edges.
   */
  it('gives the constellation the whole column, at the art\'s own 860x760 aspect', () => {
    for (const width of [PHONE_WIDTH, TABLET_WIDTH]) {
      const m = metricsAt(width);

      // sized to the art's aspect, `contain` draws it edge to edge with no
      // margin left over -- as big as the column allows
      expect(m.safeBackdropHeight).toBe(Math.round(m.layoutWidth * (760 / 860)));
    }
  });

  it('shows the ready scene a good deal larger than its own 3:2 frame', () => {
    for (const width of [PHONE_WIDTH, TABLET_WIDTH]) {
      const m = metricsAt(width);

      expect(m.readyBackdropHeight).toBeGreaterThanOrEqual(Math.round(m.layoutWidth * (600 / 900) * 1.4));
    }
  });

  it('runs the first ready card up over the base of the scene, as the chips do', () => {
    const m = metricsAt(PHONE_WIDTH);

    expect(m.readySpacerHeight).toBeLessThanOrEqual(m.readyBackdropHeight + READY_BACKDROP_TOP - 175);
  });

  it('keeps three chips plus their gaps inside the padded row', () => {
    for (const width of [PHONE_WIDTH, TABLET_WIDTH]) {
      const m = metricsAt(width);
      const row = m.chipSize * 3 + 10 * 2;

      expect(row).toBeLessThanOrEqual(m.layoutWidth - 24 * 2);
    }
  });
});

/**
 * A phone is not tall enough for every page: the safety grid and the ready
 * cards ran under the footer. The screen measures how far its column
 * overflows and asks the page to give that much back, which comes out of the
 * hero and the spacer that holds room for it, together, so the content keeps
 * riding up over the base of the art by the same amount as before.
 */
describe('onboardingMetricsFor with a squeeze', () => {
  it('changes nothing when no squeeze is asked for', () => {
    expect(metricsAt(PHONE_WIDTH, 0)).toEqual(metricsAt(PHONE_WIDTH));
  });

  it('takes the squeeze out of each spacer and its hero alike', () => {
    const base = metricsAt(PHONE_WIDTH);

    const m = metricsAt(PHONE_WIDTH, 60);

    expect(m.safeSpacerHeight).toBe(base.safeSpacerHeight - 60);
    expect(m.safeBackdropHeight).toBe(base.safeBackdropHeight - 60);
    expect(m.readySpacerHeight).toBe(base.readySpacerHeight - 60);
    expect(m.readyBackdropHeight).toBe(base.readyBackdropHeight - 60);
    expect(m.togetherSpacerHeight).toBe(base.togetherSpacerHeight - 60);
    expect(m.togetherBackdropHeight).toBe(base.togetherBackdropHeight - 60);
  });

  it('never squeezes a hero below half its height, and leaves the rest to scrolling', () => {
    const base = metricsAt(PHONE_WIDTH);

    const m = metricsAt(PHONE_WIDTH, 10000);

    expect(m.safeBackdropHeight).toBeGreaterThanOrEqual(Math.round(base.safeBackdropHeight / 2));
    expect(m.readyBackdropHeight).toBeGreaterThanOrEqual(Math.round(base.readyBackdropHeight / 2));
    expect(m.togetherBackdropHeight).toBeGreaterThanOrEqual(Math.round(base.togetherBackdropHeight / 2));
    expect(m.safeSpacerHeight - m.safeBackdropHeight).toBe(base.safeSpacerHeight - base.safeBackdropHeight);
  });

  it('leaves the width, cap and chips alone', () => {
    const base = metricsAt(TABLET_WIDTH);

    const m = metricsAt(TABLET_WIDTH, 80);

    expect(m.layoutWidth).toBe(base.layoutWidth);
    expect(m.isCapped).toBe(base.isCapped);
    expect(m.chipSize).toBe(base.chipSize);
  });
});

describe('swipeIntent', () => {
  it('reads nothing from a drag that neither travelled nor was thrown', () => {
    expect(swipeIntent(0, 0)).toBeNull();
    expect(swipeIntent(-40, -120)).toBeNull();
    expect(swipeIntent(40, 120)).toBeNull();
  });

  it('turns forward on a drag to the left and back on a drag to the right', () => {
    expect(swipeIntent(-90, 0)).toBe('next');
    expect(swipeIntent(90, 0)).toBe('previous');
  });

  it('takes a flick that ends almost where it started', () => {
    expect(swipeIntent(-12, -900)).toBe('next');
    expect(swipeIntent(12, 900)).toBe('previous');
  });

  it('trusts the distance when a flick doubles back at the end', () => {
    expect(swipeIntent(-140, 800)).toBe('next');
  });
});

describe('onboardingLift', () => {
  it('leaves a phone alone, however much room is spare', () => {
    expect(onboardingLift(900, 500, false)).toBe(0);
  });

  it('splits a tablet\'s spare height above and below the page', () => {
    expect(onboardingLift(1000, 600, true)).toBe(200);
  });

  it('lifts nothing when the page already fills the screen or overflows it', () => {
    expect(onboardingLift(700, 700, true)).toBe(0);
    expect(onboardingLift(700, 900, true)).toBe(0);
  });

  it('is zero before anything has been measured', () => {
    expect(onboardingLift(0, 0, true)).toBe(0);
  });
});
