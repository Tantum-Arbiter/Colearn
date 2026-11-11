/**
 * The theme chooser (§6.5): a heading row -- "Choose a theme" with the Filter
 * button at its end -- above one glass bar of two segments, Stories and
 * Music, each its art beside its label (the operator's picture,
 * 2026-10-04). One segment is always chosen, lit purple, and the shelf is
 * sorted under it. The finer themes wait behind the Filter button and
 * appear as pills beneath the tiles. A theme the child has chosen from there
 * stays in view while it is chosen, or the shelf would be filtered by
 * something they cannot see.
 */

import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as reanimatedModule from 'react-native-reanimated';
import { StoryFilterBar, SELECTED_TILE_FILL, THEME_BAR, THEME_TILE_ART, filterDrawerDepth } from '@/components/stories/catalogue/story-filter-bar';
import { CHILD_UI_MOTION } from '@/constants/child-ui-motion';
import { FILTER_PILL_HEIGHT, SPACE_3 } from '@/components/child-ui/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { CATALOGUE_THEMES } from '@/components/stories/catalogue/catalogue-story';
import { StoryFilterTag } from '@/types/story';

jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: jest.fn(() => false) }));

const reanimated = reanimatedModule as unknown as {
  useSharedValue: jest.Mock;
  useAnimatedStyle: jest.Mock;
  withTiming: jest.Mock;
};

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

  it('should offer exactly Stories and Music, as tiles in one row', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const underTest = tree.UNSAFE_root
      .findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('story-theme-tile-') && n.props.accessibilityRole === 'button')
      .map((n: any) => n.props.testID.replace('story-theme-tile-', ''));

    expect(Array.from(new Set(underTest))).toEqual(['stories', 'music']);
    expect(CATALOGUE_THEMES).toEqual(['stories', 'music']);
    expect(pressables(tree, 'story-theme-tile-learning')).toHaveLength(0);
    expect(pressables(tree, 'story-theme-tile-all')).toHaveLength(0);
    expect(pressables(tree, 'story-theme-tile-bedtime')).toHaveLength(0);
  });

  it('should show the chosen theme as selected and hand a tap to onSelectTheme', () => {
    const tree = render(<StoryFilterBar {...baseProps} theme="music" />);

    expect(pressables(tree, 'story-theme-tile-music')[0].props.accessibilityState).toEqual({ selected: true });
    expect(pressables(tree, 'story-theme-tile-stories')[0].props.accessibilityState).toEqual({ selected: false });

    fireEvent.press(pressables(tree, 'story-theme-tile-stories')[0]);

    expect(baseProps.onSelectTheme).toHaveBeenCalledWith('stories');
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

  it('should light the chosen tile with one lamp behind it: a deepening purple fill, a bright rim and a glow', () => {
    const tree = render(<StoryFilterBar {...baseProps} theme="music" />);

    const lamps = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-lamp' && n.props.pointerEvents);
    const underTest = StyleSheet.flatten(lamps[0].props.style);
    const glow = lamps[0].findAll((n: any) => Array.isArray(n.props.colors));
    const inner = THEME_BAR.height.phone - THEME_BAR.inset * 2;

    expect(lamps).toHaveLength(1);
    expect(lamps[0].props.pointerEvents).toBe('none');
    expect(glow.length).toBeGreaterThan(0);
    expect(glow[0].props.colors).toEqual(SELECTED_TILE_FILL);
    expect(underTest.shadowOpacity).toBeGreaterThan(0);
    expect(underTest.borderWidth).toBeGreaterThan(1);
    expect(underTest.borderRadius).toBe(inner / 2);
    expect(underTest.position).toBe('absolute');
    expect(underTest.top).toBe(0);
    expect(underTest.bottom).toBe(0);
    expect(underTest.elevation).toBeUndefined();
    CATALOGUE_THEMES.forEach((id) => {
      const tile = pressables(tree, `story-theme-tile-${id}`)[0];
      expect(tile.findAll((n: any) => Array.isArray(n.props.colors))).toHaveLength(0);
      expect(StyleSheet.flatten(tile.props.style).borderWidth).toBeUndefined();
    });
  });

  it('should draw the lamp before the tiles, so their art and words sit on top of it', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);
    const ids = tree.UNSAFE_root
      .findAll((n: any) => n.props.testID === 'story-theme-track')[0]
      .findAll((n: any) => typeof n.props.testID === 'string' && /^story-theme-(lamp|tile-)/.test(n.props.testID))
      .map((n: any) => n.props.testID as string);

    expect(ids[0]).toBe('story-theme-lamp');
    expect(ids.indexOf('story-theme-tile-stories')).toBeGreaterThan(ids.lastIndexOf('story-theme-lamp'));
  });

  it('should lay the tiles out side by side in a track that fills the capsule, the lamp measured against it', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const track = StyleSheet.flatten(
      tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-track' && n.props.style)[0].props.style
    );

    expect(track.flexDirection).toBe('row');
    expect(track.flex).toBe(1);
    expect(track.overflow).toBeUndefined();
  });

  it('should keep the finer themes behind the Filter button until it is pressed', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);
    const slot = (tag: StoryFilterTag) =>
      tree.UNSAFE_root.findAll((n: any) => n.props.testID === `story-filter-slot-${tag}` && n.props.pointerEvents)[0];

    for (const tag of TAGS) {
      expect(slot(tag).props.pointerEvents).toBe('none');
      expect(slot(tag).props.accessibilityElementsHidden).toBe(true);
      expect(slot(tag).props.importantForAccessibility).toBe('no-hide-descendants');
    }

    fireEvent.press(pressables(tree, 'story-filter-more')[0]);

    for (const tag of TAGS) {
      expect(slot(tag).props.pointerEvents).toBe('auto');
      expect(slot(tag).props.accessibilityElementsHidden).toBe(false);
      expect(slot(tag).props.importantForAccessibility).toBe('auto');
      expect(slot(tag).findAll((n: any) => n.props.testID === `story-filter-pill-${tag}`).length).toBeGreaterThan(0);
    }
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

  it('should hold both in one glass capsule, rounded at its ends, as low as a single line', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const bar = StyleSheet.flatten(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-bar')[0].props.style);
    const tiles = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-bar')[0].findAll(
      (n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('story-theme-tile-') && n.props.accessibilityRole === 'button'
    );

    expect(bar).toEqual(
      expect.objectContaining({ flexDirection: 'row', height: THEME_BAR.height.phone, borderRadius: THEME_BAR.height.phone / 2, padding: THEME_BAR.inset })
    );
    expect(bar.borderWidth).toBeGreaterThan(0);
    expect(new Set(tiles.map((n: any) => n.props.testID)).size).toBe(2);
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
    const tree = render(<StoryFilterBar {...baseProps} theme="music" />);

    const colourOf = (id: string) =>
      StyleSheet.flatten(
        pressables(tree, `story-theme-tile-${id}`)[0].findAll((n: any) => n.props.adjustsFontSizeToFit === true)[0].props.style
      ).color;

    expect(colourOf('music')).toBe('#FFFFFF');
    expect(colourOf('stories')).not.toBe('#FFFFFF');
  });

  it('should keep the chooser tight on a phone: heading, tiles and nothing wasted between', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const underTest = StyleSheet.flatten(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-rest')[0].props.style);

    expect(underTest.gap).toBe(8);
  });

  it('should hold a label to its segment and let it shrink, so a long word never crosses the bar', () => {
    const tree = render(<StoryFilterBar {...baseProps} />);

    const tile = pressables(tree, 'story-theme-tile-music')[0];
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

    const rest = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-rest')[0];

    expect(chooser.props.pointerEvents).toBe('box-none');
    expect(rest.props.pointerEvents).toBe('box-none');
    expect(heading.props.pointerEvents).toBe('box-none');
    expect(label.props.pointerEvents).toBe('none');
    expect(label.findAll((n: any) => n.props.children === 'catalogue.chooseTheme').length).toBeGreaterThan(0);
  });

  describe('opening and closing the finer themes', () => {
    const OPEN = { duration: CHILD_UI_MOTION.filterDrawer.duration };

    beforeEach(() => {
      (useReducedMotion as jest.Mock).mockReturnValue(false);
      reanimated.useSharedValue.mockImplementation((initial: unknown = 0) => React.useRef({ value: initial }).current);
      reanimated.useAnimatedStyle.mockImplementation((build: () => object) => build());
    });

    afterEach(() => {
      reanimated.useSharedValue.mockImplementation((initial: unknown = 0) => ({ value: initial }));
      reanimated.useAnimatedStyle.mockImplementation(() => ({}));
      reanimated.withTiming.mockImplementation((value: unknown, _config: unknown, callback?: (finished: boolean) => void) => {
        if (typeof callback === 'function') callback(true);
        return value;
      });
    });

    function node(tree: ReturnType<typeof render>, testID: string) {
      return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID && n.props.style)[0];
    }

    function look(tree: ReturnType<typeof render>, testID: string) {
      return StyleSheet.flatten(node(tree, testID).props.style) as any;
    }

    function pressFilter(tree: ReturnType<typeof render>) {
      fireEvent.press(pressables(tree, 'story-filter-more')[0]);
    }

    function measure(tree: ReturnType<typeof render>, tag: StoryFilterTag, width: number) {
      const size = tree.UNSAFE_root.findAll((n: any) => n.props.testID === `story-filter-slot-size-${tag}` && n.props.onLayout)[0];
      act(() => {
        size.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: FILTER_PILL_HEIGHT } } });
      });
    }

    function holdAnimations() {
      const pending: { value: number; finish: (finished: boolean) => void }[] = [];
      reanimated.withTiming.mockImplementation((value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        if (typeof callback === 'function') pending.push({ value, finish: callback });
        return value;
      });
      return pending;
    }

    describe('the lamp behind the chosen theme', () => {
      const GLIDE = { duration: CHILD_UI_MOTION.themeGlide.duration };

      function lamp(tree: ReturnType<typeof render>) {
        return look(tree, 'story-theme-lamp');
      }

      function layTrack(tree: ReturnType<typeof render>, width: number) {
        const track = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-theme-track' && n.props.onLayout)[0];
        act(() => {
          track.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 46 } } });
        });
      }

      it.each([
        ['stories', '0%'],
        ['music', '50%'],
      ] as const)('rests under %s from the first frame, one tile wide, before anything is measured', (theme, left) => {
        const tree = render(<StoryFilterBar {...baseProps} theme={theme} />);

        expect(lamp(tree).left).toBe(left);
        expect(lamp(tree).width).toBe('50%');
        expect(lamp(tree).transform).toEqual([{ translateX: 0 }]);
      });

      it('glides across to the newly chosen theme by one tile width, over the glide beat', () => {
        const tree = render(<StoryFilterBar {...baseProps} theme="stories" />);
        layTrack(tree, 340);
        reanimated.withTiming.mockClear();

        tree.rerender(<StoryFilterBar {...baseProps} theme="music" />);
        tree.rerender(<StoryFilterBar {...baseProps} theme="music" />);

        expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.objectContaining(GLIDE));
        expect(lamp(tree).left).toBe('0%');
        expect(lamp(tree).transform).toEqual([{ translateX: 170 }]);

        tree.rerender(<StoryFilterBar {...baseProps} theme="stories" />);
        tree.rerender(<StoryFilterBar {...baseProps} theme="stories" />);

        expect(lamp(tree).transform).toEqual([{ translateX: 0 }]);
      });

      it('glides back the other way from a page that opened on Music', () => {
        const tree = render(<StoryFilterBar {...baseProps} theme="music" />);
        layTrack(tree, 340);

        tree.rerender(<StoryFilterBar {...baseProps} theme="stories" />);
        tree.rerender(<StoryFilterBar {...baseProps} theme="stories" />);

        expect(lamp(tree).left).toBe('50%');
        expect(lamp(tree).transform).toEqual([{ translateX: -170 }]);
      });

      it('moves across at once under Reduce Motion', () => {
        (useReducedMotion as jest.Mock).mockReturnValue(true);
        const tree = render(<StoryFilterBar {...baseProps} theme="stories" />);
        reanimated.withTiming.mockClear();

        tree.rerender(<StoryFilterBar {...baseProps} theme="music" />);

        expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 0 }));
      });

      it('glides in a calm beat, in step with the shelves changing beneath it', () => {
        expect(CHILD_UI_MOTION.themeGlide.duration).toBeGreaterThanOrEqual(200);
        expect(CHILD_UI_MOTION.themeGlide.duration).toBeLessThanOrEqual(360);
        expect(CHILD_UI_MOTION.themeGlide.reducedDuration).toBe(0);
      });
    });

    it('opens one pill deep below the capsule, with the gap the chooser keeps between its rows', () => {
      expect(filterDrawerDepth(false)).toBe(8 + FILTER_PILL_HEIGHT);
      expect(filterDrawerDepth(true)).toBe(SPACE_3 + FILTER_PILL_HEIGHT);
    });

    it('keeps the drawer shut and out of reach until Filter is pressed, then opens it over the drawer beat', () => {
      const drawer = { value: 0 };
      const tree = render(<StoryFilterBar {...baseProps} drawer={drawer as any} />);

      expect(look(tree, 'story-filter-drawer').height).toBe(0);
      expect(look(tree, 'story-filter-drawer').overflow).toBe('hidden');
      expect(node(tree, 'story-filter-drawer').props.pointerEvents).toBe('none');

      reanimated.withTiming.mockClear();
      pressFilter(tree);

      expect(reanimated.withTiming).toHaveBeenCalledWith(filterDrawerDepth(false), expect.objectContaining(OPEN), expect.any(Function));
      expect(drawer.value).toBe(filterDrawerDepth(false));
      tree.rerender(<StoryFilterBar {...baseProps} drawer={drawer as any} />);
      expect(look(tree, 'story-filter-drawer').height).toBe(filterDrawerDepth(false));
      expect(node(tree, 'story-filter-drawer').props.pointerEvents).toBe('auto');
    });

    it('closes the drawer again over the same beat when Filter is pressed a second time', () => {
      const drawer = { value: 0 };
      const tree = render(<StoryFilterBar {...baseProps} drawer={drawer as any} />);
      pressFilter(tree);
      reanimated.withTiming.mockClear();

      pressFilter(tree);

      expect(reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining(OPEN), expect.any(Function));
      expect(drawer.value).toBe(0);
      tree.rerender(<StoryFilterBar {...baseProps} drawer={drawer as any} />);
      expect(look(tree, 'story-filter-drawer').height).toBe(0);
    });

    it('opens and closes in a calm beat: slower than a tap, never long enough to wait for', () => {
      expect(CHILD_UI_MOTION.filterDrawer.duration).toBeGreaterThanOrEqual(200);
      expect(CHILD_UI_MOTION.filterDrawer.duration).toBeLessThanOrEqual(320);
      expect(CHILD_UI_MOTION.filterDrawer.reducedDuration).toBe(0);
    });

    it('moves at once under Reduce Motion', () => {
      (useReducedMotion as jest.Mock).mockReturnValue(true);
      const tree = render(<StoryFilterBar {...baseProps} />);
      reanimated.withTiming.mockClear();

      pressFilter(tree);

      const durations = reanimated.withTiming.mock.calls.map((call) => call[1].duration);
      expect(durations.length).toBeGreaterThan(0);
      expect(durations.every((duration) => duration === 0)).toBe(true);
    });

    it('holds the drawer open with no Filter press while a finer theme is chosen', () => {
      const drawer = { value: 0 };
      render(<StoryFilterBar {...baseProps} drawer={drawer as any} selectedTags={new Set<StoryFilterTag>(['animals'])} />);

      expect(drawer.value).toBe(filterDrawerDepth(false));
    });

    it('tells the page where its drawer has come to rest, once it is there and not while it moves', () => {
      const pending = holdAnimations();
      const onDrawerChange = jest.fn();
      const tree = render(<StoryFilterBar {...baseProps} onDrawerChange={onDrawerChange} />);
      const settle = (value: number, finished: boolean) =>
        act(() => pending.filter((animation) => animation.value === value).pop()!.finish(finished));

      pressFilter(tree);
      expect(onDrawerChange).not.toHaveBeenCalled();

      settle(filterDrawerDepth(false), false);
      expect(onDrawerChange).not.toHaveBeenCalled();

      settle(filterDrawerDepth(false), true);
      expect(onDrawerChange).toHaveBeenLastCalledWith(true);

      pressFilter(tree);
      expect(onDrawerChange).toHaveBeenCalledTimes(1);

      settle(0, true);
      expect(onDrawerChange).toHaveBeenLastCalledWith(false);
    });

    it('grows each pill out from nothing to its own width, the gap to the next pill included', () => {
      const tree = render(<StoryFilterBar {...baseProps} />);
      measure(tree, 'bedtime', 132);
      measure(tree, 'adventure', 150);
      tree.rerender(<StoryFilterBar {...baseProps} />);

      expect(look(tree, 'story-filter-slot-bedtime').width).toBe(0);
      expect(look(tree, 'story-filter-slot-bedtime').opacity).toBe(0);
      expect(look(tree, 'story-filter-slot-bedtime').overflow).toBe('hidden');

      reanimated.withTiming.mockClear();
      pressFilter(tree);
      tree.rerender(<StoryFilterBar {...baseProps} />);

      expect(look(tree, 'story-filter-slot-bedtime').width).toBe(132);
      expect(look(tree, 'story-filter-slot-bedtime').opacity).toBe(1);
      expect(look(tree, 'story-filter-slot-adventure').width).toBe(150);
      expect(StyleSheet.flatten(node(tree, 'story-filter-slot-size-bedtime').props.style).paddingRight).toBe(SPACE_3);
      expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.objectContaining(OPEN));
    });

    it('measures a pill at its full width however narrow its slot is drawn', () => {
      const tree = render(<StoryFilterBar {...baseProps} />);
      pressFilter(tree);

      let holder = node(tree, 'story-filter-slot-size-bedtime').parent!;
      while (!holder.props.style || holder.props.testID === 'story-filter-slot-size-bedtime') holder = holder.parent!;
      const row = StyleSheet.flatten(holder.props.style) as any;

      expect(row.flexDirection).toBe('row');
      expect(row.overflow).toBe('scroll');
    });

    it('keeps every pill ready behind the drawer, so opening it builds nothing while it moves', () => {
      const tree = render(<StoryFilterBar {...baseProps} />);
      const built = () => TAGS.map((tag) => pressables(tree, `story-filter-pill-${tag}`).length > 0);

      expect(built()).toEqual(TAGS.map(() => true));
      pressFilter(tree);
      expect(built()).toEqual(TAGS.map(() => true));
      pressFilter(tree);
      expect(built()).toEqual(TAGS.map(() => true));
    });

    it('shrinks each pill back to nothing over the drawer beat as it closes, and puts it out of reach at once', () => {
      const tree = render(<StoryFilterBar {...baseProps} />);
      measure(tree, 'bedtime', 132);
      pressFilter(tree);
      reanimated.withTiming.mockClear();

      pressFilter(tree);

      expect(reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining(OPEN));
      expect(node(tree, 'story-filter-slot-bedtime').props.pointerEvents).toBe('none');
      expect(node(tree, 'story-filter-slot-bedtime').props.accessibilityElementsHidden).toBe(true);
      tree.rerender(<StoryFilterBar {...baseProps} />);
      expect(look(tree, 'story-filter-slot-bedtime').width).toBe(0);
      expect(look(tree, 'story-filter-slot-bedtime').opacity).toBe(0);
    });

    it('closes down to the chosen pills only, and leaves the drawer open for them', () => {
      const drawer = { value: 0 };
      const chosen = new Set<StoryFilterTag>(['animals', 'adventure']);
      const props = { ...baseProps, drawer: drawer as any, selectedTags: chosen };
      const tree = render(<StoryFilterBar {...props} />);
      measure(tree, 'animals', 120);
      measure(tree, 'bedtime', 132);
      pressFilter(tree);

      pressFilter(tree);
      tree.rerender(<StoryFilterBar {...props} />);

      expect(drawer.value).toBe(filterDrawerDepth(false));
      expect(node(tree, 'story-filter-drawer').props.pointerEvents).toBe('auto');
      expect(node(tree, 'story-filter-slot-animals').props.pointerEvents).toBe('auto');
      expect(node(tree, 'story-filter-slot-adventure').props.pointerEvents).toBe('auto');
      expect(node(tree, 'story-filter-slot-bedtime').props.pointerEvents).toBe('none');
      expect(look(tree, 'story-filter-slot-animals').width).toBe(120);
      expect(look(tree, 'story-filter-slot-bedtime').width).toBe(0);
    });

    it('shows a chosen pill at its full size from the start, with no Filter press', () => {
      const tree = render(<StoryFilterBar {...baseProps} selectedTags={new Set<StoryFilterTag>(['animals'])} />);
      measure(tree, 'animals', 120);
      tree.rerender(<StoryFilterBar {...baseProps} selectedTags={new Set<StoryFilterTag>(['animals'])} />);

      expect(look(tree, 'story-filter-slot-animals').width).toBe(120);
      expect(look(tree, 'story-filter-slot-animals').opacity).toBe(1);
      expect(node(tree, 'story-filter-slot-animals').props.pointerEvents).toBe('auto');
    });

    it('starts a chosen pill open and every other pill shut, so nothing has to move as the page arrives', () => {
      reanimated.useSharedValue.mockClear();

      render(<StoryFilterBar {...baseProps} selectedTags={new Set<StoryFilterTag>(['animals', 'bedtime'])} />);

      const starts = reanimated.useSharedValue.mock.calls.map((call) => call[0]);
      expect(starts.filter((start) => start === 1)).toHaveLength(2);
      expect(starts.filter((start) => start !== 0 && start !== 1)).toHaveLength(0);
    });

    it('shrinks a chosen pill away and shuts the drawer when it is unchosen with the drawer closed', () => {
      const drawer = { value: 0 };
      const tree = render(<StoryFilterBar {...baseProps} drawer={drawer as any} selectedTags={new Set<StoryFilterTag>(['animals'])} />);
      measure(tree, 'animals', 120);

      tree.rerender(<StoryFilterBar {...baseProps} drawer={drawer as any} selectedTags={new Set<StoryFilterTag>()} />);
      tree.rerender(<StoryFilterBar {...baseProps} drawer={drawer as any} selectedTags={new Set<StoryFilterTag>()} />);

      expect(drawer.value).toBe(0);
      expect(look(tree, 'story-filter-slot-animals').width).toBe(0);
      expect(node(tree, 'story-filter-slot-animals').props.pointerEvents).toBe('none');
      expect(node(tree, 'story-filter-drawer').props.pointerEvents).toBe('none');
    });

    it('brings the row back to its start as it closes, so the chosen pills are not left off the edge', () => {
      const scrollTo = jest.fn();
      const createNodeMock = (element: any) =>
        element.props['data-testid'] === 'story-filter-pill-row'
          ? Object.defineProperty({}, 'scrollTo', { get: () => scrollTo, set: () => {} })
          : null;
      const tree = render(<StoryFilterBar {...baseProps} />, { createNodeMock });

      pressFilter(tree);
      expect(scrollTo).not.toHaveBeenCalled();

      pressFilter(tree);
      expect(scrollTo).toHaveBeenCalledWith({ x: 0, animated: true });

      (useReducedMotion as jest.Mock).mockReturnValue(true);
      pressFilter(tree);
      pressFilter(tree);
      expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
    });

    it('keeps the pill row one pill high whatever the drawer shows of it', () => {
      const tree = render(<StoryFilterBar {...baseProps} />);

      const row = look(tree, 'story-filter-pill-row');

      expect(row.height).toBe(FILTER_PILL_HEIGHT);
      expect(row.marginTop).toBe(8);
      expect(row.flexGrow).toBe(0);
      expect(row.flexShrink).toBe(0);
    });

    it('reports the height of its resting rows, not of the drawer beneath them', () => {
      const onRestLayout = jest.fn();
      const tree = render(<StoryFilterBar {...baseProps} onRestLayout={onRestLayout} />);
      const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 358, height: 98 } } };

      fireEvent(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-rest' && n.props.onLayout)[0], 'layout', layout);

      expect(onRestLayout).toHaveBeenCalledWith(layout);
      expect(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'story-filter-rest')[0].findAll((n: any) => n.props.testID === 'story-filter-drawer')).toHaveLength(0);
    });
  });
});
