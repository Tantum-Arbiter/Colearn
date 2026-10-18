/**
 * A page that scrolls can show the owl's next subject without the bubble
 * having to leave the owl: the page moves instead, from wherever it stands,
 * and goes back to where the child left it when the tour lets go of it.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useGuideScroller } from '@/components/owl-guide/use-guide-scroller';

/** The shape a real scroll event carries, which the hook reads all of. */
function scrolledTo(y: number, viewport = 800, content = 2000): any {
  return {
    nativeEvent: {
      contentOffset: { y },
      layoutMeasurement: { height: viewport },
      contentSize: { height: content },
    },
  };
}

function withSpy() {
  const scrollTo = jest.fn();
  const hook = renderHook(() => useGuideScroller());
  hook.result.current.scrollRef.current = { scrollTo } as any;
  return { hook, scrollTo };
}

/**
 * A page whose content runs this far past the bottom of the screen. Negative
 * for a page that does not even fill it -- the home page is one of those.
 */
function pageThatCanScroll(hook: ReturnType<typeof withSpy>['hook'], own: number) {
  act(() => hook.result.current.onLayout({ nativeEvent: { layout: { height: 800 } } } as any));
  act(() => hook.result.current.onContentSizeChange(400, 800 + own));
}

describe('useGuideScroller', () => {
  it('reveals by scrolling on from where the page was sitting', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));

    expect(scrollTo).toHaveBeenCalledWith({ y: 200, animated: true });
  });

  /**
   * Each step moves the page on from where the last one left it. Carrying it
   * home and sending it out again was a bounce the child could see between
   * every pair of steps.
   */
  it('moves on from where the last step left the page', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.onScroll(scrolledTo(200)));
    act(() => hook.result.current.scroller.reveal(140));

    expect(scrollTo).toHaveBeenLastCalledWith({ y: 340, animated: true });
  });

  /** A subject above the view is reached by scrolling back up to it. */
  it('carries the page back up for a subject it has already scrolled past', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(300)));
    act(() => hook.result.current.scroller.reveal(-180));

    expect(scrollTo).toHaveBeenLastCalledWith({ y: 120, animated: true });
  });

  it('never asks the page to scroll above its own top', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(40)));
    act(() => hook.result.current.scroller.reveal(-200));

    expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: true });
  });

  it('gives the page back and forgets it when the tour is over', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.scroller.release());

    expect(scrollTo).toHaveBeenLastCalledWith({ y: 120, animated: true });
    expect(hook.result.current.reserve).toBe(0);
  });

  /**
   * A row at the very bottom cannot be lifted clear of the bubble if the page
   * has no more to scroll, so the tour asks the page for room to do it in.
   */
  /**
   * A page whose content barely fills the screen cannot scroll at all, however
   * far it is asked to. Reserving the size of the move rather than what the
   * page was missing left it stuck a long way short of where it was sent.
   */
  it('reserves what a short page is missing, not the size of the move', () => {
    const { hook } = withSpy();
    pageThatCanScroll(hook, 0);

    act(() => hook.result.current.scroller.reveal(220));

    expect(hook.result.current.reserve).toBe(220);
  });

  it('reserves only the shortfall on a page that can already travel some of it', () => {
    const { hook } = withSpy();
    pageThatCanScroll(hook, 150);

    act(() => hook.result.current.scroller.reveal(220));

    expect(hook.result.current.reserve).toBe(70);
  });

  it('reserves nothing at all on a page long enough to make the move itself', () => {
    const { hook } = withSpy();
    pageThatCanScroll(hook, 900);

    act(() => hook.result.current.scroller.reveal(220));

    expect(hook.result.current.reserve).toBe(0);
  });

  /**
   * The home page's content does not reach the bottom of the screen, so it
   * cannot scroll a single point on its own. Treating that as "no reach" rather
   * than the shortfall it is left the owl's subject behind the bubble.
   */
  it('reserves the shortfall as well as the move on a page that does not fill the screen', () => {
    const { hook } = withSpy();
    pageThatCanScroll(hook, -83);

    act(() => hook.result.current.scroller.reveal(124));

    expect(hook.result.current.reserve).toBe(207);
  });

  /** Measured once: our own reserve must not be read back as the page's reach. */
  it('keeps the page\'s own measure once the tour has started padding it', () => {
    const { hook } = withSpy();
    pageThatCanScroll(hook, -83);
    act(() => hook.result.current.scroller.reveal(100));
    // the page grows by what was reserved, as a real one does
    act(() => hook.result.current.onContentSizeChange(400, 800 - 83 + hook.result.current.reserve));

    act(() => hook.result.current.onScroll(scrolledTo(100, 800, 800 - 83 + hook.result.current.reserve)));
    act(() => hook.result.current.scroller.reveal(50));

    expect(hook.result.current.reserve).toBe(233);
  });

  it('asks the page to reserve room for the scroll it needs', () => {
    const { hook } = withSpy();

    expect(hook.result.current.reserve).toBe(0);

    act(() => hook.result.current.scroller.reveal(220));

    expect(hook.result.current.reserve).toBeGreaterThanOrEqual(220);
  });

  /** Step by step down a short page, the reserve covers the whole walk. */
  it('grows the reserve as the tour walks further down a short page', () => {
    const { hook } = withSpy();
    pageThatCanScroll(hook, 0);

    act(() => hook.result.current.scroller.reveal(150));
    act(() => hook.result.current.onScroll(scrolledTo(150, 800, 800 + hook.result.current.reserve)));
    act(() => hook.result.current.scroller.reveal(150));

    expect(hook.result.current.reserve).toBe(300);
  });

  it('leaves a page alone when nothing asked it to move', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.release());

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('takes its bearings again from wherever the page rests next', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.scroller.release());
    act(() => hook.result.current.onScroll(scrolledTo(300)));
    act(() => hook.result.current.scroller.reveal(50));

    expect(scrollTo).toHaveBeenLastCalledWith({ y: 350, animated: true });
  });

  /**
   * The guide asks before it rings furniture standing over the top of the
   * page: a page the tour has moved has its own head slid in under it.
   */
  it('tells how far the tour has moved the page from where the child left it', () => {
    const { hook } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    const before = hook.result.current.scroller.away();
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.onScroll(scrolledTo(200)));

    expect(before).toBe(0);
    expect(hook.result.current.scroller.away()).toBe(80);
  });

  it('counts only what the tour did, not where the page has got to on the way', () => {
    const { hook } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.onScroll(scrolledTo(160)));

    expect(hook.result.current.scroller.away()).toBe(40);
  });

  it('has the page home again once the tour lets go of it', () => {
    const { hook } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.onScroll(scrolledTo(200)));
    act(() => hook.result.current.scroller.release());

    expect(hook.result.current.scroller.away()).toBe(0);
  });

  /** The guide watches it in an effect, so a new object every render would loop. */
  it('hands out the same scroller across renders', () => {
    const hook = renderHook(() => useGuideScroller());
    const first = hook.result.current.scroller;

    hook.rerender({});

    expect(hook.result.current.scroller).toBe(first);
  });
});
