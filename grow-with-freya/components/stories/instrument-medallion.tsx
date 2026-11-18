/**
 * InstrumentMedallion
 *
 * The night-sky disc for one instrument, shared by the full-screen picker and the
 * inline practise carousel. The artwork is a finished medallion -sky, gold rim and
 * the instrument itself -so this component only sizes it and layers the focus ring
 * and the subscription lock on top.
 *
 * The artwork already has a thick gold rim, so the focus treatment is a glow rather
 * than a ring: a filled gold circle sits behind the medallion, just inside the rim
 * (which the normalising script puts at 0.90 of the frame), and only its shadow
 * escapes. Positioning and focus animation stay with the carousel that owns them:
 * the caller supplies the glow's animated style, which must drive opacity alone --
 * scaling it up would push the fill out past the rim as a hard gold edge.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { InstrumentDefinition } from '@/services/music-asset-registry';

/** Glow diameter as a fraction of the medallion -kept under the artwork's 0.90 rim. */
const GLOW_RATIO = 0.88;

const LOCKED_OPACITY = 0.5;

export interface InstrumentMedallionProps {
  instrument: InstrumentDefinition;
  /** Medallion diameter. */
  size: number;
  /** Animated style driving the focus glow's opacity. */
  ringStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
  /** Set false for carousels that never show a focus glow. */
  showRing?: boolean;
  isLocked?: boolean;
  onLockedPress?: () => void;
}

export const InstrumentMedallion = React.memo(function InstrumentMedallion({
  instrument,
  size,
  ringStyle,
  showRing = true,
  isLocked = false,
  onLockedPress,
}: InstrumentMedallionProps) {
  const glowSize = size * GLOW_RATIO;
  const hasMedallion = instrument.medallion !== 0;
  const opacity = isLocked ? LOCKED_OPACITY : 1;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      testID={`instrument-${instrument.id}`}
    >
      {showRing && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              top: (size - glowSize) / 2,
              left: (size - glowSize) / 2,
            },
            ringStyle,
          ]}
          testID="instrument-medallion-ring"
        />
      )}

      {hasMedallion ? (
        <Image
          source={instrument.medallion}
          style={[styles.medallion, { width: size, height: size, opacity }]}
          resizeMode="contain"
          testID="instrument-medallion-disc"
        />
      ) : (
        <View
          style={[styles.placeholder, {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: instrument.noteLayout[0]?.color ?? '#666666',
            opacity,
          }]}
          testID="instrument-medallion-placeholder"
        >
          <Ionicons name="musical-note" size={size * 0.36} color="#FFFFFF" />
        </View>
      )}

      {isLocked && (
        <Pressable
          onPress={onLockedPress}
          style={[styles.lockOverlay, { borderRadius: size / 2 }]}
          testID="instrument-medallion-lock"
        >
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
          </View>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: '#FFD470',
    shadowColor: '#FFD470',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
  medallion: {
    position: 'absolute',
  },
  placeholder: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  lockBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 50, 0.7)',
  },
});
