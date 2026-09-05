/**
 * CoverTitle -- the title a book wears on its cover wherever it is shown, on
 * the shelf and at its seat, with a wash of night behind it so it reads over
 * any artwork.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { CoverTitle, TITLE_WASH_GRADIENT } from '@/components/stories/catalogue/cover-title';

function byTestId(root: any, id: string) {
  return root.findAll((node: any) => node.props?.testID === id);
}

describe('CoverTitle', () => {
  it('should show the title on two lines at most, under its default test id', () => {
    const { UNSAFE_root } = render(<CoverTitle title="Snuggle Little Wombat" />);

    const underTest = byTestId(UNSAFE_root, 'story-cover-title')[0];

    expect(underTest.props.children).toBe('Snuggle Little Wombat');
    expect(underTest.props.numberOfLines).toBe(2);
  });

  it('should take a test id of its own, so each book can be told apart', () => {
    const { UNSAFE_root } = render(<CoverTitle title="Wombat" testID="seated-book-title" />);

    expect(byTestId(UNSAFE_root, 'seated-book-title').length).toBeGreaterThan(0);
    expect(byTestId(UNSAFE_root, 'story-cover-title')).toHaveLength(0);
  });

  it('should carry the words in from the left over a wash of night', () => {
    const { UNSAFE_root } = render(<CoverTitle title="Wombat" />);

    const wash = byTestId(UNSAFE_root, 'linear-gradient')[0];
    const underTest = StyleSheet.flatten(wash.props.style);

    expect(wash.props.colors).toEqual(TITLE_WASH_GRADIENT);
    expect(underTest.left).toBe(0);
    expect(underTest.width).toBe('70%');
  });
});
