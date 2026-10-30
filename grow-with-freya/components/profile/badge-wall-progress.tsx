/**
 * BadgeWallProgress
 *
 * The line above the badge wall: how many medallions have been found, with a
 * gold track that fills as the collection grows and a star at either end.
 *
 * It replaces the plain summary line — the same sentence, given a shape a
 * child can read at a glance without counting the grid below it.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ACCENT_GOLD, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

const BAR_HEIGHT = 36;
const TRACK_HEIGHT = 12;

interface BadgeWallProgressProps {
  earned: number;
  total: number;
  testID?: string;
}

export function BadgeWallProgress({
  earned,
  total,
  testID = 'badge-wall-progress',
}: BadgeWallProgressProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const fraction = total > 0 ? Math.min(1, Math.max(0, earned / total)) : 0;

  return (
    <View
      testID={testID}
      style={styles.bar}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: earned }}
    >
      <Text style={[styles.star, { fontSize: scaledFontSize(15) }]}>✦</Text>

      {/* One translated sentence: word order varies by language, so the count
          is never split out of it. */}
      <Text style={[styles.label, { fontSize: scaledFontSize(13) }]} numberOfLines={1}>
        {t('progress.badgesSummary', { earned, total })}
      </Text>

      <View style={styles.track} testID={`${testID}-track`}>
        <LinearGradient
          testID={`${testID}-fill`}
          colors={['#FFE49A', ACCENT_GOLD]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]}
        />
      </View>

      <Text style={[styles.percent, { fontSize: scaledFontSize(12) }]} testID={`${testID}-percent`}>
        {Math.round(fraction * 100)}%
      </Text>

      <Text style={[styles.star, { fontSize: scaledFontSize(15) }]}>✦</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: BAR_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: 'rgba(8, 26, 74, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(160, 200, 255, 0.28)',
  },
  star: {
    color: ACCENT_GOLD,
  },
  label: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  percent: {
    color: ACCENT_GOLD,
    fontFamily: Fonts.primary,
    fontWeight: '800',
    minWidth: 34,
    textAlign: 'right',
  },
  track: {
    flex: 1,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(4, 16, 47, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(190, 215, 255, 0.22)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
  },
});
