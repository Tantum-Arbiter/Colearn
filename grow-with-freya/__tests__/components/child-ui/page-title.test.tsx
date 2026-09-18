/**
 * The page title floats over the world with no app bar behind it (§6.4).
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PageTitle } from '@/components/child-ui/page-title';

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
