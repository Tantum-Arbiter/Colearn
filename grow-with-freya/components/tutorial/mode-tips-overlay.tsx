import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTutorial, TutorialId } from '@/contexts/tutorial-context';
import { RECORD_MODE_TOUR_STEPS, NARRATE_MODE_TOUR_STEPS, TutorialStepWithKeys } from './tutorial-content';
import { useTranslation } from 'react-i18next';

interface ModeTipsOverlayProps {
  mode: 'record' | 'narrate';
  isActive: boolean;
  forceShow?: boolean;
  onClose?: () => void;
}

const TUTORIALS: Record<'record' | 'narrate', { id: TutorialId; steps: TutorialStepWithKeys[] }> = {
  record: { id: 'record_mode_tour', steps: RECORD_MODE_TOUR_STEPS },
  narrate: { id: 'narrate_mode_tour', steps: NARRATE_MODE_TOUR_STEPS },
};

const STEP_ICONS: Record<string, string> = {
  // Record mode icons
  'record_intro': '🎙️',
  'record_button_tip': '🔴',
  'playback_controls': '↺',
  'record_sound_tip': '🔊',
  'record_limit': '👨‍👩‍👧',
  'record_benefit': '💜',
  'record_navigation': '📖',
  // Narrate mode icons
  'narrate_intro': '🎧',
  'auto_playback': '📖',
  'narrate_controls': '▶️',
  'narrate_sound_tip': '🔊',
  'narrate_benefit': '💜',
};

/**
 * Mode Tips Overlay - Shows guidance for Record or Narrate mode on first use
 */
export function ModeTipsOverlay({ mode, isActive, forceShow = false, onClose }: ModeTipsOverlayProps) {
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { shouldShowTutorial, completeTutorial, startTutorial, activeTutorial } = useTutorial();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  const tutorial = TUTORIALS[mode];
  const steps = tutorial.steps;

  // Dynamic card width based on current screen dimensions
  const cardWidth = Math.min(screenWidth - 40, 340);
  // Check if we're on a phone in landscape
  const isPhoneLandscape = Math.min(screenWidth, screenHeight) < 600 && screenWidth > screenHeight;

  // Check if we should show the tutorial (compute once to avoid dependency issues)
  const shouldShow = isActive && shouldShowTutorial(tutorial.id) && activeTutorial === null;

  // Show tips when mode is active and tutorial not completed OR forceShow is true
  useEffect(() => {
    if (forceShow || shouldShow) {
      // Show immediately as page loads
      if (!forceShow) {
        startTutorial(tutorial.id);
      }
      setIsVisible(true);
      setCurrentStep(0);
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15 });
    }
  }, [shouldShow, tutorial.id, opacity, scale, startTutorial, forceShow]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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
    opacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setIsVisible(false);
      if (!forceShow) {
        // Only complete tutorial if not force-shown from menu
        completeTutorial();
      }
      onClose?.();
    }, 200);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!isVisible) return null;

  const currentTip = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // For phone landscape, use a more compact horizontal layout
  const landscapeCardStyle = isPhoneLandscape ? {
    flexDirection: 'row' as const,
    width: Math.min(screenWidth - 80, 500),
    padding: 16,
    alignItems: 'center' as const,
  } : {
    width: cardWidth,
  };

  // Use conditional rendering instead of Modal to avoid iOS crashes during orientation changes
  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.absoluteContainer}>
      {/* Main container */}
      <View style={styles.overlay}>
        {/* Invisible touch-blocking layer - blocks ALL touches immediately on mount */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {}}
          onPressIn={() => {}}
          onPressOut={() => {}}
        />
        <Animated.View style={[styles.card, landscapeCardStyle, animatedCardStyle]}>
          {isPhoneLandscape ? (
            // Landscape layout: icon on left, content on right
            <>
              <View style={[styles.iconContainer, { marginBottom: 0, marginRight: 16 }]}>
                <Text style={styles.icon}>{STEP_ICONS[currentTip.id] || '📖'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { marginBottom: 4 }]}>{t(currentTip.titleKey)}</Text>
                <Text style={[styles.description, { marginBottom: 8 }]}>{t(currentTip.descriptionKey)}</Text>
                <View style={[styles.buttonRow, { marginTop: 4 }]}>
                  <View style={styles.progressDots}>
                    {steps.map((_, i) => (
                      <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
                    ))}
                  </View>
                  <View style={styles.navButtons}>
                    {!isFirstStep && (
                      <Pressable onPress={handlePrevious} style={styles.navButton}>
                        <Ionicons name="chevron-back" size={18} color="#fff" />
                      </Pressable>
                    )}
                    <Pressable onPress={handleNext} style={[styles.navButton, styles.nextButton]}>
                      <Text style={[styles.nextText, { fontSize: 12 }]}>{isLastStep ? t('tutorial.buttons.gotIt') : t('tutorial.buttons.next')}</Text>
                    </Pressable>
                    <Pressable onPress={handleClose} style={[styles.skipButton, { marginLeft: 8 }]}>
                      <Text style={[styles.skipText, { fontSize: 11 }]}>{t('tutorial.buttons.skip')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          ) : (
            // Portrait layout: vertical stack
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{STEP_ICONS[currentTip.id] || '📖'}</Text>
              </View>

              <Text style={styles.title}>{t(currentTip.titleKey)}</Text>
              <Text style={styles.description}>{t(currentTip.descriptionKey)}</Text>

              <View style={styles.progressDots}>
                {steps.map((_, i) => (
                  <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
                ))}
              </View>

              <View style={styles.buttonRow}>
                <Pressable onPress={handleClose} style={styles.skipButton}>
                  <Text style={styles.skipText}>{t('tutorial.buttons.skip')}</Text>
                </Pressable>

                <View style={styles.navButtons}>
                  {!isFirstStep && (
                    <Pressable onPress={handlePrevious} style={styles.navButton}>
                      <Ionicons name="chevron-back" size={20} color="#fff" />
                    </Pressable>
                  )}
                  <Pressable onPress={handleNext} style={[styles.navButton, styles.nextButton]}>
                    <Text style={styles.nextText}>{isLastStep ? t('tutorial.buttons.gotIt') : t('tutorial.buttons.next')}</Text>
                    {!isLastStep && <Ionicons name="chevron-forward" size={18} color="#fff" />}
                  </Pressable>
                </View>
              </View>
            </>
          )}
          </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4000, // Above all other modals
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    // Base width - overridden dynamically in component
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
    backgroundColor: '#F0F8FF',
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
    fontWeight: '700' as const,
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
    marginBottom: 20,
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
    fontWeight: '500' as const,
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
    fontWeight: '700' as const,
    color: '#fff',
    marginRight: 4,
  },
});

