import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  ACCENT_GOLD,
  ACCENT_PURPLE,
  BORDER_DEFAULT,
  NIGHT_DEEP,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useCoversJourneyBar } from '@/components/child-ui/journey-bar-cover';
import { PanelClouds } from '@/components/ui/panel-clouds';
import { PanelStarfield } from '@/components/ui/panel-starfield';
import { StarDivider } from '@/components/ui/star-divider';
import { RADIUS_LARGE, SPACE_2, SPACE_3, SPACE_4, SPACE_5 } from '@/components/child-ui/tokens';
import { Badge, badgeDescription, badgeTitle } from './progress-model';
import { BadgeArtwork } from './badge-artwork';
import { BadgeProgress } from './badge-progress';

const MAX_DOTS = 6;

export const BADGE_SHEET_MOTION = { inMs: 320, outMs: 240 } as const;

interface BadgeDetailSheetProps {
  badge: Badge | null;
  onClose: () => void;
  onRecommend: (badge: Badge) => void;
}

export function BadgeDetailSheet({ badge: requested, onClose, onRecommend }: BadgeDetailSheetProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const { height } = useWindowDimensions();
  const [badge, setBadge] = useState<Badge | null>(requested);
  if (requested !== null && requested !== badge) setBadge(requested);
  const open = requested !== null;
  const leaving = !open && badge !== null;
  // Declared before the early return so the bar goes the moment a badge is
  // chosen, rather than lingering over the sheet that just covered it.
  useCoversJourneyBar(badge !== null);

  const slide = useSharedValue(height);
  const shade = useSharedValue(0);
  useEffect(() => {
    if (open) {
      slide.value = withTiming(0, { duration: BADGE_SHEET_MOTION.inMs, easing: Easing.out(Easing.cubic) });
      shade.value = withTiming(1, { duration: BADGE_SHEET_MOTION.inMs });
      return;
    }
    shade.value = withTiming(0, { duration: BADGE_SHEET_MOTION.outMs });
    slide.value = withTiming(height, { duration: BADGE_SHEET_MOTION.outMs, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setBadge)(null);
    });
  }, [open, height, slide, shade]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  if (badge === null) return null;

  return (
    <View style={styles.overlay} testID="badge-detail-overlay" pointerEvents={leaving ? 'none' : 'auto'}>
      <Animated.View style={[styles.backdrop, shadeStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('progress.close')} />
      </Animated.View>
      {badge && (
        <Animated.View style={[styles.sheet, sheetStyle]} testID="badge-detail-sheet">
          <PanelStarfield testID="badge-detail-stars" />
          <PanelClouds testID="badge-detail-clouds" />

          <Pressable
            testID="badge-detail-close"
            accessibilityRole="button"
            accessibilityLabel={t('progress.close')}
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={TEXT_PRIMARY} />
          </Pressable>

          <BadgeArtwork artwork={badge.artwork} status={badge.status} />

          <Text style={[styles.title, { fontSize: scaledFontSize(22) }]}>{badgeTitle(badge, t)}</Text>
          <Text style={[styles.description, { fontSize: scaledFontSize(15) }]}>
            {badgeDescription(badge, t)}
          </Text>
          <StarDivider testID="badge-detail-divider" />

          <Text style={[styles.soFar, { fontSize: scaledFontSize(14) }]}>
            {t('progress.soFar', { count: badge.currentProgress })}
          </Text>

          {badge.targetProgress <= MAX_DOTS ? (
            <View style={styles.dots} testID="badge-detail-dots">
              {Array.from({ length: badge.targetProgress }, (_item, index) => (
                <View
                  key={index}
                  testID={index < badge.currentProgress ? 'badge-dot-filled' : 'badge-dot-empty'}
                  style={[styles.dot, index < badge.currentProgress ? styles.dotFilled : styles.dotEmpty]}
                />
              ))}
            </View>
          ) : (
            <View style={styles.pillWrapper}>
              <BadgeProgress
                current={badge.currentProgress}
                target={badge.targetProgress}
                earned={badge.status === 'earned'}
                testID="badge-detail-progress"
              />
            </View>
          )}

          {badge.recommendation && badge.status !== 'earned' && (
            <Pressable
              testID="badge-detail-recommendation"
              accessibilityRole="button"
              accessibilityLabel={t(badge.recommendation.labelKey)}
              onPress={() => onRecommend(badge)}
              style={styles.recommendation}
            >
              <Text style={[styles.recommendationLabel, { fontSize: scaledFontSize(15) }]}>
                {t(badge.recommendation.labelKey)}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={TEXT_PRIMARY} />
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 50,
    elevation: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4, 16, 47, 0.6)',
  },
  sheet: {
    backgroundColor: NIGHT_DEEP,
    borderTopLeftRadius: RADIUS_LARGE,
    borderTopRightRadius: RADIUS_LARGE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    padding: SPACE_5,
    paddingBottom: SPACE_5 + SPACE_4,
    alignItems: 'center',
    // The cloud follows the sheet's rounded top corners rather than spilling.
    overflow: 'hidden',
    gap: SPACE_3,
  },
  closeButton: {
    position: 'absolute',
    top: SPACE_4,
    right: SPACE_4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(80, 120, 200, 0.32)',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  soFar: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: SPACE_2,
    marginVertical: SPACE_2,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotFilled: {
    backgroundColor: ACCENT_GOLD,
  },
  dotEmpty: {
    borderWidth: 1.5,
    borderColor: 'rgba(190, 215, 255, 0.5)',
  },
  pillWrapper: {
    alignSelf: 'stretch',
    marginVertical: SPACE_2,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
    backgroundColor: ACCENT_PURPLE,
    borderRadius: 22,
    paddingHorizontal: SPACE_5,
    height: 46,
  },
  recommendationLabel: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
});
