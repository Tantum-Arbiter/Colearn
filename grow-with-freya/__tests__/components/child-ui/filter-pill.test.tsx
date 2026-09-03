/**
 * The generic filter pill behind the story tags and the badge categories:
 * content-sized, accessible, and never auto-shrinking its label.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterPill } from '@/components/child-ui/filter-pill';

const baseProps = {
  icon: 'leaf' as const,
  iconColor: '#6FCF7F',
  label: 'stories.filterTags.calming',
  selected: false,
  onPress: jest.fn(),
  testID: 'pill',
};

function pill(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'pill' && n.props.accessibilityRole === 'button')[0];
}

describe('FilterPill', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes its label and selected state to assistive tech', () => {
    const tree = render(<FilterPill {...baseProps} selected />);

    expect(pill(tree).props.accessibilityLabel).toBe('stories.filterTags.calming');
    expect(pill(tree).props.accessibilityState.selected).toBe(true);
  });

  it('reports presses', () => {
    const onPress = jest.fn();
    const tree = render(<FilterPill {...baseProps} onPress={onPress} />);

    fireEvent.press(pill(tree));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('never asks the platform to auto-shrink its label', () => {
    const tree = render(<FilterPill {...baseProps} />);

    const label = tree.UNSAFE_root.findAll((n: any) => n.props.children === 'stories.filterTags.calming')[0];
    expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    expect(label.props.numberOfLines).toBe(1);
  });
});
