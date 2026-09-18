/**
 * Tests for the time-of-day theme rule.
 *
 * Night runs 18:00 to 06:59 so the last hour before bed and the first hour
 * after waking are both calm. Everything else is daytime.
 */

import { resolveTimeOfDay, HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { NIGHT_RAMP } from '@/constants/night-palette';

const rampIndex = (stop: string) => NIGHT_RAMP.indexOf(stop as (typeof NIGHT_RAMP)[number]);

function at(hour: number): Date {
  return new Date(2026, 6, 29, hour, 30, 0);
}

describe('resolveTimeOfDay', () => {
  describe('night', () => {
    it.each([18, 19, 21, 23, 0, 3, 6])('should be night at %i:30', (hour) => {
      const underTest = resolveTimeOfDay(at(hour));

      expect(underTest).toBe<TimeOfDay>('night');
    });

    it('should turn to night on the stroke of six in the evening', () => {
      const underTest = resolveTimeOfDay(new Date(2026, 6, 29, 18, 0, 0));

      expect(underTest).toBe<TimeOfDay>('night');
    });
  });

  describe('day', () => {
    it.each([7, 9, 12, 15, 17])('should be day at %i:30', (hour) => {
      const underTest = resolveTimeOfDay(at(hour));

      expect(underTest).toBe<TimeOfDay>('day');
    });

    it('should turn to day on the stroke of seven in the morning', () => {
      const underTest = resolveTimeOfDay(new Date(2026, 6, 29, 7, 0, 0));

      expect(underTest).toBe<TimeOfDay>('day');
    });

    it('should still be night one minute before seven', () => {
      const underTest = resolveTimeOfDay(new Date(2026, 6, 29, 6, 59, 0));

      expect(underTest).toBe<TimeOfDay>('night');
    });
  });
});

describe('HOME_THEMES', () => {
  it.each(['day', 'night'] as const)('should define every colour for %s', (timeOfDay) => {
    const underTest = HOME_THEMES[timeOfDay];

    expect(Object.values(underTest).every((value) => typeof value === 'string')).toBe(true);
  });

  it('should describe the same colour roles in both themes', () => {
    const underTest = Object.keys(HOME_THEMES.day).sort();

    expect(underTest).toEqual(Object.keys(HOME_THEMES.night).sort());
  });

  it('should keep a starry sky in both themes so the mood carries over', () => {
    const underTest = [Number(HOME_THEMES.night.starOpacity), Number(HOME_THEMES.day.starOpacity)];

    expect(underTest[0]).toBeGreaterThan(0);
    expect(underTest[1]).toBeGreaterThan(0);
  });

  it('should dim the stars by day', () => {
    const underTest = Number(HOME_THEMES.day.starOpacity);

    expect(underTest).toBeLessThan(Number(HOME_THEMES.night.starOpacity));
  });

  it('should lift the sky by day without abandoning the night palette', () => {
    const underTest = [HOME_THEMES.day.skyTop, HOME_THEMES.night.skyTop];

    expect(underTest[0]).not.toBe(underTest[1]);
    expect(rampIndex(underTest[0])).toBeGreaterThan(rampIndex(underTest[1]));
  });

  it.each(['day', 'night'] as const)('should paint the %s sky from the journey ramp, darkest at the top', (timeOfDay) => {
    const { skyTop, skyMid, skyBottom } = HOME_THEMES[timeOfDay];
    const indices = [skyTop, skyMid, skyBottom].map(rampIndex);

    indices.forEach((index) => expect(index).toBeGreaterThanOrEqual(0));
    expect(indices[0]).toBeLessThan(indices[1]);
    expect(indices[1]).toBeLessThan(indices[2]);
  });
});
