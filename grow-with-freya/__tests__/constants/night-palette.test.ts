/**
 * Tests for the single night palette.
 *
 * The app used to carry seven separate sky gradients -- splash, auth,
 * auth-checking, onboarding, main menu, story catalogue and the home scene --
 * which drifted from near-black navy to blue-teal. These pin the invariant
 * that replaced them: every sky stop comes from one ordered ramp, so a screen
 * can pick a lighter or darker window on the ramp but never a new blue.
 */

import {
  NIGHT_RAMP,
  NIGHT_VOID,
  NIGHT_DEEP,
  NIGHT_PRIMARY,
  NIGHT_BRIGHT,
  SKY_GRADIENT_WORLD,
  SKY_GRADIENT_QUIET,
  SKY_GRADIENT_OVERLAY,
  SCRIM_TO_DEEP,
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

describe('sky gradients', () => {
  it.each([
    ['world', SKY_GRADIENT_WORLD],
    ['quiet', SKY_GRADIENT_QUIET],
    ['overlay', SKY_GRADIENT_OVERLAY],
  ])('draws every %s stop from the ramp', (_name, gradient) => {
    gradient.forEach((stop) => expect(rampIndex(stop)).toBeGreaterThanOrEqual(0));
  });

  it('lights the world sky from the top, where the planet sits', () => {
    const [top, mid, bottom] = SKY_GRADIENT_WORLD.map(rampIndex);

    expect(top).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(bottom);
  });

  it('keeps the quiet sky darkest at the top, so text-led screens stay legible', () => {
    const [top, mid, bottom] = SKY_GRADIENT_QUIET.map(rampIndex);

    expect(top).toBeLessThan(mid);
    expect(mid).toBeLessThan(bottom);
  });

  it('starts the quiet sky darker than the world sky ever gets', () => {
    const quietTop = rampIndex(SKY_GRADIENT_QUIET[0]);
    const worldFloor = Math.min(...SKY_GRADIENT_WORLD.map(rampIndex));

    expect(quietTop).toBeLessThan(worldFloor);
  });

  it('keeps a modal overlay darker than the world it covers', () => {
    const overlayCeiling = Math.max(...SKY_GRADIENT_OVERLAY.map(rampIndex));
    const worldCeiling = Math.max(...SKY_GRADIENT_WORLD.map(rampIndex));

    expect(overlayCeiling).toBeLessThan(worldCeiling);
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

describe('SCRIM_TO_DEEP', () => {
  const rgbOf = (hex: string) =>
    [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(', ');

  it('lands on the deep stop, so artwork meets the surface without a seam', () => {
    expect(SCRIM_TO_DEEP[SCRIM_TO_DEEP.length - 1]).toBe(NIGHT_DEEP);
  });

  it('fades from fully transparent to the same colour it lands on', () => {
    const rgb = rgbOf(NIGHT_DEEP);

    expect(SCRIM_TO_DEEP[0]).toBe(`rgba(${rgb}, 0)`);
    expect(SCRIM_TO_DEEP[1]).toContain(`rgba(${rgb},`);
  });

  it('rises in opacity across its stops', () => {
    expect(alphaOf(SCRIM_TO_DEEP[0])).toBeLessThan(alphaOf(SCRIM_TO_DEEP[1]));
  });
});
