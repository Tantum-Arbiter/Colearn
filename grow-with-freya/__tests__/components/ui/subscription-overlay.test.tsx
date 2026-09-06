/**
 * Tests for the subscription overlay after it became a free-trial screen.
 *
 * The screen now leads with the trial rather than a price list: what you get
 * today, when you are warned, when you are charged. The three-plan picker it
 * used to open with is still there and still buys the same packages, but it
 * is folded away behind "Unlock a plan" -- so the assertions that matter are
 * that the picker starts hidden, that opening it brings back all three plans,
 * and that the plans still carry their prices.
 *
 * The trial copy is deliberately not wired to a new RevenueCat package: the
 * button buys monthly_premium exactly as before, so that if a 5-day intro
 * offer is added to that package later the screen needs no code change. That
 * is why there is no assertion here about a trial-specific plan id.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => <Text>{props.name}</Text>,
    MaterialCommunityIcons: (props: any) => <Text>{props.name}</Text>,
  };
});

jest.mock('@/services/subscription-service', () => ({
  getOfferings: jest.fn(async () => null),
  getOfferingPrices: jest.fn(() => null),
  mapPlanIdToPackage: jest.fn(() => null),
  purchasePackage: jest.fn(async () => ({ success: false, cancelled: true })),
}));

jest.mock('@/components/account/privacy-policy-screen', () => ({
  PrivacyPolicyContent: () => null,
}));
jest.mock('@/components/account/terms-conditions-screen', () => ({
  TermsConditionsContent: () => null,
}));

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

/** Every string rendered anywhere inside one node's subtree. */
function textIn(node: any): string {
  return node
    .findAll(() => true)
    .flatMap((n: any) => ([] as any[]).concat(n.props?.children ?? []))
    .filter((child: any) => typeof child === 'string')
    .join(' ');
}

function press(tree: ReturnType<typeof render>, testID: string) {
  const target = findByTestId(tree, testID)[0];
  act(() => {
    target.props.onPress();
  });
}

function renderOverlay(props: Partial<React.ComponentProps<typeof SubscriptionOverlay>> = {}) {
  return render(<SubscriptionOverlay visible onClose={jest.fn()} {...props} />);
}

describe('SubscriptionOverlay', () => {
  it('renders nothing while hidden', () => {
    const tree = renderOverlay({ visible: false });

    expect(tree.toJSON()).toBeNull();
  });

  it('leads with how the free trial works', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.trial.title');
    expect(json).toContain('subscription.trial.subtitle');
  });

  it('no longer heads the screen with the old plan-picker copy', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).not.toContain('subscription.choosePlan');
  });

  it.each([
    [0, 'subscription.trial.todayLabel', 'subscription.trial.todayBody'],
    [1, 'subscription.trial.notifyLabel', 'subscription.trial.notifyBody'],
    [2, 'subscription.trial.chargeLabel', 'subscription.trial.chargeBody'],
  ])('spells out step %i of the trial', (index, labelKey, bodyKey) => {
    const tree = renderOverlay();
    const json = JSON.stringify(tree.toJSON());

    expect(findByTestId(tree, `trial-step-${index}`).length).toBeGreaterThan(0);
    expect(json).toContain(labelKey);
    expect(json).toContain(bodyKey);
  });

  it('gives every step its own artwork', () => {
    const tree = renderOverlay();

    for (const index of [0, 1, 2]) {
      const icon = findByTestId(tree, `trial-step-icon-${index}`)[0];
      expect(icon.props.source).toBeTruthy();
    }
  });

  /**
   * The design joins the three steps with a run of dots, not a rule. A single
   * dash reads as a divider between three separate facts; the dotted run reads
   * as one journey moving forward, which is the whole point of the card.
   */
  it('joins the steps with a run of dots rather than a solid rule', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'trial-link-0').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'trial-link-1').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'trial-link-dot').length).toBeGreaterThanOrEqual(12);
  });

  it('draws one fewer link than it has steps', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'trial-link-2')).toHaveLength(0);
  });

  /**
   * The stars are the hero sky's own artwork rather than flat glyph stars --
   * the design's are lit, and Ionicons cannot be.
   */
  it('crowns the page with the sky artwork, not glyph stars', () => {
    const tree = renderOverlay();

    const stars = findByTestId(tree, 'trial-star-cluster')[0];
    const images = stars.findAll((n: any) => n.props?.source !== undefined);

    expect(images.length).toBeGreaterThanOrEqual(5);
  });

  it('illustrates the premium card', () => {
    const tree = renderOverlay();

    const art = findByTestId(tree, 'trial-premium-art')[0];

    expect(art.props.source).toBeTruthy();
  });

  /**
   * The promise changed shape: 50 books are unlocked the moment the trial
   * starts, and the rest of the library arrives when it ends. Both halves have
   * to be on the screen or the offer misrepresents itself in one direction or
   * the other.
   */
  it('promises books today and the rest when the trial ends', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.trial.benefitStories');
    expect(json).toContain('subscription.trial.benefitMoreLater');
  });

  it('crowns the most-popular badge', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('crown');
  });

  it('points the way forward on the call to action', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('arrow-forward');
  });

  it('stops at three steps', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'trial-step-3')).toHaveLength(0);
  });

  it('shows the premium card with its badge and every benefit', () => {
    const tree = renderOverlay();
    const json = JSON.stringify(tree.toJSON());

    expect(findByTestId(tree, 'trial-premium-card').length).toBeGreaterThan(0);
    expect(json).toContain('subscription.trial.mostPopular');
    for (const index of [0, 1, 2, 3, 4, 5]) {
      expect(findByTestId(tree, `trial-benefit-${index}`).length).toBeGreaterThan(0);
    }
  });

  /**
   * The premium card is the only plan on screen, which could read as the only
   * plan there is. This line is what tells a parent the others exist, so it
   * lives in the card rather than beside the toggle that opens them.
   */
  it('says in the premium card that other plans can be chosen', () => {
    const tree = renderOverlay();

    const hint = findByTestId(tree, 'trial-other-plans');

    expect(hint.length).toBeGreaterThan(0);
    expect(JSON.stringify(tree.toJSON())).toContain('subscription.trial.otherPlans');
  });

  it('opens the plan picker straight from that line', () => {
    const tree = renderOverlay();

    press(tree, 'trial-other-plans');

    expect(findByTestId(tree, 'plan-card-monthly_basic').length).toBeGreaterThan(0);
  });

  it('calls the action a free trial rather than a subscription', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.trial.cta');
  });

  it('keeps the legal links', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.privacyPolicy');
    expect(json).toContain('subscription.termsAndConditions');
  });
});

