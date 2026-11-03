import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

/** How long to give the page to take on the room asked for before reaching again. */
const REACH_MS = 120;

/**
 * What the owl asks of a page it is touring: move so the thing being talked
 * about is not behind the bubble, come back between steps, and be given back
 * whole at the end.
 */
export interface GuideScroller {
  /**
   * Move the page this far from where it is now -- down for a positive shift,
   * up for a negative one -- reserving room to do it in.
   *
   * Relative, and only ever asked for from a page at rest, so there is no
   * carrying it home between steps: that round trip was a bounce the child
   * could see, and the ring was drawn over the page while it made it.
   */
  reveal: (shift: number) => void;
  away: () => number;
  /** Back to where the child left it, and forget it: the tour is over. */
  release: () => void;
}

export interface GuideScrollerBinding {
  scrollRef: React.RefObject<ScrollView | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Both needed to know how far the page can actually travel on its own. */
  onLayout: (event: LayoutChangeEvent) => void;
  onContentSizeChange: (width: number, height: number) => void;
  /** Extra room the page adds to the foot of its content while a tour needs it. */
  reserve: number;
  scroller: GuideScroller;
}

export function useGuideScroller(): GuideScrollerBinding {
  const scrollRef = useRef<ScrollView | null>(null);
  const offset = useRef(0);
  // where the page was sitting when the tour first asked for room, so it can
  // be given back at the end. Every shift in between is measured from a page
  // at rest and applied from where it stands, so nothing drifts.
  const resting = useRef<number | null>(null);
  const [reserve, setReserve] = useState(0);
  const pending = useRef<number | null>(null);
  const [tick, setTick] = useState(0);
  // how far the page could scroll on its own, before the tour reserved
  // anything: content that already runs past the viewport, and no further
  const viewport = useRef(0);
  const content = useRef(0);
  // Taken once, before the tour has reserved anything, so it is the page's own
  // measure and nothing of ours. Negative on a page whose content does not even
  // fill the screen -- which is the case that matters, and the one that is lost
  // if this is clamped at zero.
  const ownReach = useRef<number | null>(null);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
    viewport.current = event.nativeEvent.layoutMeasurement.height;
    content.current = event.nativeEvent.contentSize.height;
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewport.current = event.nativeEvent.layout.height;
  }, []);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    content.current = height;
  }, []);

  // the scroll waits a render, so the room asked for is part of the page
  // before it is scrolled into -- a row at the foot of a short page has
  // nowhere to go otherwise. The repeat is for that same room: the padding is
  // laid out natively a beat after the render that declares it, and a scroll
  // that arrives first is clamped to the page's old end and goes nowhere.
  useEffect(() => {
    if (pending.current === null) return;
    const y = pending.current;
    pending.current = null;
    scrollRef.current?.scrollTo({ y, animated: true });
    const settle = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: true }), REACH_MS);
    return () => clearTimeout(settle);
  }, [tick]);

  const scroller = useMemo<GuideScroller>(
    () => ({
      reveal: (shift: number) => {
        const home = resting.current ?? offset.current;
        resting.current = home;
        const to = Math.max(0, offset.current + shift);
        pending.current = to;
        // A short page cannot scroll at all, however far it is asked to, so the
        // room reserved is what the page is missing rather than the size of the
        // move: reserving the move itself left a page whose content does not
        // fill the screen stuck most of the way short of where it was sent.
        if (ownReach.current === null && viewport.current > 0) {
          ownReach.current = content.current - viewport.current;
        }
        const reach = ownReach.current ?? 0;
        setReserve((room) => Math.max(room, Math.max(0, to - reach)));
        setTick((count) => count + 1);
      },
      away: () => (resting.current === null ? 0 : Math.round(offset.current - resting.current)),
      release: () => {
        if (resting.current === null) return;
        pending.current = resting.current;
        resting.current = null;
        ownReach.current = null;
        setReserve(0);
        setTick((count) => count + 1);
      },
    }),
    []
  );

  return { scrollRef, onScroll, onLayout, onContentSizeChange, reserve, scroller };
}
