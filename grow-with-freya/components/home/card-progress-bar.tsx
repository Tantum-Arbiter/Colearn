import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HERO_CARD } from '@/constants/home-sky';

export interface CardProgressBarProps {
  fraction: number;
  height?: number;
  testID?: string;
}

export function progressPercent(fraction: number): number {
  return Math.round(Math.min(1, Math.max(0, fraction)) * 100);
}

export const CardProgressBar = memo(function CardProgressBar({ fraction, height = 8, testID = 'card-progress' }: CardProgressBarProps) {
  const radius = height / 2;
  const percent = progressPercent(fraction);

  return (
    <View testID={`${testID}-track`} style={[styles.track, { height, borderRadius: radius }]}>
      <LinearGradient
        testID={`${testID}-fill`}
        colors={[HERO_CARD.progressFrom, HERO_CARD.progressTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${percent}%`, borderRadius: radius }]}
      >
        <LinearGradient
          testID={`${testID}-sheen`}
          colors={[HERO_CARD.progressSheen, 'transparent']}
          style={[styles.sheen, { borderRadius: radius }]}
          pointerEvents="none"
        />
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: HERO_CARD.progressTrack,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.16)',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
    shadowColor: HERO_CARD.progressFrom,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
  },
});
