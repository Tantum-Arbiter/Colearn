import React, { useEffect, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AUTH_OVERLAY_Z, type AuthEntrance } from '@/constants/app-shell';
import { PAGE_TRANSITION_DURATION_MS } from '@/constants/page-transition';

interface AuthOverlayProps {
  entrance: AuthEntrance;
  children: ReactNode;
}

export function AuthOverlay({ entrance, children }: AuthOverlayProps) {
  const { height } = useWindowDimensions();
  const offset = useSharedValue(entrance === 'slide' ? height : 0);

  useEffect(() => {
    if (entrance !== 'slide') return;
    offset.value = withTiming(0, { duration: PAGE_TRANSITION_DURATION_MS, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
  }, [entrance, offset]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, style]} testID="auth-overlay">
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: AUTH_OVERLAY_Z,
  },
});
