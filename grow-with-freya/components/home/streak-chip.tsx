import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { HOME_CARD_TINTS, HOME_CARD_TYPE } from '@/constants/home-journey';
import { StatIcon } from './stat-icons';

/** Big enough for the flame to read as a flame, small enough not to be a panel. */
const FLAME_SIZE = 26;

export interface StreakChipProps {
  days: number;
  animated: boolean;
  testID?: string;
}

/**
 * How many days in a row, under the greeting.
 *
 * Encouragement rather than a statistic: the flame is the whole of the
 * display, and a child with no streak yet is invited to start one instead of
 * being shown a zero. It reads and does not respond to a press -- the numbers
 * behind it live on the progress screen, which the badge panel already opens.
 */
export const StreakChip = memo(function StreakChip({ days, animated, testID = 'streak-chip' }: StreakChipProps) {
  const { t } = useTranslation();
  const burning = days > 0;
  const label = burning ? t('home.streak.days', { count: days }) : t('home.streak.start');

  return (
    <View
      testID={testID}
      style={styles.chip}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View style={burning ? undefined : styles.unlit}>
        <StatIcon kind="flame" size={FLAME_SIZE} animated={animated && burning} testID={`${testID}-flame`} />
      </View>
      <Text style={[styles.text, burning ? null : styles.textMuted]}>{label}</Text>
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
  // a streak not yet lit: the same flame, banked down rather than a second icon
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
