/**
 * The category bar is how a child finds badges: one pill per category plus
 * "All", labelled through translation keys, exactly one selected.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BadgeCategoryBar } from '@/components/progress/badge-category-bar';
import { BADGE_CATEGORIES } from '@/components/progress/progress-model';

function pills(tree: ReturnType<typeof render>) {
  return BADGE_CATEGORIES.map((category) =>
    tree.UNSAFE_root.findAll(
      (n: any) => n.props.testID === `badge-category-${category.id}` && n.props.accessibilityRole === 'button'
    )[0]
  );
}

describe('BadgeCategoryBar', () => {
  it('renders a pill for All and every category', () => {
    const tree = render(<BadgeCategoryBar selected="all" onSelect={jest.fn()} />);

    pills(tree).forEach((pill, index) => {
      expect(pill).toBeTruthy();
      expect(pill.props.accessibilityLabel).toBe(BADGE_CATEGORIES[index].labelKey);
    });
  });

  it('marks exactly the selected pill', () => {
    const tree = render(<BadgeCategoryBar selected="calm" onSelect={jest.fn()} />);

    const selected = pills(tree).filter((pill: any) => pill.props.accessibilityState.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.testID).toBe('badge-category-calm');
  });

  it('reports the tapped category', () => {
    const onSelect = jest.fn();
    const tree = render(<BadgeCategoryBar selected="all" onSelect={onSelect} />);

    fireEvent.press(pills(tree)[2]);

    expect(onSelect).toHaveBeenCalledWith('music');
  });
});
