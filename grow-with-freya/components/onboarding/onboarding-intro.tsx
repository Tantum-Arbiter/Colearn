import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

export const ONBOARDING_INTRO = {
  message: 'Sell what it is here, the moment a user opens - a short video showcasing functionality/value for kid and parent',
  start: 'Start onboarding',
  maxWidth: 520,
} as const;

interface OnboardingIntroProps {
  onStart: () => void;
}

export function OnboardingIntro({ onStart }: OnboardingIntroProps) {
  const insets = useSafeAreaInsets();
  const { scaledFontSize } = useAccessibility();
  const messageSize = scaledFontSize(20);

  return (
    <View testID="onboarding-intro" style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.middle}>
        <Text testID="onboarding-intro-message" style={[styles.message, { fontSize: messageSize, lineHeight: Math.round(messageSize * 1.4) }]}>
          {ONBOARDING_INTRO.message}
        </Text>
      </View>
      <Pressable
        testID="onboarding-intro-start"
        accessibilityRole="button"
        accessibilityLabel={ONBOARDING_INTRO.start}
        onPress={onStart}
        style={({ pressed }) => [styles.start, pressed && styles.startPressed]}
      >
        <Text style={[styles.startLabel, { fontSize: scaledFontSize(17) }]}>{ONBOARDING_INTRO.start}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    maxWidth: ONBOARDING_INTRO.maxWidth,
    color: '#1B205E',
    fontFamily: Fonts.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  start: {
    maxWidth: ONBOARDING_INTRO.maxWidth,
    width: '100%',
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: '#6D5DF5',
    alignItems: 'center',
  },
  startPressed: {
    opacity: 0.85,
  },
  startLabel: {
    color: '#FFFFFF',
    fontFamily: Fonts.primary,
    fontWeight: '800',
  },
});
