/**
 * Tests for the Story Garden shelf.
 *
 * The shelf replaces the free-scrolling genre carousel. A short drag must move
 * exactly one book, one book sits centred, and its neighbours only peek in.
 *
 * Note: these live in __tests__/components/story-garden/ rather than
 * __tests__/components/stories/ because jest.config.js skips the latter in CI.
 * jest.config also maps `react-native` to `react-native-web`, so host nodes are
 * DOM elements and getByTestId does not resolve; queries use UNSAFE_*ByProps.
 */

import React from 'react';
import { FlatList, Text } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import {
  StoryShelf,
  SHELF_GAP,
  computeCentredIndex,
  computeShelfSidePadding,
} from '@/components/stories/story-garden/story-shelf';
import { getStoryPlace } from '@/constants/story-places';
import type { Story } from '@/types/story';

const BOOK_WIDTH = 200;
const CONTAINER_WIDTH = 390;
const ITEM_PITCH = BOOK_WIDTH + SHELF_GAP;

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function makeStory(id: string): Story {
  return {
    id,
    title: `Story ${id}`,
    description: '',
    category: 'bedtime',
    isAvailable: true,
  } as Story;
}

function renderShelf(stories: Story[], bookmarkedStoryId: string | null = null) {
  return render(
    <StoryShelf
      place={getStoryPlace('moonlit-stories')}
      stories={stories}
      containerWidth={CONTAINER_WIDTH}
      bookWidth={BOOK_WIDTH}
      bookmarkedStoryId={bookmarkedStoryId}
      language="en"
      onSelectBook={jest.fn()}
    />
  );
}

describe('computeCentredIndex', () => {
  it.each([
    [0, 0],
    [ITEM_PITCH * 0.4, 0],
    [ITEM_PITCH * 0.6, 1],
    [ITEM_PITCH, 1],
    [ITEM_PITCH * 2, 2],
  ])('should map offset %p to index %p', (offset, expected) => {
    const underTest = computeCentredIndex(offset, ITEM_PITCH, 5);

    expect(underTest).toBe(expected);
  });

  it('should stop at the last book rather than running past it', () => {
    const underTest = computeCentredIndex(ITEM_PITCH * 99, ITEM_PITCH, 3);

    expect(underTest).toBe(2);
  });

  it('should never return a negative index when overscrolled', () => {
    const underTest = computeCentredIndex(-500, ITEM_PITCH, 3);

    expect(underTest).toBe(0);
  });

  it('should return zero for an empty shelf', () => {
    const underTest = computeCentredIndex(0, ITEM_PITCH, 0);

    expect(underTest).toBe(0);
  });
});

describe('computeShelfSidePadding', () => {
  it('should centre the first book in the container', () => {
    const underTest = computeShelfSidePadding(CONTAINER_WIDTH, BOOK_WIDTH);

    expect(underTest).toBe((CONTAINER_WIDTH - BOOK_WIDTH) / 2);
  });

  it('should not go negative when the book is wider than the container', () => {
    const underTest = computeShelfSidePadding(200, 400);

    expect(underTest).toBe(0);
  });
});

describe('StoryShelf', () => {
  describe('rendering', () => {
    it('should render one book per story', () => {
      const view = renderShelf([makeStory('a'), makeStory('b'), makeStory('c')]);

      expect(byTestId(view, 'shelf-book-a').length).toBeGreaterThan(0);
      expect(byTestId(view, 'shelf-book-b').length).toBeGreaterThan(0);
      expect(byTestId(view, 'shelf-book-c').length).toBeGreaterThan(0);
    });

    it('should show the place name as a translation key', () => {
      const view = renderShelf([makeStory('a')]);

      expect(textContents(view)).toContain('storyGarden.places.moonlitStories');
    });

    it('should render nothing for an empty place rather than a blank shelf', () => {
      const view = renderShelf([]);

      expect(byTestId(view, 'story-shelf-moonlit-stories')).toHaveLength(0);
    });
  });

  describe('snap scrolling', () => {
    it('should snap by exactly one book pitch', () => {
      const view = renderShelf([makeStory('a'), makeStory('b')]);

      expect(view.UNSAFE_getByType(FlatList).props.snapToInterval).toBe(ITEM_PITCH);
    });

    it('should use fast deceleration so the shelf does not drift', () => {
      const view = renderShelf([makeStory('a'), makeStory('b')]);

      expect(view.UNSAFE_getByType(FlatList).props.decelerationRate).toBe('fast');
    });

    it('should disable interval momentum so one drag never skips two books', () => {
      const view = renderShelf([makeStory('a'), makeStory('b')]);

      expect(view.UNSAFE_getByType(FlatList).props.disableIntervalMomentum).toBe(true);
    });

    it('should pad the sides so the first book starts centred', () => {
      const view = renderShelf([makeStory('a'), makeStory('b')]);

      expect(view.UNSAFE_getByType(FlatList).props.contentContainerStyle).toEqual({
        paddingHorizontal: computeShelfSidePadding(CONTAINER_WIDTH, BOOK_WIDTH),
      });
    });
  });

  describe('the centred book', () => {
    it('should title only the centred book', () => {
      const view = renderShelf([makeStory('a'), makeStory('b')]);

      expect(byTestId(view, 'shelf-book-title-a').length).toBeGreaterThan(0);
      expect(byTestId(view, 'shelf-book-title-b')).toHaveLength(0);
    });
  });

  describe('the bookmark', () => {
    it('should ribbon only the book that is part-read', () => {
      const view = renderShelf([makeStory('a'), makeStory('b')], 'b');

      expect(byTestId(view, 'shelf-book-ribbon-b').length).toBeGreaterThan(0);
      expect(byTestId(view, 'shelf-book-ribbon-a')).toHaveLength(0);
    });
  });
});
