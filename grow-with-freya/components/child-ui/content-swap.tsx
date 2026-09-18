import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

export const CONTENT_SWAP = {
  outMs: 160,
  inMs: 260,
  lift: 8,
} as const;

interface ContentSwapProps {
  /** Changes when the content underneath is a different set of things. */
  contentKey: string;
  children: ReactNode;
  /** For a column that has to fill its parent rather than wrap its content. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A column that fades out, changes what it holds, and fades back in.
 *
 * Unlike SectionCrossfade this never lays one copy over another, so it works
 * inside a scroll view -- an absolutely positioned leaving layer there would
 * be measured into the scroll content and drag the page's height about. The
 * cost is that the two halves run in sequence rather than overlapping, which
 * is what a shelf changing its whole contents wants anyway: the old books
 * leave before the new ones arrive.
 */
export function ContentSwap({ contentKey, children, style: outer, testID = 'content-swap' }: ContentSwapProps) {
  const [shown, setShown] = useState({ key: contentKey, node: children });
  const latest = useRef<ReactNode>(children);
  latest.current = children;

  const opacity = useSharedValue(1);
  const lift = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  // while the key stands still the column is a plain passthrough, so anything
  // that changes inside it -- a download finishing, a cover arriving -- still
  // reaches the screen
  if (shown.key === contentKey && shown.node !== children) {
    setShown({ key: contentKey, node: children });
  }

  useEffect(() => {
    if (shown.key === contentKey) return;

    if (reduceMotion) {
      setShown({ key: contentKey, node: latest.current });
      return;
    }

    opacity.value = withTiming(0, { duration: CONTENT_SWAP.outMs, easing: Easing.in(Easing.quad) });
    lift.value = withTiming(-CONTENT_SWAP.lift, { duration: CONTENT_SWAP.outMs, easing: Easing.in(Easing.quad) });

    const swap = setTimeout(() => {
      setShown({ key: contentKey, node: latest.current });
      lift.value = CONTENT_SWAP.lift;
      opacity.value = withTiming(1, { duration: CONTENT_SWAP.inMs, easing: Easing.out(Easing.cubic) });
      lift.value = withTiming(0, { duration: CONTENT_SWAP.inMs, easing: Easing.out(Easing.cubic) });
    }, CONTENT_SWAP.outMs);

    return () => clearTimeout(swap);
  }, [contentKey, shown.key, opacity, lift, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  return (
    <Animated.View testID={testID} style={[styles.column, outer, style]}>
      {shown.node}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
  },
});
