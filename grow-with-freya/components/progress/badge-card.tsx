import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { BORDER_DEFAULT, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CHILD_UI_MOTION, CHILD_UI_SCALE, motionDuration } from '@/constants/child-ui-motion';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { RADIUS_CARD, SPACE_2, SPACE_3 } from '@/components/child-ui/tokens';
import { Badge } from './progress-model';
import { BadgeArtwork } from './badge-artwork';
import { BadgeProgress } from './badge-progress';

const CARD_SURFACE = 'rgba(7, 29, 84, 0.55)';

interface BadgeCardProps {
  badge: Badge;
  width: number;
  onPress: (badge: Badge) => void;
}

export function BadgeCard({ badge, width, onPress }: BadgeCardProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const pressScale = useSharedValue(1);
  const duration = motionDuration(CHILD_UI_MOTION.cardTap, reduceMotion);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(CHILD_UI_SCALE.cardPressed, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(badge);
  }, [onPress, badge]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        testID={`badge-card-${badge.id}`}
        accessibilityRole="button"
        accessibilityLabel={t(badge.titleKey)}
        accessibilityValue={{ text: t('progress.count', { current: badge.currentProgress, target: badge.targetProgress }) }}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { width }]}
      >
        <BadgeArtwork artwork={badge.artwork} status={badge.status} />
        <Text style={[styles.title, { fontSize: scaledFontSize(13) }]} numberOfLines={2}>
          {t(badge.titleKey)}
        </Text>
        <Text style={[styles.description, { fontSize: scaledFontSize(11) }]} numberOfLines={3}>
          {t(badge.descriptionKey)}
        </Text>
        <BadgeProgress
          current={badge.currentProgress}
          target={badge.targetProgress}
          earned={badge.status === 'earned'}
          testID={`badge-progress-${badge.id}`}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS_CARD,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: CARD_SURFACE,
    padding: SPACE_3,
    alignItems: 'center',
    gap: SPACE_2,
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '500',
    textAlign: 'center',
    minHeight: 40,
  },
});
