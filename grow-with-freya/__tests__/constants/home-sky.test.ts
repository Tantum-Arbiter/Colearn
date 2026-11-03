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
  PORTRAIT_TABLET_SUN_SCALE,
  STAR_BASIS_CAP,
  buildHeroSky,
  starBasis,
  heroContentTop,
  heroMotionMode,
  heroSunFrame,
  heroSunScale,
  sunFrame,
  type HeroStarSeed,
  TALL_PHONE_SUN_SCALE,
  TALL_PHONE_CONTENT_DROP,
  TALL_PHONE_CONTENT_LIFT,
  heroContentDrop,
  heroContentLift,
  heroSlackDrop,
  PORTRAIT_TABLET_CONTENT_LIFT,
} from '@/constants/home-sky';

const PHONE = 402;
const TABLET = 834;
const SUN = sunFrame(PHONE, 59);

function distanceFromSun(seed: HeroStarSeed, sun = SUN): number {
  const centreX = seed.x + seed.size / 2;
  const centreY = seed.y + seed.size / 2;

  return Math.hypot(centreX - sun.centreX, centreY - sun.centreY) / sun.size;
}

/**
 * The stars are texture around the hero, not the hero. Sized point-for-point
 * off the sun they grew with it twice over on a tablet -- once for the wider
 * screen, again for portrait's `sizeScale` boost -- and the scatter of small
 * lights read as a handful of blobs.
 */
describe('starBasis', () => {
  it('leaves a phone alone -- its sun never reaches the cap', () => {
    const phoneSun = sunFrame(PHONE, 59).size;

    expect(starBasis(phoneSun)).toBe(phoneSun);
  });

  it('stops the stars keeping pace once the sun is tablet-sized', () => {
    const tabletSun = sunFrame(TABLET, 24).size;

    expect(tabletSun).toBeGreaterThan(STAR_BASIS_CAP);
    expect(starBasis(tabletSun)).toBe(STAR_BASIS_CAP);
  });

  it("does not let portrait's bigger sun drag the stars up with it", () => {
    const plain = sunFrame(TABLET, 24);
    const boosted = sunFrame(TABLET, 24, TABLET, 1.3);

    expect(boosted.size).toBeGreaterThan(plain.size);
    expect(starBasis(boosted.size, 1.3)).toBe(starBasis(plain.size));
  });

  it('draws the stars from the basis it is handed, not the sun', () => {
    const sun = sunFrame(TABLET, 24, TABLET, 1.3);
    const big = buildHeroSky(TABLET, sun).stars;
    const damped = buildHeroSky(TABLET, sun, starBasis(sun.size, 1.3)).stars;

    expect(damped[0].size).toBeLessThan(big[0].size);
    // still centred where they were -- only their size changed
    expect(damped[0].x + damped[0].size / 2).toBeCloseTo(big[0].x + big[0].size / 2, 5);
  });
});

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

  it('should grow past its ordinary ratio when handed a size scale, without moving off centre', () => {
    const plain = sunFrame(TABLET, 59);
    const scaled = sunFrame(TABLET, 59, TABLET, 1.3);

    expect(scaled.size).toBe(Math.round(TABLET * HERO_SKY.sunSizeRatio * 1.3));
    expect(scaled.size).toBeGreaterThan(plain.size);
    expect(scaled.centreX).toBe(plain.centreX);
    expect(scaled.top).toBe(plain.top);
  });
});

describe('heroSunScale', () => {
  it('should grow the sun on an upright tablet', () => {
    expect(heroSunScale(1194, TABLET)).toBe(1);
    expect(heroSunScale(TABLET, 1194)).toBe(PORTRAIT_TABLET_SUN_SCALE);
  });

  it('should grow the sun on a tall phone, which has sky to spare above its cards', () => {
    expect(heroSunScale(PHONE, 874)).toBe(TALL_PHONE_SUN_SCALE);
    expect(heroSunScale(430, 932)).toBe(TALL_PHONE_SUN_SCALE);
    expect(TALL_PHONE_SUN_SCALE).toBeGreaterThan(PORTRAIT_TABLET_SUN_SCALE);
  });

  it('should leave the sun alone on a short phone, which has no room to give', () => {
    expect(heroSunScale(375, 667)).toBe(1);
    expect(heroSunScale(375, 812)).toBe(1);
    expect(heroSunScale(874, PHONE)).toBe(1);
  });
});

