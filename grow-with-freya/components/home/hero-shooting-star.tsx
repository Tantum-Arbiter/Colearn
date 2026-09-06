import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { HERO_SKY, type HeroMotionMode, type HeroShootingStarSeed } from '@/constants/home-sky';
import { HERO_SHOOTING_STAR_ART } from './hero-sky-art';

export interface HeroShootingStarProps {
  seed: HeroShootingStarSeed;
  mode: HeroMotionMode;
  testID?: string;
}

export const HeroShootingStar = memo(function HeroShootingStar({
  seed,
  mode,
  testID = 'hero-shooting-star',
}: HeroShootingStarProps) {
  const flight = useSharedValue(0);

  useEffect(() => {
    if (mode === 'off') {
      cancelAnimation(flight);
      flight.value = 0;
      return;
    }

    flight.value = withRepeat(
      withSequence(
        withDelay(seed.everyMs, withTiming(1, { duration: seed.flightMs, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(flight);
    };
  }, [mode, flight, seed.everyMs, seed.flightMs]);

  const travels = mode === 'full';
  const still = mode === 'off';

  const style = useAnimatedStyle(() => {
    const glow = Math.sin(Math.PI * flight.value);

    return {
      opacity: still
        ? HERO_SKY.shootingRestOpacity
        : HERO_SKY.shootingIdleOpacity + (1 - HERO_SKY.shootingIdleOpacity) * glow,
      transform: [
        { translateX: travels ? seed.travelX * flight.value : 0 },
        { translateY: travels ? seed.travelY * flight.value : 0 },
      ],
    };
  });

  return (
    <View testID={`${testID}-layer`} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.star, { left: seed.x, top: seed.y, width: seed.width, height: seed.height }, style]}>
        <Image testID={testID} source={HERO_SHOOTING_STAR_ART} style={styles.art} contentFit="contain" transition={0} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
  },
  art: {
    width: '100%',
    height: '100%',
  },
});
