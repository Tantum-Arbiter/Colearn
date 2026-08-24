/**
 * Tests for the auth card's width.
 *
 * The card used to be the screen minus its inset, which on a tablet made the
 * sign-in buttons 674pt of pill -- a phone layout stretched to fill an iPad
 * rather than a tablet layout. These pin the cap that stops that, and pin
 * that phones are unaffected by it.
 */

import {
  authLayoutFor,
  CONTENT_MAX_WIDTH,
  CARD_PADDING,
} from '@/components/auth/auth-theme';

const PHONE_WIDTH = 402;
const LARGE_PHONE_WIDTH = 440;
const TABLET_WIDTH = 834;

describe('authLayoutFor', () => {
  it('leaves a phone filling its inset', () => {
    const { contentWidth } = authLayoutFor(PHONE_WIDTH);

    expect(contentWidth).toBeLessThan(CONTENT_MAX_WIDTH);
    expect(contentWidth).toBeGreaterThan(0);
  });

  it('leaves even the largest phone under the cap', () => {
    expect(authLayoutFor(LARGE_PHONE_WIDTH).contentWidth).toBeLessThan(CONTENT_MAX_WIDTH);
  });

  it('caps the content on a tablet rather than filling the screen', () => {
    const { contentWidth } = authLayoutFor(TABLET_WIDTH);

    expect(contentWidth).toBe(CONTENT_MAX_WIDTH);
    // the stretched value this replaced
    expect(contentWidth).toBeLessThan(674);
  });

  it('reports the cap, which is what switches the card to its compact rhythm', () => {
    // the guest card's blocks carry no margins of their own -- on a phone
    // `space-between` spaces them, and on a tablet that same rule would deal
    // the spare height out as ~150pt gaps, so the compact style keys off this
    expect(authLayoutFor(TABLET_WIDTH).isCapped).toBe(true);
    expect(authLayoutFor(LARGE_PHONE_WIDTH).isCapped).toBe(false);
  });

  it('only budgets a max height once the width cap has bitten', () => {
    expect(authLayoutFor(TABLET_WIDTH).cardMaxHeight).toBeGreaterThan(0);
    // a phone card is meant to fill its screen
    expect(authLayoutFor(LARGE_PHONE_WIDTH).cardMaxHeight).toBeUndefined();
  });

  it('keeps the card exactly its content plus its own padding', () => {
    for (const width of [PHONE_WIDTH, TABLET_WIDTH]) {
      const { cardWidth, contentWidth } = authLayoutFor(width);

      expect(cardWidth).toBe(contentWidth + CARD_PADDING * 2);
      expect(cardWidth).toBeLessThanOrEqual(width);
    }
  });

  it('never grows the card past the screen it is on', () => {
    for (const width of [320, PHONE_WIDTH, 768, TABLET_WIDTH, 1024]) {
      expect(authLayoutFor(width).cardWidth).toBeLessThanOrEqual(width);
    }
  });
});
