/**
 * Tests for the subscription overlay after it became a free-trial screen.
 *
 * The screen leads with the trial and nothing else: what you get today, when
 * you are warned, when you are charged. The three-plan picker it once folded
 * away has moved to the end-of-trial upgrade screen, so what matters here is
 * that no plan list is left behind and that the upgrade line opens that
 * screen instead of expanding one in place.
 *
 * The trial copy is deliberately not wired to a new RevenueCat package: the
 * button buys monthly_basic, the plan the trial runs on, so that if a 5-day
 * intro offer is added to that package later the screen needs no code
 * change.
 */

import React from 'react';
import { ScrollView } from 'react-native';
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

const mockEligible = jest.fn(() => true);
jest.mock('@/hooks/use-trial-eligibility', () => ({
  useTrialEligibility: () => mockEligible(),
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

/**
 * The overlay sizes itself off the viewport, and jsdom reports 0x0 unless it
 * is told otherwise -- which would read as the shortest screen the app runs
 * on and put every test in the landscape-phone branch.
 */
function setViewport(width: number, height: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: height, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

const PHONE_PORTRAIT = [402, 874] as const;
const PHONE_LANDSCAPE = [874, 402] as const;

describe('SubscriptionOverlay', () => {
  beforeEach(() => {
    mockEligible.mockReturnValue(true);
    setViewport(...PHONE_PORTRAIT);
  });

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
  it.each(['trial-link-0', 'trial-link-1'])('joins the steps with a run of dots at %s', (testID) => {
    const tree = renderOverlay();

    const link = findByTestId(tree, testID)[0];
    const dots = link.findAll((node: any) => node.props?.testID === 'trial-link-dot');

    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  /**
   * Both framed boxes carry the design's amber halo. It is a shadow rather
   * than a border, so nothing about the border assertions above would notice
   * if it were dropped.
   */
  it.each(['trial-timeline', 'trial-premium-card'])('haloes %s in the frame yellow', (testID) => {
    const tree = renderOverlay();

    const style = [findByTestId(tree, testID)[0].props.style]
      .flat(3)
      .reduce((merged: any, entry: any) => ({ ...merged, ...entry }), {});

    expect(style.shadowColor).toBe('#FFE14D');
    expect(style.shadowRadius).toBeGreaterThan(0);
    expect(style.shadowOpacity).toBeGreaterThan(0);
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

  it('offers Basic in the highlighted card and points at Premium above it', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.trial.planName');
    expect(json).toContain('subscription.trial.upgrade');
  });

  it('no longer sells the trial as more books arriving on day five', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).not.toContain('subscription.trial.benefitMoreLater');
  });

  /**
   * The card carried an illustration down its left edge, which cost the copy
   * a third of the card's width on a phone -- the reason the plan name and
   * the benefits had to be set small enough to fit beside it.
   */
  it('gives the card’s full width to its copy', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'trial-premium-art')).toHaveLength(0);
  });

  /**
   * The promise changed shape: 50 books are unlocked the moment the trial
   * starts, and the rest of the library arrives when it ends. Both halves have
   * to be on the screen or the offer misrepresents itself in one direction or
   * the other. The books are promised by the timeline's first step now, so
   * that is where this asserts they are.
   */
  it('promises books today, and names Premium as where the rest live', () => {
    const tree = renderOverlay();

    expect(textIn(findByTestId(tree, 'trial-step-0')[0])).toContain('subscription.trial.todayBody');
    expect(JSON.stringify(tree.toJSON())).toContain('subscription.trial.upgrade');
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
    expect(json).toContain('subscription.trial.mostRecommended');
    for (const index of [0, 1, 2, 3]) {
      expect(findByTestId(tree, `trial-benefit-${index}`).length).toBeGreaterThan(0);
    }
  });

  /**
   * The card used to restate the timeline: the same books, the same free
   * period, the same right to cancel, one card below where the timeline had
   * just promised them. Each repetition is a line of height on a phone
   * screen that has none to spare.
   */
  it('leaves the timeline to promise the books, the price and the cancelling', () => {
    const tree = renderOverlay();
    const card = textIn(findByTestId(tree, 'trial-premium-card')[0]);

    expect(card).not.toContain('subscription.trial.benefitStories');
    expect(card).not.toContain('subscription.trial.benefitCancel');
    expect(card).not.toContain('subscription.trial.planPrice');
    expect(findByTestId(tree, 'trial-benefit-4')).toHaveLength(0);
  });

  /** What is left is what the timeline does not already say. */
  it('keeps the card to what the timeline leaves out', () => {
    const card = textIn(findByTestId(renderOverlay(), 'trial-premium-card')[0]);

    expect(card).toContain('subscription.trial.benefitNoAds');
    expect(card).toContain('subscription.trial.benefitDevices');
  });

  /**
   * One line now does both jobs: it names Premium as where the rest of the
   * library lives, and points at where to go and get it. They were two lines
   * saying overlapping things directly above each other.
   */
  it('points at the other plans from the upgrade line itself', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'trial-upgrade').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'trial-other-plans')).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).not.toContain('subscription.trial.otherPlans');
  });

  /**
   * The upgrade offer belongs to the end of the trial and opens on its own
   * there. This screen only says Premium exists: a control here would put the
   * upsell in front of a parent still deciding whether to keep Basic at all.
   */
  it('states the upgrade rather than offering it', () => {
    const upgradeLine = findByTestId(renderOverlay(), 'trial-upgrade')[0];

    expect(upgradeLine.props.onPress).toBeUndefined();
    expect(upgradeLine.props.accessibilityRole).toBeUndefined();
  });

  /**
   * The whole offer is meant to be taken in at a glance, so nothing on it may
   * hide below a fold. The legal panel keeps its own scroll -- it is a
   * document -- but it only mounts once a link is followed.
   *
   * This is enforced by the scroller being disabled rather than absent: on
   * every screen the offer fits on it cannot be scrolled at all, so nothing
   * can be hidden below one.
   */
  it('holds the whole offer without scrolling', () => {
    const scroller = findByTestId(renderOverlay(), 'trial-scroller')[0];

    expect(scroller.props.scrollEnabled).toBe(false);
  });

  /**
   * A phone on its side is wider than the widest tablet breakpoint and a
   * third of the height. Sized off width alone the screen took that as
   * licence for its largest type and icons, and ran the plan card out
   * underneath the pinned button.
   */
  describe('on a phone in landscape', () => {
    beforeEach(() => {
      setViewport(...PHONE_LANDSCAPE);
    });

    it('does not take a wide-but-short screen as room for full-size type', () => {
      // Read each height before changing the viewport: every mounted tree
      // subscribes to dimension changes, so a tree held across a resize has
      // already re-rendered at the new size by the time it is inspected.
      const landscapeIcon = findByTestId(renderOverlay(), 'trial-step-icon-0')[0].props.style.height;

      setViewport(...PHONE_PORTRAIT);
      const portraitIcon = findByTestId(renderOverlay(), 'trial-step-icon-0')[0].props.style.height;

      expect(landscapeIcon).toBeLessThan(portraitIcon);
    });

    /** Landscape earns the no-fold rule by running two columns and trimming,
     *  not by handing the parent a scrollbar. */
    it('holds the whole offer without scrolling here too', () => {
      const scroller = findByTestId(renderOverlay(), 'trial-scroller')[0];

      expect(scroller.props.scrollEnabled).toBe(false);
    });

    it('gives the plan card the larger share of the row, since it carries more words', () => {
      const tree = renderOverlay();
      const timeline = findByTestId(tree, 'trial-timeline')[0];
      const plan = findByTestId(tree, 'trial-premium-card')[0];

      const flexOf = (node: any) =>
        ([] as any[]).concat(node.props.style ?? []).reduce(
          (found: number | undefined, layer: any) => (layer && typeof layer.flex === 'number' ? layer.flex : found),
          undefined,
        );

      // The plan card's own wrapper carries the flex, so read it from the
      // row rather than the bordered card inside it.
      expect(flexOf(timeline)).toBeLessThan(1);
      expect(plan).toBeDefined();
    });

    it('drops the decorative stars rather than the offer', () => {
      const tree = renderOverlay();

      expect(findByTestId(tree, 'trial-star-cluster')).toHaveLength(0);
      expect(findByTestId(tree, 'trial-premium-card').length).toBeGreaterThan(0);
      expect(findByTestId(tree, 'trial-timeline').length).toBeGreaterThan(0);
    });

    /** The label is the only thing the spent-trial variant changes, so it has
     *  to survive the short-screen layout the same way. */
    it('still swaps to the plans once the trial is spent', () => {
      mockEligible.mockReturnValue(false);

      const json = JSON.stringify(renderOverlay().toJSON());

      expect(json).toContain('subscription.unlockPlan');
      expect(json).not.toContain('subscription.startFreeTrial');
    });
  });

  it('calls the action a free trial rather than a subscription', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.startFreeTrial');
    expect(json).not.toContain('subscription.signInToSubscribe');
  });

  /**
   * There is no free period left to offer once it has been spent, so the
   * button stops promising one. It still opens the same purchase, which is
   * why only the label changes.
   */
  it('offers the plans instead once the trial is spent', () => {
    mockEligible.mockReturnValue(false);

    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.unlockPlan');
    expect(json).not.toContain('subscription.startFreeTrial');
  });

  it('recommends the highlighted card and calls the plan-list badge popular', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.trial.mostRecommended');
    expect(json).not.toContain('subscription.trial.mostPopular');
  });

  it('keeps the legal links', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('subscription.privacyPolicy');
    expect(json).toContain('subscription.termsAndConditions');
  });
});

/**
 * The plan cards themselves are covered by the plan-picker suite now. What is
 * left to prove here is the absence: the trial screen sells the trial, and
 * nothing on it opens a price list in place.
 */
describe('SubscriptionOverlay without the plan picker', () => {
  beforeEach(() => {
    mockEligible.mockReturnValue(true);
  });

  it('carries no plan cards of its own', () => {
    const tree = renderOverlay();

    for (const planId of ['monthly_basic', 'monthly_premium', 'yearly']) {
      expect(findByTestId(tree, `plan-card-${planId}`)).toHaveLength(0);
    }
  });

  it('no longer folds a plan list away behind a toggle', () => {
    const tree = renderOverlay();
    const json = JSON.stringify(tree.toJSON());

    expect(findByTestId(tree, 'unlock-plan-toggle')).toHaveLength(0);
    expect(json).not.toContain('subscription.exploreOptions');
  });

  it('no longer calls anything on the screen Unlock a plan', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).not.toContain('subscription.unlockPlan');
  });
});
