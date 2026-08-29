/**
 * The page title floats over the world with no app bar behind it (§6.4).
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PageTitle } from '@/components/child-ui/page-title';

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
