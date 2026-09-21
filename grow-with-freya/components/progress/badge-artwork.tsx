import React from 'react';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { ACCENT_GOLD, ACCENT_PURPLE } from '@/constants/night-palette';
import { BadgeStatus } from './progress-model';

export const BADGE_ARTWORK_SIZE = 76;
const SPARKLE_PATH = 'M 6 0 Q 7 5 12 6 Q 7 7 6 12 Q 5 7 0 6 Q 5 5 6 0 Z';

const RIM_BY_STATUS: Record<BadgeStatus, { borderColor: string; borderStyle: 'solid' | 'dashed'; borderWidth: number }> = {
  earned: { borderColor: ACCENT_GOLD, borderStyle: 'solid', borderWidth: 2.5 },
  in_progress: { borderColor: ACCENT_PURPLE, borderStyle: 'solid', borderWidth: 2 },
  started: { borderColor: 'rgba(142, 114, 243, 0.6)', borderStyle: 'solid', borderWidth: 1.5 },
  undiscovered: { borderColor: 'rgba(190, 215, 255, 0.5)', borderStyle: 'dashed', borderWidth: 1.5 },
};

const ARTWORK_OPACITY: Record<BadgeStatus, number> = {
  earned: 1,
  in_progress: 1,
  started: 0.85,
  undiscovered: 0.45,
};

const Sparkle = ({ left, top }: { left: number; top: number }) => (
  <View testID="badge-sparkle" style={[styles.sparkle, { left, top }]} pointerEvents="none">
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Path d={SPARKLE_PATH} fill={ACCENT_GOLD} />
    </Svg>
  </View>
);

interface BadgeArtworkProps {
  artwork: ImageSourcePropType;
  status: BadgeStatus;
  /** Diameter of the medallion. The Profile wall draws these far smaller than
   *  the Progress cards do, and the rim, glow and sparkles follow it. */
  size?: number;
}

export function BadgeArtwork({ artwork, status, size = BADGE_ARTWORK_SIZE }: BadgeArtworkProps) {
  const rim = RIM_BY_STATUS[status];

  return (
    <View style={[styles.wrapper, { width: size, height: size }]} testID={`badge-artwork-${status}`}>
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2 },
          rim,
          status === 'earned' && styles.earnedGlow,
          status === 'in_progress' && styles.progressGlow,
        ]}
      >
        <Image
          source={artwork}
          style={[styles.image, { opacity: ARTWORK_OPACITY[status] }]}
          contentFit="contain"
          transition={0}
          cachePolicy="memory-disk"
        />
        {status === 'undiscovered' && <View style={styles.dreamOverlay} pointerEvents="none" />}
      </View>
      {status === 'earned' && (
        <>
          <Sparkle left={-4} top={size * 0.08} />
          <Sparkle left={size - 6} top={-2} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(4, 16, 47, 0.4)',
  },
  earnedGlow: {
    shadowColor: ACCENT_GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  progressGlow: {
    shadowColor: ACCENT_PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
  },
  image: {
    width: '76%',
    height: '76%',
  },
  dreamOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 16, 47, 0.35)',
  },
  sparkle: {
    position: 'absolute',
  },
});
