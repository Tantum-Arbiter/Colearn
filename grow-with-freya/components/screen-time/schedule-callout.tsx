import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { ReminderService, type CustomReminder, type ReminderStats } from '@/services/reminder-service';

const TEAL = '#4ECDC4';
const PURPLE = '#6D5DF5';
const CARD_BG = 'rgba(255, 255, 255, 0.05)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.10)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.65)';
const CHIP_BG = 'rgba(255, 255, 255, 0.07)';

/** The benefit chips shown before a schedule exists. Calm by design: each one
 *  names what the parent gets, never a streak or a score. */
const BENEFITS: { icon: React.ComponentProps<typeof Ionicons>['name']; key: string }[] = [
  { icon: 'swap-horizontal-outline', key: 'screenTime.scheduleBenefitCalm' },
  { icon: 'notifications-outline', key: 'screenTime.scheduleBenefitGentle' },
  { icon: 'moon-outline', key: 'screenTime.scheduleBenefitBedtime' },
];

export interface ScheduleCalloutProps {
  /** Null while the reminder stats are still loading. */
  stats: ReminderStats | null;
  onOpen: () => void;
  testID?: string;
}

/**
 * The earliest of today's reminders that has not happened yet.
 *
 * `upcomingToday` is every active reminder for this weekday, past ones
 * included, so the time of day is what decides. Exported for tests: passing
 * `now` keeps it from depending on the wall clock.
 */
export function pickNextReminder(
  upcomingToday: CustomReminder[],
  now: string
): CustomReminder | null {
  const ahead = upcomingToday
    .filter((r) => r.time > now)
    .sort((a, b) => a.time.localeCompare(b.time));
  return ahead[0] ?? null;
}

function currentHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * The Screen Time dashboard's invitation to build a schedule.
 *
 * Leads with what the parent gets rather than with the mechanics, and once
 * reminders exist it reports the state instead of repeating the pitch.
 */
export function ScheduleCallout({ stats, onOpen, testID = 'schedule-callout' }: ScheduleCalloutProps) {
  const { t } = useTranslation();
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();

  const hasSchedule = (stats?.totalReminders ?? 0) > 0;

  const summary = useMemo(() => {
    if (!hasSchedule || !stats) return '';
    const next = pickNextReminder(stats.upcomingToday, currentHHMM());
    return t('screenTime.scheduleActiveSummary', {
      count: stats.totalReminders,
      next: next ? ReminderService.formatTime(next.time) : t('screenTime.scheduleNothingToday'),
    });
  }, [hasSchedule, stats, t]);

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.headRow}>
        <LinearGradient
          colors={[TEAL, PURPLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <Ionicons name={hasSchedule ? 'calendar' : 'sparkles'} size={20} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.headText}>
          <Text style={[styles.title, { fontSize: scaledFontSize(17) }]}>
            {t(hasSchedule ? 'screenTime.scheduleActiveTitle' : 'screenTime.scheduleEmptyTitle')}
          </Text>
          <Text style={[styles.body, { fontSize: scaledFontSize(13) }]} testID="schedule-callout-body">
            {hasSchedule ? summary : t('screenTime.scheduleEmptyBody')}
          </Text>
        </View>
      </View>

      {!hasSchedule && (
        <View style={styles.chipRow}>
          {BENEFITS.map(({ icon, key }) => (
            <View key={key} style={styles.chip}>
              <Ionicons name={icon} size={13} color={TEAL} />
              <Text style={[styles.chipText, { fontSize: scaledFontSize(11) }]}>{t(key)}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        testID="schedule-callout-cta"
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.cta,
          {
            minHeight: scaledButtonSize(48),
            paddingVertical: scaledPadding(12),
            paddingHorizontal: scaledPadding(18),
          },
          pressed && styles.ctaPressed,
        ]}
      >
        <Text style={[styles.ctaText, { fontSize: scaledFontSize(15) }]}>
          {t(hasSchedule ? 'screenTime.scheduleManage' : 'screenTime.createMySchedule')}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  headRow: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  body: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
    lineHeight: 19,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: CHIP_BG,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipText: {
    fontFamily: Fonts.rounded,
    color: TEXT_DIM,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: PURPLE,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
