/**
 * Tests for the home screen's paywall button.
 *
 * It used to read "Unlock a Plan" and open a price list. The screen it opens
 * now leads with the free trial, so the button says so -- and "Unlock a plan"
 * survives only as the name of the folded-away plan picker inside that screen.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

import { UnlockPlanButton } from '@/components/home/unlock-plan-button';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

const mockEligible = jest.fn(() => true);
jest.mock('@/hooks/use-trial-eligibility', () => ({
  useTrialEligibility: () => mockEligible(),
}));

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

describe('UnlockPlanButton', () => {
  beforeEach(() => {
    mockEligible.mockReturnValue(true);
  });

  it('invites the parent to start the free trial', () => {
    const json = JSON.stringify(render(<UnlockPlanButton onPress={jest.fn()} />).toJSON());

    expect(json).toContain('subscription.startFreeTrial');
  });

  it('no longer offers to unlock a plan', () => {
    const json = JSON.stringify(render(<UnlockPlanButton onPress={jest.fn()} />).toJSON());

    expect(json).not.toContain('subscription.unlockPlan');
  });

  it('reports the trial wording to screen readers too', () => {
    const tree = render(<UnlockPlanButton onPress={jest.fn()} />);

    const button = findByTestId(tree, 'unlock-plan-button')[0];

    expect(button.props.accessibilityLabel).toBe('subscription.startFreeTrial');
  });

  it('wears the shared gold button, the one Login wears, with the lock after its words', () => {
    const tree = render(<UnlockPlanButton onPress={jest.fn()} />);

    expect(findByTestId(tree, 'unlock-plan-button-glow').length).toBeGreaterThan(0);
    const button = findByTestId(tree, 'unlock-plan-button')[0];
    expect(button.props.icon).toBe('lock-closed');
    expect(button.props.iconPosition).toBe('trailing');
  });

  it('fires the press it was given', () => {
    const onPress = jest.fn();
    const tree = render(<UnlockPlanButton onPress={onPress} />);

    findByTestId(tree, 'unlock-plan-button')[0].props.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

/**
 * Once the trial has been used and cancelled there is no free period left to
 * offer, so the button stops promising one and offers the plans instead.
 */
describe('UnlockPlanButton after the trial is spent', () => {
  it('offers the plans rather than a trial it cannot give', () => {
    mockEligible.mockReturnValue(false);

    const json = JSON.stringify(render(<UnlockPlanButton onPress={jest.fn()} />).toJSON());

    expect(json).toContain('subscription.unlockPlan');
    expect(json).not.toContain('subscription.startFreeTrial');
  });
});
