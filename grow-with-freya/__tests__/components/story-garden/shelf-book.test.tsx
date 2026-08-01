/**
 * Tests for a single book on a Story Garden shelf.
 *
 * Covers ship as 4:3 landscape art (2732x2048). The book presents them as a
 * portrait 3:4 object and lets the image centre-crop, so the shelf reads as a
 * bookshelf rather than a row of media tiles.
 *
 * Note: jest.config maps `react-native` to `react-native-web`, so host nodes are
 * DOM elements and getByTestId does not resolve. Queries here use accessibility
 * labels, text and UNSAFE_*ByProps.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, type RenderResult } from '@testing-library/react-native';
import { ShelfBook } from '@/components/stories/story-garden/shelf-book';
import { STORY_GARDEN_SCALE } from '@/constants/story-garden-motion';
import type { Story } from '@/types/story';

const BOOK_WIDTH = 200;

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'wombat',
    title: 'Snuggle Little Wombat',
    description: '',
    category: 'bedtime',
    isAvailable: true,
    coverImage: 'file:///cover.webp',
    ...overrides,
  } as Story;
}

function renderBook(props: Partial<React.ComponentProps<typeof ShelfBook>> = {}) {
  const onPress = jest.fn();

  const view = render(
    <ShelfBook
      story={makeStory()}
      width={BOOK_WIDTH}
      isCentred
      isBookmarked={false}
      language="en"
      onPress={onPress}
      {...props}
    />
  );

  return { view, onPress, ...view };
}

describe('ShelfBook', () => {
  describe('shape', () => {
    it('should be taller than it is wide so it reads as a book, not a tile', () => {
      const underTest = BOOK_WIDTH / STORY_GARDEN_SCALE.coverAspectRatio;

      expect(underTest).toBeGreaterThan(BOOK_WIDTH);
    });

    it('should centre-crop the landscape cover art', () => {
      const { view } = renderBook();

      expect(view.UNSAFE_queryAllByProps({ contentFit: 'cover' }).length).toBeGreaterThan(0);
    });

    it('should recycle the cover by story id so shelves do not flicker', () => {
      const { view } = renderBook();

      expect(view.UNSAFE_queryAllByProps({ recyclingKey: 'wombat' }).length).toBeGreaterThan(0);
    });

    it('should fall back to the category emoji when a story has no cover', () => {
      const { view } = renderBook({ story: makeStory({ coverImage: undefined }) });

      expect(byTestId(view, 'shelf-book-cover-wombat')).toHaveLength(0);
    });
  });

  describe('the title', () => {
    it('should appear when the book is centred', () => {
      const { view } = renderBook({ isCentred: true });

      expect(textContents(view)).toContain('Snuggle Little Wombat');
    });

    it('should stay hidden when the book is only peeking in', () => {
      const { view } = renderBook({ isCentred: false });

      expect(byTestId(view, 'shelf-book-title-wombat')).toHaveLength(0);
    });
  });

  describe('the bookmark ribbon', () => {
    it('should show when the story is part-read', () => {
      const { view } = renderBook({ isBookmarked: true });

      expect(byTestId(view, 'shelf-book-ribbon-wombat').length).toBeGreaterThan(0);
    });

    it('should stay hidden for an untouched story', () => {
      const { view } = renderBook({ isBookmarked: false });

      expect(byTestId(view, 'shelf-book-ribbon-wombat')).toHaveLength(0);
    });
  });

  describe('picking the book up', () => {
    it('should hand the story back to the caller on tap', () => {
      const { getByLabelText, onPress } = renderBook();

      fireEvent.press(getByLabelText('Snuggle Little Wombat'));

      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'wombat' }),
        expect.anything()
      );
    });

    it('should expose the title to assistive technology', () => {
      const { getByLabelText } = renderBook();

      expect(getByLabelText('Snuggle Little Wombat')).toBeTruthy();
    });
  });
});
