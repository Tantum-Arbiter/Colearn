import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { HOME_CARD_TINTS, HOME_CARD_TYPE } from '@/constants/home-journey';
import { StatIcon } from './stat-icons';

const TROPHY_SIZE = 24;

export interface AchievementTallyChipProps {
  unlocked: number;
  remaining: number;
  animated: boolean;
  testID?: string;
}

export const AchievementTallyChip = memo(function AchievementTallyChip({
  unlocked,
  remaining,
  animated,
  testID = 'achievement-tally-chip',
}: AchievementTallyChipProps) {
  const { t } = useTranslation();
  const started = unlocked > 0;
  const label = t('home.achievementTally.label', { unlocked, remaining });

  return (
    <View testID={testID} style={styles.chip} accessible accessibilityRole="text" accessibilityLabel={label}>
      <View testID={`${testID}-trophy-slot`} style={started ? undefined : styles.unlit}>
        <StatIcon kind="trophy" size={TROPHY_SIZE} animated={animated && started} testID={`${testID}-trophy`} />
      </View>
      <Text style={[styles.text, started ? null : styles.textMuted]}>{label}</Text>
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
