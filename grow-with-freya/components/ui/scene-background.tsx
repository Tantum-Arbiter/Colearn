/**
 * SceneBackground
 *
 * Full-bleed night scene used behind the music screens and the instrument picker.
 * A scene is drawn once per mount and stays put across re-renders and rotation.
 *
 * The artwork is 3:4 portrait, so every other viewport is a centre crop. The crop
 * is computed rather than delegated to resizeMode="cover" so that focalBias can
 * pull it above centre -a landscape tablet otherwise crops the moon away.
 * focalBias 0 keeps the top of the scene, 1 the bottom, 0.5 is a true centre crop.
 */

import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';

import {
  SCENE_BACKGROUND_FALLBACK_COLOR,
  SCENE_BACKGROUND_SOURCE_HEIGHT,
  SCENE_BACKGROUND_SOURCE_WIDTH,
  getSceneBackground,
  nextSceneBackgroundIndex,
} from '@/constants/scene-backgrounds';

export interface SceneBackgroundProps {
  /** Pin a specific scene instead of drawing one at random. */
  source?: number;
  /** 0 disables the blur layer entirely. */
  blurIntensity?: number;
  /** 0 disables the darkening scrim entirely. */
  scrimOpacity?: number;
  /** Where the crop sits vertically: 0 = top of the scene, 1 = bottom. */
  focalBias?: number;
  /** Overrides the window size -needed wherever the background is rotated. */
  viewport?: { width: number; height: number };
}

export function SceneBackground({
  source,
  blurIntensity = 40,
  scrimOpacity = 0.35,
  focalBias = 0.42,
  viewport,
}: SceneBackgroundProps) {
  const window = useWindowDimensions();
  const width = viewport?.width ?? window.width;
  const height = viewport?.height ?? window.height;

  const [drawnScene] = useState(() => getSceneBackground(nextSceneBackgroundIndex()));
  const scene = source ?? drawnScene;

  const cropStyle = useMemo(() => {
    const scale = Math.max(
      width / SCENE_BACKGROUND_SOURCE_WIDTH,
      height / SCENE_BACKGROUND_SOURCE_HEIGHT,
    );
    const drawnWidth = SCENE_BACKGROUND_SOURCE_WIDTH * scale;
    const drawnHeight = SCENE_BACKGROUND_SOURCE_HEIGHT * scale;

    return {
      width: drawnWidth,
      height: drawnHeight,
      left: (width - drawnWidth) / 2,
      top: (height - drawnHeight) * focalBias,
    };
  }, [width, height, focalBias]);

  return (
    <View style={styles.container} pointerEvents="none" testID="scene-background">
      <Image
        source={scene}
        style={[styles.image, cropStyle]}
        resizeMode="cover"
        testID="scene-background-image"
      />
      {scrimOpacity > 0 && (
        <View
          style={[styles.scrim, { opacity: scrimOpacity }]}
          testID="scene-background-scrim"
        />
      )}
      {blurIntensity > 0 && (
        <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: SCENE_BACKGROUND_FALLBACK_COLOR,
  },
  image: {
    position: 'absolute',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
});
