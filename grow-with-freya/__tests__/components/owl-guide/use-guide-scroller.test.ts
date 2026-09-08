/**
 * A page that scrolls can show the owl's next subject without the bubble
 * having to leave the owl: the page moves instead, and goes back to where it
 * was when the tour lets go of it.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useGuideScroller } from '@/components/owl-guide/use-guide-scroller';

function scrolledTo(y: number): any {
  return { nativeEvent: { contentOffset: { y } } };
}

function withSpy() {
  const scrollTo = jest.fn();
  const hook = renderHook(() => useGuideScroller());
  hook.result.current.scrollRef.current = { scrollTo } as any;
  return { hook, scrollTo };
}

describe('useGuideScroller', () => {
  it('reveals by scrolling on from where the page was sitting', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));

    expect(scrollTo).toHaveBeenCalledWith({ y: 200, animated: true });
  });

  /** Otherwise each step would scroll on from the last one and run off the page. */
  it('measures every step from where the page was when the tour took hold', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.onScroll(scrolledTo(200)));
    act(() => hook.result.current.scroller.reveal(140));

    expect(scrollTo).toHaveBeenLastCalledWith({ y: 260, animated: true });
  });

  it('puts the page back between steps', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.scroller.restore());

    expect(scrollTo).toHaveBeenLastCalledWith({ y: 120, animated: true });
  });

  /**
   * The restore between steps is animated, so the page is still moving when
   * the next step asks for room. Re-reading the offset then would take the
   * mid-flight position for the page's resting place and the tour would walk
   * the page away from where it started.
   */
  it('keeps its bearings through a restore, rather than reading them again mid-glide', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.reveal(80));
    act(() => hook.result.current.scroller.restore());
    // the restore is still gliding: the page reports somewhere in between
    act(() => hook.result.current.onScroll(scrolledTo(160)));
    act(() => hook.result.current.scroller.reveal(90));

    // 120 + 90, not the 160 + 90 that reading the offset again would give
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 210, animated: true });
  });

  it('says whether a restore has a page to carry back', () => {
    const { hook } = withSpy();

    let untouched: boolean | undefined;
    act(() => { untouched = hook.result.current.scroller.restore(); });
    act(() => hook.result.current.scroller.reveal(80));
    let carried: boolean | undefined;
    act(() => { carried = hook.result.current.scroller.restore(); });

    expect(untouched).toBe(false);
    expect(carried).toBe(true);
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
  it('asks the page to reserve room for the scroll it needs', () => {
    const { hook } = withSpy();

    expect(hook.result.current.reserve).toBe(0);

    act(() => hook.result.current.scroller.reveal(220));

    expect(hook.result.current.reserve).toBeGreaterThanOrEqual(220);
  });

  it('leaves a page alone when nothing asked it to move', () => {
    const { hook, scrollTo } = withSpy();

    act(() => hook.result.current.onScroll(scrolledTo(120)));
    act(() => hook.result.current.scroller.restore());
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

  /** The guide watches it in an effect, so a new object every render would loop. */
  it('hands out the same scroller across renders', () => {
    const hook = renderHook(() => useGuideScroller());
    const first = hook.result.current.scroller;

    hook.rerender({});

    expect(hook.result.current.scroller).toBe(first);
  });
});
