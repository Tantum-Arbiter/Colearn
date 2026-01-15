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
import { SETTINGS_WALKTHROUGH_STEPS } from './tutorial-content';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SettingsTipsOverlayProps {
  /** Whether the account screen is currently active/visible */
  isActive?: boolean;
}

/**
 * Settings Tips Overlay - Shows guidance on first settings visit
 */
export function SettingsTipsOverlay({ isActive = true }: SettingsTipsOverlayProps) {
  const { hasSeenSettings, markSettingsViewed, shouldShowTutorial, isLoaded } = useTutorial();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const hasTriggeredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    // Wait for tutorial state to be loaded and only when screen is active
    if (!isLoaded || !isActive) {
      return;
    }

    // Only trigger once
    if (hasTriggeredRef.current) {
      return;
    }

    if (!hasSeenSettings && shouldShowTutorial('settings_walkthrough')) {
      console.log('[SettingsTipsOverlay] Triggering overlay show');
      hasTriggeredRef.current = true;

      timerRef.current = setTimeout(() => {
        console.log('[SettingsTipsOverlay] Setting isVisible to true');
        setIsVisible(true);
        opacity.value = withTiming(1, { duration: 300 });
        scale.value = withSpring(1, { damping: 15 });
      }, 500);
    }

    // Cleanup only on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoaded, hasSeenSettings, shouldShowTutorial, opacity, scale, isActive]);

  const handleNext = () => {
    if (currentStep < SETTINGS_WALKTHROUGH_STEPS.length - 1) {
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
      markSettingsViewed();
    }, 200);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!isVisible) return null;

  const currentTip = SETTINGS_WALKTHROUGH_STEPS[currentStep];
  const isLastStep = currentStep === SETTINGS_WALKTHROUGH_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      {/* Main container */}
      <View style={styles.overlay}>
        {/* Invisible touch-blocking layer - blocks ALL touches immediately on mount */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {}}
          onPressIn={() => {}}
          onPressOut={() => {}}
        />
        <Animated.View style={[styles.card, animatedCardStyle]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>
              {currentTip.id === 'settings_intro' && '⚙️'}
              {currentTip.id === 'login' && '🔐'}
              {currentTip.id === 'language' && '🌍'}
              {currentTip.id === 'avatar' && '👤'}
              {currentTip.id === 'accessibility' && '🔍'}
              {currentTip.id === 'screen_time' && '⏱️'}
            </Text>
          </View>

          <Text style={styles.title}>{currentTip.title}</Text>
          <Text style={styles.description}>{currentTip.description}</Text>

          <View style={styles.progressDots}>
            {SETTINGS_WALKTHROUGH_STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentStep && styles.dotActive]}
              />
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
              <Pressable
                onPress={handleNext}
                style={[styles.navButton, styles.nextButton]}
              >
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
  icon: { fontSize: 40 },
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
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive: { backgroundColor: '#4ECDC4', width: 24 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipButton: { padding: 10 },
  skipText: { fontSize: 14, fontFamily: Fonts.sans, fontWeight: '500' as const, color: '#888' },
  navButtons: { flexDirection: 'row', gap: 8 },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextButton: { minWidth: 100 },
  nextText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '700' as const,
    color: '#fff',
    marginRight: 4,
  },
});

