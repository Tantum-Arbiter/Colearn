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
import { HERO_SKY, type HeroMotionMode, type HeroStarSeed } from '@/constants/home-sky';
import { HERO_STAR_ART } from './hero-sky-art';

interface HeroStarProps {
  seed: HeroStarSeed;
  mode: HeroMotionMode;
}

const HeroStar = memo(function HeroStar({ seed, mode }: HeroStarProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (mode === 'off') {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }

    const breathe = Easing.inOut(Easing.sin);
    pulse.value = withDelay(
      seed.delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: seed.twinkleMs, easing: breathe }),
          withTiming(0, { duration: seed.twinkleMs, easing: breathe })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [mode, pulse, seed.delayMs, seed.twinkleMs]);

  const floor = mode === 'gentle' ? HERO_SKY.gentleFloor : HERO_SKY.twinkleFloor;
  const scaleReach = mode === 'full' ? HERO_SKY.twinkleScale - 1 : 0;

  const style = useAnimatedStyle(() => ({
    opacity: 1 - (1 - floor) * pulse.value,
    transform: [{ scale: 1 + scaleReach * pulse.value }],
  }));

  return (
    <Animated.View style={[styles.star, { left: seed.x, top: seed.y, width: seed.size, height: seed.size }, style]}>
      <Image
        testID={`hero-star-${seed.id}`}
        source={HERO_STAR_ART[seed.kind]}
        style={styles.art}
        contentFit="contain"
        transition={0}
      />
    </Animated.View>
  );
});

export interface HeroStarsLayerProps {
  stars: HeroStarSeed[];
  mode: HeroMotionMode;
  testID?: string;
}

export const HeroStarsLayer = memo(function HeroStarsLayer({ stars, mode, testID = 'hero-stars-layer' }: HeroStarsLayerProps) {
  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((seed) => (
        <HeroStar key={seed.id} seed={seed} mode={mode} />
      ))}
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
