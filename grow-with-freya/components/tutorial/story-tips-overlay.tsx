import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTutorial } from '@/contexts/tutorial-context';
import { STORY_READER_TIPS } from './tutorial-content';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryTipsOverlayProps {
  storyId: string;
}

/**
 * Story Tips Overlay - Shows parent guidance tips on first story opened
 * Displays a series of slides about how to maximize story time
 */
export function StoryTipsOverlay({ storyId }: StoryTipsOverlayProps) {
  const insets = useSafeAreaInsets();
  const { hasSeenFirstStory, markFirstStoryViewed, shouldShowTutorial } = useTutorial();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  // Show tips on first story if tutorial not completed
  useEffect(() => {
    if (!hasSeenFirstStory && shouldShowTutorial('story_reader_tips')) {
      // Small delay to let story load first
      const timer = setTimeout(() => {
        setIsVisible(true);
        opacity.value = withTiming(1, { duration: 300 });
        scale.value = withSpring(1, { damping: 15 });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenFirstStory, shouldShowTutorial, opacity, scale]);

  const handleNext = () => {
    if (currentStep < STORY_READER_TIPS.length - 1) {
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
      markFirstStoryViewed();
    }, 200);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!isVisible) return null;

  const currentTip = STORY_READER_TIPS[currentStep];
  const isLastStep = currentStep === STORY_READER_TIPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, animatedCardStyle]}>
          {/* Icon/Emoji */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>
              {currentTip.id === 'story_welcome' && '📖'}
              {currentTip.id === 'interactive_elements' && '✨'}
              {currentTip.id === 'point_and_discuss' && '👆'}
              {currentTip.id === 'pause_and_predict' && '🤔'}
              {currentTip.id === 'voices_and_sounds' && '🎭'}
              {currentTip.id === 'navigate_story' && '📱'}
            </Text>
          </View>

          <Text style={styles.title}>{currentTip.title}</Text>
          <Text style={styles.description}>{currentTip.description}</Text>

          {/* Progress dots */}
          <View style={styles.progressDots}>
            {STORY_READER_TIPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentStep && styles.dotActive]}
              />
            ))}
          </View>

          {/* Navigation */}
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
                <Text style={styles.nextText}>{isLastStep ? 'Start Reading!' : 'Next'}</Text>
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

