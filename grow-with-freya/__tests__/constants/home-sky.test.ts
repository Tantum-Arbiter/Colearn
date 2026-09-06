/**
 * Tests for the hero sky's layout and motion rules.
 *
 * The sun is the anchor; stars, sparkles and clouds are
 * placed around it from the sun's own frame so that the same scene holds on a
 * phone and a tablet. Every duration and drift is bounded so the sky stays
 * calm, and nothing twinkles in step with anything else.
 */

import {
  HERO_SKY,
  buildHeroSky,
  heroContentTop,
  heroMotionMode,
  sunFrame,
  type HeroStarSeed,
} from '@/constants/home-sky';

const PHONE = 402;
const TABLET = 834;
const SUN = sunFrame(PHONE, 59);

function distanceFromSun(seed: HeroStarSeed, sun = SUN): number {
  const centreX = seed.x + seed.size / 2;
  const centreY = seed.y + seed.size / 2;

  return Math.hypot(centreX - sun.centreX, centreY - sun.centreY) / sun.size;
}

describe('sunFrame', () => {
  it('should hang the sun centred under the safe area with breathing room above it', () => {
    const underTest = sunFrame(PHONE, 59);

    expect(underTest.centreX).toBe(PHONE / 2);
    expect(underTest.top).toBe(59 + HERO_SKY.sunTopInset);
    expect(underTest.size).toBe(Math.round(PHONE * HERO_SKY.sunSizeRatio));
    expect(underTest.centreY).toBe(underTest.top + underTest.size / 2);
  });

  it('should let the welcome start below the sun with a clear gap', () => {
    const underTest = heroContentTop(59, SUN.size);

    expect(underTest).toBe(59 + HERO_SKY.sunTopInset + SUN.size + HERO_SKY.welcomeGap);
  });
});

describe('heroMotionMode', () => {
  it.each([
    [true, false, 'full'],
    [true, true, 'gentle'],
    [false, false, 'off'],
    [false, true, 'off'],
  ] as const)('with settled %s and reduce motion %s should be %s', (settled, reduceMotion, expected) => {
    expect(heroMotionMode(settled, reduceMotion)).toBe(expected);
  });
});

