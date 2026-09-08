import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

/** How long to give the page to take on the room asked for before reaching again. */
const REACH_MS = 120;

/**
 * What the owl asks of a page it is touring: move so the thing being talked
 * about is not behind the bubble, come back between steps, and be given back
 * whole at the end.
 */
export interface GuideScroller {
  /** Scroll this far past the page's resting place, reserving room to do it in. */
  reveal: (shift: number) => void;
  /** Back to the resting place, which is remembered for the steps still to come.
   *  True when there was a page to carry back -- it glides, so anything read
   *  off it should wait for the scroll settle. */
  restore: () => boolean;
  /** Back to it and forget it: the tour is over. */
  release: () => void;
}

export interface GuideScrollerBinding {
  scrollRef: React.RefObject<ScrollView | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Extra room the page adds to the foot of its content while a tour needs it. */
  reserve: number;
  scroller: GuideScroller;
}

export function useGuideScroller(): GuideScrollerBinding {
  const scrollRef = useRef<ScrollView | null>(null);
  const offset = useRef(0);
  // where the page was sitting when the tour first asked for room. Held for
  // the whole tour: the restore between steps is animated, so reading the
  // offset again while it glides would take a mid-flight position for the
  // page's own place and walk it away a step at a time.
  const resting = useRef<number | null>(null);
  const [reserve, setReserve] = useState(0);
  const pending = useRef<number | null>(null);
  const [tick, setTick] = useState(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
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
        if (resting.current === null) resting.current = offset.current;
        pending.current = resting.current + shift;
        setReserve((room) => Math.max(room, shift));
        setTick((count) => count + 1);
      },
      restore: () => {
        if (resting.current === null) return false;
        pending.current = resting.current;
        setTick((count) => count + 1);
        return true;
      },
      release: () => {
        if (resting.current === null) return;
        pending.current = resting.current;
        resting.current = null;
        setReserve(0);
        setTick((count) => count + 1);
      },
    }),
    []
  );

  return { scrollRef, onScroll, reserve, scroller };
}
