/**
 * Milestones are warm memories (§12): completed ones carry a gentle lavender
 * tick, incomplete ones stay visible without any failure treatment.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MilestoneCard } from '@/components/progress/milestone-card';
import { Milestone } from '@/components/progress/progress-model';

const milestone = (achieved: boolean): Milestone => ({
  id: 'first-five-stories',
  titleKey: 'progress.milestones.firstFiveStories.title',
  descriptionKey: 'progress.milestones.firstFiveStories.description',
  artwork: { uri: 'test://artwork' },
  achieved,
});

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('MilestoneCard', () => {
  it('renders the title and description through translation keys', () => {
    const tree = render(<MilestoneCard milestone={milestone(true)} width={110} />);

    expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === 'progress.milestones.firstFiveStories.title').length).toBeGreaterThan(0);
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === 'progress.milestones.firstFiveStories.description').length).toBeGreaterThan(0);
  });

  it('shows the tick badge only when achieved', () => {
    const achieved = render(<MilestoneCard milestone={milestone(true)} width={110} />);
    const pending = render(<MilestoneCard milestone={milestone(false)} width={110} />);

    expect(byTestId(achieved, 'milestone-tick-first-five-stories').length).toBeGreaterThan(0);
    expect(byTestId(pending, 'milestone-tick-first-five-stories')).toHaveLength(0);
  });

  it('reports its state to assistive tech', () => {
    const tree = render(<MilestoneCard milestone={milestone(true)} width={110} />);

    const card = byTestId(tree, 'milestone-card-first-five-stories')[0];
    expect(card.props.accessibilityState.checked).toBe(true);
  });
});
