import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { HOME_CARD_TINTS, HOME_CARD_TYPE, HOME_JOURNEY_MOTION } from '@/constants/home-journey';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface FindStoryPillProps {
  onPress: () => void;
  testID?: string;
}

export const FindStoryPill = memo(function FindStoryPill({ onPress, testID = 'find-story-pill' }: FindStoryPillProps) {
  const { t } = useTranslation();
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: HOME_JOURNEY_MOTION.pressInMs });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: HOME_JOURNEY_MOTION.pressOutMs });
  }, [pressed]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - HOME_JOURNEY_MOTION.pressScale) * pressed.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t('home.milestone.findStory')}
      accessibilityHint={t('home.milestone.hint')}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.pill, style]}
    >
      <Text style={styles.text}>{t('home.milestone.findStory')} ›</Text>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: HOME_CARD_TINTS.findFill,
    borderWidth: 1,
    borderColor: HOME_CARD_TINTS.findEdge,
  },
  text: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.cta,
    fontWeight: '700',
    color: HOME_CARD_TINTS.title,
  },
});
