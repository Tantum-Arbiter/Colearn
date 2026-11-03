export const UNLOCK_PLAN = {
  // sized up now that it sits with the cards rather than floating over the
  // art: in the content it is competing with full-width artwork, where at
  // the bottom edge it only had to be noticed against empty sky
  height: 48,
  paddingHorizontal: 22,
  fontSize: 16,
  iconSize: 17,
  marginHorizontal: 18,
  marginBottom: 14,
} as const;

export function shouldOfferPlan(tier: string): boolean {
  return tier !== 'premium';
}
