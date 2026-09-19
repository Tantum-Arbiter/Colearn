/**
 * Tests for the activity-journey night palette.
 *
 * The story, instrument and puzzle screens each carried their own copy of a
 * blue-teal gradient. These pin the invariant that replaced them: the sky is
 * one ordered ramp, and a journey screen picks a window on it rather than a
 * new blue. Screens outside those journeys keep their own palettes and are
 * deliberately not covered here.
 */

import {
  NIGHT_RAMP,
  NIGHT_VOID,
  NIGHT_DEEP,
  NIGHT_PRIMARY,
  NIGHT_BRIGHT,
  SKY_GRADIENT_WORLD,
  SURFACE_PRIMARY,
  SURFACE_SECONDARY,
  SURFACE_NAV,
  BORDER_DEFAULT,
  BORDER_ACTIVE,
  headerSkyVeil,
  skyWorldColourAt,
} from '@/constants/night-palette';

const rampIndex = (stop: string) => NIGHT_RAMP.indexOf(stop as (typeof NIGHT_RAMP)[number]);

const luminance = (hex: string) => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const alphaOf = (rgba: string) => Number(rgba.split(',').pop()?.replace(')', '').trim());

describe('NIGHT_RAMP', () => {
  it('runs darkest to brightest', () => {
    const luminances = NIGHT_RAMP.map(luminance);

    expect(luminances).toEqual([...luminances].sort((a, b) => a - b));
  });

  it('has no duplicate stops', () => {
    expect(new Set(NIGHT_RAMP).size).toBe(NIGHT_RAMP.length);
  });

  it.each([
    ['void', NIGHT_VOID],
    ['deep', NIGHT_DEEP],
    ['primary', NIGHT_PRIMARY],
    ['bright', NIGHT_BRIGHT],
  ])('names the %s stop from the ramp itself', (_name, stop) => {
    expect(rampIndex(stop)).toBeGreaterThanOrEqual(0);
  });
});

describe('SKY_GRADIENT_WORLD', () => {
  it('draws every stop from the ramp', () => {
    SKY_GRADIENT_WORLD.forEach((stop) => expect(rampIndex(stop)).toBeGreaterThanOrEqual(0));
  });

  it('lights the sky from the top, where the planet sits', () => {
    const [top, mid, bottom] = SKY_GRADIENT_WORLD.map(rampIndex);

    expect(top).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(bottom);
  });

  it('never reaches the darkest stop, which is reserved for surfaces beneath it', () => {
    expect(SKY_GRADIENT_WORLD).not.toContain(NIGHT_VOID);
  });
});

describe('surfaces and borders', () => {
  it.each([
    ['SURFACE_PRIMARY', SURFACE_PRIMARY],
    ['SURFACE_SECONDARY', SURFACE_SECONDARY],
    ['SURFACE_NAV', SURFACE_NAV],
    ['BORDER_DEFAULT', BORDER_DEFAULT],
    ['BORDER_ACTIVE', BORDER_ACTIVE],
  ])('%s is translucent, so the world shows through it', (_name, token) => {
    const alpha = alphaOf(token);

    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(1);
  });

  it('makes the navigation the most opaque surface, so it reads as a shelf', () => {
    expect(alphaOf(SURFACE_NAV)).toBeGreaterThan(alphaOf(SURFACE_SECONDARY));
    expect(alphaOf(SURFACE_SECONDARY)).toBeGreaterThan(alphaOf(SURFACE_PRIMARY));
  });

  it('makes the active border brighter than the default one', () => {
    expect(alphaOf(BORDER_ACTIVE)).toBeGreaterThan(alphaOf(BORDER_DEFAULT));
  });
});

/**
 * Content that scrolls up under a page's header dissolves into the sky before
 * it reaches the buttons. The veil it dissolves into has to be the sky itself,
 * so its colours are read off the same gradient the page is painted with.
 */
describe('skyWorldColourAt', () => {
  it.each([
    ['the top of the page', 0, SKY_GRADIENT_WORLD[0]],
    ['the middle of the page', 0.5, SKY_GRADIENT_WORLD[1]],
    ['the foot of the page', 1, SKY_GRADIENT_WORLD[2]],
  ])('should be the sky as painted at %s', (_case, fraction, hex) => {
    const underTest = skyWorldColourAt(fraction);

    expect(underTest).toEqual({
      red: parseInt(hex.slice(1, 3), 16),
      green: parseInt(hex.slice(3, 5), 16),
      blue: parseInt(hex.slice(5, 7), 16),
    });
  });

  it('should blend evenly between two stops', () => {
    const top = skyWorldColourAt(0);
    const middle = skyWorldColourAt(0.5);

    const underTest = skyWorldColourAt(0.25);

    expect(underTest.blue).toBe(Math.round((top.blue + middle.blue) / 2));
    expect(underTest.red).toBe(Math.round((top.red + middle.red) / 2));
  });

  it('should hold the end colours beyond the page', () => {
    expect(skyWorldColourAt(-1)).toEqual(skyWorldColourAt(0));
    expect(skyWorldColourAt(2)).toEqual(skyWorldColourAt(1));
  });
});

describe('headerSkyVeil', () => {
  const HEADER = 240;
  const SCREEN = 1200;

  it('should be solid sky over the top of the header and clear by its lower edge', () => {
    const underTest = headerSkyVeil(HEADER, SCREEN);

    expect(underTest.locations[0]).toBe(0);
    expect(underTest.locations[underTest.locations.length - 1]).toBe(1);
    expect(underTest.colours[0]).toMatch(/, 1\)$/);
    expect(underTest.colours[1]).toMatch(/, 1\)$/);
    expect(underTest.colours[underTest.colours.length - 1]).toMatch(/, 0\)$/);
    expect(underTest.locations[1]).toBeGreaterThanOrEqual(0.4);
    expect(underTest.locations[1]).toBeLessThanOrEqual(0.7);
  });

  it('should take each colour from the sky at the height it sits at', () => {
    const underTest = headerSkyVeil(HEADER, SCREEN);
    const atFoot = skyWorldColourAt(HEADER / SCREEN);

    expect(underTest.colours[0]).toBe('rgba(21, 82, 183, 1)');
    expect(underTest.colours[underTest.colours.length - 1]).toBe(
      `rgba(${atFoot.red}, ${atFoot.green}, ${atFoot.blue}, 0)`
    );
  });

  it('should still be a usable gradient before the screen has been measured', () => {
    const underTest = headerSkyVeil(HEADER, 0);

    expect(underTest.colours).toHaveLength(underTest.locations.length);
    underTest.colours.forEach((colour) => expect(colour).not.toContain('NaN'));
  });
});
