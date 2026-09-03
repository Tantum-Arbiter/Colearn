/**
 * Tests for the one earth shared between the home page and the pages below.
 *
 * The home page shows the top of the globe rising from its bottom edge and
 * the page underneath shows the rest hanging from its top edge, so the slide
 * between them scrolls past a single whole world rather than two crops.
 */

import { EARTH, earthCap, earthDiameter, earthLayout } from '@/constants/earth';

const PHONE = { width: 390, height: 844 };
const SMALL_PHONE = { width: 375, height: 667 };
const TABLET = { width: 834, height: 1194 };
const TABLET_LANDSCAPE = { width: 1194, height: 834 };

const SCREENS = [
  ['a phone', PHONE],
  ['a small phone', SMALL_PHONE],
  ['a tablet', TABLET],
  ['a tablet on its side', TABLET_LANDSCAPE],
] as const;

describe('earthDiameter', () => {
  it.each(SCREENS)('should fit the whole globe inside the width of %s', (_case, screen) => {
    const underTest = earthDiameter(screen.width, screen.height);

    expect(underTest).toBeLessThanOrEqual(screen.width);
  });

  it.each(SCREENS)('should leave most of %s to the page rather than the globe', (_case, screen) => {
    const underTest = earthDiameter(screen.width, screen.height);

    expect(underTest).toBeLessThanOrEqual(screen.height * EARTH.diameterHeightRatio);
  });

  it('should follow the width on a phone', () => {
    const underTest = earthDiameter(PHONE.width, PHONE.height);

    expect(underTest).toBe(Math.floor(PHONE.width * EARTH.diameterWidthRatio));
  });

  it('should follow the height on a tablet on its side', () => {
    const underTest = earthDiameter(TABLET_LANDSCAPE.width, TABLET_LANDSCAPE.height);

    expect(underTest).toBe(Math.floor(TABLET_LANDSCAPE.height * EARTH.diameterHeightRatio));
  });
});

describe('earthCap', () => {
  it.each(SCREENS)('should add up to one whole globe across the two edges on %s', (_case, screen) => {
    const underTest =
      earthCap(screen.width, screen.height, 'bottom') + earthCap(screen.width, screen.height, 'top');

    expect(underTest).toBe(earthDiameter(screen.width, screen.height));
  });

  it('should raise the top half on the home page', () => {
    const underTest = earthCap(PHONE.width, PHONE.height, 'bottom');

    expect(underTest).toBe(Math.round(earthDiameter(PHONE.width, PHONE.height) * EARTH.riseFraction));
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

  it('should continue exactly where the home page left off', () => {
    const rising = earthLayout(PHONE.width, PHONE.height, 'bottom');
    const hanging = earthLayout(PHONE.width, PHONE.height, 'top');

    const underTest = rising.cap + hanging.cap;

    expect(underTest).toBe(rising.diameter);
    expect(hanging.left).toBe(rising.left);
  });
});
