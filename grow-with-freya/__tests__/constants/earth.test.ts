/**
 * Tests for the shared earth that rises from the bottom of the home page and
 * hangs from the top of every page underneath it.
 *
 * The two edges have to describe one globe so the slide between pages reads
 * as scrolling past the same world, and the visible slice has to stay a
 * horizon on every screen shape rather than a small ball.
 */

import { EARTH, earthCap, earthChord, earthDiameter, earthLayout } from '@/constants/earth';

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 834, height: 1194 };
const TABLET_LANDSCAPE = { width: 1194, height: 834 };

const SCREENS = [
  ['a phone', PHONE],
  ['a tablet', TABLET],
  ['a tablet on its side', TABLET_LANDSCAPE],
] as const;

describe('earthCap', () => {
  it('should follow the width on a phone', () => {
    const underTest = earthCap(PHONE.width, PHONE.height, 'bottom');

    expect(underTest).toBe(Math.round(PHONE.width * EARTH.rise.widthRatio));
  });

  it('should follow the height on a tablet on its side so the globe does not swallow the page', () => {
    const underTest = earthCap(TABLET_LANDSCAPE.width, TABLET_LANDSCAPE.height, 'bottom');

    expect(underTest).toBe(Math.round(TABLET_LANDSCAPE.height * EARTH.rise.heightRatio));
  });

  it.each(SCREENS)('should hang deeper than it rises on %s, since the header floats over the underside', (_case, screen) => {
    const underTest = earthCap(screen.width, screen.height, 'top');

    expect(underTest).toBeGreaterThan(earthCap(screen.width, screen.height, 'bottom'));
  });

  it.each([
    ['a phone', PHONE],
    ['a tablet', TABLET],
  ] as const)('should bulge well past the screen edges on %s rather than sit flat like a lid', (_case, screen) => {
    const diameter = earthDiameter(screen.width, screen.height);
    const cap = earthCap(screen.width, screen.height, 'top');

    const underTest = earthChord(diameter, cap * 0.65);

    expect(underTest).toBeGreaterThanOrEqual(screen.width);
  });
});

describe('earthDiameter', () => {
  it.each(SCREENS)('should overhang %s so the earth reads as a horizon, not a ball', (_case, screen) => {
    const underTest = earthDiameter(screen.width, screen.height);

    expect(underTest).toBeGreaterThan(screen.width);
  });

  it.each(SCREENS)('should never grow past the ceiling on %s', (_case, screen) => {
    const underTest = earthDiameter(screen.width, screen.height);

    expect(underTest).toBeLessThanOrEqual(Math.round(screen.width * EARTH.maxDiameterRatio));
  });

  it('should be cut by the home page edge at a chord wider than the phone', () => {
    const diameter = earthDiameter(PHONE.width, PHONE.height);

    const underTest = earthChord(diameter, earthCap(PHONE.width, PHONE.height, 'bottom'));

    expect(underTest).toBeCloseTo(PHONE.width * EARTH.overhang, 0);
  });

  it.each(SCREENS)('should still span the whole width where a page below cuts it on %s', (_case, screen) => {
    const diameter = earthDiameter(screen.width, screen.height);

    const underTest = earthChord(diameter, earthCap(screen.width, screen.height, 'top'));

    expect(underTest).toBeGreaterThanOrEqual(screen.width * 0.84);
  });
});

describe('earthChord', () => {
  it('should be the full diameter at the equator', () => {
    const underTest = earthChord(500, 250);

    expect(underTest).toBe(500);
  });

  it('should vanish when nothing is cut', () => {
    const underTest = earthChord(500, 0);

    expect(underTest).toBe(0);
  });
});

describe('earthLayout', () => {
  it.each(SCREENS)('should describe one globe for both edges on %s', (_case, screen) => {
    const underTest = earthLayout(screen.width, screen.height, 'bottom').diameter;

    expect(underTest).toBe(earthLayout(screen.width, screen.height, 'top').diameter);
  });

  it.each(SCREENS)('should centre the globe on %s', (_case, screen) => {
    const underTest = earthLayout(screen.width, screen.height, 'bottom');

    expect(underTest.left).toBe(Math.round((screen.width - underTest.diameter) / 2));
  });

  it('should start the rising globe at the top of its window', () => {
    const underTest = earthLayout(PHONE.width, PHONE.height, 'bottom');

    expect(underTest.top).toBe(0);
  });

  it('should hang the globe so its underside lands on the window floor', () => {
    const underTest = earthLayout(PHONE.width, PHONE.height, 'top');

    expect(underTest.top + underTest.diameter).toBe(underTest.cap);
  });
});
