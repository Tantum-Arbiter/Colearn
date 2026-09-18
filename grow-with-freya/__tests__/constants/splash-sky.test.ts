/**
 * Tests for the sky behind the splash logo.
 *
 * The splash is on screen for a couple of seconds, so its sky cannot rely on the
 * home sky's slow twinkle alone: moonlight blooms behind the sprout as it grows,
 * a few motes lift off the book, and one shooting star crosses the upper sky.
 * All of it has to stay calm.
 */

import {
  SHOOTING_STAR,
  SPLASH_GLOW,
  SPLASH_MOTES,
  buildMotes,
  glowFrame,
  moteOpacity,
  shootingStarPath,
  taglineBottom,
} from '@/constants/splash-sky';
import { SPLASH_TIMELINE, layerFrame } from '@/constants/splash-logo';
import { HERO_HALO } from '@/constants/home-sky';
import { earthLayout } from '@/constants/earth';

const LOGO = 280;
const PHONE = { width: 390, height: 844 };

describe('glowFrame', () => {
  it('should centre the moonlight on the sprout, not on the logo square', () => {
    const logoLeft = 55;
    const logoTop = 282;
    const stem = layerFrame('stem', LOGO);
    const leafTop = layerFrame('leafTop', LOGO);

    const underTest = glowFrame(logoLeft, logoTop, LOGO);

    const centreX = underTest.left + underTest.size / 2;
    const centreY = underTest.top + underTest.size / 2;
    expect(centreX).toBeCloseTo(logoLeft + LOGO / 2, 6);
    expect(centreY).toBeGreaterThan(logoTop + leafTop.top);
    expect(centreY).toBeLessThan(logoTop + stem.top + stem.height);
  });

  it('should spill past the sprout on every side', () => {
    const book = layerFrame('book', LOGO);

    const underTest = glowFrame(0, 0, LOGO);

    expect(underTest.size).toBeGreaterThan(book.width * 2);
    expect(underTest.size).toBe(LOGO * SPLASH_GLOW.sizeRatio);
  });

  it('should light the sprout with moonlight whatever the hour, because gold over a blue sky turns grey', () => {
    expect(SPLASH_GLOW.colour).toBe(HERO_HALO.night);
  });

  it('should stay moonlight rather than a spotlight', () => {
    expect(SPLASH_GLOW.peakOpacity).toBeLessThanOrEqual(0.5);
    expect(SPLASH_GLOW.restOpacity).toBeLessThan(SPLASH_GLOW.peakOpacity);
    expect(SPLASH_GLOW.restOpacity).toBeGreaterThan(0);
  });
});

describe('buildMotes', () => {
  it('should be the same every launch', () => {
    expect(buildMotes(LOGO)).toEqual(buildMotes(LOGO));
  });

  it('should keep to a handful', () => {
    const underTest = buildMotes(LOGO);

    expect(underTest).toHaveLength(SPLASH_MOTES.count);
    expect(SPLASH_MOTES.count).toBeLessThanOrEqual(8);
  });

  it('should lift every mote off the open book', () => {
    const book = layerFrame('book', LOGO);

    const underTest = buildMotes(LOGO);

    underTest.forEach((mote) => {
      expect(mote.x).toBeGreaterThan(book.left);
      expect(mote.x).toBeLessThan(book.left + book.width);
      expect(mote.startY).toBeGreaterThanOrEqual(book.top);
      expect(mote.startY).toBeLessThanOrEqual(book.top + book.height / 2);
      expect(mote.risePx).toBeGreaterThan(0);
      expect(mote.startY - mote.risePx).toBeGreaterThanOrEqual(0);
    });
  });

  it('should scale with the logo', () => {
    const small = buildMotes(100);

    const underTest = buildMotes(300);

    underTest.forEach((mote, index) => {
      expect(mote.x).toBeCloseTo(small[index].x * 3, 6);
      expect(mote.risePx).toBeCloseTo(small[index].risePx * 3, 6);
    });
  });

  it('should send them up one after another, slowly and faintly', () => {
    const underTest = buildMotes(LOGO);

    const delays = underTest.map((mote) => mote.delayMs);
    expect(new Set(delays).size).toBe(underTest.length);
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(SPLASH_TIMELINE.stem.delayMs);
    underTest.forEach((mote) => {
      expect(mote.durationMs).toBeGreaterThanOrEqual(2400);
      expect(mote.peakOpacity).toBeLessThanOrEqual(0.6);
      expect(mote.size).toBeLessThanOrEqual(4);
    });
  });

  it('should show at least a few before the splash leaves', () => {
    const underTest = buildMotes(LOGO);

    const seen = underTest.filter((mote) => mote.delayMs + mote.durationMs / 3 < SPLASH_TIMELINE.exitAtMs);

    expect(seen.length).toBeGreaterThanOrEqual(3);
  });
});

