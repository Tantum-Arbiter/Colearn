/**
 * SceneBackground
 *
 * Full-bleed night scene used behind the music screens and the instrument picker.
 * A scene is drawn once per mount and stays put across re-renders and rotation.
 *
 * The artwork is 3:4 portrait, so every other viewport is a centre crop. The
 * fitting is the platform's, not ours: computed here from the window size it was
 * a React render behind the view's own bounds, and a tablet turned on its side
 * showed the fill behind the art for a third of a second. `focalBias` rides on
 * `contentPosition` -- 0 keeps the top of the scene, 1 the bottom, 0.5 is a true
 * centre crop -- so a landscape tablet still keeps the moon rather than cropping
 * it away.
 *
 * Behind the art, the same scene as a gradient. A picture cannot be re-sampled
 * in the frame a rotation resizes it, but a gradient is redrawn with the layer
 * it is on, so what shows through while the art catches up is the scene's own
 * colours rather than a flat panel.
 */

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import {
  SCENE_BACKGROUNDS,
  SCENE_BACKGROUND_FALLBACK_COLOR,
  SCENE_BACKGROUND_TONE_STOPS,
  getSceneBackground,
  getSceneBackgroundTones,
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
}

export function SceneBackground({
  source,
  blurIntensity = 40,
  scrimOpacity = 0.35,
  focalBias = 0.42,
}: SceneBackgroundProps) {
  const [drawnIndex] = useState(nextSceneBackgroundIndex);
  const pinnedIndex = source === undefined ? -1 : SCENE_BACKGROUNDS.indexOf(source);
  const sceneIndex = pinnedIndex >= 0 ? pinnedIndex : drawnIndex;
  const scene = source ?? getSceneBackground(drawnIndex);

  return (
    <View style={styles.container} pointerEvents="none" testID="scene-background">
      <LinearGradient
        colors={getSceneBackgroundTones(sceneIndex) as [string, string, ...string[]]}
        locations={SCENE_BACKGROUND_TONE_STOPS as [number, number, ...number[]]}
        style={StyleSheet.absoluteFill}
        testID="scene-background-tones"
      />
      <Image
        source={scene}
        style={styles.image}
        contentFit="cover"
        contentPosition={{ top: `${focalBias * 100}%`, left: '50%' }}
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
    ...StyleSheet.absoluteFillObject,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
});
