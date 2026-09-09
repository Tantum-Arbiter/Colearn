import { useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GUIDE_TIMING } from '@/constants/owl-guide';
import type { GuideScroller } from './use-guide-scroller';

/** Short enough to be over before the guide measures again on the scroll settle. */
const GLIDE_MS = Math.round(GUIDE_TIMING.scrollSettleMs * 0.75);

export interface GuideLiftBinding {
  /** Put on the surface itself, so what the owl points at moves with it. */
  style: ViewStyle;
  scroller: GuideScroller;
}

/**
 * The same bargain a scrolling page makes with the owl, for a surface that has
 * no scroll view to offer: a sheet standing over the screen rises far enough
 * for the button being talked about to sit clear of the bubble, and settles
 * back between steps.
 *
 * Without it the bubble would have to leave the owl to reach a button low on
 * the sheet, which is what made it read as a second, unattached voice.
 */
export function useGuideLift(): GuideLiftBinding {
  const offset = useSharedValue(0);
  const held = useRef(0);

  const scroller = useMemo<GuideScroller>(() => {
    const glide = (to: number) => {
      offset.value = withTiming(to, { duration: GLIDE_MS, easing: Easing.out(Easing.cubic) });
    };
    return {
      reveal: (shift: number) => {
        held.current += shift;
        glide(-held.current);
      },
      release: () => {
        held.current = 0;
        glide(0);
      },
    };
  }, [offset]);

  const style = useAnimatedStyle<ViewStyle>(() => ({ transform: [{ translateY: offset.value }] }));

  return { style, scroller };
}