describe('moteOpacity', () => {
  it.each([
    ['invisible as it leaves the page', 0, 0],
    ['still coming up a quarter of the way', 0.25, Math.sin(Math.PI / 4) * 0.5],
    ['brightest mid-flight', 0.5, 0.5],
    ['fading three quarters of the way', 0.75, Math.sin(Math.PI / 4) * 0.5],
    ['gone by the top', 1, 0],
  ])('should be %s', (_case, progress, expected) => {
    const underTest = moteOpacity(progress, 0.5);

    expect(underTest).toBeCloseTo(expected, 6);
  });

  it('should never go negative outside its flight', () => {
    expect(moteOpacity(-0.2, 0.5)).toBe(0);
    expect(moteOpacity(1.3, 0.5)).toBe(0);
  });
});

describe('taglineBottom', () => {
  it.each([
    ['a phone', 390, 844],
    ['a tablet', 834, 1194],
    ['a tablet on its side', 1194, 834],
  ])('should rest the tagline clear above the earth on %s', (_case, width, height) => {
    const underTest = taglineBottom(width, height);

    expect(underTest).toBeGreaterThanOrEqual(earthLayout(width, height, 'bottom').cap + 20);
  });

  it('should keep the tagline below the logo', () => {
    const logoBottom = (PHONE.height + LOGO) / 2;

    const underTest = taglineBottom(PHONE.width, PHONE.height);

    expect(PHONE.height - underTest - 28).toBeGreaterThan(logoBottom - LOGO * 0.2);
  });
});

describe('shootingStarPath', () => {
  it('should cross the upper sky, clear of the logo', () => {
    const logoTop = (PHONE.height - LOGO) / 2;
    const highestLeaf = logoTop + layerFrame('leafTop', LOGO).top;

    const underTest = shootingStarPath(PHONE.width, PHONE.height);

    expect(Math.max(underTest.fromY, underTest.toY)).toBeLessThan(highestLeaf);
    expect(Math.min(underTest.fromY, underTest.toY)).toBeGreaterThan(0);
  });

  it('should fall gently across the screen rather than dive', () => {
    const underTest = shootingStarPath(PHONE.width, PHONE.height);

    const run = Math.abs(underTest.toX - underTest.fromX);
    const fall = underTest.toY - underTest.fromY;
    expect(fall).toBeGreaterThan(0);
    expect(fall).toBeLessThan(run);
    expect(underTest.angleDeg).toBeCloseTo((Math.atan2(fall, underTest.toX - underTest.fromX) * 180) / Math.PI, 6);
  });

  it('should pass once, after the sprout is up and before the splash leaves', () => {
    expect(SHOOTING_STAR.delayMs).toBeGreaterThanOrEqual(SPLASH_TIMELINE.stem.delayMs + SPLASH_TIMELINE.stem.durationMs);
    expect(SHOOTING_STAR.delayMs + SHOOTING_STAR.durationMs).toBeLessThanOrEqual(SPLASH_TIMELINE.exitAtMs);
    expect(SHOOTING_STAR.peakOpacity).toBeLessThanOrEqual(0.7);
  });
});
