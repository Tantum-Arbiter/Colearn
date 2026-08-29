import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ACCENT_PURPLE, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CHILD_UI_MOTION, CHILD_UI_SCALE, motionDuration } from '@/constants/child-ui-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { PLAY_DIAMETER_CARD, PLAY_DIAMETER_FEATURED } from '@/components/child-ui/tokens';

const HIGHLIGHT_GRADIENT = ['#9C8FFB', ACCENT_PURPLE] as const;

interface StoryPlayButtonProps {
  variant: 'featured' | 'card';
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

export function StoryPlayButton({ variant, onPress, accessibilityLabel, testID }: StoryPlayButtonProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const diameter = variant === 'featured' ? PLAY_DIAMETER_FEATURED : PLAY_DIAMETER_CARD;
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const duration = motionDuration(CHILD_UI_MOTION.readPress, reduceMotion);

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(CHILD_UI_SCALE.readPressed, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        testID={testID ?? `story-play-${variant}`}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, { width: diameter, height: diameter, borderRadius: diameter / 2 }]}
      >
        <LinearGradient
          colors={HIGHLIGHT_GRADIENT}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.fill, { borderRadius: diameter / 2 }]}
        >
          <Ionicons
            name="play"
            size={Math.round(diameter * (variant === 'featured' ? 0.34 : 0.5))}
            color={TEXT_PRIMARY}
            style={styles.playIcon}
          />
          {variant === 'featured' && (
            <Text testID="story-play-label" style={styles.label} numberOfLines={1}>
              {t('catalogue.read')}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    shadowColor: ACCENT_PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    marginLeft: 2,
  },
  label: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: -2,
  },
});
