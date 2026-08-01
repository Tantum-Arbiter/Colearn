/**
 * Tests for the night sky behind the home scene.
 *
 * Stars sit in the upper reaches, the horizon has to stay a horizon on a wide
 * screen rather than becoming a small planet, and shooting stars are rare.
 */

import {
  CLOUD_LAYER,
  cloudBandTop,
  HORIZON,
  SHOOTING_STAR,
  STAR_FIELD,
  buildStarField,
  horizonSize,
  isWideScreen,
  nextShootingStarDelay,
} from '@/constants/night-sky';

const PHONE = 390;
const TABLET = 834;
const HEIGHT = 844;

describe('isWideScreen', () => {
  it.each([
    ['a phone', PHONE, false],
    ['a large phone', 430, false],
    ['a tablet', TABLET, true],
    ['a large tablet', 1024, true],
  ])('should treat %s as wide=%s', (_case, width, expected) => {
    const underTest = isWideScreen(width);

    expect(underTest).toBe(expected);
  });
});

describe('horizonSize', () => {
  it('should overhang the screen so the earth reads as a horizon, not a ball', () => {
    const underTest = horizonSize(PHONE);

    expect(underTest.width).toBeGreaterThan(PHONE);
  });

  it('should overhang much further on a wide screen', () => {
    const underTest = horizonSize(TABLET).width / TABLET;

    expect(underTest).toBeGreaterThan(horizonSize(PHONE).width / PHONE);
  });

  it('should keep the arc shallower on a wide screen', () => {
    const underTest = horizonSize(TABLET).height / TABLET;

    expect(underTest).toBeLessThan(horizonSize(PHONE).height / PHONE);
  });

  it.each([
    ['phone', PHONE, HORIZON.phoneWidthRatio],
    ['tablet', TABLET, HORIZON.tabletWidthRatio],
  ])('should scale the %s horizon from its ratio', (_case, width, ratio) => {
    const underTest = horizonSize(width).width;

    expect(underTest).toBe(Math.round(width * ratio));
  });
});

describe('buildStarField', () => {
  it('should place every star it promises', () => {
    const underTest = buildStarField(PHONE, HEIGHT);

    expect(underTest).toHaveLength(STAR_FIELD.count);
  });

  it('should keep the stars in the upper sky, clear of the horizon', () => {
    const underTest = buildStarField(PHONE, HEIGHT).every(
      (star) => star.y <= HEIGHT * STAR_FIELD.skyFraction
    );

    expect(underTest).toBe(true);
  });

  it('should keep every star on screen', () => {
    const underTest = buildStarField(PHONE, HEIGHT).every(
      (star) => star.x >= 0 && star.x <= PHONE
    );

    expect(underTest).toBe(true);
  });

  it('should give the stars differing twinkle speeds so they never pulse in unison', () => {
    const underTest = new Set(buildStarField(PHONE, HEIGHT).map((star) => star.twinkleMs));

    expect(underTest.size).toBeGreaterThan(1);
  });

  it('should stagger their starts as well', () => {
    const underTest = new Set(buildStarField(PHONE, HEIGHT).map((star) => star.delayMs));

    expect(underTest.size).toBeGreaterThan(1);
  });

  it('should be the same field every time it is built for a screen', () => {
    const underTest = buildStarField(PHONE, HEIGHT);

    expect(underTest).toEqual(buildStarField(PHONE, HEIGHT));
  });
});

describe('nextShootingStarDelay', () => {
  it.each([
    ['the shortest roll', 0, SHOOTING_STAR.restMinMs],
    ['the longest roll', 1, SHOOTING_STAR.restMaxMs],
  ])('should return %s', (_case, roll, expected) => {
    const underTest = nextShootingStarDelay(roll);

    expect(underTest).toBe(expected);
  });

  it('should let the first one come sooner', () => {
    const underTest = nextShootingStarDelay(0, true);

    expect(underTest).toBeLessThan(nextShootingStarDelay(0));
  });

  it('should stay rare enough to be a treat rather than a tic', () => {
    const underTest = SHOOTING_STAR.restMinMs;

    expect(underTest).toBeGreaterThan(SHOOTING_STAR.flightMs * 15);
  });
});

describe('cloudBandTop', () => {
  it('should keep the clouds out of the top half of the screen', () => {
    const underTest = cloudBandTop(HEIGHT);

    expect(underTest).toBeGreaterThanOrEqual(HEIGHT / 2);
  });

  it.each([
    ['a short screen', 667],
    ['a tall screen', 932],
    ['a tablet', 1194],
  ])('should sit at the same fraction on %s', (_case, height) => {
    const underTest = cloudBandTop(height) / height;

    expect(underTest).toBeCloseTo(CLOUD_LAYER.topRatio, 2);
  });

  it('should feather the cut so there is no hard line across the sky', () => {
    const underTest = CLOUD_LAYER.featherHeight;

    expect(underTest).toBeGreaterThan(0);
  });
});