describe('buildHeroSky', () => {
  const underTest = buildHeroSky(PHONE, SUN);

  describe('the stars', () => {
    const stars = underTest.stars.filter((seed) => seed.kind.startsWith('star-'));
    const sparkles = underTest.stars.filter((seed) => seed.kind.startsWith('sparkle-'));

    it('should mix five-point stars with a few four-point sparkles', () => {
      expect(stars.length).toBeGreaterThanOrEqual(6);
      expect(sparkles.length).toBeGreaterThanOrEqual(3);
      expect(sparkles.length).toBeLessThan(stars.length);
    });

    it('should come in small, medium and large sizes', () => {
      const sizes = new Set(underTest.stars.map((seed) => seed.size));

      expect(sizes.size).toBeGreaterThanOrEqual(3);
    });

    it('should keep some stars close to the sun and send others out to the corners', () => {
      const near = underTest.stars.filter((seed) => distanceFromSun(seed) < 1.3);
      const far = underTest.stars.filter((seed) => distanceFromSun(seed) > 1.7);

      expect(near.length).toBeGreaterThanOrEqual(3);
      expect(far.length).toBeGreaterThanOrEqual(3);
    });

    it('should never sit on the sun itself', () => {
      const overlapping = underTest.stars.filter((seed) => distanceFromSun(seed) < 0.62);

      expect(overlapping).toEqual([]);
    });

    it('should not mirror itself across the sun', () => {
      const offsets = underTest.stars.map((seed) => Math.round(seed.x + seed.size / 2 - SUN.centreX));
      const mirrored = offsets.filter((offset) => offsets.includes(-offset));

      expect(mirrored.length).toBeLessThan(offsets.length / 2);
    });

    it('should twinkle slowly and never in step', () => {
      const delays = new Set(underTest.stars.map((seed) => seed.delayMs));

      underTest.stars.forEach((seed) => {
        expect(seed.twinkleMs).toBeGreaterThanOrEqual(HERO_SKY.twinkleMinMs);
        expect(seed.twinkleMs).toBeLessThanOrEqual(HERO_SKY.twinkleMaxMs);
      });
      expect(delays.size).toBe(underTest.stars.length);
    });

    it('should stay inside the sky', () => {
      underTest.stars.forEach((seed) => {
        expect(seed.x).toBeGreaterThanOrEqual(-seed.size / 2);
        expect(seed.x + seed.size).toBeLessThanOrEqual(PHONE + seed.size / 2);
        expect(seed.y).toBeGreaterThanOrEqual(0);
        expect(seed.y + seed.size).toBeLessThanOrEqual(underTest.height);
      });
    });
  });

  describe('the clouds', () => {
    it('should frame the sun from both edges, and settle lower down on both sides too', () => {
      const aboveSun = underTest.clouds.filter((cloud) => cloud.y < SUN.centreY);
      const belowSun = underTest.clouds.filter((cloud) => cloud.y > SUN.centreY);
      const fromLeft = (clouds: typeof underTest.clouds) => clouds.filter((cloud) => cloud.x < 0);
      const fromRight = (clouds: typeof underTest.clouds) => clouds.filter((cloud) => cloud.x + cloud.width > PHONE);

      expect(fromLeft(aboveSun).length).toBeGreaterThanOrEqual(1);
      expect(fromRight(aboveSun).length).toBeGreaterThanOrEqual(1);
      expect(fromLeft(belowSun).length).toBeGreaterThanOrEqual(1);
      expect(fromRight(belowSun).length).toBeGreaterThanOrEqual(1);
    });

    it('should reach down past the welcome to bridge into the card below', () => {
      const welcomeTop = heroContentTop(59, SUN.size);
      const bridging = underTest.clouds.filter((cloud) => cloud.y + cloud.height > welcomeTop + HERO_SKY.welcomeBlock);

      expect(bridging.length).toBeGreaterThanOrEqual(1);
    });

    it('should keep the sun clear', () => {
      const sunLeft = SUN.centreX - SUN.size / 2;
      const sunRight = SUN.centreX + SUN.size / 2;
      const covering = underTest.clouds.filter(
        (cloud) => cloud.y < SUN.centreY && cloud.x < sunRight && cloud.x + cloud.width > sunLeft && cloud.x + cloud.width * 0.6 > sunLeft && cloud.x + cloud.width * 0.4 < sunRight
      );

      expect(covering).toEqual([]);
    });

    it('should drift by only a few pixels, very slowly', () => {
      underTest.clouds.forEach((cloud) => {
        expect(Math.abs(cloud.driftX) + Math.abs(cloud.driftY)).toBeGreaterThanOrEqual(HERO_SKY.cloudDriftMinPx);
        expect(Math.abs(cloud.driftX)).toBeLessThanOrEqual(HERO_SKY.cloudDriftMaxPx);
        expect(Math.abs(cloud.driftY)).toBeLessThanOrEqual(HERO_SKY.cloudDriftMaxPx);
        expect(cloud.driftMs).toBeGreaterThanOrEqual(HERO_SKY.cloudDriftMinMs);
        expect(cloud.driftMs).toBeLessThanOrEqual(HERO_SKY.cloudDriftMaxMs);
      });
    });

    it('should keep the art in proportion', () => {
      underTest.clouds.forEach((cloud) => {
        expect(cloud.height).toBeGreaterThan(0);
        expect(cloud.width / cloud.height).toBeGreaterThan(1.4);
        expect(cloud.opacity).toBeLessThanOrEqual(1);
        expect(cloud.opacity).toBeGreaterThan(0.3);
      });
    });
  });


  describe('the halo', () => {
    it('should sit behind the sun and spread well past it', () => {
      const { halo } = underTest;

      expect(halo.x + halo.size / 2).toBe(SUN.centreX);
      expect(halo.y + halo.size / 2).toBe(SUN.centreY);
      expect(halo.size).toBeGreaterThan(SUN.size * 2);
    });
  });

  it('should scale with the screen rather than stretch', () => {
    const tabletSun = sunFrame(TABLET, 24);
    const tablet = buildHeroSky(TABLET, tabletSun);

    expect(tablet.stars.length).toBe(underTest.stars.length);
    expect(tablet.clouds.length).toBe(underTest.clouds.length);
    tablet.stars.forEach((seed, index) => {
      expect(seed.size / tabletSun.size).toBeCloseTo(underTest.stars[index].size / SUN.size, 5);
    });
  });
});

/**
 * The stars blink rather than breathe. The old pulse eased between full and
 * 0.75 opacity across the whole cycle, which at that depth read as nothing
 * happening. A blink is the opposite shape -- steady for seconds, then a
 * short dip -- and these bounds are what keep it a blink and keep it calm:
 * the dip must be brief against the hold, and the hold must be long enough
 * that a skyful of stars is never busy.
 */
describe('the star blink', () => {
  it('is brief against the time a star spends lit', () => {
    expect(HERO_SKY.blinkMs * 2).toBeLessThan(HERO_SKY.twinkleMinMs / 2);
  });

  it('holds still for seconds between blinks', () => {
    expect(HERO_SKY.twinkleMinMs).toBeGreaterThanOrEqual(2000);
  });

  it('dips far enough to be seen at all', () => {
    expect(HERO_SKY.blinkFloor).toBeLessThan(0.6);
  });

  it('dips less when motion is already being eased back', () => {
    expect(HERO_SKY.gentleFloor).toBeGreaterThan(HERO_SKY.blinkFloor);
  });
});
