import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTutorial } from '@/contexts/tutorial-context';
import { EMOTION_CARDS_TIPS } from './tutorial-content';
import { useTranslation } from 'react-i18next';

interface EmotionCardsTipsOverlayProps {
  forceShow?: boolean;
  onClose?: () => void;
}

const STEP_ICONS: Record<string, string> = {
  emotion_cards_welcome: '🎭',
  emotion_cards_together: '👨‍👩‍👧',
  emotion_cards_connect: '💡',
  emotion_cards_scenarios: '🎮',
  emotion_cards_themes: '🎨',
};

/**
 * Emotion Cards Tips Overlay - Shows parent guidance tips on first emotion cards visit
 */
export function EmotionCardsTipsOverlay({ forceShow = false, onClose }: EmotionCardsTipsOverlayProps) {
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { hasSeenEmotionCards, markEmotionCardsViewed, shouldShowTutorial } = useTutorial();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const overlayOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);

  const cardWidth = Math.min(screenWidth - 40, 340);
  // Limit image size to fit within card (with padding)
  const maxImageSize = cardWidth - 48; // Account for card padding
  const imageSize = Math.min(screenWidth * 0.6, maxImageSize, 250);
  const isPhoneLandscape = Math.min(screenWidth, screenHeight) < 600 && screenWidth > screenHeight;

  const shouldShow = !hasSeenEmotionCards && shouldShowTutorial('emotion_cards_tips');

  useEffect(() => {
    if (forceShow) {
      setIsMounted(true);
      setIsVisible(true);
      setCurrentStep(0);
      overlayOpacity.value = withTiming(1, { duration: 300 });
      cardOpacity.value = withTiming(1, { duration: 300 });
      cardScale.value = withSpring(1, { damping: 20, stiffness: 200 });
    } else if (shouldShow) {
      setIsMounted(true);
      overlayOpacity.value = withTiming(0.5, { duration: 300 });

      const timer = setTimeout(() => {
        setIsVisible(true);
        overlayOpacity.value = withTiming(1, { duration: 300 });
        cardOpacity.value = withTiming(1, { duration: 300 });
        cardScale.value = withSpring(1, { damping: 20, stiffness: 200 });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shouldShow, overlayOpacity, cardOpacity, cardScale, forceShow]);

  const handleNext = () => {
    if (currentStep < EMOTION_CARDS_TIPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    cardOpacity.value = withTiming(0, { duration: 200 });
    overlayOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setIsVisible(false);
      setIsMounted(false);
      if (!forceShow) {
        markEmotionCardsViewed();
      }
      onClose?.();
    }, 200);
  };

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const currentTip = EMOTION_CARDS_TIPS[currentStep];
  if (!isMounted) return null;

  const isLastStep = currentStep === EMOTION_CARDS_TIPS.length - 1;
  const isFirstStep = currentStep === 0;

  const landscapeCardStyle = isPhoneLandscape ? {
    flexDirection: 'row' as const,
    width: Math.min(screenWidth - 80, 500),
    padding: 16,
    alignItems: 'center' as const,
  } : {
    width: cardWidth,
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, animatedOverlayStyle]} pointerEvents="auto">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {}}
          onPressIn={() => {}}
          onPressOut={() => {}}
        />
      </Animated.View>

      {isVisible && currentTip && (
        <View style={styles.cardContainer} pointerEvents="box-none">
          <Animated.View style={[styles.card, landscapeCardStyle, animatedCardStyle]}>
            {currentTip.image ? (
              <Image source={currentTip.image} style={[styles.tipImage, { width: imageSize, height: imageSize }]} resizeMode="contain" />
            ) : (
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{STEP_ICONS[currentTip.id] || '🎭'}</Text>
              </View>
            )}

            <Text style={styles.title}>{t(currentTip.titleKey)}</Text>
            <Text style={styles.description}>{t(currentTip.descriptionKey)}</Text>

            <View style={styles.progressDots}>
              {EMOTION_CARDS_TIPS.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
              ))}
            </View>

            <View style={styles.buttonRow}>
              <Pressable onPress={handleClose} style={styles.skipButton}>
                <Text style={styles.skipText}>{t('tutorial.buttons.skipAll')}</Text>
              </Pressable>
              <View style={styles.navButtons}>
                {!isFirstStep && (
                  <Pressable onPress={handlePrevious} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </Pressable>
                )}
                <Pressable onPress={handleNext} style={[styles.navButton, styles.nextButton]}>
                  <Text style={styles.nextText}>{isLastStep ? t('tutorial.buttons.letsGo') : t('tutorial.buttons.next')}</Text>
                  {!isLastStep && <Ionicons name="chevron-forward" size={18} color="#fff" />}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  cardContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: '#4a4a5a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  tipImage: {
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  dotActive: {
    backgroundColor: '#4ECDC4',
    width: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '500',
    color: '#888',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextButton: {
    minWidth: 100,
  },
  nextText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#fff',
    marginRight: 4,
  },
});

