import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { RADIUS_LARGE, SPACE_2, SPACE_3, SPACE_4, SPACE_5 } from '@/components/child-ui/tokens';
import { Badge } from './progress-model';
import { BadgeArtwork } from './badge-artwork';
import { BadgeProgress } from './badge-progress';

const MAX_DOTS = 6;

interface BadgeDetailSheetProps {
  badge: Badge | null;
  onClose: () => void;
  onRecommend: (badge: Badge) => void;
}

export function BadgeDetailSheet({ badge, onClose, onRecommend }: BadgeDetailSheetProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  if (badge === null) return null;

  return (
    <View style={styles.overlay} testID="badge-detail-overlay">
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('progress.close')} />
      {badge && (
        <View style={styles.sheet} testID="badge-detail-sheet">
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

          <Text style={[styles.title, { fontSize: scaledFontSize(22) }]}>{t(badge.titleKey)}</Text>
          <Text style={[styles.description, { fontSize: scaledFontSize(15) }]}>
            {t(badge.descriptionKey)}
          </Text>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50,
    elevation: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
