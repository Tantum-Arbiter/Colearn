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
import { STORY_PAGE_PREVIEW, cornerPose } from '@/constants/story-page-preview';
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
  const bases = root.findAll((node: any) => node.props?.testID === 'story-page-preview-base' && node.props?.source !== undefined && node.props?.style !== undefined);
  if (bases.length > 0) {
    return bases[bases.length - 1].props.source.uri;
  }
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
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs);
    });

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
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs);
    });

    expect(nodes(UNSAFE_root, 'story-page-preview-fade').length).toBeGreaterThan(0);
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.prepareMs);
    });
    expect(restingPage(UNSAFE_root)).toBe('test://page-1');
  });

  it('should open light: no strips are built until shortly before the first turn, so the card can rise smoothly', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    expect(nodes(UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
    expect(nodes(UNSAFE_root, 'story-page-preview-strip')).toHaveLength(0);
    expect(restingPage(UNSAFE_root)).toBe('test://cover');

    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs - 1);
    });
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(nodes(UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
    expect(nodes(UNSAFE_root, 'story-page-preview-still').length).toBeGreaterThan(0);
  });

  it('should take the strips down again once a turn has landed, so nothing heavy sits under the resting page', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
    });

    expect(restingPage(UNSAFE_root)).toBe('test://page-1');
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
  });

  it('should give the strips a moment to load before the turn', () => {
    expect(STORY_PAGE_PREVIEW.prepareMs).toBeGreaterThanOrEqual(400);
    expect(STORY_PAGE_PREVIEW.prepareMs).toBeLessThan(STORY_PAGE_PREVIEW.dwellMs);
  });

  it('should turn the pages with a leaf drawn as strips, so it can bend like paper', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs);
    });

    const strips = nodes(UNSAFE_root, 'story-page-preview-strip');
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
    expect(strips).toHaveLength(STORY_PAGE_PREVIEW.curl.strips);
    expect(nodes(UNSAFE_root, 'story-page-preview-fade')).toHaveLength(0);
  });

  it('should give every strip its slice of the page in front and of the next page on its back', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs);
    });
    const half = size.width / 2;
    const stripWidth = half / STORY_PAGE_PREVIEW.curl.strips;

    const strips = nodes(UNSAFE_root, 'story-page-preview-strip');
    const underTest = strips.map((strip: any, index: number) => {
      const images = strip.findAll((node: any) => node.props?.source !== undefined && node.props?.style !== undefined && node.props?.testID?.startsWith('story-page-preview-'));
      const front = images.find((node: any) => node.props.testID === 'story-page-preview-page');
      const back = images.find((node: any) => node.props.testID === 'story-page-preview-next');
      return {
        front: front.props.source.uri,
        frontLeft: StyleSheet.flatten(front.props.style).left,
        back: back.props.source.uri,
        backLeft: StyleSheet.flatten(back.props.style).left,
        expectedFrontLeft: -(half + index * stripWidth),
        expectedBackLeft: (index + 1) * stripWidth + (index === strips.length - 1 ? 0 : STORY_PAGE_PREVIEW.curl.overlap) - half,
      };
    });

    expect(underTest.every((s: any) => s.front === 'test://cover' && s.back === 'test://page-1')).toBe(true);
    expect(underTest.every((s: any) => Math.abs(s.frontLeft - s.expectedFrontLeft) < 1e-9)).toBe(true);
    expect(underTest.every((s: any) => Math.abs(s.backLeft - s.expectedBackLeft) < 1e-9)).toBe(true);
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
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs);
      });

      const strips = nodes(UNSAFE_root, 'story-page-preview-strip');
      const underTest = strips.map((strip: any) => StyleSheet.flatten(strip.props.style).transform);
      expect(restingPage(UNSAFE_root)).toBe('test://page-1');
      expect(underTest.length).toBeGreaterThan(0);
      expect(underTest.every((transform: unknown[]) => JSON.stringify(transform) === JSON.stringify([{ translateX: 0 }, { skewX: '0deg' }, { scaleX: 1 }]))).toBe(true);
    });

    it('should lay every strip where the fold puts it half-way through a turn', () => {
      animatedStyle.mockImplementation((worklet: () => unknown) => worklet());
      timing.mockImplementation(() => 0.5);
      const half = size.width / 2;
      const stripWidth = half / STORY_PAGE_PREVIEW.curl.strips;
      const story = makeStory(3);
      const { UNSAFE_root, rerender } = render(<StoryPageSlideshow story={story} isCurrent {...size} />);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      rerender(<StoryPageSlideshow story={story} isCurrent {...size} />);

      const strips = nodes(UNSAFE_root, 'story-page-preview-strip');
      const underTest = strips.map((strip: any, index: number) => {
        const transform = StyleSheet.flatten(strip.props.style).transform as ({ translateX: number } | { skewX: string } | { scaleX: number })[];
        const overlap = index === strips.length - 1 ? 0 : STORY_PAGE_PREVIEW.curl.overlap;
        const expected = cornerPose(index * stripWidth, (index + 1) * stripWidth + overlap, 0.5, half, size.height);
        return JSON.stringify(transform) === JSON.stringify([{ translateX: expected.translateX }, { skewX: expected.skewX }, { scaleX: expected.scaleX }]);
      });
      expect(underTest).toHaveLength(STORY_PAGE_PREVIEW.curl.strips);
      expect(underTest.every(Boolean)).toBe(true);
      expect(strips.some((strip: any) => (StyleSheet.flatten(strip.props.style).transform[0] as { translateX: number }).translateX < 0)).toBe(true);
      expect(strips.some((strip: any) => (StyleSheet.flatten(strip.props.style).transform[1] as { skewX: string }).skewX !== '0deg')).toBe(true);
    });

    it('should tint a strip only as much of it as shows, so the standing leaf never reads as a dark wedge', () => {
      animatedStyle.mockImplementation((worklet: () => unknown) => worklet());
      timing.mockImplementation(() => 0.65);
      const story = makeStory(3);
      const { UNSAFE_root, rerender } = render(<StoryPageSlideshow story={story} isCurrent {...size} />);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      rerender(<StoryPageSlideshow story={story} isCurrent {...size} />);

      const strips = nodes(UNSAFE_root, 'story-page-preview-strip');
      const alphaOf = (strip: any) => {
        const tint = strip.findAll((node: any) => node.props?.testID === 'story-page-preview-tint')[0];
        return Number(String(StyleSheet.flatten(tint.props.style).backgroundColor).split(',').pop()!.replace(')', ''));
      };
      const { shade, presenceGain } = STORY_PAGE_PREVIEW.curl;
      const widthOf = (strip: any) => Math.abs((StyleSheet.flatten(strip.props.style).transform[2] as { scaleX: number }).scaleX);
      const narrowAndTinted = strips.filter((strip: any) => widthOf(strip) * presenceGain < 0.9 && alphaOf(strip) > 0);

      expect(strips.every((strip: any) => alphaOf(strip) <= shade * Math.min(1, widthOf(strip) * presenceGain) + 1e-6)).toBe(true);
      expect(narrowAndTinted.length).toBeGreaterThan(0);
      expect(narrowAndTinted.every((strip: any) => alphaOf(strip) < shade)).toBe(true);
    });

    it('should fade a strip over to its back face rather than switch, so no strip pops as it passes upright', () => {
      animatedStyle.mockImplementation((worklet: () => unknown) => worklet());
      timing.mockImplementation(() => 0.65);
      const story = makeStory(3);
      const { UNSAFE_root, rerender } = render(<StoryPageSlideshow story={story} isCurrent {...size} />);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      rerender(<StoryPageSlideshow story={story} isCurrent {...size} />);

      const backs: number[] = nodes(UNSAFE_root, 'story-page-preview-back').map((node: any) => StyleSheet.flatten(node.props.style).opacity as number);
      const underTest = backs.filter((opacity) => opacity > 0.05 && opacity < 0.95);

      expect(backs.length).toBe(STORY_PAGE_PREVIEW.curl.strips);
      expect(underTest.length).toBeGreaterThan(0);
      expect(backs.every((opacity) => opacity >= 0 && opacity <= 1)).toBe(true);
    });

    it('should cover the freshly staged strips with a plain still of the page, and lift it only once the turn begins', () => {
      timing.mockImplementation(() => 0.5);
      const story = makeStory(3);
      const { UNSAFE_root } = render(<StoryPageSlideshow story={story} isCurrent {...size} />);
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs);
      });
      const staged = nodes(UNSAFE_root, 'story-page-preview-still').filter((node: any) => node.props.source !== undefined);
      expect(staged.length).toBeGreaterThan(0);
      expect(staged.every((node: any) => node.props.source.uri === 'test://cover')).toBe(true);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.prepareMs);
      });

      expect(nodes(UNSAFE_root, 'story-page-preview-still')).toHaveLength(0);
    });

    it('should still turn when the stage is mounted ahead of the turn: staging must not cancel the turn itself', () => {
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs);
      });
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.prepareMs);
      });

      expect(restingPage(UNSAFE_root)).toBe('test://page-1');
    });

    it('should keep loaded stills beneath the stage, this page on top of the next, so a landing reveals the page that was already showing', () => {
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

      const bases = nodes(UNSAFE_root, 'story-page-preview-base').filter((node: any) => node.type?.displayName === 'MockExpoImage').map((node: any) => node.props.source.uri);

      expect(bases).toEqual(['test://page-1', 'test://cover']);
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.prepareMs);
      });
      const playing = nodes(UNSAFE_root, 'story-page-preview-playing')[0];
      const order = playing.findAll((node: any) => node.props?.testID === 'story-page-preview-base' || node.props?.testID === 'story-page-preview-leaf').map((node: any) => node.props.testID);
      expect(order.indexOf('story-page-preview-leaf')).toBeGreaterThan(order.lastIndexOf('story-page-preview-base'));
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
