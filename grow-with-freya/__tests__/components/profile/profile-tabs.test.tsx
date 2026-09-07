/**
 * The three tabs under the child's face. Each one is a way into one of the
 * things that are theirs, and exactly one is ever open -- the page shows one
 * section at a time rather than stacking all three down a long scroll.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileTabs, PROFILE_TABS } from '@/components/profile/profile-tabs';

function tab(tree: ReturnType<typeof render>, id: string) {
  return tree.UNSAFE_root.findAll(
    (n: any) => n.props.testID === `profile-tab-${id}` && n.props.accessibilityRole === 'button',
  )[0];
}

describe('ProfileTabs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers the three sections in order: saved, badges, manage', () => {
    expect(PROFILE_TABS.map((entry) => entry.id)).toEqual(['saved', 'badges', 'manage']);

    const underTest = render(<ProfileTabs selected="saved" onSelect={jest.fn()} />);

    for (const entry of PROFILE_TABS) expect(tab(underTest, entry.id)).toBeTruthy();
  });

  it.each([
    ['saved', 'heart', 'profile.tabs.saved'],
    ['badges', 'ribbon', 'profile.tabs.badges'],
    ['manage', 'cloud-download', 'profile.tabs.manage'],
  ])('gives the %s tab its %s glyph and its own label', (id, glyph, labelKey) => {
    const underTest = render(<ProfileTabs selected="saved" onSelect={jest.fn()} />);

    const entry = PROFILE_TABS.find((candidate) => candidate.id === id);

    expect(entry?.icon).toBe(glyph);
    expect(tab(underTest, id).props.accessibilityLabel).toBe(labelKey);
  });

  it('marks exactly the open tab as selected', () => {
    const underTest = render(<ProfileTabs selected="badges" onSelect={jest.fn()} />);

    const flags = PROFILE_TABS.map((entry) => tab(underTest, entry.id).props.accessibilityState?.selected);

    expect(flags).toEqual([false, true, false]);
  });

  it('reports a tap through onSelect with the tab id', () => {
    const onSelect = jest.fn();
    const underTest = render(<ProfileTabs selected="saved" onSelect={onSelect} />);

    fireEvent.press(tab(underTest, 'manage'));

    expect(onSelect).toHaveBeenCalledWith('manage');
  });
});
