import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { STORY_GARDEN_MOTION, motionDuration } from '@/constants/story-garden-motion';

export interface ReaderControlsLayerProps {
  visible: boolean;
  reduceMotion?: boolean;
  /** Render children bare, adding nothing to the tree. Used when the Story Garden is off. */
  passthrough?: boolean;
  children: React.ReactNode;
}

export const ReaderControlsLayer = memo(function ReaderControlsLayer({
  visible,
  reduceMotion = false,
  passthrough = false,
  children,
}: ReaderControlsLayerProps) {
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: visible
        ? motionDuration(STORY_GARDEN_MOTION.controlsReveal, reduceMotion)
        : motionDuration(STORY_GARDEN_MOTION.controlsHide, reduceMotion),
      easing: Easing.out(Easing.quad),
    });
  }, [visible, reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (passthrough) {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={[styles.layer, animatedStyle]}
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      testID="reader-controls-layer"
    >
      <View style={styles.inner} pointerEvents="box-none">
        {children}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  inner: {
    flex: 1,
  },
});
