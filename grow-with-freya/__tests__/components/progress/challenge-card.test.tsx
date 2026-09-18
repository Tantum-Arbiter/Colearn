/**
 * Weekly and monthly adventures are gentle invitations, rendered through
 * the same badge state language and reported like any other badge tap.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChallengeCard } from '@/components/progress/challenge-card';
import { Challenge, badgeStatus } from '@/components/progress/progress-model';

const challenge = (period: Challenge['period'], current: number, target: number): Challenge => ({
  id: `${period}-three-story-times`,
  titleKey: 'progress.challenges.threeStoryTimes.title',
  descriptionKey: 'progress.challenges.threeStoryTimes.description',
  artwork: { uri: 'test://artwork' },
  category: 'stories',
  currentProgress: current,
  targetProgress: target,
  status: badgeStatus(current, target),
  recommendation: { labelKey: 'progress.recommendations.together', tag: null },
  period,
});

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('ChallengeCard', () => {
  it.each([
    ['weekly', 'progress.thisWeek'],
    ['monthly', 'progress.thisMonth'],
  ] as const)('labels a %s adventure with its period key', (period, key) => {
    const tree = render(<ChallengeCard challenge={challenge(period, 1, 3)} onPress={jest.fn()} />);

    expect(byTestId(tree, `challenge-period-${period}`)[0].props.children).toBe(key);
  });

  it('renders progress through the shared badge state language', () => {
    const tree = render(<ChallengeCard challenge={challenge('weekly', 1, 3)} onPress={jest.fn()} />);

    expect(byTestId(tree, 'badge-artwork-started').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'challenge-progress-weekly').length).toBeGreaterThan(0);
  });

  it('reports taps with the challenge', () => {
    const onPress = jest.fn();
    const underTest = challenge('monthly', 0, 10);
    const tree = render(<ChallengeCard challenge={underTest} onPress={onPress} />);

    fireEvent.press(byTestId(tree, 'challenge-card-monthly')[0]);

    expect(onPress).toHaveBeenCalledWith(underTest);
  });
});
