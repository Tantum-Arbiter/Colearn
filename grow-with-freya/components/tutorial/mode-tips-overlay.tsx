import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTutorial, TutorialId } from '@/contexts/tutorial-context';
import { RECORD_MODE_TOUR_STEPS, NARRATE_MODE_TOUR_STEPS } from './tutorial-content';
import { TutorialStep } from './spotlight-overlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ModeTipsOverlayProps {
  mode: 'record' | 'narrate';
  isActive: boolean;
  forceShow?: boolean;
  onClose?: () => void;
}

const TUTORIALS: Record<'record' | 'narrate', { id: TutorialId; steps: Omit<TutorialStep, 'target'>[] }> = {
  record: { id: 'record_mode_tour', steps: RECORD_MODE_TOUR_STEPS },
  narrate: { id: 'narrate_mode_tour', steps: NARRATE_MODE_TOUR_STEPS },
};

const STEP_ICONS: Record<string, string> = {
  // Record mode icons
  'record_intro': '🎙️',
  'record_button_tip': '🔴',
  'playback_controls': '↺',
  'record_limit': '👨‍👩‍👧',
  'record_benefit': '💜',
  'record_navigation': '📖',
  // Narrate mode icons
  'narrate_intro': '🎧',
  'auto_playback': '📖',
  'narrate_controls': '▶️',
  'narrate_benefit': '💜',
};

/**
 * Mode Tips Overlay - Shows guidance for Record or Narrate mode on first use
 */
export function ModeTipsOverlay({ mode, isActive, forceShow = false, onClose }: ModeTipsOverlayProps) {
  const { shouldShowTutorial, completeTutorial, startTutorial, activeTutorial } = useTutorial();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  const tutorial = TUTORIALS[mode];
  const steps = tutorial.steps;

  // Show tips when mode is active and tutorial not completed OR forceShow is true
  useEffect(() => {
    if (forceShow) {
      // Immediately show when forceShow is true
      setIsVisible(true);
      setCurrentStep(0);
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15 });
    } else if (isActive && shouldShowTutorial(tutorial.id) && activeTutorial === null) {
      // Small delay to let UI settle
      const timer = setTimeout(() => {
        startTutorial(tutorial.id);
        setIsVisible(true);
        setCurrentStep(0);
        opacity.value = withTiming(1, { duration: 300 });
        scale.value = withSpring(1, { damping: 15 });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isActive, shouldShowTutorial, tutorial.id, opacity, scale, activeTutorial, startTutorial, forceShow]);

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

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, animatedCardStyle]}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{STEP_ICONS[currentTip.id] || '📖'}</Text>
          </View>

          <Text style={styles.title}>{currentTip.title}</Text>
          <Text style={styles.description}>{currentTip.description}</Text>

          {/* Progress dots */}
          <View style={styles.progressDots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
            ))}
          </View>

          {/* Navigation */}
          <View style={styles.buttonRow}>
            <Pressable onPress={handleClose} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            <View style={styles.navButtons}>
              {!isFirstStep && (
                <Pressable onPress={handlePrevious} style={styles.navButton}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </Pressable>
              )}
              <Pressable onPress={handleNext} style={[styles.navButton, styles.nextButton]}>
                <Text style={styles.nextText}>{isLastStep ? 'Got it!' : 'Next'}</Text>
                {!isLastStep && <Ionicons name="chevron-forward" size={18} color="#fff" />}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 340);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
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

