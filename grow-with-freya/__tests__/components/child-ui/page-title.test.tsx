/**
 * The page title floats over the world with no app bar behind it (§6.4).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { PageTitle } from '@/components/child-ui/page-title';
import { HEADING_HALO } from '@/components/child-ui/heading-halo';

const mockAccessibility = jest.fn(() => ({
  scaledFontSize: (n: number) => n,
  isTablet: false,
}));
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => mockAccessibility(),
}));

function titleNode(tree: ReturnType<typeof render>) {
  const node = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'page-title')[0];
  expect(node).toBeTruthy();
  return node;
}

describe('PageTitle', () => {
  it('renders the given title as a header', () => {
    const tree = render(<PageTitle title="stories.title" />);

    const node = titleNode(tree);
    expect(node.props.children).toBe('stories.title');
    expect(node.props.accessibilityRole).toBe('header');
  });

  it('keeps the title to a single line', () => {
    const tree = render(<PageTitle title="stories.title" />);

    expect(titleNode(tree).props.numberOfLines).toBe(1);
  });
});

/**
 * The title sits on the globe, and white on lime-green continents is hard
 * to read. A soft dark shadow under the letters lifts them off whatever
 * land they happen to fall on.
 */
/**
 * The title sits on the globe and lifts off it by size, seven percent up
 * from where it was, with only a soft shadow beneath -- a heavy one read as
 * an outline.
 */
describe('PageTitle over the globe', () => {
  it('casts only a soft shadow under its letters', () => {
    const tree = render(<PageTitle title="Stories" />);

    const style = [titleNode(tree).props.style].flat(Infinity).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    const alpha = Number(String(style.textShadowColor).match(/[\d.]+\)$/)?.[0].slice(0, -1));

    expect(style.textShadowRadius).toBeGreaterThan(0);
    expect(alpha).toBeLessThanOrEqual(0.6);
  });

  it.each([
    ['a phone', false, 36],
    ['a tablet', true, 44],
  ])('sets the type seven percent up from where it was on %s', (_case, isTablet, size) => {
    mockAccessibility.mockReturnValue({ scaledFontSize: (n: number) => n, isTablet });
    const tree = render(<PageTitle title="Stories" />);

    const style = [titleNode(tree).props.style].flat(Infinity).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});

    expect(style.fontSize).toBe(size);
  });
});

/**
 * Over the painted planet a shadow under the letters was not enough: the
 * title sits in a soft night-sky halo (operator, 2026-10-03).
 */
describe('PageTitle over the painted planet', () => {
  it('should sit in a heading halo, drawn behind its words', () => {
    const tree = render(<PageTitle title="Progress" />);
    const names = ['page-title-halo', 'page-title'];

    const order = tree.UNSAFE_root
      .findAll((n: any) => names.includes(n.props.testID))
      .map((n: any) => n.props.testID)
      .filter((name: string, index: number, all: string[]) => all.indexOf(name) === index);
    const halo = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'page-title-halo' && n.props.spread)[0];

    expect(order).toEqual(names);
    expect(halo.props.spread).toEqual(HEADING_HALO.title);
  });

  it('should still let the words shrink to fit the room between the header`s buttons', () => {
    const tree = render(<PageTitle title="Progress" />);

    const wrap = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'page-title-wrap' && n.props.style)[0];

    expect(StyleSheet.flatten(wrap.props.style)).toEqual(expect.objectContaining({ flexShrink: 1, maxWidth: '100%' }));
    expect(titleNode(tree).props.adjustsFontSizeToFit).toBe(true);
  });
});
