/**
 * CelebrationOverlay
 *
 * Semi-transparent overlay with a centred card shown when a game round
 * is completed.  An ✕ button in the card's top-right corner closes it.
 * Calm, warm, age-appropriate — no aggressive gamification.
 */

import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

interface CelebrationOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Called when user taps "Continue" (e.g. show bridge overlay) */
  onContinue: () => void;
  /** Called when user taps close X (e.g. go back) */
  onClose: () => void;
}

export function CelebrationOverlay({
  visible,
  onContinue,
  onClose,
}: CelebrationOverlayProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  // Fade-in animations
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      const ease = Easing.out(Easing.cubic);
      overlayOpacity.value = withTiming(1, { duration: 300, easing: ease });
      cardScale.value = withDelay(100, withTiming(1, { duration: 350, easing: ease }));
    } else {
      overlayOpacity.value = 0;
      cardScale.value = 0.9;
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  if (!visible) return null;

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onContinue();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Animated.View style={[styles.backdrop, overlayAnimatedStyle]} testID="celebration-overlay">
      {/* Tap backdrop to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      {/* Card */}
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        {/* Close button — top right */}
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
          hitSlop={12}
        >
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Message */}
        <Text style={[styles.title, { fontSize: scaledFontSize(22) }]}>
          {t('games.wellDone')}
        </Text>
        <Text style={[styles.subtitle, { fontSize: scaledFontSize(13) }]}>
          {t('games.roundComplete')}
        </Text>

        {/* Continue button */}
        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel={t('games.continue')}
        >
          <Text style={[styles.continueText, { fontSize: scaledFontSize(14) }]}>
            {t('games.continue')}
          </Text>
          <Ionicons name="arrow-forward" size={14} color="#1E3A8A" />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: 'center',
    minWidth: 240,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  title: {
    fontFamily: Fonts.rounded,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Fonts.primary,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#4ADE80',
  },
  continueText: {
    fontFamily: Fonts.rounded,
    color: '#1E3A8A',
    fontWeight: '700',
  },
});
