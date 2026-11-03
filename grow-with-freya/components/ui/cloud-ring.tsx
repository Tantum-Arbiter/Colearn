import React, { memo } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { EARTH, cloudRingLayout, planetHorizonLayout } from '@/constants/earth';
import { HOME_THEMES } from '@/constants/home-scene';
import { SKY_GRADIENT_WORLD } from '@/constants/night-palette';
import { snapToPixel } from '@/constants/page-slide';
import { CLOUD_RING_ART, PLANET_ART } from '@/constants/planet-art';
import { useTimeOfDay } from '@/hooks/use-time-of-day';

const PIXEL_SCALE = PixelRatio.get();

function useBelowHome(mainOffset: SharedValue<number>, height: number) {
  return useAnimatedStyle(() => ({
    transform: [{ translateY: snapToPixel(mainOffset.value + height, PIXEL_SCALE) }],
  }));
}

export interface GapSkyProps {
  mainOffset: SharedValue<number>;
  width: number;
  height: number;
  gap: number;
  testID?: string;
}

export const GapSky = memo(function GapSky({ mainOffset, width, height, gap, testID = 'gap-sky' }: GapSkyProps) {
  const timeOfDay = useTimeOfDay();
  const ride = useBelowHome(mainOffset, height);
  const below = planetHorizonLayout(width, height, 'top');

  if (!(gap > 0)) return null;

  return (
    <Animated.View testID={testID} style={[styles.layer, { height: gap + EARTH.seamOverlap }, ride]} pointerEvents="none">
      <LinearGradient
        testID={`${testID}-colour`}
        colors={[HOME_THEMES[timeOfDay].skyBottom, SKY_GRADIENT_WORLD[0]]}
        style={StyleSheet.absoluteFill}
      />
      <View
        testID={`${testID}-planet-window`}
        style={[styles.window, { top: gap - below.overhang, height: below.overhang + EARTH.seamOverlap }]}
      >
        <Image
          testID={`${testID}-planet`}
          source={PLANET_ART.source}
          style={[
            styles.art,
            { left: below.left, top: below.rise + below.overhang - below.height, width: below.width, height: below.height },
            styles.upsideDown,
          ]}
          contentFit="fill"
          transition={0}
          alt=""
        />
      </View>
    </Animated.View>
  );
});

export interface CloudRingProps {
  mainOffset: SharedValue<number>;
  width: number;
  height: number;
  gap: number;
  testID?: string;
}

export const CloudRing = memo(function CloudRing({ mainOffset, width, height, gap, testID = 'cloud-ring' }: CloudRingProps) {
  const ring = cloudRingLayout(width, height);
  const ride = useBelowHome(mainOffset, height);

  if (!(gap > 0)) return null;

  return (
    <Animated.View
      testID={testID}
      style={[styles.layer, styles.above, { height: gap }, ride]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        testID={`${testID}-art`}
        source={CLOUD_RING_ART.source}
        style={[styles.art, { left: ring.left, top: ring.top, width: ring.width, height: ring.height }]}
        contentFit="fill"
        transition={0}
        alt=""
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  above: {
    zIndex: 1,
  },
  art: {
    position: 'absolute',
  },
  window: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  upsideDown: {
    transform: [{ scaleY: -1 }],
  },
});
