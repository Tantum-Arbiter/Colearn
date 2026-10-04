/**
 * The theme chooser (§6.5): a heading row -- "Choose a theme" with the Filter
 * button at its end -- above one row of three tiles, Stories, Learning and
 * Music, each a piece of art over a label. One tile is always chosen and the
 * shelf is sorted under it. The finer themes wait behind the Filter button and
 * appear as pills beneath the tiles. A theme the child has chosen from there
 * stays in view while it is chosen, or the shelf would be filtered by
 * something they cannot see.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { StoryFilterBar, SELECTED_TILE_FILL, THEME_TILE_ART } from '@/components/stories/catalogue/story-filter-bar';
import { CATALOGUE_THEMES } from '@/components/stories/catalogue/catalogue-story';
import { StoryFilterTag } from '@/types/story';

const TAGS: StoryFilterTag[] = ['bedtime', 'adventure', 'calming', 'family-exercises', 'animals'];

const baseProps = {
  theme: 'stories' as const,
  onSelectTheme: jest.fn(),
  tags: TAGS,
  selectedTags: new Set<StoryFilterTag>(),
  onToggleTag: jest.fn(),
};

function pressables(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll(
    (n: any) => n.props.testID === testID && n.props.accessibilityRole === 'button'
  );
}

function texts(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root
    .findAll((n: any) => typeof n.props.children === 'string')
    .map((n: any) => n.props.children as string);
}

describe('StoryFilterBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should head the row with "Choose a theme" and put the Filter button beside it', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    expect(texts(tree)).toContain('catalogue.chooseTheme');
    expect(pressables(tree, 'story-filter-more').length).toBeGreaterThan(0);
  });

  it('should offer exactly Stories, Learning and Music, as tiles in one row', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const underTest = tree.UNSAFE_root
      .findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('story-theme-tile-') && n.props.accessibilityRole === 'button')
      .map((n: any) => n.props.testID.replace('story-theme-tile-', ''));

    expect(Array.from(new Set(underTest))).toEqual(['stories', 'learning', 'music']);
    expect(CATALOGUE_THEMES).toEqual(['stories', 'learning', 'music']);
    expect(pressables(tree, 'story-theme-tile-all')).toHaveLength(0);
    expect(pressables(tree, 'story-theme-tile-bedtime')).toHaveLength(0);
  });

  it('should show the chosen theme as selected and hand a tap to onSelectTheme', () => {
    const tree = render(<StoryFilterBar {...baseProps} theme="learning" />);

    expect(pressables(tree, 'story-theme-tile-learning')[0].props.accessibilityState).toEqual({ selected: true });
    expect(pressables(tree, 'story-theme-tile-stories')[0].props.accessibilityState).toEqual({ selected: false });

    fireEvent.press(pressables(tree, 'story-theme-tile-music')[0]);

    expect(baseProps.onSelectTheme).toHaveBeenCalledWith('music');
  });

  it('should carry rendered art for each tile', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    for (const id of CATALOGUE_THEMES) {
      const art = tree.UNSAFE_root.findAll((n: any) => n.props.testID === `story-theme-art-${id}`);
      expect(art.length).toBeGreaterThan(0);
      expect(art[0].props.source).toBeDefined();
      expect(THEME_TILE_ART[id]).toBeDefined();
    }
  });

  it('should light the chosen tile with a deepening purple fill, a bright rim and a glow', () => {
    const tree = render(<StoryFilterBar {...baseProps} theme="music" />);

    const glow = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-glow-music');
    const underTest = StyleSheet.flatten(pressables(tree, 'story-theme-tile-music')[0].props.style);

    expect(glow.length).toBeGreaterThan(0);
    expect(glow[0].props.colors).toEqual(SELECTED_TILE_FILL);
    expect(underTest.shadowOpacity).toBeGreaterThan(0);
    expect(underTest.borderWidth).toBeGreaterThan(1);
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-glow-stories')).toHaveLength(0);
  });

  it('should keep the finer themes behind the Filter button until it is pressed', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    expect(pressables(tree, 'story-filter-pill-family-exercises')).toHaveLength(0);

    fireEvent.press(pressables(tree, 'story-filter-more')[0]);

    expect(pressables(tree, 'story-filter-pill-family-exercises').length).toBeGreaterThan(0);
    expect(pressables(tree, 'story-filter-pill-bedtime').length).toBeGreaterThan(0);
  });

  it('should keep a chosen finer theme in view, and hand a tap on it to onToggleTag', () => {
    const tree = render(<StoryFilterBar {...baseProps} selectedTags={new Set<StoryFilterTag>(['animals'])} />);

    const pill = pressables(tree, 'story-filter-pill-animals');
    expect(pill.length).toBeGreaterThan(0);

    fireEvent.press(pill[0]);

    expect(baseProps.onToggleTag).toHaveBeenCalledWith('animals');
  });

  it('should label a tile through its translation key, art above the words', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const tile = pressables(tree, 'story-theme-tile-stories')[0];
    const underTest = StyleSheet.flatten(tile.props.style);

    expect(texts(tree)).toContain('catalogue.themes.stories');
    expect(underTest.flexDirection).not.toBe('row');
  });

  it('should make each phone tile a short box, so the chooser is a way in and not a screenful', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const underTest = StyleSheet.flatten(pressables(tree, 'story-theme-tile-stories')[0].props.style);

    expect(underTest.height).toBe(72);
    expect(underTest.flex).toBe(1);
  });

  it('should keep the chooser tight on a phone: heading, tiles and nothing wasted between', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const underTest = StyleSheet.flatten(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-bar')[0].props.style);

    expect(underTest.gap).toBe(8);
  });

  it('should hold a tile label to the tile and let it shrink, so a long word never crosses the box', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const tile = pressables(tree, 'story-theme-tile-learning')[0];
    const label = tile.findAll((n: any) => n.props.adjustsFontSizeToFit === true)[0];
    const underTest = StyleSheet.flatten(label.props.style);

    expect(underTest.alignSelf).toBe('stretch');
    expect(underTest.textAlign).toBe('center');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.minimumFontScale).toBeLessThanOrEqual(0.75);
  });

  it('carries no view toggle', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    expect(pressables(tree, 'story-filter-view-toggle')).toHaveLength(0);
  });
});
