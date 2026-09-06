/**
 * Tests for the plan cards, lifted out of the trial screen so the end-of-trial
 * upgrade offer can show the same list.
 *
 * The scenarios here came from the subscription overlay's own suite, where the
 * cards used to live: what each plan includes, what Basic does not, and which
 * of the three carries the free trial.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { PlanPicker, buildPlans, type PlanId } from '@/components/subscription/plan-picker';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

const ALL_PLANS: PlanId[] = ['monthly_basic', 'monthly_premium', 'yearly'];

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

function renderPicker(props: Partial<React.ComponentProps<typeof PlanPicker>> = {}) {
  return render(
    <PlanPicker
      planIds={ALL_PLANS}
      selectedPlan="monthly_basic"
      onSelect={jest.fn()}
      livePrices={null}
      {...props}
    />,
  );
}

describe('PlanPicker', () => {
  it('shows every plan it is given', () => {
    const tree = renderPicker();

    for (const planId of ALL_PLANS) {
      expect(findByTestId(tree, `plan-card-${planId}`).length).toBeGreaterThan(0);
    }
  });

  it('shows only the plans it is given', () => {
    const tree = renderPicker({ planIds: ['monthly_premium'] });

    expect(findByTestId(tree, 'plan-card-monthly_basic')).toHaveLength(0);
    expect(findByTestId(tree, 'plan-card-yearly')).toHaveLength(0);
  });

  it('carries the prices the plans are sold at', () => {
    const json = JSON.stringify(renderPicker().toJSON());

    expect(json).toContain('$5.99');
    expect(json).toContain('$9.99');
    expect(json).toContain('$89.99');
  });

  it('prefers the store’s own price once it arrives', () => {
    const json = JSON.stringify(
      renderPicker({ livePrices: { monthly_basic: { priceString: '£4.49' } } }).toJSON(),
    );

    expect(json).toContain('£4.49');
    expect(json).not.toContain('$5.99');
  });

  it('reports the plan the parent pressed', () => {
    const onSelect = jest.fn();
    const tree = renderPicker({ onSelect });

    act(() => {
      findByTestId(tree, 'plan-card-yearly')[0].props.onPress();
    });

    expect(onSelect).toHaveBeenCalledWith('yearly');
  });

  it('opens the details of the selected plan only', () => {
    const tree = renderPicker({ selectedPlan: 'monthly_premium' });

    expect(textIn(findByTestId(tree, 'plan-card-monthly_premium')[0])).toContain('subscription.detailAllStories');
    expect(textIn(findByTestId(tree, 'plan-card-monthly_basic')[0])).not.toContain('subscription.detail50Stories');
  });

  /**
   * The end-of-trial screen names Premium's features in full above the
   * picker, so a card that also opened them would print the same four lines
   * twice and push the price off a phone screen.
   */
  it('keeps the details closed when the screen already lists them', () => {
    const tree = renderPicker({ selectedPlan: 'monthly_premium', showDetails: false });
    const premium = textIn(findByTestId(tree, 'plan-card-monthly_premium')[0]);

    expect(premium).toContain('subscription.planPremium');
    expect(premium).not.toContain('subscription.detailAllStories');
  });

  it('badges Premium as the popular choice', () => {
    const premium = textIn(renderPicker().UNSAFE_root.findAll((n: any) => n.props.testID === 'plan-card-monthly_premium')[0]);

    expect(premium).toContain('subscription.mostPopular');
  });

  /**
   * Basic's own list reads as all upside, which hides the one thing a parent
   * is actually choosing between: songs and instruments. The crossed-out rows
   * name what Basic does not include, reusing the very keys Premium ticks, so
   * the two lists cannot drift apart.
   */
  it('crosses out what Basic does not include', () => {
    const tree = renderPicker();
    const basic = textIn(findByTestId(tree, 'plan-card-monthly_basic')[0]);

    expect(findByTestId(tree, 'plan-exclusion-monthly_basic-0').length).toBeGreaterThan(0);
    expect(basic).toContain('subscription.detailAllSongs');
    expect(basic).toContain('subscription.detailAllInstruments');
  });

  /**
   * Basic is capped at 50 stories and Premium is what lifts the cap, so the
   * download line Basic used to carry ("up to 50 books") said the same thing
   * twice and in the wrong currency -- books, not stories.
   */
  it('caps Basic at 50 stories and drops its download line', () => {
    const basic = textIn(findByTestId(renderPicker(), 'plan-card-monthly_basic')[0]);

    expect(basic).toContain('subscription.detail50Stories');
    expect(basic).not.toContain('subscription.detailDownload50');
    expect(basic).not.toContain('subscription.detailAllStories');
  });

  it('is what unlocks every book on premium', () => {
    const premium = textIn(findByTestId(renderPicker({ selectedPlan: 'monthly_premium' }), 'plan-card-monthly_premium')[0]);

    expect(premium).toContain('subscription.detailAllStories');
  });

  it.each(['monthly_premium', 'yearly'] as PlanId[])('crosses nothing out on %s', (planId) => {
    const tree = renderPicker({ selectedPlan: planId });

    expect(findByTestId(tree, `plan-exclusion-${planId}-0`)).toHaveLength(0);
  });

  /**
   * Basic is the only plan with a trial. Premium and Annual are bought
   * outright, and the negative assertion is what stops a shared card template
   * from quietly promising a free period on all three.
   */
  it('offers the trial on Basic', () => {
    expect(findByTestId(renderPicker(), 'plan-trial-note-monthly_basic').length).toBeGreaterThan(0);
  });

  it.each(['monthly_premium', 'yearly'] as PlanId[])('does not offer a trial on %s', (planId) => {
    expect(findByTestId(renderPicker(), `plan-trial-note-${planId}`)).toHaveLength(0);
  });

  it('sets the trial note beside the plan name, not under the price', () => {
    const row = textIn(findByTestId(renderPicker(), 'plan-name-row-monthly_basic')[0]);

    expect(row).toContain('subscription.planBasic');
    expect(row).toContain('subscription.trial.includesTrial');
  });

  /**
   * The end-of-trial screen sells Premium to someone whose trial is already
   * running, so a "includes a free trial" note on any card there would be
   * offering a second one.
   */
  it('drops the trial note entirely when asked to', () => {
    const tree = renderPicker({ showTrialNote: false });

    expect(findByTestId(tree, 'plan-trial-note-monthly_basic')).toHaveLength(0);
  });

  it('leaves the annual plan at its price with nothing added', () => {
    const annual = textIn(findByTestId(renderPicker(), 'plan-card-yearly')[0]);

    expect(annual).toContain('$89.99');
    expect(annual).not.toContain('subscription.trial.includesTrial');
  });
});

describe('buildPlans', () => {
  const t = (key: string) => key;

  it('builds the three plans the app sells', () => {
    expect(buildPlans(t, null).map((plan) => plan.id)).toEqual(ALL_PLANS);
  });

  it('falls back to listed prices before the store answers', () => {
    expect(buildPlans(t, null)[0].price).toBe('$5.99');
  });

  it('takes the store’s price for each plan it knows', () => {
    const plans = buildPlans(t, { yearly: { priceString: '£74.99' } });

    expect(plans.find((plan) => plan.id === 'yearly')?.price).toBe('£74.99');
  });
});
