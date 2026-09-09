import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { HOME_CARD_TINTS, HOME_CARD_TYPE } from '@/constants/home-journey';
import { StatIcon } from './stat-icons';

/** Matches the streak chip's flame so the two read as one pair, not two
 *  different sizes of icon sitting side by side. */
const BOOK_SIZE = 24;

export interface WeeklyReadingChipProps {
  minutes: number;
  animated: boolean;
  testID?: string;
}

/**
 * How many minutes of stories this week, beside the streak.
 *
 * The streak says a child came back; this says what they did once they were
 * here -- a livelier, shorter-lived number than the lifetime total the
 * progress screen keeps, so it actually moves week to week. A week with
 * nothing read yet gets an invitation rather than "0 min", the same choice
 * the streak makes for a cold start.
 */
export const WeeklyReadingChip = memo(function WeeklyReadingChip({
  minutes,
  animated,
  testID = 'weekly-reading-chip',
}: WeeklyReadingChipProps) {
  const { t } = useTranslation();
  const hasRead = minutes > 0;
  const label = hasRead ? t('home.weeklyReading.minutes', { count: minutes }) : t('home.weeklyReading.none');

  return (
    <View testID={testID} style={styles.chip} accessible accessibilityRole="text" accessibilityLabel={label}>
      <View style={hasRead ? undefined : styles.unlit}>
        <StatIcon kind="book" size={BOOK_SIZE} animated={animated && hasRead} testID={`${testID}-book`} />
      </View>
      <Text style={[styles.text, hasRead ? null : styles.textMuted]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
  },
  // a week with nothing read yet: the same book, banked down rather than a
  // second icon -- mirrors the streak chip's unlit flame
  unlit: {
    opacity: 0.4,
  },
  text: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.body,
    fontWeight: '700',
    color: HOME_CARD_TINTS.title,
  },
  textMuted: {
    fontWeight: '600',
    color: HOME_CARD_TINTS.body,
  },
});