describe('SubscriptionOverlay plan picker', () => {
  it('folds the plans away behind Explore options', () => {
    const tree = renderOverlay();
    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain('subscription.exploreOptions');
    expect(findByTestId(tree, 'plan-card-monthly_basic')).toHaveLength(0);
  });

  it('no longer calls the folded section Unlock a plan', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).not.toContain('subscription.unlockPlan');
  });

  it('brings back all three plans when opened', () => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');

    expect(findByTestId(tree, 'plan-card-monthly_basic').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'plan-card-monthly_premium').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'plan-card-yearly').length).toBeGreaterThan(0);
  });

  it('folds them away again', () => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');
    press(tree, 'unlock-plan-toggle');

    expect(findByTestId(tree, 'plan-card-monthly_basic')).toHaveLength(0);
  });

  it('still carries the prices the plans are sold at', () => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');
    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain('$5.99');
    expect(json).toContain('$9.99');
    expect(json).toContain('$89.99');
  });

  /**
   * Basic and Premium carry the trial; Annual does not. The negative
   * assertion is the load-bearing one -- a note rendered from a shared plan
   * template would quietly appear on all three, and the annual price is the
   * one place the offer must not imply a free period.
   */
  it.each(['monthly_basic', 'monthly_premium'])('offers the trial on %s', (planId) => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');
    const note = findByTestId(tree, `plan-trial-note-${planId}`);

    expect(note.length).toBeGreaterThan(0);
  });

  it.each([
    ['monthly_basic', 'subscription.planBasic'],
    ['monthly_premium', 'subscription.planPremium'],
  ])('sets the %s trial note beside the plan name, not under the price', (planId, nameKey) => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');
    const row = textIn(findByTestId(tree, `plan-name-row-${planId}`)[0]);

    expect(row).toContain(nameKey);
    expect(row).toContain('subscription.trial.includesTrial');
  });

  /**
   * Basic's own list reads as all upside, which hides the one thing a parent
   * is actually choosing between: songs and instruments. The crossed-out rows
   * name what Basic does not include, reusing the very keys Premium ticks, so
   * the two lists cannot drift apart.
   */
  it('crosses out what Basic does not include', () => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');
    press(tree, 'plan-card-monthly_basic');
    const basic = textIn(findByTestId(tree, 'plan-card-monthly_basic')[0]);

    expect(findByTestId(tree, 'plan-exclusion-monthly_basic-0').length).toBeGreaterThan(0);
    expect(basic).toContain('subscription.detailAllSongs');
    expect(basic).toContain('subscription.detailAllInstruments');
  });

  it.each(['monthly_premium', 'yearly'])('crosses nothing out on %s', (planId) => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');
    press(tree, `plan-card-${planId}`);

    expect(findByTestId(tree, `plan-exclusion-${planId}-0`)).toHaveLength(0);
  });

  it('does not offer a trial on the annual plan', () => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');

    expect(findByTestId(tree, 'plan-trial-note-yearly')).toHaveLength(0);
  });

  it('leaves the annual plan at its price with nothing added', () => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');
    const annual = textIn(findByTestId(tree, 'plan-card-yearly')[0]);

    expect(annual).toContain('$89.99');
    expect(annual).not.toContain('subscription.trial.includesTrial');
  });

  it('starts with premium chosen, so the trial button buys premium', () => {
    const tree = renderOverlay();

    press(tree, 'unlock-plan-toggle');
    const premium = findByTestId(tree, 'plan-card-monthly_premium')[0];

    expect(premium.props.accessibilityState?.selected).toBe(true);
  });
});
