import React, { memo, useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  HERO_ANIMALS,
  HERO_FOREGROUND,
  HERO_FRAMES,
  HERO_LOOP_MS,
  heroFrame,
  swayPose,
  type HeroAnimal,
} from '@/constants/login-hero';
import { HERO_ANIMAL_ART, HERO_BACKDROP_ART, HERO_FOREGROUND_ART } from '@/constants/login-hero-art';

interface AnimalLayerProps {
  animal: HeroAnimal;
  width: number;
  height: number;
  clock: SharedValue<number>;
}

function AnimalLayer({ animal, width, height, clock }: AnimalLayerProps) {
  const frame = heroFrame(HERO_FRAMES[animal], width, height);
  const size = { width: frame.width, height: frame.height };

  const sway = useAnimatedStyle(() => {
    const pose = swayPose(clock.value, animal);

    return { transform: [{ rotate: `${Math.round(pose.rotateDeg * 1000) / 1000}deg` }, { scaleY: pose.scaleY }] };
  });

  return (
    <Animated.View testID={`login-hero-${animal}`} pointerEvents="none" style={[styles.part, styles.hingedAtBottom, frame, sway]}>
      <Image
        testID={`login-hero-${animal}-art`}
        source={HERO_ANIMAL_ART[animal]}
        style={[styles.part, styles.atOrigin, size]}
        resizeMode="stretch"
      />
    </Animated.View>
  );
}

export interface LoginHeroProps {
  width: number;
  height: number;
  animated?: boolean;
  testID?: string;
}

export const LoginHero = memo(function LoginHero({ width, height, animated = true, testID = 'login-hero' }: LoginHeroProps) {
  const clock = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(clock);
      clock.value = 0;
      return undefined;
    }
    clock.value = 0;
    clock.value = withRepeat(withTiming(HERO_LOOP_MS, { duration: HERO_LOOP_MS, easing: Easing.linear }), -1, false);

    return () => {
      cancelAnimation(clock);
    };
  }, [animated, clock]);

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height }}
    >
      <Image
        testID="login-hero-backdrop"
        source={HERO_BACKDROP_ART}
        style={[styles.part, styles.atOrigin, { width, height }]}
        resizeMode="stretch"
      />
      {HERO_ANIMALS.map((animal) => (
        <AnimalLayer key={animal} animal={animal} width={width} height={height} clock={clock} />
      ))}
      <Image
        testID="login-hero-foreground"
        source={HERO_FOREGROUND_ART}
        style={[styles.part, heroFrame(HERO_FOREGROUND, width, height)]}
        resizeMode="stretch"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  part: {
    position: 'absolute',
  },
  atOrigin: {
    left: 0,
    top: 0,
  },
  hingedAtBottom: {
    transformOrigin: 'bottom',
  },
});
