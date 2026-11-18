export type AgeRange = 'all' | '1-2' | '2-4' | '4+';

export function ageMonthsToRange(ageInMonths: number): AgeRange {
  if (ageInMonths < 24) return '1-2';
  if (ageInMonths < 48) return '2-4';
  return '4+';
}
