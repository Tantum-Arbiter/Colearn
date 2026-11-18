import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useSwapHold } from '@/components/stories/catalogue/use-swap-hold';

const VIEWPORT = 1000;
const CONTENT = 3200;
const SHELVES = 2000;
const SHORT_PAGE = 2600;

function scrolled(y: number, content = CONTENT): NativeSyntheticEvent<NativeScrollEvent> {
  return {
    nativeEvent: {
      contentOffset: { x: 0, y },
      layoutMeasurement: { width: 800, height: VIEWPORT },
      contentSize: { width: 800, height: content },
    },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

function laidOut(height: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { x: 0, y: 0, width: 800, height } } } as LayoutChangeEvent;
}

function setup(reduceMotion = false) {
  const scrollTo = jest.fn();
  const scrollRef = { current: { scrollTo } as unknown as ScrollView };
  const hook = renderHook(
    ({ swapKey, startAt }: { swapKey: string; startAt?: number }) => useSwapHold({ swapKey, scrollRef, reduceMotion, startAt }),
    { initialProps: { swapKey: 'stories:' } as { swapKey: string; startAt?: number } },
  );
  return { ...hook, scrollTo };
}

function scrolledShelves(reduceMotion = false) {
  const view = setup(reduceMotion);
  act(() => {
    view.result.current.measure('stories:')(laidOut(SHELVES));
    view.result.current.onScroll(scrolled(900));
  });
  return view;
}

