/**
 * Tests for when the plan offer appears.
 *
 * A family who has already paid should never be asked again -seeing an upsell
 * you have already bought reads as the app not knowing who you are.
 */

import { shouldOfferPlan } from '@/constants/unlock-plan';

describe('shouldOfferPlan', () => {
  it.each([
    ['a free family', 'free', true],
    ['a basic subscriber', 'basic', true],
  ])('should offer to %s', (_case, tier, expected) => {
    const underTest = shouldOfferPlan(tier);

    expect(underTest).toBe(expected);
  });

  it('should never pester a premium subscriber', () => {
    const underTest = shouldOfferPlan('premium');

    expect(underTest).toBe(false);
  });
});
