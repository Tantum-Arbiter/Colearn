/**
 * The journey navigation shelf (§6.11): four fixed areas, exactly one
 * selected, labels resolved through i18n keys, and selection reported
 * through the onSelect callback rather than any internal routing.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChildBottomNavigation, CHILD_NAV_ITEMS, navClearance } from '@/components/child-ui/child-bottom-navigation';
import { NAV_HEIGHT } from '@/components/child-ui/tokens';

function items(tree: ReturnType<typeof render>) {
  return CHILD_NAV_ITEMS.map((item) =>
    tree.UNSAFE_root.findAll((n: any) => n.props.testID === `navigation-item-${item.id}` && n.props.accessibilityRole === 'tab')[0]
  );
}

describe('ChildBottomNavigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the four journey areas in order', () => {
    expect(CHILD_NAV_ITEMS.map((item) => item.id)).toEqual(['home', 'library', 'progress', 'parents']);

    const tree = render(<ChildBottomNavigation selected="library" onSelect={jest.fn()} />);

    items(tree).forEach((node) => expect(node).toBeTruthy());
  });

  it('marks exactly one item as selected', () => {
    const tree = render(<ChildBottomNavigation selected="library" onSelect={jest.fn()} />);

    const selectedFlags = items(tree).map((node: any) => node.props.accessibilityState?.selected);
    expect(selectedFlags.filter(Boolean)).toHaveLength(1);
    expect(selectedFlags[1]).toBe(true);
  });

  it('labels every item through a translation key', () => {
    const tree = render(<ChildBottomNavigation selected="home" onSelect={jest.fn()} />);

    items(tree).forEach((node: any, index) => {
      expect(node.props.accessibilityLabel).toBe(CHILD_NAV_ITEMS[index].labelKey);
    });
  });

  it('reports a tap through onSelect with the item id', () => {
    const onSelect = jest.fn();
    const tree = render(<ChildBottomNavigation selected="library" onSelect={onSelect} />);

    fireEvent.press(items(tree)[0]);

    expect(onSelect).toHaveBeenCalledWith('home');
  });

  it('reserves scroll clearance for its full height plus breathing room', () => {
    expect(navClearance(0)).toBeGreaterThan(NAV_HEIGHT);
    expect(navClearance(20)).toBe(navClearance(0) + 20);
  });
});
