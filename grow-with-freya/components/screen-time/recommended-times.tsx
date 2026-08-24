import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';

const GREEN = '#81C784';
const TEAL = '#4ECDC4';
const CARD_BG = 'rgba(76, 175, 80, 0.08)';
const CARD_BORDER = 'rgba(76, 175, 80, 0.25)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.75)';
const DIVIDER = 'rgba(255, 255, 255, 0.10)';

/** Three research-informed time slots, fixed rather than derived from the
 *  child's own data -- suggestions for building a schedule, not a report on
 *  one. */
const SLOTS: { time: string; key: string }[] = [
  { time: '9:00 AM - 10:00 AM', key: 'screenTime.morningStoriesEmotions' },
  { time: '2:00 PM - 3:00 PM', key: 'screenTime.afternoonLearning' },
  { time: '5:00 PM - 6:00 PM', key: 'screenTime.preDinnerMusic' },
];

export interface RecommendedTimesProps {
  testID?: string;
}

/**
 * Research-backed time-of-day suggestions for screen activities.
 *
 * Lives inside the schedule window now, next to the reminders a parent is
 * actually building, rather than on the dashboard where it only described
 * a suggestion with nothing to act on it with.
 */
export function RecommendedTimes({ testID = 'recommended-times' }: RecommendedTimesProps) {
  const { t } = useTranslation();
  const { scaledFontSize, scaledPadding } = useAccessibility();

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.headRow}>
        <Ionicons name="sunny-outline" size={18} color={GREEN} />
        <Text style={[styles.title, { fontSize: scaledFontSize(16) }]}>
          {t('screenTime.recommendedTimes')}
        </Text>
      </View>

      <Text style={[styles.intro, { fontSize: scaledFontSize(13) }]}>
        {t('screenTime.recommendedTimesIntro')}
      </Text>

      {SLOTS.map((slot, i) => (
        <View
          key={slot.key}
          style={[
            styles.slot,
            { paddingVertical: scaledPadding(8) },
            i === SLOTS.length - 1 && styles.slotLast,
          ]}
        >
          <Text style={[styles.slotTime, { fontSize: scaledFontSize(13) }]}>{slot.time}</Text>
          <Text style={[styles.slotActivity, { fontSize: scaledFontSize(12) }]} numberOfLines={2}>
            {t(slot.key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: GREEN,
  },
  intro: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
    lineHeight: 18,
    marginBottom: 10,
  },
  slot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  slotLast: {
    borderBottomWidth: 0,
  },
  slotTime: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    color: TEAL,
    flexShrink: 0,
  },
  slotActivity: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
    textAlign: 'right',
    flex: 1,
  },
});
