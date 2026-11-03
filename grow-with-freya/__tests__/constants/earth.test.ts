/**
 * Tests for the one earth shared between the home page and the pages below.
 *
 * The home page shows the top of the globe rising from its bottom edge and
 * the page underneath shows the rest hanging from its top edge, so the slide
 * between them scrolls past a single whole world rather than two crops.
 */

import {
  EARTH,
  earthCap,
  earthDiameter,
  earthLayout,
  planetHorizonLayout,
  planetRadius,
  planetReach,
  cloudGap,
  cloudRingLayout,
} from '@/constants/earth';
import { CLOUD_RING_ART, PLANET_ART } from '@/constants/planet-art';

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

/**
 * The world at the edge of a page is the operator's painting (2026-10-03): the
 * foot of it, a large planet rising out of cloud, with the sky taken out. It
 * stands the right way up at the foot of the home page and hangs upside down
 * from the top of the pages below. The operator's conditions: the planet
 * large, more of it in view than cloud, and cloud where the planet leaves the
 * screen. So the painting is drawn with the planet itself as wide as the
 * screen, and only cloud runs off the sides.
 */
describe('planetHorizonLayout', () => {
  const EVERY_SCREEN = [
    ...SCREENS,
    ['a tall phone', { width: 402, height: 874 }],
    ['a large phone', { width: 440, height: 956 }],
    ['a narrow Android phone', { width: 360, height: 780 }],
    ['a large tablet on its side', { width: 1376, height: 1032 }],
  ] as const;
  const scaleOn = (screen: { width: number }) => screen.width / PLANET_ART.limbWidth;

  it.each(EVERY_SCREEN)('should draw the planet, between its clouds, exactly as wide as %s', (_case, screen) => {
    const underTest = planetHorizonLayout(screen.width, screen.height);

    expect((underTest.width * PLANET_ART.limbWidth) / PLANET_ART.width).toBeCloseTo(screen.width, 6);
  });

  it.each(EVERY_SCREEN)('should stand the planet in the middle of %s, with as much cloud off one side as the other', (_case, screen) => {
    const underTest = planetHorizonLayout(screen.width, screen.height);

    expect(underTest.left + PLANET_ART.planetCentreX * scaleOn(screen)).toBeCloseTo(screen.width / 2, 6);
    expect(underTest.left).toBeLessThan(0);
    expect(underTest.left + underTest.width).toBeGreaterThan(screen.width);
  });

  it.each(EVERY_SCREEN)('should keep the painting`s own proportions on %s', (_case, screen) => {
    const underTest = planetHorizonLayout(screen.width, screen.height);

    expect(underTest.height / underTest.width).toBeCloseTo(PLANET_ART.height / PLANET_ART.width, 6);
  });

  /**
   * At the foot of the home page the planet's top stands where the globe's
   * did. It was lowered for an hour and raised again (operator, 2026-10-03).
   */
  it.each(EVERY_SCREEN)('should stand the planet`s top as far above the foot of %s as the globe`s was', (_case, screen) => {
    const cap = earthCap(screen.width, screen.height, 'bottom');

    const underTest = planetHorizonLayout(screen.width, screen.height);

    expect(planetReach(screen.width, screen.height, 'bottom')).toBe(cap);
    expect(underTest.rise - PLANET_ART.planetTop * scaleOn(screen)).toBeCloseTo(cap, 6);
    expect(planetHorizonLayout(screen.width, screen.height, 'bottom')).toEqual(underTest);
  });

  /**
   * On the pages below the planet hangs a little lower than the globe's
   * underside did. It hung lower still for an hour; the operator had it
   * brought back up, the page's content with it (2026-10-03).
   */
  it.each(EVERY_SCREEN)('should hang the planet`s tip a little lower below the top of %s than the globe`s underside was', (_case, screen) => {
    const cap = earthCap(screen.width, screen.height, 'top');

    const underTest = planetHorizonLayout(screen.width, screen.height, 'top');

    expect(planetReach(screen.width, screen.height, 'top')).toBeCloseTo(cap * EARTH.planetHang, 6);
    expect(underTest.rise - PLANET_ART.planetTop * scaleOn(screen)).toBeCloseTo(cap * EARTH.planetHang, 6);
    expect(EARTH.planetHang).toBeGreaterThan(1.05);
    expect(EARTH.planetHang).toBeLessThan(1.2);
  });

  it.each([
    [0, 844],
    [390, 0],
    [Number.NaN, 844],
    [390, Number.NaN],
    [390, -844],
  ])('should reach nowhere on a screen %p by %p', (width, height) => {
    expect(planetReach(width, height, 'top')).toBe(0);
    expect(planetReach(width, height, 'bottom')).toBe(0);
  });

  it.each(EVERY_SCREEN)('should draw the hanging planet as large and in the same place across %s as the standing one', (_case, screen) => {
    const standing = planetHorizonLayout(screen.width, screen.height, 'bottom');
    const hanging = planetHorizonLayout(screen.width, screen.height, 'top');

    expect(hanging.width).toBe(standing.width);
    expect(hanging.height).toBe(standing.height);
    expect(hanging.left).toBe(standing.left);
  });

  it.each(EVERY_SCREEN)('should never hang the planet lower than the painting reaches, so the top of %s is never bare', (_case, screen) => {
    const hanging = planetHorizonLayout(screen.width, screen.height, 'top');

    expect(hanging.height).toBeGreaterThanOrEqual(hanging.rise - 1e-6);
  });

  it.each(EVERY_SCREEN)('should show planet and none of the painting`s own cloud down the middle of %s', (_case, screen) => {
    const shown = earthCap(screen.width, screen.height, 'bottom') / scaleOn(screen);

    expect(shown).toBeLessThanOrEqual(PLANET_ART.cloudLine);
  });

  it.each([
    [0, 844],
    [390, 0],
    [-390, 844],
    [Number.NaN, 844],
    [390, Number.NaN],
  ])('should draw nothing on a screen %p by %p', (width, height) => {
    expect(planetHorizonLayout(width, height)).toEqual({ width: 0, height: 0, left: 0, rise: 0, overhang: 0 });
  });

  it('should know the painting`s planet: its top inside the cut, how wide it shows between the clouds, and where cloud crosses it', () => {
    expect(PLANET_ART.planetTop).toBeGreaterThan(0);
    expect(PLANET_ART.limbWidth).toBeGreaterThan(PLANET_ART.width * 0.7);
    expect(PLANET_ART.limbWidth).toBeLessThan(PLANET_ART.planetRadius * 2);
    expect(PLANET_ART.cloudLine).toBeGreaterThan(PLANET_ART.planetRadius * 0.5);
    expect(PLANET_ART.planetTop + PLANET_ART.cloudLine).toBeLessThan(PLANET_ART.height);
  });
});

