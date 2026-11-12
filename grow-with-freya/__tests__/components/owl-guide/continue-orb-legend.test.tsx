/**
 * The Continue orb in both its states, for the owl's step about it: as it is
 * with nothing part-read -- the bookmark over "Read to bookmark" -- and as it
 * becomes once a book is under way, the book's own cover filling the glass
 * with "Continue" over it.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ContinueOrbLegend } from '@/components/owl-guide/continue-orb-legend';
import { STAT_ORB } from '@/constants/stat-orbs';
import type { ChildHomeStory } from '@/types/child-home';

let mockStory: ChildHomeStory | undefined;
jest.mock('@/components/home/use-continue-story', () => ({
  useContinueStory: () => mockStory,
}));

jest.mock('@/data/stories', () => ({
  ALL_STORIES: [
    { id: 'no-cover', title: 'No Cover' },
    { id: 'sample', title: 'Sample', coverImage: 'file:///sample.webp' },
  ],
}));

function within(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID && node.props.style !== undefined)[0];
}

function words(node: any): string[] {
  return node
    .findAll((child: any) => child.type === Text)
    .map((child: any) => child.props.children)
    .filter((child: unknown): child is string => typeof child === 'string');
}

describe('ContinueOrbLegend', () => {
  beforeEach(() => {
    mockStory = undefined;
  });

  it('shows the orb with nothing part-read: the bookmark over "Read to bookmark"', () => {
    const tree = render(<ContinueOrbLegend />);
    const before = within(tree, 'continue-orb-legend-before');

    expect(before.findAll((node: any) => node.props.testID === 'stat-orb-continue-bookmark').length).toBeGreaterThan(0);
    expect(words(before)).toEqual(['home.statOrb.readToBookmark']);
  });

  it('banks the first orb down and lights the second, as the home does', () => {
    const tree = render(<ContinueOrbLegend />);
    const artOpacity = (side: string) =>
      StyleSheet.flatten(
        within(tree, `continue-orb-legend-${side}`).findAll((node: any) => node.props.testID === 'stat-orb-continue-art' && node.props.style)[0].props.style
      ).opacity;

    expect(artOpacity('before')).toBe(STAT_ORB.restingOpacity);
    expect(artOpacity('after')).toBe(1);
  });

  it("shows the orb once a book is under way: the family's own cover, with the bookmark and Continue over it", () => {
    mockStory = { id: 'juni', title: 'Hold On, Juni', currentPage: 4, totalPages: 10, coverImage: { uri: 'file:///juni.webp' } };
    const tree = render(<ContinueOrbLegend />);
    const after = within(tree, 'continue-orb-legend-after');

    expect(after.findAll((node: any) => node.props.testID === 'continue-orb-legend-cover')[0].props.source).toEqual({
      uri: 'file:///juni.webp',
    });
    expect(after.findAll((node: any) => node.props.testID === 'stat-orb-continue-bookmark').length).toBeGreaterThan(0);
    expect(words(after)).toEqual(['home.statOrb.continue']);
  });

  it('shows a sample cover when the family has nothing part-read yet', () => {
    const tree = render(<ContinueOrbLegend />);
    const after = within(tree, 'continue-orb-legend-after');

    expect(after.findAll((node: any) => node.props.testID === 'continue-orb-legend-cover')[0].props.source).toEqual({
      uri: 'file:///sample.webp',
    });
  });

  it('leads from one state to the other with an arrow, before then after', () => {
    const tree = render(<ContinueOrbLegend />);
    const order = tree.UNSAFE_root
      .findAll(
        (node: any) =>
          ['continue-orb-legend-before', 'continue-orb-legend-arrow', 'continue-orb-legend-after'].includes(node.props.testID) &&
          node.props.style !== undefined
      )
      .map((node: any) => node.props.testID);

    expect(order.filter((id: string, index: number) => order.indexOf(id) === index)).toEqual([
      'continue-orb-legend-before',
      'continue-orb-legend-arrow',
      'continue-orb-legend-after',
    ]);
  });
});
