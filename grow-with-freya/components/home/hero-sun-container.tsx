import React, { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { TimeOfDay } from '@/constants/home-scene';
import { HERO_SKY, type HeroMotionMode, type SunFrame } from '@/constants/home-sky';
import { SkyFace } from './sky-face';

export interface HeroSunContainerProps {
  sun: SunFrame;
  timeOfDay: TimeOfDay;
  mode: HeroMotionMode;
  testID?: string;
}

export const HeroSunContainer = memo(function HeroSunContainer({
  sun,
  timeOfDay,
  mode,
  testID = 'hero-sun',
}: HeroSunContainerProps) {
  const breath = useSharedValue(0);

  useEffect(() => {
    if (mode !== 'full') {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }

    breath.value = withRepeat(
      withTiming(1, { duration: HERO_SKY.sunBreatheMs / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    return () => {
      cancelAnimation(breath);
    };
  }, [mode, breath]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -HERO_SKY.sunBreatheLift * breath.value }],
  }));

  return (
    <Animated.View
      testID={testID}
      style={[styles.sun, { left: sun.centreX - sun.size / 2, top: sun.top, width: sun.size, height: sun.size }, style]}
      pointerEvents="box-none"
    >
      <SkyFace size={sun.size} timeOfDay={timeOfDay} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sun: {
    position: 'absolute',
    zIndex: 10,
  },
});
