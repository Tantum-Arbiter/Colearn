/**
 * The theme chooser (§6.5): a heading row -- "Choose a theme" with the Filter
 * button at its end -- above one glass bar of three segments, Stories,
 * Learning and Music, each its art beside its label (the operator's picture,
 * 2026-10-04). One segment is always chosen, lit purple, and the shelf is
 * sorted under it. The finer themes wait behind the Filter button and
 * appear as pills beneath the tiles. A theme the child has chosen from there
 * stays in view while it is chosen, or the shelf would be filtered by
 * something they cannot see.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { StoryFilterBar, SELECTED_TILE_FILL, THEME_BAR, THEME_TILE_ART } from '@/components/stories/catalogue/story-filter-bar';
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

  it('should label a segment through its translation key, its art beside the words', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const tile = pressables(tree, 'story-theme-tile-stories')[0];
    const underTest = StyleSheet.flatten(tile.props.style);

    expect(texts(tree)).toContain('catalogue.themes.stories');
    expect(underTest.flexDirection).toBe('row');
    expect(underTest.alignItems).toBe('center');
  });

  it('should hold all three in one glass capsule, rounded at its ends, as low as a single line', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const bar = StyleSheet.flatten(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-bar')[0].props.style);
    const tiles = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-bar')[0].findAll(
      (n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('story-theme-tile-') && n.props.accessibilityRole === 'button'
    );

    expect(bar).toEqual(
      expect.objectContaining({ flexDirection: 'row', height: THEME_BAR.height.phone, borderRadius: THEME_BAR.height.phone / 2, padding: THEME_BAR.inset })
    );
    expect(bar.borderWidth).toBeGreaterThan(0);
    expect(new Set(tiles.map((n: any) => n.props.testID)).size).toBe(3);
    expect(THEME_BAR.height.phone).toBeLessThan(72);
  });

  it('should share the capsule equally, each segment rounded inside it', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const inner = THEME_BAR.height.phone - THEME_BAR.inset * 2;

    CATALOGUE_THEMES.forEach((id) => {
      const underTest = StyleSheet.flatten(pressables(tree, `story-theme-tile-${id}`)[0].props.style);

      expect(underTest.flex).toBe(1);
      expect(underTest.borderRadius).toBe(inner / 2);
    });
  });

  it('should write the chosen label brightest and the others a little softer', () => {
    const tree = render(<StoryFilterBar {...baseProps} theme="learning" />);

    const colourOf = (id: string) =>
      StyleSheet.flatten(
        pressables(tree, `story-theme-tile-${id}`)[0].findAll((n: any) => n.props.adjustsFontSizeToFit === true)[0].props.style
      ).color;

    expect(colourOf('learning')).toBe('#FFFFFF');
    expect(colourOf('stories')).not.toBe('#FFFFFF');
  });

  it('should keep the chooser tight on a phone: heading, tiles and nothing wasted between', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const underTest = StyleSheet.flatten(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-bar')[0].props.style);

    expect(underTest.gap).toBe(8);
  });

  it('should hold a label to its segment and let it shrink, so a long word never crosses the bar', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const tile = pressables(tree, 'story-theme-tile-learning')[0];
    const label = tile.findAll((n: any) => n.props.adjustsFontSizeToFit === true)[0];
    const underTest = StyleSheet.flatten(label.props.style);

    expect(underTest.flexShrink).toBe(1);
    expect(underTest.fontSize).toBe(THEME_BAR.label.phone);
    expect(underTest.lineHeight).toBeUndefined();
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.minimumFontScale).toBeLessThanOrEqual(0.75);
  });

  it('carries no view toggle', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    expect(pressables(tree, 'story-filter-view-toggle')).toHaveLength(0);
  });
  it('reports where its capsule sits, so the page can stop it against the planet', () => {
    const onThemeBarLayout = jest.fn();
    const tree = render(<StoryFilterBar {...baseProps} onThemeBarLayout={onThemeBarLayout} />);
    const layout = { nativeEvent: { layout: { x: 0, y: 42, width: 358, height: 56 } } };

    fireEvent(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-bar' && n.props.onLayout)[0], 'layout', layout);

    expect(onThemeBarLayout).toHaveBeenCalledWith(layout);
  });

  it('lets a drag that starts between its buttons reach the page beneath it', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const chooser = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-bar')[0];
    const heading = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-heading')[0];
    const label = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-heading-label')[0];

    expect(chooser.props.pointerEvents).toBe('box-none');
    expect(heading.props.pointerEvents).toBe('box-none');
    expect(label.props.pointerEvents).toBe('none');
    expect(label.findAll((n: any) => n.props.children === 'catalogue.chooseTheme').length).toBeGreaterThan(0);
  });
});
