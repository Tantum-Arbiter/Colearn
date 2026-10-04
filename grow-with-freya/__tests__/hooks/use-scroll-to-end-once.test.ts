/**
 * A card opened to choose where to start scrolls its body to the end once --
 * where the pages and the ways to read are -- but only when its content is
 * taller than the body shows; a card that holds everything stays put, so
 * nothing at its top is scrolled under the cover.
 */

import { act, renderHook } from '@testing-library/react-native';
import { useScrollToEndOnce } from '@/hooks/use-scroll-to-end-once';

function scrollerFor(active: boolean) {
  const { result } = renderHook(() => useScrollToEndOnce(active));
  const scrollToEnd = jest.fn();
  result.current.ref.current = { scrollToEnd } as never;

  const layout = (height: number) => result.current.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 300, height } } } as never);

  return { result, scrollToEnd, layout };
}

describe('useScrollToEndOnce', () => {
  it('should scroll to the end when the content runs past the body', () => {
    const { result, scrollToEnd, layout } = scrollerFor(true);

    act(() => {
      layout(400);
      result.current.onContentSizeChange(300, 520);
    });

    expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
  });

  it('should leave a body that holds everything where it is', () => {
    const { result, scrollToEnd, layout } = scrollerFor(true);

    act(() => {
      layout(500);
      result.current.onContentSizeChange(300, 500);
    });

    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('should wait to know both heights before it decides', () => {
    const { result, scrollToEnd, layout } = scrollerFor(true);

    act(() => {
      result.current.onContentSizeChange(300, 520);
    });
    const beforeLayout = scrollToEnd.mock.calls.length;
    act(() => {
      layout(400);
    });

    expect(beforeLayout).toBe(0);
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
  });

  it('should do it only once, leaving the child to scroll after', () => {
    const { result, scrollToEnd, layout } = scrollerFor(true);

    act(() => {
      layout(400);
      result.current.onContentSizeChange(300, 520);
      result.current.onContentSizeChange(300, 560);
      layout(380);
    });

    expect(scrollToEnd).toHaveBeenCalledTimes(1);
  });

  it('should leave a card opened the ordinary way where it starts', () => {
    const { result, scrollToEnd, layout } = scrollerFor(false);

    act(() => {
      layout(400);
      result.current.onContentSizeChange(300, 520);
    });

    expect(scrollToEnd).not.toHaveBeenCalled();
  });
});
