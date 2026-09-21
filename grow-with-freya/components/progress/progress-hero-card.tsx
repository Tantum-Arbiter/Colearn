import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  ACCENT_GOLD,
  ACCENT_GREEN,
  ACCENT_PURPLE,
  BORDER_DEFAULT,
  NIGHT_BRIGHT,
  TEXT_PRIMARY,
} from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { RADIUS_LARGE, SPACE_1, SPACE_3, SPACE_4, SPACE_5 } from '@/components/child-ui/tokens';
import { ActivityCounters } from './progress-model';
import { ProgressRing } from './progress-ring';
import { ActivityMetric } from './activity-metric';

const CARD_SURFACE = 'rgba(7, 29, 84, 0.55)';

interface ProgressHeroCardProps {
  counters: ActivityCounters;
}

export function ProgressHeroCard({ counters }: ProgressHeroCardProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.card} testID="progress-hero-card">
      <Text style={[styles.heading, { fontSize: scaledFontSize(18) }]}>
        {t('progress.weeklyHeading')}
      </Text>

      <View style={styles.columns}>
        <ProgressRing minutesThisWeek={counters.minutesThisWeek} />

        <View style={styles.rightColumn}>
          <View style={styles.timeRow}>
            <View style={styles.clockCircle}>
              <Ionicons name="time-outline" size={20} color={TEXT_PRIMARY} />
            </View>
            <View style={styles.timeText}>
              <Text style={[styles.timeTitle, { fontSize: scaledFontSize(15) }]}>
                {t('progress.timeTogether')}
              </Text>
              <Text style={[styles.timeValueLine, { fontSize: scaledFontSize(14) }]}>
                <Text style={styles.timeValue} testID="progress-minutes">{counters.minutesThisWeek}</Text>
                {' '}
                {t('progress.minsSuffix')}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <ActivityMetric
              icon="book"
              iconColor={ACCENT_PURPLE}
              label={t('progress.storiesRead')}
              value={counters.storiesRead}
              testID="metric-stories"
            />
            <View style={styles.separator} />
            <ActivityMetric
              icon="musical-notes"
              iconColor={NIGHT_BRIGHT}
              label={t('progress.musicSessions')}
              value={counters.musicSessions}
              testID="metric-music"
            />
            <View style={styles.separator} />
            <ActivityMetric
              icon="heart"
              iconColor={ACCENT_GREEN}
              label={t('progress.calmMoments')}
              value={counters.calmMoments}
              testID="metric-calm"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS_LARGE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: CARD_SURFACE,
    padding: SPACE_4,
    paddingVertical: SPACE_5,
    gap: SPACE_4,
  },
  heading: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_4,
  },
  rightColumn: {
    flex: 1,
    gap: SPACE_4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
  clockCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: BORDER_DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    flex: 1,
    gap: 2,
  },
  timeTitle: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  timeValueLine: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '600',
  },
  timeValue: {
    color: ACCENT_GOLD,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE_1,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(190, 215, 255, 0.25)',
  },
});
