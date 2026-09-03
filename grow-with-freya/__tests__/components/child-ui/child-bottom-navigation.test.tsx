/**
 * The journey navigation shelf (§6.11): four fixed areas, exactly one
 * selected, labels resolved through i18n keys, and selection reported
 * through the onSelect callback rather than any internal routing.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  ChildBottomNavigation,
  CHILD_NAV_ITEMS,
  navBottomOffset,
  navClearance,
  navWidth,
} from '@/components/child-ui/child-bottom-navigation';
import { NAV_HEIGHT, NAV_MAX_WIDTH } from '@/components/child-ui/tokens';

function items(tree: ReturnType<typeof render>) {
  return CHILD_NAV_ITEMS.map((item) =>
    tree.UNSAFE_root.findAll((n: any) => n.props.testID === `navigation-item-${item.id}` && n.props.accessibilityRole === 'tab')[0]
  );
}

describe('ChildBottomNavigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the three journey areas in order', () => {
    expect(CHILD_NAV_ITEMS.map((item) => item.id)).toEqual(['home', 'library', 'progress']);

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

  it('reserves scroll clearance for its full height, its bottom offset and breathing room', () => {
    expect(navClearance(0)).toBeGreaterThan(NAV_HEIGHT + navBottomOffset(0));
    expect(navClearance(34)).toBe(NAV_HEIGHT + navBottomOffset(34) + (navClearance(0) - NAV_HEIGHT - navBottomOffset(0)));
  });

  it('sits low on the screen: tucked toward the home indicator but never below a small floor', () => {
    expect(navBottomOffset(0)).toBeGreaterThan(0);
    expect(navBottomOffset(34)).toBeLessThan(34);
    expect(navBottomOffset(34)).toBeGreaterThan(navBottomOffset(0));
  });

  it('caps its width on wide screens instead of stretching', () => {
    expect(navWidth(393, false)).toBeLessThan(393);
    expect(navWidth(1024, true)).toBe(NAV_MAX_WIDTH);
  });
});
