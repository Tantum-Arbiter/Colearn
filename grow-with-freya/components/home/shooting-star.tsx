import React, { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SHOOTING_STAR } from '@/constants/night-sky';

export interface ShootingStarProps {
  flight: number;
  width: number;
  height: number;
  colour: string;
  testID?: string;
}

export const ShootingStar = memo(function ShootingStar({
  flight,
  width,
  height,
  colour,
  testID = 'shooting-star',
}: ShootingStarProps) {
  const progress = useSharedValue(0);
  const fade = useSharedValue(0);

  const travel = width * SHOOTING_STAR.travelRatio;
  const startX = width * 0.58;
  const startY = height * 0.08;

  useEffect(() => {
    if (flight === 0) {
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, {
      duration: SHOOTING_STAR.flightMs,
      easing: Easing.out(Easing.quad),
    });

    fade.value = withSequence(
      withTiming(0.9, { duration: SHOOTING_STAR.flightMs * 0.22 }),
      withTiming(0, { duration: SHOOTING_STAR.flightMs * 0.78 })
    );
  }, [flight, progress, fade]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: progress.value * travel }, { translateY: progress.value * travel * 0.42 }],
  }));

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      style={[styles.root, { left: startX, top: startY }, style]}
    >
      <Svg width={SHOOTING_STAR.trailLength} height={6}>
        <Defs>
          <LinearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={colour} stopOpacity={0} />
            <Stop offset="100%" stopColor={colour} stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={1.6} width={SHOOTING_STAR.trailLength} height={2.8} rx={1.4} fill="url(#trail)" />
      </Svg>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    transform: [{ rotate: `${SHOOTING_STAR.angleDegrees}deg` }],
  },
});
