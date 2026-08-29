/**
 * The detail sheet is where recommendations live (§22): gentle progress
 * dots and one activity-driven suggestion — never on the Progress page
 * itself, and never once the badge is earned.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BadgeDetailSheet } from '@/components/progress/badge-detail-sheet';
import { Badge, badgeStatus } from '@/components/progress/progress-model';

const badge = (current: number, target: number): Badge => ({
  id: 'calm-champion',
  titleKey: 'progress.badges.calmChampion.title',
  descriptionKey: 'progress.badges.calmChampion.description',
  artwork: { uri: 'test://artwork' },
  category: 'calm',
  currentProgress: current,
  targetProgress: target,
  status: badgeStatus(current, target),
  recommendation: { labelKey: 'progress.recommendations.calming', tag: 'calming' },
});

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('BadgeDetailSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when no badge is selected', () => {
    const tree = render(<BadgeDetailSheet badge={null} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(byTestId(tree, 'badge-detail-sheet')).toHaveLength(0);
  });

  it('shows one dot per target with the current progress filled', () => {
    const tree = render(<BadgeDetailSheet badge={badge(2, 5)} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(byTestId(tree, 'badge-dot-filled')).toHaveLength(2);
    expect(byTestId(tree, 'badge-dot-empty')).toHaveLength(3);
  });

  it('falls back to the progress pill for large targets', () => {
    const large = { ...badge(6, 10), id: 'story-adventurer' };
    const tree = render(<BadgeDetailSheet badge={large} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(byTestId(tree, 'badge-detail-dots')).toHaveLength(0);
    expect(byTestId(tree, 'badge-detail-progress').length).toBeGreaterThan(0);
  });

  it('routes the recommendation through onRecommend', () => {
    const onRecommend = jest.fn();
    const underTest = badge(2, 5);
    const tree = render(<BadgeDetailSheet badge={underTest} onClose={jest.fn()} onRecommend={onRecommend} />);

    fireEvent.press(byTestId(tree, 'badge-detail-recommendation')[0]);

    expect(onRecommend).toHaveBeenCalledWith(underTest);
  });

  it('offers no recommendation once the badge is earned', () => {
    const tree = render(<BadgeDetailSheet badge={badge(5, 5)} onClose={jest.fn()} onRecommend={jest.fn()} />);

    expect(byTestId(tree, 'badge-detail-recommendation')).toHaveLength(0);
  });

  it('closes through the close control', () => {
    const onClose = jest.fn();
    const tree = render(<BadgeDetailSheet badge={badge(2, 5)} onClose={onClose} onRecommend={jest.fn()} />);

    fireEvent.press(byTestId(tree, 'badge-detail-close')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
