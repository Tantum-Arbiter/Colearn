import { TREND_BAR, isOverLimit, trendBarFill } from '@/constants/usage-trend-bars';

const LIMIT = 3600;

describe('isOverLimit', () => {
  it('is over only once the day has passed the limit, not on reaching it', () => {
    expect(isOverLimit(LIMIT - 1, LIMIT)).toBe(false);
    expect(isOverLimit(LIMIT, LIMIT)).toBe(false);
    expect(isOverLimit(LIMIT + 1, LIMIT)).toBe(true);
  });

  it('says nothing about a day when no limit is set', () => {
    // A parent who has turned the limit off is not being told they are over it.
    expect(isOverLimit(50000, 0)).toBe(false);
  });
});

describe('trendBarFill', () => {
  it('marks a day over the limit in amber, so the trend says it plainly', () => {
    expect(trendBarFill(LIMIT * 3, LIMIT, true)).toBe(TREND_BAR.over);
    expect(trendBarFill(LIMIT * 3, LIMIT, false)).toBe(TREND_BAR.overFaint);
  });

  it('leaves a day inside the limit as it was', () => {
    expect(trendBarFill(LIMIT - 60, LIMIT, true)).toBe(TREND_BAR.within);
    expect(trendBarFill(LIMIT - 60, LIMIT, false)).toBe(TREND_BAR.withinFaint);
  });

  it('keeps the picked day solid even on a day with nothing on it', () => {
    expect(trendBarFill(0, LIMIT, true)).toBe(TREND_BAR.within);
  });

  it('leaves an untouched day as a faint marker rather than a colour', () => {
    expect(trendBarFill(0, LIMIT, false)).toBe(TREND_BAR.empty);
  });

  it('colours nothing amber when no limit is set', () => {
    expect(trendBarFill(50000, 0, true)).toBe(TREND_BAR.within);
    expect(trendBarFill(50000, 0, false)).toBe(TREND_BAR.withinFaint);
  });
});

describe('the palette', () => {
  it('uses the amber the rest of the parents area warns in', () => {
    expect(TREND_BAR.over).toBe('#F59E0B');
  });

  it('faints each colour rather than swapping it for another', () => {
    expect(TREND_BAR.overFaint).toContain('245, 158, 11');
    expect(TREND_BAR.withinFaint).toContain('78, 205, 196');
  });
});
