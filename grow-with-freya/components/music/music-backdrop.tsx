/**
 * MusicBackdrop
 *
 * The night meadow every music page stands on -- the sheet's panel while the
 * song is being read, and the instrument once it arrives.
 *
 * The blur and the darkening are baked into the artwork rather than laid over
 * it at runtime. Two of these are on screen together while the sheet leaves for
 * the instrument, and identical opaque pictures stack to the same pixels: a
 * live `BlurView` and scrim would double up and then lighten as one faded out.
 * It also spares the device a full-screen blur it would otherwise redraw every
 * frame of the arrival.
 *
 * The art is 4:3 and no music screen is, so something has to go. `cover` keeps
 * the whole width in view on anything wider than 4:3 and takes the rest off the
 * top, which on a phone held sideways keeps the meadow and the water -- the half
 * worth seeing. A screen taller than the art loses a little from each side
 * instead, rather than leaving a gap. The fitting is the platform's: sized here
 * from `useWindowDimensions` it was a render behind the view's own bounds, and a
 * tablet turned on its side showed the fill behind it for a third of a second.
 *
 * Behind the art, the same meadow as a gradient. A picture cannot be re-sampled
 * in the frame a rotation resizes it, but a gradient is redrawn with the layer
 * it is on, so what shows through while the art catches up is the meadow's own
 * colours rather than a flat panel -- the stops are sampled straight down the
 * artwork.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const MEADOW_NIGHT = require('@/assets/music/scenes/meadow-night-blurred.webp');

/** Sampled down `meadow-night-blurred.webp`: the meadow, without the meadow. */
export const MEADOW_GRADIENT = ['#0C151D', '#18303F', '#1F2417', '#131713'] as const;
export const MEADOW_GRADIENT_STOPS = [0, 0.42, 0.85, 1] as const;

export function MusicBackdrop() {
  return (
    <View style={styles.container} pointerEvents="none" testID="music-backdrop">
      <LinearGradient
        colors={[...MEADOW_GRADIENT]}
        locations={[...MEADOW_GRADIENT_STOPS]}
        style={StyleSheet.absoluteFill}
        testID="music-backdrop-tones"
      />
      <Image
        source={MEADOW_NIGHT}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
        testID="music-backdrop-image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: MEADOW_GRADIENT[0],
  },
});
