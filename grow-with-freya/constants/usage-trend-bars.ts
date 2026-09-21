/**
 * What colour a day is in the screen-time trend.
 *
 * A day past the limit is amber -- the same amber the rest of the parents' area
 * warns in. Without it a fortnight of long days reads exactly like a fortnight
 * of short ones: the bars are all the same colour and only their heights differ,
 * which says how the days compare to each other and nothing about whether any of
 * them was healthy.
 *
 * Amber rather than red on purpose. This is a week already spent; red is for the
 * limit being spent now, which is the ring's job.
 */
export const TREND_BAR = {
  within: '#4ECDC4',
  withinFaint: 'rgba(78, 205, 196, 0.32)',
  over: '#F59E0B',
  overFaint: 'rgba(245, 158, 11, 0.32)',
  empty: 'rgba(255, 255, 255, 0.13)',
} as const;

/** Whether a day went past the limit. A limit of nothing is a limit turned off. */
export function isOverLimit(usageSeconds: number, limitSeconds: number): boolean {
  return limitSeconds > 0 && usageSeconds > limitSeconds;
}

export function trendBarFill(
  usageSeconds: number,
  limitSeconds: number,
  isSelected: boolean,
): string {
  const over = isOverLimit(usageSeconds, limitSeconds);
  if (isSelected) return over ? TREND_BAR.over : TREND_BAR.within;
  if (usageSeconds <= 0) return TREND_BAR.empty;
  return over ? TREND_BAR.overFaint : TREND_BAR.withinFaint;
}
