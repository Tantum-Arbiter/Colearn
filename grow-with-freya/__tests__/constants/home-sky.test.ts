/**
 * Tests for the hero sky's layout and motion rules.
 *
 * The sun is the anchor; stars and sparkles are
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
