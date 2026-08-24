import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { formatDurationCompact } from '@/utils/time-formatting';

const ALERT_RED = '#E4483F';

// the badge and its two halo rings, sized so the outer ring still clears the
// title's line box at the largest accessibility scale
const BADGE_SIZE = 82;
const HALO_SIZE = 104;
const GLOW_SIZE = 132;

export interface ScreenTimeAlertHeaderProps {
  /** Seconds used today -- the figure the alert is about. */
  usageSeconds: number;
  /** The day's allowance, for the "of your daily limit" clause. */
  limitSeconds: number;
  testID?: string;
}

/**
 * The alert that leads the screen-time glance once the day's limit is spent.
 *
 * It replaces the dashboard's greeting rather than sitting above it: a
 * "Good afternoon" over a limit-reached alert reads as two voices talking at
 * once. It is deliberately only rendered in the exceeded state -- a full
 * alert treatment for a child who has used fourteen of sixty minutes would
 * contradict the encouragement banner further down the same page, and the
 * app does not tell parents off.
 */
export const ScreenTimeAlertHeader = memo(function ScreenTimeAlertHeader({
  usageSeconds,
  limitSeconds,
  testID = 'screen-time-alert-header',
}: ScreenTimeAlertHeaderProps) {
  const { t } = useTranslation();
  const { scaledFontSize, isTablet, contentMaxWidth } = useAccessibility();

  const used = formatDurationCompact(usageSeconds);
  const limit = formatDurationCompact(limitSeconds);

  // The figure is emphasised in red, so the sentence has to be broken around
  // it -- but it stays a single translatable sentence rather than three
  // fragments, because the figure does not sit in the same place in every
  // language. Splitting the finished translation on the value it was given
  // keeps the word order whatever the translator chose; if a locale drops the
  // placeholder the sentence still renders, just without the emphasis.
  const usageLine = t('screenTime.alert.usage', { used, limit });
  const figureAt = usageLine.indexOf(used);
  const beforeFigure = figureAt >= 0 ? usageLine.slice(0, figureAt) : usageLine;
  const afterFigure = figureAt >= 0 ? usageLine.slice(figureAt + used.length) : '';

  return (
    <View
      style={[
        styles.root,
        isTablet && { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' },
      ]}
      testID={testID}
    >
      <View style={styles.badgeBlock}>
        {/* two concentric halos rather than a shadow: a shadow this wide
            renders as a grey smear on Android, a ring does not */}
        <View style={[styles.ring, styles.glow]} pointerEvents="none" />
        <View style={[styles.ring, styles.halo]} pointerEvents="none" />
        <View
          style={styles.badge}
          accessibilityRole="image"
          accessibilityLabel={t('screenTime.alert.title')}
          testID="screen-time-alert-badge"
        >
          <Text style={[styles.badgeMark, { fontSize: scaledFontSize(42) }]}>!</Text>
        </View>
        <Image
          source={require('@/assets/images/screen-time/star-happy.webp')}
          style={styles.star}
          resizeMode="contain"
        />
      </View>

      <Text style={[styles.title, { fontSize: scaledFontSize(30) }]} testID="screen-time-alert-title">
        {t('screenTime.alert.title')}
      </Text>

      <Text style={[styles.usage, { fontSize: scaledFontSize(16) }]} testID="screen-time-alert-usage">
        {beforeFigure}
        {figureAt >= 0 && <Text style={styles.usageFigure}>{used}</Text>}
        {afterFigure}
      </Text>

      <Text style={[styles.break, { fontSize: scaledFontSize(16) }]} testID="screen-time-alert-break">
        {t('screenTime.alert.break')}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  badgeBlock: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ring: {
    position: 'absolute',
    borderColor: ALERT_RED,
  },
  glow: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    borderWidth: 1,
    opacity: 0.22,
  },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    borderWidth: 2,
    opacity: 0.45,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 3,
    borderColor: ALERT_RED,
    backgroundColor: 'rgba(228, 72, 63, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMark: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 48,
  },
  // the one warm note in the block, sitting where the design puts it: the
  // alert is about a limit, not about the child having done something wrong
  star: {
    position: 'absolute',
    right: 0,
    top: GLOW_SIZE * 0.28,
    width: 44,
    height: 44,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 2,
  },
  usage: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 8,
  },
  usageFigure: {
    color: ALERT_RED,
    fontWeight: '800',
  },
  break: {
    fontFamily: Fonts.rounded,
    color: ALERT_RED,
    textAlign: 'center',
    marginTop: 2,
  },
});
