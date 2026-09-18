import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ACCENT_GOLD, BORDER_DEFAULT, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CHILD_UI_MOTION, CHILD_UI_SCALE, motionDuration } from '@/constants/child-ui-motion';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { RADIUS_CARD, SPACE_1, SPACE_2, SPACE_3, SPACE_4 } from '@/components/child-ui/tokens';
import { Challenge } from './progress-model';
import { BadgeArtwork } from './badge-artwork';
import { BadgeProgress } from './badge-progress';

const CARD_SURFACE = 'rgba(7, 29, 84, 0.55)';
const LAVENDER_TEXT = 'rgba(199, 186, 255, 0.95)';

interface ChallengeCardProps {
  challenge: Challenge;
  onPress: (challenge: Challenge) => void;
}

export function ChallengeCard({ challenge, onPress }: ChallengeCardProps) {
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
    onPress(challenge);
  }, [onPress, challenge]);

  const periodKey = challenge.period === 'weekly' ? 'progress.thisWeek' : 'progress.thisMonth';

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        testID={`challenge-card-${challenge.period}`}
        accessibilityRole="button"
        accessibilityLabel={`${t(periodKey)}: ${t(challenge.titleKey)}`}
        accessibilityValue={{ text: t('progress.count', { current: challenge.currentProgress, target: challenge.targetProgress }) }}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        <BadgeArtwork artwork={challenge.artwork} status={challenge.status} />
        <View style={styles.body}>
          <View style={styles.periodRow}>
            <Ionicons
              name={challenge.period === 'weekly' ? 'calendar-outline' : 'calendar'}
              size={14}
              color={ACCENT_GOLD}
            />
            <Text testID={`challenge-period-${challenge.period}`} style={[styles.period, { fontSize: scaledFontSize(12) }]}>
              {t(periodKey)}
            </Text>
          </View>
          <Text style={[styles.title, { fontSize: scaledFontSize(15) }]} numberOfLines={2}>
            {t(challenge.titleKey)}
          </Text>
          <Text style={[styles.description, { fontSize: scaledFontSize(12) }]} numberOfLines={2}>
            {t(challenge.descriptionKey)}
          </Text>
          <BadgeProgress
            current={challenge.currentProgress}
            target={challenge.targetProgress}
            earned={challenge.status === 'earned'}
            testID={`challenge-progress-${challenge.period}`}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_4,
    borderRadius: RADIUS_CARD,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: CARD_SURFACE,
    padding: SPACE_3,
  },
  body: {
    flex: 1,
    gap: SPACE_1,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_1,
  },
  period: {
    color: LAVENDER_TEXT,
    fontFamily: Fonts.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  description: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '500',
    marginBottom: SPACE_2,
  },
});
