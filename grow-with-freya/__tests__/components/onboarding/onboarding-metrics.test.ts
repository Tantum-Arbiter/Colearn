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
  onboardingMetricsFor as metricsAt,
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

  it('keeps three chips plus their gaps inside the padded row', () => {
    for (const width of [PHONE_WIDTH, TABLET_WIDTH]) {
      const m = metricsAt(width);
      const row = m.chipSize * 3 + 10 * 2;

      expect(row).toBeLessThanOrEqual(m.layoutWidth - 24 * 2);
    }
  });
});
