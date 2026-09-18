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
