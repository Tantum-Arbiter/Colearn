import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { HeroCloudSeed, HeroMotionMode } from '@/constants/home-sky';
import { HERO_CLOUD_ART } from './hero-sky-art';

interface HeroCloudProps {
  seed: HeroCloudSeed;
  mode: HeroMotionMode;
}

const HeroCloud = memo(function HeroCloud({ seed, mode }: HeroCloudProps) {
  const drift = useSharedValue(0);

  useEffect(() => {
    if (mode !== 'full') {
      cancelAnimation(drift);
      drift.value = 0;
      return;
    }

    drift.value = withRepeat(withTiming(1, { duration: seed.driftMs, easing: Easing.inOut(Easing.sin) }), -1, true);

    return () => {
      cancelAnimation(drift);
    };
  }, [mode, drift, seed.driftMs]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: seed.driftX * drift.value }, { translateY: seed.driftY * drift.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.cloud,
        { left: seed.x, top: seed.y, width: seed.width, height: seed.height, opacity: seed.opacity },
        style,
      ]}
    >
      <Image
        testID={`hero-cloud-${seed.id}`}
        source={HERO_CLOUD_ART[seed.kind]}
        style={[styles.art, seed.mirrored ? styles.mirrored : null]}
        contentFit="contain"
        transition={0}
      />
    </Animated.View>
  );
});

export interface HeroCloudLayerProps {
  clouds: HeroCloudSeed[];
  mode: HeroMotionMode;
  intensity?: number;
  testID?: string;
}

export const HeroCloudLayer = memo(function HeroCloudLayer({
  clouds,
  mode,
  intensity = 1,
  testID = 'hero-cloud-layer',
}: HeroCloudLayerProps) {
  return (
    <View testID={testID} style={[StyleSheet.absoluteFill, { opacity: intensity }]} pointerEvents="none">
      {clouds.map((seed) => (
        <HeroCloud key={seed.id} seed={seed} mode={mode} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
});
