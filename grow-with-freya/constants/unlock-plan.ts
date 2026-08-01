export const UNLOCK_PLAN = {
  height: 40,
  paddingHorizontal: 16,
  iconSize: 15,
  marginHorizontal: 18,
  marginBottom: 14,
  lipHeight: 4,
  face: '#FFD54A',
  faceLow: '#F7B416',
  lip: '#D98C05',
  ink: '#5A3B02',
} as const;

export function shouldOfferPlan(tier: string): boolean {
  return tier !== 'premium';
}