describe('heroContentLift', () => {
  it('should lift the greeting-to-trial block by a twentieth of a portrait tablet', () => {
    expect(PORTRAIT_TABLET_CONTENT_LIFT).toBe(0.05);
    expect(heroContentLift(TABLET, 1194)).toBe(Math.round(1194 * 0.05));
    expect(heroContentLift(1024, 1366)).toBe(Math.round(1366 * 0.05));
  });

  it('should leave a landscape tablet and every phone where they are', () => {
    expect(heroContentLift(1194, TABLET)).toBe(0);
    expect(heroContentLift(PHONE, 874)).toBe(0);
  });
});

describe('heroSlackDrop', () => {
  it('should bring the sun and the page under it down by the room left at the foot', () => {
    expect(heroSlackDrop(874, 850)).toBe(24);
  });

  it('should keep the sun and the page high: at most half the drop first tried', () => {
    expect(HERO_SKY.maxSlackDrop).toBeLessThanOrEqual(32);
    expect(heroSlackDrop(874, 700)).toBe(HERO_SKY.maxSlackDrop);
  });

  it.each([
    ['fills the screen', 874],
    ['runs past it and scrolls', 950],
  ])('should not move a page that %s', (_, content) => {
    expect(heroSlackDrop(874, content)).toBe(0);
  });

  it('should stop short of drifting the sun far from the top on a page with lots of room', () => {
    expect(heroSlackDrop(874, 500)).toBe(HERO_SKY.maxSlackDrop);
  });

  it.each([
    ['not yet measured', 0, 0],
    ['measured as nonsense', Number.NaN, 700],
  ])('should move nothing on a page %s', (_, viewport, content) => {
    expect(heroSlackDrop(viewport, content)).toBe(0);
  });
});

describe('heroContentDrop', () => {
  it('should raise the greeting and the cards by a twentieth of a tall phone, net of the room the bigger sun asked for', () => {
    expect(TALL_PHONE_CONTENT_LIFT).toBe(0.05);
    expect(heroContentDrop(PHONE, 874)).toBe(TALL_PHONE_CONTENT_DROP - Math.round(874 * 0.05));
    expect(heroContentDrop(430, 932)).toBe(TALL_PHONE_CONTENT_DROP - Math.round(932 * 0.05));
  });

  it('should still start the greeting below the grown sun', () => {
    const sun = sunFrame(PHONE, 59, 874, heroSunScale(PHONE, 874));

    expect(heroContentTop(59, sun.size) + heroContentDrop(PHONE, 874)).toBeGreaterThan(sun.top + sun.size - HERO_SKY.welcomeGap * 2);
  });

  it('should still fit an iPhone 16 Pro without scrolling once the sun has grown', () => {
    const grownSun = sunFrame(PHONE, 59, 874, heroSunScale(PHONE, 874)).size;
    const plainSun = sunFrame(PHONE, 59, 874).size;
    const spareOnThePlainLayout = 142;

    expect(grownSun - plainSun + heroContentDrop(PHONE, 874)).toBeLessThan(spareOnThePlainLayout);
  });

  it('should not move anything on a short phone or a tablet', () => {
    expect(heroContentDrop(375, 667)).toBe(0);
    expect(heroContentDrop(TABLET, 1194)).toBe(0);
    expect(heroContentDrop(1194, TABLET)).toBe(0);
  });
});

describe('heroSunFrame', () => {
  it('should be the grown sun on a tall phone and the plain sun on a short one', () => {
    expect(heroSunFrame(PHONE, 874, 59)).toEqual(sunFrame(PHONE, 59, 874, TALL_PHONE_SUN_SCALE));
    expect(heroSunFrame(375, 667, 20)).toEqual(sunFrame(375, 20, 667));
  });

  it('should be the plain sun on a tablet on its side', () => {
    expect(heroSunFrame(1194, TABLET, 24)).toEqual(sunFrame(1194, 24, TABLET));
  });

  it('should grow the sun on an upright tablet, which has the height to spare', () => {
    expect(heroSunFrame(TABLET, 1194, 24)).toEqual(sunFrame(TABLET, 24, 1194, PORTRAIT_TABLET_SUN_SCALE));
    expect(PORTRAIT_TABLET_SUN_SCALE).toBe(1.3);
  });

  it('should count a screen as a tablet from a short side of 768', () => {
    expect(heroSunFrame(768, 1024, 20)).toEqual(sunFrame(768, 20, 1024, PORTRAIT_TABLET_SUN_SCALE));
    expect(heroSunFrame(767, 1024, 20)).toEqual(sunFrame(767, 20, 1024, TALL_PHONE_SUN_SCALE));
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