/**
 * Between the home page and the page below it there is a gap filled with
 * cloud (operator, 2026-10-03), so the slide passes from the top of the world
 * through cloud to its turned-about underside. The gap is what the planet
 * would hide if the two halves were one round world -- its height less the
 * part of it each page shows -- held between 15% and 60% of the screen, so a
 * phone still gets a layer of cloud and a tablet on its side is not a long
 * fall through it.
 */

const ALL_SCREENS = [
  ['a phone', { width: 390, height: 844 }],
  ['a small phone', { width: 375, height: 667 }],
  ['a tall phone', { width: 402, height: 874 }],
  ['a large phone', { width: 440, height: 956 }],
  ['a narrow Android phone', { width: 360, height: 780 }],
  ['a tablet', { width: 834, height: 1194 }],
  ['a tablet on its side', { width: 1194, height: 834 }],
  ['a large tablet', { width: 1032, height: 1376 }],
  ['a large tablet on its side', { width: 1376, height: 1032 }],
] as const;

const room = (width: number, height: number, edge: 'top' | 'bottom') => {
  const layout = planetHorizonLayout(width, height, edge);
  return layout.height - layout.rise;
};

/**
 * Between the home page and the page below it there is a gap. While the
 * pages slide, the two halves of the planet meet in it as one round world,
 * with a ring of cloud round its waist (operator, 2026-10-03). The gap is
 * what the planet would hide if the two halves were one world, held between
 * 15% and 60% of the screen and then made 10% thinner, and never more than
 * the two paintings can fill between them, so the halves always meet.
 */
describe('cloudGap', () => {
  const wholeWorld = (width: number, height: number) =>
    2 * planetRadius(width) - planetReach(width, height, 'bottom') - planetReach(width, height, 'top');

  it.each(ALL_SCREENS)('should be the rest of the world, within the bounds, 10%% thinner, on %s', (_case, screen) => {
    const { width, height } = screen;
    const bounded = Math.min(Math.max(wholeWorld(width, height), height * EARTH.cloudGap.least), height * EARTH.cloudGap.most);
    const fill = room(width, height, 'bottom') + room(width, height, 'top') - EARTH.seamOverlap;

    expect(cloudGap(width, height)).toBeCloseTo(Math.min(bounded * EARTH.cloudGap.thin, fill), 6);
    expect(EARTH.cloudGap.thin).toBe(0.9);
  });

  it('should be the rest of the world, 10% thinner, on a tablet', () => {
    expect(cloudGap(834, 1194)).toBeCloseTo(wholeWorld(834, 1194) * 0.9, 6);
  });

  it('should be no more than the two paintings can fill on a phone, less the point they overlap, so the halves still meet', () => {
    const fill = room(402, 874, 'bottom') + room(402, 874, 'top') - EARTH.seamOverlap;

    expect(874 * 0.15 * 0.9).toBeGreaterThan(fill);
    expect(cloudGap(402, 874)).toBeCloseTo(fill, 6);
  });

  it('should hold a tablet on its side to 60% of its height, made 10% thinner', () => {
    expect(cloudGap(1194, 834)).toBeCloseTo(834 * 0.6 * 0.9, 6);
  });

  it('should know the planet`s radius on a screen, as the painting is drawn on it', () => {
    expect(planetRadius(919)).toBeCloseTo(PLANET_ART.planetRadius, 6);
    expect(planetRadius(402)).toBeCloseTo((PLANET_ART.planetRadius * 402) / PLANET_ART.limbWidth, 6);
  });

  it.each([
    [0, 844],
    [390, 0],
    [Number.NaN, 844],
    [390, Number.NaN],
  ])('should leave no gap on a screen %p by %p', (width, height) => {
    expect(cloudGap(width, height)).toBe(0);
  });
});

