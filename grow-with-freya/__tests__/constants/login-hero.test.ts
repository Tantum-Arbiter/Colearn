/**
 * The three animals on the login page: each sways on its own beat about its
 * feet, breathes, and every so often cross-fades into its beaming self, the way
 * the sun and moon do. Everything is read off one clock so it can be tested as
 * arithmetic.
 */

import {
  HERO_ANIMALS,
  HERO_FOREGROUND,
  HERO_FRAMES,
  HERO_LOOP_MS,
  HERO_MOTION,
  HERO_RHYTHM,
  heroFrame,
  laughAmount,
  laughFace,
  swayPose,
} from '@/constants/login-hero';

describe('the loop', () => {
  it.each(HERO_ANIMALS)('%s: every rhythm divides the loop, so it wraps without a jump', (animal) => {
    const rhythm = HERO_RHYTHM[animal];

    for (const period of [rhythm.swayMs, rhythm.breatheMs, rhythm.laughEveryMs]) {
      expect(HERO_LOOP_MS % period).toBe(0);
    }
  });

  it.each(HERO_ANIMALS)('%s: laughs never overlap and each finishes inside the period', (animal) => {
    const rhythm = HERO_RHYTHM[animal];
    const cues = [...rhythm.laughsAtMs].sort((a, b) => a - b);

    cues.forEach((atMs, index) => {
      expect(atMs + HERO_MOTION.laughMs).toBeLessThanOrEqual(index + 1 < cues.length ? cues[index + 1] : rhythm.laughEveryMs);
    });
  });

  it('starts each animal laughing at a different moment, so they do not beam in chorus', () => {
    const openings = HERO_ANIMALS.map((animal) => HERO_RHYTHM[animal].laughsAtMs[0]);

    expect(new Set(openings).size).toBe(HERO_ANIMALS.length);
  });
});

describe('swayPose', () => {
  it.each(HERO_ANIMALS)('%s stands upright at full height at rest', (animal) => {
    const underTest = swayPose(0, animal);

    expect(underTest.rotateDeg).toBeCloseTo(0, 9);
    expect(underTest.scaleY).toBe(1);
  });

  it.each(HERO_ANIMALS)('%s leans as far as its sway and no further', (animal) => {
    const rhythm = HERO_RHYTHM[animal];
    const leans = Array.from({ length: 33 }, (_, index) => swayPose((rhythm.swayMs * index) / 32, animal).rotateDeg);

    expect(Math.max(...leans.map(Math.abs))).toBeCloseTo(rhythm.swayDeg, 6);
  });

  it.each(HERO_ANIMALS)('%s breathes in fully half way through a breath and out again by its end', (animal) => {
    const rhythm = HERO_RHYTHM[animal];

    expect(swayPose(rhythm.breatheMs / 2, animal).scaleY).toBeCloseTo(1 + HERO_MOTION.breatheScale, 9);
    expect(swayPose(rhythm.breatheMs, animal).scaleY).toBeCloseTo(1, 9);
  });

  it('does not rock the three animals in step', () => {
    const at = 700;
    const leans = HERO_ANIMALS.map((animal) => swayPose(at, animal).rotateDeg);

    expect(new Set(leans.map((lean) => Math.sign(lean))).size).toBeGreaterThan(1);
  });
});

describe('laughFace', () => {
  it('shows the resting face before the laugh and once it is over', () => {
    expect(laughFace(0)).toBe(0);
    expect(laughFace(1)).toBe(0);
    expect(laughFace(-0.1)).toBe(0);
  });

  it('shows the beaming face fully between the fade in and the fade out', () => {
    expect(laughFace(HERO_MOTION.laughFadeInEnds)).toBeCloseTo(1, 9);
    expect(laughFace((HERO_MOTION.laughFadeInEnds + HERO_MOTION.laughFadeOutStarts) / 2)).toBeCloseTo(1, 9);
    expect(laughFace(HERO_MOTION.laughFadeOutStarts)).toBeCloseTo(1, 9);
  });

  it('cross-fades rather than cutting, on the way in and the way out', () => {
    const fadingIn = laughFace(HERO_MOTION.laughFadeInEnds / 2);
    const fadingOut = laughFace((HERO_MOTION.laughFadeOutStarts + 1) / 2);

    [fadingIn, fadingOut].forEach((amount) => {
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBeLessThan(1);
    });
  });
});

describe('laughAmount', () => {
  it.each(HERO_ANIMALS)('%s rests at the start and between laughs', (animal) => {
    const rhythm = HERO_RHYTHM[animal];

    expect(laughAmount(0, animal)).toBe(0);
    rhythm.laughsAtMs.forEach((atMs) => {
      expect(laughAmount(atMs, animal)).toBe(0);
      expect(laughAmount(atMs + HERO_MOTION.laughMs, animal)).toBe(0);
    });
  });

  it.each(HERO_ANIMALS)('%s beams fully in the middle of every laugh, and again next time round', (animal) => {
    const rhythm = HERO_RHYTHM[animal];

    rhythm.laughsAtMs.forEach((atMs) => {
      const midway = atMs + HERO_MOTION.laughMs / 2;

      expect(laughAmount(midway, animal)).toBeCloseTo(1, 9);
      expect(laughAmount(midway + rhythm.laughEveryMs, animal)).toBeCloseTo(1, 9);
    });
  });
});

describe('heroFrame', () => {
  it('scales a frame of fractions to the box', () => {
    expect(heroFrame({ x: 0.5, y: 0.25, width: 0.25, height: 0.5 }, 400, 200)).toEqual({
      left: 200,
      top: 50,
      width: 100,
      height: 100,
    });
  });
});

describe('the measured frames', () => {
  it.each(HERO_ANIMALS)('%s sits inside the canvas', (animal) => {
    const frame = HERO_FRAMES[animal];

    expect(frame.x).toBeGreaterThanOrEqual(0);
    expect(frame.y).toBeGreaterThanOrEqual(0);
    expect(frame.x + frame.width).toBeLessThanOrEqual(1);
    expect(frame.y + frame.height).toBeLessThanOrEqual(1);
  });

  it('puts the book across the bottom of the canvas', () => {
    expect(HERO_FOREGROUND.y + HERO_FOREGROUND.height).toBeGreaterThan(0.95);
    expect(HERO_FOREGROUND.width).toBeGreaterThan(0.95);
  });
});
