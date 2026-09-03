import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

export const SECTION_CROSSFADE = {
  outMs: 160,
  inMs: 260,
  lift: 10,
} as const;

interface SectionCrossfadeProps {
  sectionKey: string;
  children: ReactNode;
  testID?: string;
}

interface Shown {
  key: string;
  node: ReactNode;
}

export function SectionCrossfade({ sectionKey, children, testID = 'section-crossfade' }: SectionCrossfadeProps) {
  const [shown, setShown] = useState<Shown>({ key: sectionKey, node: children });
  const latest = useRef<ReactNode>(children);
  const opacity = useSharedValue(1);
  const lift = useSharedValue(0);
  const settled = shown.key === sectionKey;

  useEffect(() => {
    latest.current = children;
  });

  useEffect(() => {
    if (settled) {
      return;
    }
    opacity.value = withTiming(0, { duration: SECTION_CROSSFADE.outMs, easing: Easing.in(Easing.quad) });
    lift.value = withTiming(-SECTION_CROSSFADE.lift, { duration: SECTION_CROSSFADE.outMs, easing: Easing.in(Easing.quad) });
    const swap = setTimeout(() => {
      setShown({ key: sectionKey, node: latest.current });
      lift.value = SECTION_CROSSFADE.lift;
      opacity.value = withTiming(1, { duration: SECTION_CROSSFADE.inMs, easing: Easing.out(Easing.cubic) });
      lift.value = withTiming(0, { duration: SECTION_CROSSFADE.inMs, easing: Easing.out(Easing.cubic) });
    }, SECTION_CROSSFADE.outMs);

    return () => clearTimeout(swap);
  }, [settled, sectionKey, opacity, lift]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  return (
    <Animated.View testID={testID} style={[styles.fill, style]} pointerEvents={settled ? 'auto' : 'none'}>
      {settled ? children : shown.node}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
