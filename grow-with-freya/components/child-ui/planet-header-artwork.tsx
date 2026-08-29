import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image, ImageSource } from 'expo-image';

const DEFAULT_SOURCE = require('@/assets/images/ui-elements/home-earth-night.webp');
const ASSET_ASPECT_RATIO = 959 / 368;
const MIN_WIDTH_RATIO = 0.55;
const MAX_WIDTH_RATIO = 0.65;

interface PlanetHeaderArtworkProps {
  source?: ImageSource | number;
  widthRatio?: number;
  topOffsetRatio?: number;
}

export function clampWidthRatio(ratio: number): number {
  return Math.min(MAX_WIDTH_RATIO, Math.max(MIN_WIDTH_RATIO, ratio));
}

export function planetLayout(screenWidth: number, widthRatio: number, topOffsetRatio: number) {
  const width = screenWidth * clampWidthRatio(widthRatio);
  const height = width / ASSET_ASPECT_RATIO;
  return { width, height, top: height * topOffsetRatio };
}

export function PlanetHeaderArtwork({
  source = DEFAULT_SOURCE,
  widthRatio = 0.6,
  topOffsetRatio = -0.34,
}: PlanetHeaderArtworkProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { width, height, top } = planetLayout(screenWidth, widthRatio, topOffsetRatio);

  return (
    <View
      testID="planet-header-artwork"
      pointerEvents="none"
      style={[styles.container, { top }]}
    >
      <Image
        source={source}
        style={{ width, height }}
        contentFit="contain"
        transition={0}
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 0,
  },
});
