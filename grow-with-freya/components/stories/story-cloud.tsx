import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import type { CatalogueTheme } from './catalogue/catalogue-story';

export type CloudTheme = CatalogueTheme;

export const CLOUD_ART = {
  width: 2000,
  height: 667,
  top: 95,
  bottom: 616,
  left: 37,
  right: 1958,
} as const;

type PieceName = 'left' | 'stretch-left' | 'crown' | 'stretch-right' | 'right';

interface CloudLook {
  cuts: readonly [number, number, number, number];
  decoration: number;
  pieces: Record<PieceName, ImageSource>;
}

export const CLOUD_THEMES: Record<CloudTheme, CloudLook> = {
  stories: {
    cuts: [430, 880, 1120, 1570],
    decoration: 318,
    pieces: {
      left: require('@/assets/images/story-cloud/stories-left.webp'),
      'stretch-left': require('@/assets/images/story-cloud/stories-stretch-left.webp'),
      crown: require('@/assets/images/story-cloud/stories-crown.webp'),
      'stretch-right': require('@/assets/images/story-cloud/stories-stretch-right.webp'),
      right: require('@/assets/images/story-cloud/stories-right.webp'),
    },
  },
  music: {
    cuts: [430, 880, 1120, 1550],
    decoration: 389,
    pieces: {
      left: require('@/assets/images/story-cloud/music-left.webp'),
      'stretch-left': require('@/assets/images/story-cloud/music-stretch-left.webp'),
      crown: require('@/assets/images/story-cloud/music-crown.webp'),
      'stretch-right': require('@/assets/images/story-cloud/music-stretch-right.webp'),
      right: require('@/assets/images/story-cloud/music-right.webp'),
    },
  },
};

export const CLOUD_TEXT_INSET = 25;
const DECORATION_CLEARANCE = 8;
const SEAM = 0.5;
const BODY = CLOUD_ART.bottom - CLOUD_ART.top;

export interface CloudPiece {
  name: PieceName;
  x: number;
  width: number;
}

export interface CloudFrame {
  scale: number;
  top: number;
  height: number;
  pieces: CloudPiece[];
}

export function cloudFrame(width: number, height: number, theme: CloudTheme = 'stories'): CloudFrame {
  if (width <= 0 || height <= 0) return { scale: 0, top: 0, height: 0, pieces: [] };
  const [leftCut, crownStart, crownEnd, rightCut] = CLOUD_THEMES[theme].cuts;
  const leftShown = leftCut - CLOUD_ART.left;
  const crownWidth = crownEnd - crownStart;
  const fixed = leftShown + crownWidth + (CLOUD_ART.right - rightCut);
  const scale = Math.min(height / BODY, width / fixed);
  const stretch = Math.max(0, (width - fixed * scale) / 2);
  const crown = leftShown * scale + stretch;
  const right = crown + crownWidth * scale + stretch;
  return {
    scale,
    top: (height - BODY * scale) / 2 - CLOUD_ART.top * scale,
    height: CLOUD_ART.height * scale,
    pieces: [
      { name: 'left', x: -CLOUD_ART.left * scale, width: leftCut * scale },
      { name: 'stretch-left', x: leftShown * scale - SEAM, width: stretch + SEAM * 2 },
      { name: 'crown', x: crown, width: crownWidth * scale },
      { name: 'stretch-right', x: crown + crownWidth * scale - SEAM, width: stretch + SEAM * 2 },
      { name: 'right', x: right, width: (CLOUD_ART.width - rightCut) * scale },
    ],
  };
}

export function cloudInset(height: number, theme: CloudTheme = 'stories'): number {
  return Math.max(CLOUD_TEXT_INSET, CLOUD_THEMES[theme].decoration * (height / BODY) + DECORATION_CLEARANCE);
}

export const StoryCloud = memo(function StoryCloud({ theme = 'stories' }: { theme?: CloudTheme }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  const frame = cloudFrame(size.width, size.height, theme);
  const pieces = CLOUD_THEMES[theme].pieces;

  return (
    <View
      testID="story-cloud"
      nativeID={`story-cloud-${theme}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={onLayout}
      style={StyleSheet.absoluteFill}
    >
      {frame.pieces.map((piece) => (
        <Image
          key={piece.name}
          testID={`story-cloud-${piece.name}`}
          source={pieces[piece.name]}
          contentFit="fill"
          transition={0}
          style={{ position: 'absolute', left: piece.x, width: piece.width, top: frame.top, height: frame.height }}
        />
      ))}
    </View>
  );
});
