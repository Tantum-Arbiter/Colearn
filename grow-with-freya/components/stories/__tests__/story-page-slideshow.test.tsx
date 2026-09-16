/**
 * Tests for StoryPageSlideshow -- the story card's cover, which turns to the
 * next page of the book every few seconds while the card is the one in front.
 *
 * Key behaviours tested:
 * 1. The card opens on the cover
 * 2. After the dwell the page turns and the next page is the one at rest
 * 3. The pages loop back round to the cover
 * 4. Only the card in front turns; a neighbour stays on its cover
 * 5. Swiping away resets the book to its cover, so it opens fresh next time
 * 6. A book with no page art never turns
 * 7. Leaving the card stops the clock
 * 8. With reduced motion on, the pages fade rather than turn
 * 9. A landed leaf lies flat again for the next turn; a turn cut short does not count as landed
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { StyleSheet, type ImageSourcePropType } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StoryPageSlideshow } from '@/components/stories/story-page-slideshow';
import { STORY_PAGE_PREVIEW } from '@/constants/story-page-preview';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { Story } from '@/types/story';

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

const mockReducedMotion = useReducedMotion as jest.Mock;

const art = (name: string) => ({ uri: `test://${name}` }) as unknown as string;

function makeStory(pageCount: number): Story {
  return {
    id: 'juni',
    title: 'Hold On, Juni',
    category: 'growing',
    isAvailable: true,
    coverImage: art('cover') as unknown as ImageSourcePropType,
    pages: Array.from({ length: pageCount }, (_, i) => ({
      id: `p${i + 1}`,
      pageNumber: i + 1,
      text: 'words',
      backgroundImage: art(`page-${i + 1}`),
    })),
  };
}

function restingPage(root: any): string | undefined {
  const pages = root.findAll((node: any) => node.props?.testID === 'story-page-preview-page' && node.props?.source !== undefined);
  return pages[0]?.props.source.uri;
}

function nodes(root: any, testID: string) {
  return root.findAll((node: any) => node.props?.testID === testID);
}

const size = { width: 300, height: 156 };

describe('StoryPageSlideshow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should open on the cover', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    expect(restingPage(UNSAFE_root)).toBe('test://cover');
  });

  it('should turn to the first page after the dwell', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
    });

    expect(restingPage(UNSAFE_root)).toBe('test://page-1');
  });

  it('should not turn before the dwell is up', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - 1);
    });

    expect(restingPage(UNSAFE_root)).toBe('test://cover');
  });

  it('should keep turning, one page per dwell, and come back round to the cover', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(2)} isCurrent {...size} />);
    const seen: (string | undefined)[] = [restingPage(UNSAFE_root)];

    for (let i = 0; i < 3; i += 1) {
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      seen.push(restingPage(UNSAFE_root));
    }

    expect(seen).toEqual(['test://cover', 'test://page-1', 'test://page-2', 'test://cover']);
  });

  it('should have the next page ready behind the leaf before it turns', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    const underTest = nodes(UNSAFE_root, 'story-page-preview-next').filter((node: any) => node.props.source !== undefined);

    expect(underTest.length).toBeGreaterThan(0);
    expect(underTest.every((node: any) => node.props.source.uri === 'test://page-1')).toBe(true);
  });

  it('should leave a neighbouring card on its cover, however long it waits', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent={false} {...size} />);

    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs * 5);
    });

    expect(restingPage(UNSAFE_root)).toBe('test://cover');
    expect(nodes(UNSAFE_root, 'story-page-preview-playing')).toHaveLength(0);
  });

  it('should go back to the cover when the child swipes to another book, and start afresh when they come back', () => {
    const { UNSAFE_root, rerender } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);
    for (let i = 0; i < 2; i += 1) {
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
    }
    expect(restingPage(UNSAFE_root)).toBe('test://page-2');

    rerender(<StoryPageSlideshow story={makeStory(3)} isCurrent={false} {...size} />);
    expect(restingPage(UNSAFE_root)).toBe('test://cover');

    rerender(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - 1);
    });
    expect(restingPage(UNSAFE_root)).toBe('test://cover');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(restingPage(UNSAFE_root)).toBe('test://page-1');
  });

  it('should never turn a book that has no page art', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(0)} isCurrent {...size} />);

    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs * 3);
    });

    expect(restingPage(UNSAFE_root)).toBe('test://cover');
    expect(nodes(UNSAFE_root, 'story-page-preview-playing')).toHaveLength(0);
  });

  it('should show nothing for a book with no cover and no pages', () => {
    const { toJSON } = render(<StoryPageSlideshow story={{ ...makeStory(0), coverImage: '' }} isCurrent {...size} />);

    expect(toJSON()).toBeNull();
  });

  it('should stop the clock when the card goes away', () => {
    const { unmount } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('should fade between pages rather than turn them when reduced motion is on', () => {
    mockReducedMotion.mockReturnValue(true);

    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    expect(nodes(UNSAFE_root, 'story-page-preview-fade').length).toBeGreaterThan(0);
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
    });
    expect(restingPage(UNSAFE_root)).toBe('test://page-1');
  });

  it('should turn the pages with a leaf that lifts at the spine', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    expect(nodes(UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
    expect(nodes(UNSAFE_root, 'story-page-preview-fade')).toHaveLength(0);
  });

  describe('the leaf between turns', () => {
    const animatedStyle = useAnimatedStyle as unknown as jest.Mock;
    const sharedValue = useSharedValue as unknown as jest.Mock;
    const timing = withTiming as unknown as jest.Mock;
    const settledTiming = timing.getMockImplementation();
    const freshSharedValue = sharedValue.getMockImplementation();

    beforeEach(() => {
      sharedValue.mockImplementation((initial: number) => React.useRef({ value: initial }).current);
    });

    afterEach(() => {
      animatedStyle.mockImplementation(() => ({}));
      sharedValue.mockImplementation(freshSharedValue);
      timing.mockImplementation(settledTiming);
    });

    it('should lie flat again once a turn has landed, ready to lift for the next', () => {
      animatedStyle.mockImplementation((worklet: () => unknown) => worklet());
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });

      const leaf = nodes(UNSAFE_root, 'story-page-preview-leaf')[0];
      const underTest = StyleSheet.flatten(leaf.props.style).transform;
      expect(restingPage(UNSAFE_root)).toBe('test://page-1');
      expect(underTest).toEqual(expect.arrayContaining([{ scaleX: 1 }]));
    });

    it('should not count a turn that was cut short as a page turned', () => {
      timing.mockImplementation((value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        callback?.(false);
        return value;
      });
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });

      expect(restingPage(UNSAFE_root)).toBe('test://cover');
    });
  });
});
