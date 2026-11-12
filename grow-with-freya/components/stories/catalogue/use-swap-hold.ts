import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

const ARRIVED = 1;

interface SwapHoldInput {
  swapKey: string;
  scrollRef: RefObject<ScrollView | null>;
  reduceMotion: boolean;
  startAt?: number;
}

export interface SwapHold {
  holdHeight: number | undefined;
  measure: (key: string) => (event: LayoutChangeEvent) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onContentSizeChange: (width: number, height: number) => void;
}

export function useSwapHold({ swapKey, scrollRef, reduceMotion, startAt }: SwapHoldInput): SwapHold {
  const [holdHeight, setHoldHeight] = useState<number | undefined>(undefined);
  const held = useRef<number | undefined>(undefined);
  const currentKey = useRef(swapKey);
  const shownHeight = useRef<number | undefined>(undefined);
  const offset = useRef(0);
  const viewport = useRef(0);
  const content = useRef(0);
  const arrivingAt = useRef<number | undefined>(undefined);

  const hold = useCallback((height: number | undefined) => {
    held.current = height;
    setHoldHeight(height);
  }, []);

  const letGo = useCallback(() => {
    arrivingAt.current = undefined;
    hold(undefined);
  }, [hold]);

  const glideTo = useCallback(
    (target: number) => {
      scrollRef.current?.scrollTo({ y: target, animated: !reduceMotion });
      if (reduceMotion) {
        letGo();
        return;
      }
      arrivingAt.current = target;
    },
    [letGo, reduceMotion, scrollRef]
  );

  useEffect(() => {
    if (currentKey.current === swapKey) return;
    currentKey.current = swapKey;
    if (held.current !== undefined || offset.current <= 0 || shownHeight.current === undefined) return;
    hold(shownHeight.current);
    if (startAt !== undefined && offset.current > startAt) {
      glideTo(startAt);
    }
  }, [swapKey, startAt, hold, glideTo]);

  const measure = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      if (key !== currentKey.current) return;
      const natural = event.nativeEvent.layout.height;
      shownHeight.current = natural;
      if (held.current === undefined || arrivingAt.current !== undefined) return;

      const reach = content.current - Math.max(0, held.current - natural) - viewport.current;
      if (offset.current <= reach) {
        letGo();
        return;
      }

      glideTo(Math.max(0, reach));
    },
    [letGo, glideTo]
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.y;
      viewport.current = event.nativeEvent.layoutMeasurement.height;
      content.current = event.nativeEvent.contentSize.height;
      if (arrivingAt.current !== undefined && offset.current <= arrivingAt.current + ARRIVED) {
        letGo();
      }
    },
    [letGo]
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewport.current = event.nativeEvent.layout.height;
  }, []);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    content.current = height;
  }, []);

  return { holdHeight, measure, onScroll, onLayout, onContentSizeChange };
}
