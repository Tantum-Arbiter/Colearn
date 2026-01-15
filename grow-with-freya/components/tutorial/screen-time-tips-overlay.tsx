import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTutorial } from '@/contexts/tutorial-context';
import { SCREEN_TIME_TIPS } from './tutorial-content';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScreenTimeTipsOverlayProps {
  isActive?: boolean;
}

const STEP_ICONS: Record<string, string> = {
  'screen_time_intro': '⏱️',
  'age_based_limits': '👶',
  'weekly_heatmap': '📊',
  'custom_reminders': '🔔',
  'routine_building': '📅',
};

export function ScreenTimeTipsOverlay({ isActive = true }: ScreenTimeTipsOverlayProps) {
  const { hasSeenScreenTime, markScreenTimeViewed, shouldShowTutorial, isLoaded } = useTutorial();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const hasTriggeredRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    console.log('[ScreenTimeTipsOverlay] Check:', {
      isLoaded,
      isActive,
      hasTriggered: hasTriggeredRef.current,
      hasSeenScreenTime,
      shouldShow: shouldShowTutorial('screen_time_tips'),
    });

    if (!isLoaded || !isActive) {
      console.log('[ScreenTimeTipsOverlay] Early return - isLoaded or isActive false');
      return;
    }

    if (hasTriggeredRef.current) {
      console.log('[ScreenTimeTipsOverlay] Already triggered');
      return;
    }

    if (!hasSeenScreenTime && shouldShowTutorial('screen_time_tips')) {
      console.log('[ScreenTimeTipsOverlay] Triggering overlay!');
      hasTriggeredRef.current = true;

      timerRef.current = setTimeout(() => {
        console.log('[ScreenTimeTipsOverlay] Setting isVisible to true');
        setIsVisible(true);
        opacity.value = withTiming(1, { duration: 300 });
        scale.value = withSpring(1, { damping: 15 });
      }, 500);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoaded, hasSeenScreenTime, shouldShowTutorial, opacity, scale, isActive]);

  const handleNext = () => {
    if (currentStep < SCREEN_TIME_TIPS.length - 1) {
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
      markScreenTimeViewed();
    }, 200);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!isVisible) return null;

  const currentTip = SCREEN_TIME_TIPS[currentStep];
  const isLastStep = currentStep === SCREEN_TIME_TIPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {}}
          onPressIn={() => {}}
          onPressOut={() => {}}
        />
        <Animated.View style={[styles.card, animatedCardStyle]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{STEP_ICONS[currentTip.id] || '⏱️'}</Text>
          </View>

          <Text style={styles.title}>{currentTip.title}</Text>
          <Text style={styles.description}>{currentTip.description}</Text>

          <View style={styles.progressDots}>
            {SCREEN_TIME_TIPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.buttonRow}>
            <Pressable onPress={handleClose} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip All</Text>
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
    backgroundColor: '#2a1a4a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9b59b6',
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(155, 89, 182, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#9b59b6',
    width: 20,
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
    fontFamily: Fonts.body,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(155, 89, 182, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nextButton: {
    backgroundColor: '#9b59b6',
  },
  nextText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#fff',
    marginRight: 4,
  },
});