describe('useSwapHold', () => {
  it('leaves the column alone while nothing has changed', () => {
    const underTest = scrolledShelves();

    expect(underTest.result.current.holdHeight).toBeUndefined();
  });

  it('holds the column at the height it had when the set changes under a scrolled page', () => {
    const underTest = scrolledShelves();

    underTest.rerender({ swapKey: 'music:' });

    expect(underTest.result.current.holdHeight).toBe(SHELVES);
  });

  it('does not hold a page that is at the top, which has nothing to lose', () => {
    const underTest = setup();
    act(() => {
      underTest.result.current.measure('stories:')(laidOut(SHELVES));
      underTest.result.current.onScroll(scrolled(0));
    });

    underTest.rerender({ swapKey: 'music:' });

    expect(underTest.result.current.holdHeight).toBeUndefined();
  });

  it('glides the page up to the furthest the new set can reach', () => {
    const underTest = scrolledShelves();
    underTest.rerender({ swapKey: 'music:' });

    act(() => {
      underTest.result.current.measure('music:')(laidOut(SHELVES - 1580));
    });

    expect(underTest.scrollTo).toHaveBeenCalledWith({ y: CONTENT - 1580 - VIEWPORT, animated: true });
  });

  it('keeps holding until the page has arrived, so it never has to snap', () => {
    const underTest = scrolledShelves();
    underTest.rerender({ swapKey: 'music:' });
    act(() => {
      underTest.result.current.measure('music:')(laidOut(SHELVES - 1580));
    });

    act(() => {
      underTest.result.current.onScroll(scrolled(700));
    });

    expect(underTest.result.current.holdHeight).toBe(SHELVES);
  });

  it('lets the column go once the page has arrived', () => {
    const underTest = scrolledShelves();
    underTest.rerender({ swapKey: 'music:' });
    act(() => {
      underTest.result.current.measure('music:')(laidOut(SHELVES - 1580));
    });

    act(() => {
      underTest.result.current.onScroll(scrolled(CONTENT - 1580 - VIEWPORT));
    });

    expect(underTest.result.current.holdHeight).toBeUndefined();
  });

  it('takes the page to the top when the new set cannot scroll at all', () => {
    const underTest = scrolledShelves();
    act(() => {
      underTest.result.current.onScroll(scrolled(900, SHORT_PAGE));
    });
    underTest.rerender({ swapKey: 'music:' });

    act(() => {
      underTest.result.current.measure('music:')(laidOut(120));
    });

    expect(underTest.scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('leaves the page where it is when the new set is long enough to keep the place', () => {
    const underTest = scrolledShelves();
    underTest.rerender({ swapKey: 'music:' });

    act(() => {
      underTest.result.current.measure('music:')(laidOut(SHELVES - 100));
    });

    expect(underTest.scrollTo).not.toHaveBeenCalled();
    expect(underTest.result.current.holdHeight).toBeUndefined();
  });

  it('pays no attention to the old set laying itself out again on its way out', () => {
    const underTest = scrolledShelves();
    underTest.rerender({ swapKey: 'music:' });

    act(() => {
      underTest.result.current.measure('stories:')(laidOut(120));
    });

    expect(underTest.scrollTo).not.toHaveBeenCalled();
    expect(underTest.result.current.holdHeight).toBe(SHELVES);
  });

  it('holds from the height the new set had once it is the one being left', () => {
    const underTest = scrolledShelves();
    underTest.rerender({ swapKey: 'music:' });
    act(() => {
      underTest.result.current.measure('music:')(laidOut(SHELVES - 100));
      underTest.result.current.onScroll(scrolled(900, CONTENT - 100));
    });

    underTest.rerender({ swapKey: 'stories:' });

    expect(underTest.result.current.holdHeight).toBe(SHELVES - 100);
  });

  describe('under Reduce Motion', () => {
    it('moves the page without a glide', () => {
      const underTest = scrolledShelves(true);
      act(() => {
        underTest.result.current.onScroll(scrolled(900, SHORT_PAGE));
      });
      underTest.rerender({ swapKey: 'music:' });

      act(() => {
        underTest.result.current.measure('music:')(laidOut(120));
      });

      expect(underTest.scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    });

    it('lets the column go at once, with no glide to wait for', () => {
      const underTest = scrolledShelves(true);
      underTest.rerender({ swapKey: 'music:' });

      act(() => {
        underTest.result.current.measure('music:')(laidOut(120));
      });

      expect(underTest.result.current.holdHeight).toBeUndefined();
    });
  });

  it('keeps track of how tall the page is from its own content-size reports', () => {
    const underTest = setup();
    act(() => {
      underTest.result.current.measure('stories:')(laidOut(SHELVES));
      underTest.result.current.onLayout(laidOut(VIEWPORT));
      underTest.result.current.onContentSizeChange(800, CONTENT);
      underTest.result.current.onScroll(scrolled(900));
    });
    underTest.rerender({ swapKey: 'music:' });

    act(() => {
      underTest.result.current.onContentSizeChange(800, CONTENT + 400);
      underTest.result.current.measure('music:')(laidOut(SHELVES - 1980));
    });

    expect(underTest.scrollTo).toHaveBeenCalledWith({ y: CONTENT + 400 - 1980 - VIEWPORT, animated: true });
  });

  describe('when the page knows at once where it has to end up', () => {
    it('starts the glide the moment the set changes, alongside the theme', () => {
      const underTest = scrolledShelves();

      underTest.rerender({ swapKey: 'music:', startAt: 0 });

      expect(underTest.scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
    });

    it('holds the column tall while it glides, so the page never has to snap', () => {
      const underTest = scrolledShelves();

      underTest.rerender({ swapKey: 'music:', startAt: 0 });

      expect(underTest.result.current.holdHeight).toBe(SHELVES);
    });

    it('does not start a second glide when the new set lays itself out on the way', () => {
      const underTest = scrolledShelves();
      underTest.rerender({ swapKey: 'music:', startAt: 0 });

      act(() => {
        underTest.result.current.measure('music:')(laidOut(120));
      });

      expect(underTest.scrollTo).toHaveBeenCalledTimes(1);
    });

    it('lets the column go once the page has arrived', () => {
      const underTest = scrolledShelves();
      underTest.rerender({ swapKey: 'music:', startAt: 0 });

      act(() => {
        underTest.result.current.onScroll(scrolled(0));
      });

      expect(underTest.result.current.holdHeight).toBeUndefined();
    });

    it('leaves a page that is already above that point where it is', () => {
      const underTest = scrolledShelves();

      underTest.rerender({ swapKey: 'music:', startAt: 1200 });

      expect(underTest.scrollTo).not.toHaveBeenCalled();
    });

    it('moves without a glide under Reduce Motion, and lets go at once', () => {
      const underTest = scrolledShelves(true);

      underTest.rerender({ swapKey: 'music:', startAt: 0 });

      expect(underTest.scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
      expect(underTest.result.current.holdHeight).toBeUndefined();
    });
  });
});