/**
 * Each painting runs on past its page's edge into the gap, and the two meet
 * there. The lower half hangs deeper than the upper stands, so they meet off
 * the middle of the gap, where both show the same row of the painting: the
 * join is a mirror line, not a seam. They overlap by a point so no hairline
 * of sky shows between them.
 */
describe('the halves meeting in the gap', () => {
  it.each(ALL_SCREENS)('should run the two paintings on to meet, overlapping by a point, on %s', (_case, screen) => {
    const { width, height } = screen;
    const above = planetHorizonLayout(width, height, 'bottom');
    const below = planetHorizonLayout(width, height, 'top');

    expect(above.overhang + below.overhang).toBeGreaterThanOrEqual(cloudGap(width, height) + EARTH.seamOverlap - 1e-6);
    expect(above.overhang + below.overhang).toBeLessThanOrEqual(cloudGap(width, height) + EARTH.seamOverlap + 1e-6);
  });

  it.each(ALL_SCREENS)('should meet where both halves show the same row of the painting, on %s', (_case, screen) => {
    const { width, height } = screen;
    const above = planetHorizonLayout(width, height, 'bottom');
    const below = planetHorizonLayout(width, height, 'top');

    expect(above.rise + above.overhang).toBeCloseTo(below.rise + below.overhang, 0);
  });

  it.each(ALL_SCREENS)('should never run a painting on further than it goes, on %s', (_case, screen) => {
    for (const edge of ['bottom', 'top'] as const) {
      const layout = planetHorizonLayout(screen.width, screen.height, edge);
      expect(layout.overhang).toBeGreaterThan(0);
      expect(layout.rise + layout.overhang).toBeLessThanOrEqual(layout.height + 1e-6);
    }
  });
});

/**
 * The ring of cloud round the world's waist, sized against the planet: as
 * wide as the painting's ring is against its planet, centred across the
 * screen and on the place the halves meet, and kept inside the gap -- pressed
 * a little flatter where the gap is too thin for it -- so no cloud shows on a
 * page at rest.
 */
describe('cloudRingLayout', () => {
  const scaleOf = (width: number) => planetRadius(width) / CLOUD_RING_ART.radius;

  it.each(ALL_SCREENS)('should be as wide against the planet as the painting`s ring, centred across %s', (_case, screen) => {
    const ring = cloudRingLayout(screen.width, screen.height);

    expect(ring.width).toBeCloseTo(CLOUD_RING_ART.width * scaleOf(screen.width), 6);
    expect(ring.left + ring.width / 2).toBeCloseTo(screen.width / 2, 6);
  });

  it.each(ALL_SCREENS)('should lie wholly inside the gap on %s', (_case, screen) => {
    const ring = cloudRingLayout(screen.width, screen.height);

    expect(ring.top).toBeGreaterThanOrEqual(-1e-6);
    expect(ring.top + ring.height).toBeLessThanOrEqual(cloudGap(screen.width, screen.height) + 1e-6);
  });

  it('should sit centred on the place the halves meet, at full height, on a tablet', () => {
    const ring = cloudRingLayout(834, 1194);
    const meet = planetHorizonLayout(834, 1194, 'bottom').overhang;

    expect(ring.height).toBeCloseTo(CLOUD_RING_ART.height * scaleOf(834), 6);
    expect(ring.top + CLOUD_RING_ART.centreY * scaleOf(834)).toBeCloseTo(meet, 6);
  });

  it('should be pressed flatter to fit a phone`s thin gap', () => {
    const ring = cloudRingLayout(402, 874);

    expect(ring.height).toBeLessThan(CLOUD_RING_ART.height * scaleOf(402));
    expect(ring.height).toBeCloseTo(cloudGap(402, 874), 6);
  });

  it.each([
    [0, 844],
    [390, 0],
    [Number.NaN, 844],
  ])('should draw nothing on a screen %p by %p', (width, height) => {
    expect(cloudRingLayout(width, height)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });
});
