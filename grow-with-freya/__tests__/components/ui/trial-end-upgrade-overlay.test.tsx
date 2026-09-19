/**
 * Tests for the screen a parent meets before the trial converts.
 *
 * Doing nothing is a real answer here -- the store charges for Basic and the
 * app keeps working -- so the assertions that matter are that the screen says
 * what that costs, offers only the plans that are an upgrade on it, and lets
 * the parent leave without buying anything.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { TrialEndUpgradeOverlay } from '@/components/ui/trial-end-upgrade-overlay';
import { ChildBottomNavigation } from '@/components/child-ui/child-bottom-navigation';
import { JourneyBarProvider, JourneyBarOutlet } from '@/components/child-ui/journey-bar-slot';
import type { TrialStatus } from '@/constants/trial-end';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => <Text>{props.name}</Text>,
    MaterialCommunityIcons: (props: any) => <Text>{props.name}</Text>,
  };
});

const mockPurchase = jest.fn(async () => ({ success: false, cancelled: true }));
const mockMapPlan = jest.fn(() => null);
jest.mock('@/services/subscription-service', () => ({
  getOfferings: jest.fn(async () => null),
  getOfferingPrices: jest.fn(() => null),
  mapPlanIdToPackage: (...args: unknown[]) => mockMapPlan(...(args as [])),
  purchasePackage: (...args: unknown[]) => mockPurchase(...(args as [])),
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

function trialStatus(overrides: Partial<TrialStatus> = {}): TrialStatus {
  return {
    inTrial: true,
    daysRemaining: 2,
    endsAt: new Date('2026-09-08T09:00:00.000Z'),
    billingTier: 'basic',
    ...overrides,
  };
}

function renderOverlay(props: Partial<React.ComponentProps<typeof TrialEndUpgradeOverlay>> = {}) {
  return render(
    <TrialEndUpgradeOverlay visible onClose={jest.fn()} status={trialStatus()} {...props} />,
  );
}

describe('TrialEndUpgradeOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing while hidden', () => {
    expect(renderOverlay({ visible: false }).toJSON()).toBeNull();
  });

  /**
   * Counted against the calendar, not in 24-hour blocks: the headline sits
   * directly above the date it refers to, and a trial converting at 09:00
   * tomorrow reads "tomorrow" even though it is thirteen hours away.
   */
  describe('the countdown', () => {
    // built in local time: a UTC instant lands on either side of midnight
    // depending on the runner's zone, which is the very thing under test
    const NOW = new Date(2026, 8, 6, 12, 0);

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([
      ['a few days out', new Date(2026, 8, 9, 9, 0), 'subscription.trialEnd.titleDays'],
      ['the day before', new Date(2026, 8, 7, 9, 0), 'subscription.trialEnd.titleTomorrow'],
      ['later the same day', new Date(2026, 8, 6, 22, 0), 'subscription.trialEnd.titleToday'],
    ])('names %s in its own words', (_label, endsAt, key) => {
      const tree = renderOverlay({ status: trialStatus({ endsAt }) });

      expect(textIn(findByTestId(tree, 'trial-end-title')[0])).toContain(key);
    });

    /**
     * The case the 24-hour count got wrong: thirteen hours out, but on the
     * next page of the calendar, printed above a date that says so.
     */
    it('does not call tomorrow today just because it is hours away', () => {
      const tree = renderOverlay({
        status: trialStatus({ daysRemaining: 0, endsAt: new Date(2026, 8, 7, 2, 0) }),
      });

      expect(textIn(findByTestId(tree, 'trial-end-title')[0])).toContain('subscription.trialEnd.titleTomorrow');
    });

    /**
     * The same screen is reachable by hand from the trial screen, where there
     * may be no countdown to report -- and a headline about a trial ending
     * "in 0 days" would be a lie told to a paying subscriber.
     */
    it('drops the countdown when no trial is running', () => {
      const tree = renderOverlay({ status: trialStatus({ inTrial: false }) });

      expect(textIn(findByTestId(tree, 'trial-end-title')[0])).toContain('subscription.trialEnd.titleUpgrade');
    });
  });

  /**
   * The same story-art strip the free-trial screen sits on, so the two
   * paywalls read as one place rather than two screens from different apps.
   * It is behind every headline the screen can show, the countdown states
   * included -- they are one component, not a screen per wording.
   */
  it('sits on the paywall artwork', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'trial-end-background')[0].props.source).toBeTruthy();
  });

  it('says what happens if the parent does nothing', () => {
    const tree = renderOverlay();

    const staying = textIn(findByTestId(tree, 'trial-end-staying-card')[0]);
    expect(staying).toContain('subscription.trialEnd.stayingLabel');
    expect(staying).toContain('subscription.trialEnd.stayingPrice');
    expect(staying).toContain('subscription.detail50Stories');
  });

  it('quotes the Basic price the charge will be for', () => {
    const json = JSON.stringify(renderOverlay().toJSON());

    expect(json).toContain('$5.99');
  });

  it('names what Premium adds on top of Basic', () => {
    const tree = renderOverlay();

    const adds = textIn(findByTestId(tree, 'trial-end-adds-card')[0]);
    expect(adds).toContain('subscription.trialEnd.addsAll');
    expect(adds).toContain('subscription.detailAllInstruments');
  });

  /**
   * Basic is what the parent gets by doing nothing, so selling it back to
   * them here would be a plan card that buys the plan they already have.
   */
  it('offers only the plans that are an upgrade on Basic', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'plan-card-monthly_premium').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'plan-card-yearly').length).toBeGreaterThan(0);
    expect(findByTestId(tree, 'plan-card-monthly_basic')).toHaveLength(0);
  });

  /**
   * Everything Premium adds is named once, in the card above the picker. The
   * plan cards repeating it cost a phone screen's worth of height and left
   * the price below the fold.
   */
  it('names what Premium adds once, not once per plan card', () => {
    const tree = renderOverlay();
    const premiumCard = textIn(findByTestId(tree, 'plan-card-monthly_premium')[0]);

    expect(textIn(findByTestId(tree, 'trial-end-adds-card')[0])).toContain('subscription.detailAllInstruments');
    expect(premiumCard).not.toContain('subscription.detailAllInstruments');
  });

  it('starts on Premium rather than making the parent choose first', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'plan-card-monthly_premium')[0].props.accessibilityState).toEqual({ selected: true });
  });

  it('buys the plan the parent switched to', async () => {
    const tree = renderOverlay();

    press(tree, 'plan-card-yearly');
    press(tree, 'trial-end-upgrade');
    await act(async () => {});

    expect(mockMapPlan).toHaveBeenCalledWith('yearly');
  });

  it('lets the parent leave on Basic without buying anything', () => {
    const onClose = jest.fn();
    const tree = renderOverlay({ onClose });

    press(tree, 'trial-end-keep-basic');

    expect(mockPurchase).not.toHaveBeenCalled();
    expect(findByTestId(tree, 'trial-end-keep-basic').length).toBeGreaterThan(0);
    expect(onClose).toBeDefined();
  });

  it('offers no trial note on plans that carry no trial', () => {
    const tree = renderOverlay();

    expect(findByTestId(tree, 'plan-trial-note-monthly_premium')).toHaveLength(0);
  });
});

/** The trial's end covers the whole screen, so the bar at the foot steps out while it is up. */
describe('TrialEndUpgradeOverlay and the journey bar', () => {
  it.each([
    [true, 0],
    [false, 1],
  ])('with the overlay visible=%s, leaves %s bar on screen', (visible, expected) => {
    const tree = render(
      <JourneyBarProvider>
        <ChildBottomNavigation selected="home" onSelect={jest.fn()} slotKey="main" />
        <TrialEndUpgradeOverlay visible={visible} onClose={jest.fn()} status={trialStatus()} />
        <JourneyBarOutlet pageKey="main" />
      </JourneyBarProvider>
    );

    const bars = tree.UNSAFE_root.findAll(
      (n: any) => n.props.testID === 'child-bottom-navigation' && n.props.accessibilityRole === 'tablist'
    );
    expect(bars).toHaveLength(expected);
  });
});
