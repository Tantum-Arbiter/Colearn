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
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StoryPageSlideshow } from '@/components/stories/story-page-slideshow';
import { STORY_PAGE_PREVIEW, cornerPose } from '@/constants/story-page-preview';
import { STORY_DETAIL_OPENING } from '@/constants/story-opening';
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
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
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
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
    });

    expect(nodes(UNSAFE_root, 'story-page-preview-fade').length).toBeGreaterThan(0);
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.readyMs);
    });
    expect(restingPage(UNSAFE_root)).toBe('test://page-1');
  });

  it('should open light: no strips are built while the card rises, and then a leaf stands ready under a still of the cover, long before the first turn', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    expect(nodes(UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
    expect(nodes(UNSAFE_root, 'story-page-preview-strip')).toHaveLength(0);
    expect(restingPage(UNSAFE_root)).toBe('test://cover');

    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs - 1);
    });
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(nodes(UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
    expect(nodes(UNSAFE_root, 'story-page-preview-still').length).toBeGreaterThan(0);
    expect(restingPage(UNSAFE_root)).toBe('test://cover');
  });

  it('should stand a fresh leaf ready under a still of the page as soon as a turn lands, so a page picked between turns can turn at once', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
    });

    expect(restingPage(UNSAFE_root)).toBe('test://page-1');
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
    const still = nodes(UNSAFE_root, 'story-page-preview-still').filter((node: any) => node.props.source !== undefined);
    expect(still.length).toBeGreaterThan(0);
    expect(still.every((node: any) => node.props.source.uri === 'test://page-1')).toBe(true);
  });

  it('should build the leaf only once the card has risen and its words have come in, and still leave its pictures time to load before the first turn', () => {
    const { readyMs, dwellMs } = STORY_PAGE_PREVIEW;

    expect(readyMs).toBeGreaterThan(STORY_DETAIL_OPENING.sheetRiseMs);
    expect(readyMs).toBeGreaterThan(STORY_DETAIL_OPENING.staggerMs * 2 + STORY_DETAIL_OPENING.contentMs);
    expect(dwellMs - readyMs).toBeGreaterThanOrEqual(400);
  });

  it('should turn the pages with a leaf drawn as strips, so it can bend like paper', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
    });

    const strips = nodes(UNSAFE_root, 'story-page-preview-strip');
    expect(nodes(UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
    expect(strips).toHaveLength(STORY_PAGE_PREVIEW.curl.strips);
    expect(nodes(UNSAFE_root, 'story-page-preview-fade')).toHaveLength(0);
  });

  it('should give every strip its slice of the page in front and of the next page on its back', () => {
    const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);
    act(() => {
      jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
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

  describe('a page the child picked to start from', () => {
    const picked = (heldPage: number | null, pages = 4) => <StoryPageSlideshow story={makeStory(pages)} isCurrent heldPage={heldPage} {...size} />;
    const timing = withTiming as unknown as jest.Mock;
    const landAtOnce = timing.getMockImplementation();
    let land: (() => void) | null = null;
    const stallTurns = () => {
      timing.mockImplementation((value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        land = callback ? () => callback(true) : null;
        return value;
      });
    };

    const sharedValue = useSharedValue as unknown as jest.Mock;
    const freshSharedValue = sharedValue.getMockImplementation();
    const pinSharedValues = () => sharedValue.mockImplementation((initial: number) => React.useRef({ value: initial }).current);
    const easing = Easing as unknown as Record<'cubic' | 'sin' | 'out' | 'inOut', jest.Mock>;
    const realCurves = () => {
      easing.cubic.mockImplementation((t: number) => t * t * t);
      easing.sin.mockImplementation((t: number) => 1 - Math.cos((t * Math.PI) / 2));
      easing.out.mockImplementation((curve: (t: number) => number) => (t: number) => 1 - curve(1 - t));
      easing.inOut.mockImplementation((curve: (t: number) => number) => (t: number) => (t < 0.5 ? curve(t * 2) / 2 : 1 - curve((1 - t) * 2) / 2));
    };
    const lastTurn = () => timing.mock.calls[timing.mock.calls.length - 1][1] as { duration: number; easing: (t: number) => number };

    afterEach(() => {
      timing.mockImplementation(landAtOnce);
      sharedValue.mockImplementation(freshSharedValue);
      Object.values(easing).forEach((curve) => curve.mockImplementation(() => undefined));
      land = null;
    });

    it('should turn to the picked page at once, with the same leaf as the automatic turn, then rest there', () => {
      const view = render(picked(null));
      expect(restingPage(view.UNSAFE_root)).toBe('test://cover');
      stallTurns();

      view.rerender(picked(2));

      expect(nodes(view.UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-still')).toHaveLength(0);
      expect(restingPage(view.UNSAFE_root)).toBe('test://cover');

      act(() => land!());

      expect(restingPage(view.UNSAFE_root)).toBe('test://page-3');
      expect(nodes(view.UNSAFE_root, 'story-page-preview-held').length).toBeGreaterThan(0);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-playing')).toHaveLength(0);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
    });

    it('should not wait for the next automatic turn, nor for the strips to be readied first', () => {
      const view = render(picked(null));
      stallTurns();

      view.rerender(picked(2));

      expect(timing).toHaveBeenCalled();
      expect(nodes(view.UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
    });

    it('should turn no more once it rests on the picked page, however long it waits', () => {
      pinSharedValues();
      const view = render(picked(2));
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-3');
      stallTurns();
      const turned = timing.mock.calls.length;

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs * 3);
      });

      expect(timing.mock.calls.length).toBe(turned);
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-3');
      expect(nodes(view.UNSAFE_root, 'story-page-preview-still').length).toBeGreaterThan(0);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-fade')).toHaveLength(0);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-held').length).toBeGreaterThan(0);
    });

    it('should turn a page picked once the card has risen on the leaf already standing there, building nothing at the tap', () => {
      const view = render(picked(null));
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
      });
      const standing = nodes(view.UNSAFE_root, 'story-page-preview-leaf')[0];
      expect(standing).toBeDefined();
      stallTurns();

      view.rerender(picked(2));

      expect(nodes(view.UNSAFE_root, 'story-page-preview-leaf')[0]).toBe(standing);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-still')).toHaveLength(0);
      expect(timing).toHaveBeenCalled();
      act(() => land!());
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-3');
    });

    it('should draw the half beneath the leaf afresh for a picked page, so it never shows the page readied for the clock, even for a frame', () => {
      const view = render(picked(null));
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
      });
      const under = () => nodes(view.UNSAFE_root, 'story-page-preview-under').filter((node: any) => node.props.source !== undefined)[0];
      const readied = under();
      expect(readied.props.source.uri).toBe('test://page-1');
      stallTurns();

      view.rerender(picked(2));

      expect(under().props.source.uri).toBe('test://page-3');
      expect(under()).not.toBe(readied);
    });

    it('should set a picked page moving at once, on the same leaf and in the same time, where the automatic turn lifts its leaf slowly', () => {
      realCurves();
      const view = render(picked(null));
      stallTurns();
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      const clock = lastTurn();
      act(() => land!());
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-1');

      view.rerender(picked(2));

      const pick = lastTurn();
      const tenthOfASecond = 100 / STORY_PAGE_PREVIEW.turnMs;
      expect(pick.duration).toBe(clock.duration);
      expect(clock.easing(tenthOfASecond)).toBeLessThan(0.005);
      expect(pick.easing(tenthOfASecond)).toBeGreaterThan(0.05);
      expect(pick.easing(0)).toBeCloseTo(0, 9);
      expect(pick.easing(1)).toBeCloseTo(1, 9);
      expect(pick.easing(0.25)).toBeLessThan(0.5);
      expect(pick.easing(0.95)).toBeGreaterThan(0.99);
    });

    it('should keep the automatic turn`s gentle lift for the clock', () => {
      realCurves();
      render(picked(null));
      stallTurns();

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });

      const clock = lastTurn();
      expect(clock.duration).toBe(STORY_PAGE_PREVIEW.turnMs);
      expect(clock.easing(0.25)).toBeCloseTo(0.0625, 9);
      expect(clock.easing(0.75)).toBeCloseTo(0.9375, 9);
    });

    it('should turn again, at once, to another page the child picks instead', () => {
      const view = render(picked(1));
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-2');
      stallTurns();

      view.rerender(picked(3));

      expect(nodes(view.UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
      act(() => land!());
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-4');
    });

    it('should carry a turn already under way on to the picked page instead of where it was going, without starting it over', () => {
      pinSharedValues();
      const view = render(picked(null));
      stallTurns();
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      expect(nodes(view.UNSAFE_root, 'story-page-preview-leaf').length).toBeGreaterThan(0);
      const started = timing.mock.calls.length;

      view.rerender(picked(3));

      expect(timing.mock.calls.length).toBe(started);
      act(() => land!());

      expect(restingPage(view.UNSAFE_root)).toBe('test://page-4');
      expect(nodes(view.UNSAFE_root, 'story-page-preview-held').length).toBeGreaterThan(0);
    });

    it('should let the leaf fall straight back when the child picks the page it is turning away from, and rest there', () => {
      pinSharedValues();
      realCurves();
      const view = render(picked(null));
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-1');
      stallTurns();
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      const forward = timing.mock.calls.length;

      view.rerender(picked(0));

      expect(timing.mock.calls.length).toBe(forward + 1);
      expect(timing.mock.calls[forward][0]).toBe(0);
      expect(lastTurn().easing(100 / STORY_PAGE_PREVIEW.turnMs)).toBeGreaterThan(0.05);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-playing').length).toBeGreaterThan(0);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-held')).toHaveLength(0);
      act(() => land!());

      expect(restingPage(view.UNSAFE_root)).toBe('test://page-1');
      expect(nodes(view.UNSAFE_root, 'story-page-preview-held').length).toBeGreaterThan(0);
      const rested = timing.mock.calls.length;
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs * 2);
      });
      expect(timing.mock.calls.length).toBe(rested);
    });

    it('should take the leaf forward again to another page picked while it falls back', () => {
      pinSharedValues();
      const view = render(picked(null));
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      stallTurns();
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      view.rerender(picked(0));
      const fallingBack = timing.mock.calls.length;

      view.rerender(picked(3));

      expect(timing.mock.calls.length).toBe(fallingBack + 1);
      expect(timing.mock.calls[fallingBack][0]).toBe(1);
      act(() => land!());
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-4');
      expect(nodes(view.UNSAFE_root, 'story-page-preview-held').length).toBeGreaterThan(0);
    });

    it('should take only the rest of the way back, not a whole turn, when the leaf falls back part-way through', () => {
      const sharedValue = useSharedValue as unknown as jest.Mock;
      sharedValue.mockImplementation((initial: number) => React.useRef({ value: initial }).current);
      const view = render(picked(null));
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      let partWay = 0.4;
      timing.mockImplementation((value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        land = callback ? () => callback(true) : null;
        return partWay;
      });
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
      });
      partWay = 0;

      view.rerender(picked(0));

      expect(lastTurn().duration).toBeCloseTo(STORY_PAGE_PREVIEW.turnMs * 0.4, 6);
    });

    it('should turn at once to a page picked while the leaf stands ready for the automatic turn, and turn no further', () => {
      pinSharedValues();
      const view = render(picked(null));
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - 1);
      });
      expect(nodes(view.UNSAFE_root, 'story-page-preview-still').length).toBeGreaterThan(0);

      view.rerender(picked(3));

      expect(restingPage(view.UNSAFE_root)).toBe('test://page-4');
      stallTurns();
      const turned = timing.mock.calls.length;
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs * 2);
      });
      expect(timing.mock.calls.length).toBe(turned);
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-4');
      expect(nodes(view.UNSAFE_root, 'story-page-preview-still').length).toBeGreaterThan(0);
    });

    it('should still land on the picked page when the card draws again during the turn, without starting the turn over', () => {
      pinSharedValues();
      const view = render(picked(null));
      stallTurns();
      view.rerender(picked(2));
      const started = timing.mock.calls.length;

      view.rerender(picked(2));
      view.rerender(picked(2));
      expect(timing.mock.calls.length).toBe(started);
      act(() => land!());

      expect(restingPage(view.UNSAFE_root)).toBe('test://page-3');
      expect(nodes(view.UNSAFE_root, 'story-page-preview-held').length).toBeGreaterThan(0);
    });

    describe('the way the leaf turns', () => {
      const stageOf = (root: any) => nodes(root, 'story-page-preview-stage')[0];
      const mirrored = (node: any) => JSON.stringify(StyleSheet.flatten(node.props.style)?.transform ?? []) === JSON.stringify([{ scaleX: -1 }]);
      const picturesIn = (stage: any) => stage.findAll((node: any) => node.type?.displayName === 'MockExpoImage');

      it('should turn back from the left, every picture the right way round, when the child picks an earlier page', () => {
        const view = render(picked(3));
        expect(restingPage(view.UNSAFE_root)).toBe('test://page-4');
        stallTurns();

        view.rerender(picked(1));

        const stage = stageOf(view.UNSAFE_root);
        expect(mirrored(stage)).toBe(true);
        expect(picturesIn(stage).length).toBeGreaterThan(0);
        expect(picturesIn(stage).every(mirrored)).toBe(true);
        act(() => land!());
        expect(restingPage(view.UNSAFE_root)).toBe('test://page-2');
      });

      it('should turn forward from the right when the child picks a later page', () => {
        const view = render(picked(1));
        stallTurns();

        view.rerender(picked(3));

        const stage = stageOf(view.UNSAFE_root);
        expect(mirrored(stage)).toBe(false);
        expect(picturesIn(stage).some(mirrored)).toBe(false);
      });

      it('should stand the next leaf ready the forward way once a turn back has landed', () => {
        const view = render(picked(3));
        stallTurns();
        view.rerender(picked(1));
        act(() => land!());

        act(() => {
          jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
        });

        expect(mirrored(stageOf(view.UNSAFE_root))).toBe(false);
      });

      it('should keep the automatic flicking turning forward, even from the last page round to the cover', () => {
        const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(2)} isCurrent {...size} />);
        for (let i = 0; i < 2; i += 1) {
          act(() => {
            jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
          });
        }
        expect(restingPage(UNSAFE_root)).toBe('test://page-2');
        stallTurns();

        act(() => {
          jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
        });

        expect(nodes(UNSAFE_root, 'story-page-preview-still')).toHaveLength(0);
        expect(mirrored(stageOf(UNSAFE_root))).toBe(false);
        act(() => land!());
        expect(restingPage(UNSAFE_root)).toBe('test://cover');
      });

      it('should carry an automatic turn already under way on the way it was going when an earlier page is picked', () => {
        pinSharedValues();
        const view = render(picked(null));
        for (let i = 0; i < 2; i += 1) {
          act(() => {
            jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
          });
        }
        expect(restingPage(view.UNSAFE_root)).toBe('test://page-2');
        stallTurns();
        act(() => {
          jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
        });

        view.rerender(picked(0));

        expect(mirrored(stageOf(view.UNSAFE_root))).toBe(false);
        act(() => land!());
        expect(restingPage(view.UNSAFE_root)).toBe('test://page-1');
      });
    });

    describe('telling the card a picked turn is under way', () => {
      const reported = (onPickTurning: jest.Mock) => onPickTurning.mock.calls.map(([turning]) => turning);
      const reporting = (heldPage: number | null, onPickTurning: jest.Mock) => (
        <StoryPageSlideshow story={makeStory(4)} isCurrent heldPage={heldPage} onPickTurning={onPickTurning} {...size} />
      );

      it('should say so as the turn to a picked page begins, and again as it lands', () => {
        const onPickTurning = jest.fn();
        const view = render(reporting(null, onPickTurning));
        stallTurns();

        view.rerender(reporting(2, onPickTurning));
        expect(reported(onPickTurning)).toEqual([true]);
        act(() => land!());

        expect(reported(onPickTurning)).toEqual([true, false]);
      });

      it('should tell whichever listener the card gave it last', () => {
        const first = jest.fn();
        const latest = jest.fn();
        const view = render(reporting(null, first));
        view.rerender(reporting(null, latest));
        stallTurns();

        view.rerender(reporting(2, latest));

        expect(first).not.toHaveBeenCalled();
        expect(reported(latest)).toEqual([true]);
      });

      it('should say nothing for the turns the cover makes by itself', () => {
        const onPickTurning = jest.fn();
        render(reporting(null, onPickTurning));
        stallTurns();

        act(() => {
          jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
        });
        act(() => land!());

        expect(onPickTurning).not.toHaveBeenCalled();
      });

      it('should count a turn already under way that a pick takes over as the picked turn', () => {
        pinSharedValues();
        const onPickTurning = jest.fn();
        const view = render(reporting(null, onPickTurning));
        stallTurns();
        act(() => {
          jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
        });

        view.rerender(reporting(3, onPickTurning));
        expect(reported(onPickTurning)).toEqual([true]);
        act(() => land!());

        expect(reported(onPickTurning)).toEqual([true, false]);
      });

      it('should count a leaf falling back to the page it was leaving as the picked turn', () => {
        pinSharedValues();
        const onPickTurning = jest.fn();
        const view = render(reporting(null, onPickTurning));
        act(() => {
          jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
        });
        stallTurns();
        act(() => {
          jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
        });

        view.rerender(reporting(0, onPickTurning));
        expect(reported(onPickTurning)).toEqual([true]);
        act(() => land!());

        expect(reported(onPickTurning)).toEqual([true, false]);
      });

      it('should say the turn is over when the cover goes away part-way through it', () => {
        const onPickTurning = jest.fn();
        const view = render(reporting(null, onPickTurning));
        stallTurns();
        view.rerender(reporting(2, onPickTurning));

        view.rerender(<StoryPageSlideshow story={makeStory(4)} isCurrent={false} heldPage={2} onPickTurning={onPickTurning} {...size} />);

        expect(reported(onPickTurning)).toEqual([true, false]);
      });

      it('should say nothing when the picked page is the one already showing', () => {
        const onPickTurning = jest.fn();
        const view = render(reporting(2, onPickTurning));
        onPickTurning.mockClear();
        stallTurns();

        view.rerender(reporting(2, onPickTurning));

        expect(onPickTurning).not.toHaveBeenCalled();
      });

      it('should say so for a fade under Reduce Motion too', () => {
        mockReducedMotion.mockReturnValue(true);
        const onPickTurning = jest.fn();
        const view = render(reporting(null, onPickTurning));
        stallTurns();

        view.rerender(reporting(2, onPickTurning));
        act(() => land!());

        expect(reported(onPickTurning)).toEqual([true, false]);
      });
    });

    it('should stay on the cover, turning nothing, when the picked page has no picture of its own', () => {
      const view = render(picked(9, 2));

      expect(nodes(view.UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
      expect(restingPage(view.UNSAFE_root)).toBe('test://cover');
      expect(nodes(view.UNSAFE_root, 'story-page-preview-held').length).toBeGreaterThan(0);
    });

    it('should fade to the picked page rather than turn when reduced motion is on', () => {
      mockReducedMotion.mockReturnValue(true);
      const view = render(picked(null));
      stallTurns();

      view.rerender(picked(2));

      expect(nodes(view.UNSAFE_root, 'story-page-preview-fade').length).toBeGreaterThan(0);
      expect(nodes(view.UNSAFE_root, 'story-page-preview-leaf')).toHaveLength(0);
      act(() => land!());
      expect(restingPage(view.UNSAFE_root)).toBe('test://page-3');
    });

    it('should turn the pages as before while nothing is picked', () => {
      const { UNSAFE_root } = render(picked(null));

      expect(nodes(UNSAFE_root, 'story-page-preview-playing')).toHaveLength(1);
      expect(nodes(UNSAFE_root, 'story-page-preview-held')).toHaveLength(0);
    });

    it('should show a neighbouring card its picked page without turning', () => {
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(4)} isCurrent={false} heldPage={2} {...size} />);

      expect(restingPage(UNSAFE_root)).toBe('test://page-3');
      expect(nodes(UNSAFE_root, 'story-page-preview-playing')).toHaveLength(0);
      expect(nodes(UNSAFE_root, 'story-page-preview-held')).toHaveLength(0);
    });

    it('should size the held cover as the playing one', () => {
      const view = render(picked(2));

      const style = StyleSheet.flatten(nodes(view.UNSAFE_root, 'story-page-preview-held')[0].props.style);
      expect(style.width).toBe(size.width);
      expect(style.height).toBe(size.height);
    });
  });

  describe('readying the pages a child might pick', () => {
    const warmOf = (root: any) =>
      nodes(root, 'story-page-preview-warm').filter((node: any) => node.props?.source !== undefined && node.props?.style !== undefined);

    it('should decode every page of the book in front at the cover`s size, out of sight, so a pick turns without a stall', () => {
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(4)} isCurrent {...size} />);

      const warm = warmOf(UNSAFE_root);
      expect(new Set(warm.map((node: any) => node.props.source.uri))).toEqual(new Set(['test://page-2', 'test://page-3', 'test://page-4']));
      const style = StyleSheet.flatten(warm[0].props.style);
      expect(style.width).toBe(size.width);
      expect(style.height).toBe(size.height);
      const hidden = nodes(UNSAFE_root, 'story-page-preview-warmth')[0];
      expect(StyleSheet.flatten(hidden.props.style).opacity).toBe(0);
      expect(hidden.props.pointerEvents).toBe('none');
      expect(hidden.props.accessibilityElementsHidden).toBe(true);
    });

    it('should keep readying them while the cover rests on a picked page', () => {
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(4)} isCurrent heldPage={2} {...size} />);

      expect(warmOf(UNSAFE_root).length).toBeGreaterThan(0);
    });

    it('should ready nothing for a neighbouring card', () => {
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(4)} isCurrent={false} {...size} />);

      expect(warmOf(UNSAFE_root)).toHaveLength(0);
    });
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

    it('should lie flat again as soon as a turn has landed, ready to lift for the next', () => {
      animatedStyle.mockImplementation((worklet: () => unknown) => worklet());
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs);
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
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
      });
      const staged = nodes(UNSAFE_root, 'story-page-preview-still').filter((node: any) => node.props.source !== undefined);
      expect(staged.length).toBeGreaterThan(0);
      expect(staged.every((node: any) => node.props.source.uri === 'test://cover')).toBe(true);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.readyMs);
      });

      expect(nodes(UNSAFE_root, 'story-page-preview-still')).toHaveLength(0);
    });

    it('should still turn when the stage is mounted ahead of the turn: staging must not cancel the turn itself', () => {
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
      });
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.dwellMs - STORY_PAGE_PREVIEW.readyMs);
      });

      expect(restingPage(UNSAFE_root)).toBe('test://page-1');
    });

    it('should keep loaded stills beneath the stage, this page on top of the next, so a landing reveals the page that was already showing', () => {
      const { UNSAFE_root } = render(<StoryPageSlideshow story={makeStory(3)} isCurrent {...size} />);

      const bases = nodes(UNSAFE_root, 'story-page-preview-base').filter((node: any) => node.type?.displayName === 'MockExpoImage').map((node: any) => node.props.source.uri);

      expect(bases).toEqual(['test://page-1', 'test://cover']);
      act(() => {
        jest.advanceTimersByTime(STORY_PAGE_PREVIEW.readyMs);
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
