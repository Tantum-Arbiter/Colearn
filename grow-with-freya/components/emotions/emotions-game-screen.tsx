import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { EmotionCard } from './emotion-card';
import { getRandomEmotion, getRandomPromptIndex, EMOTION_GAME_CONFIG } from '@/data/emotions';
import { Emotion, EmotionGameState, EmotionTheme } from '@/types/emotion';
import { getThemeNameKey, getThemeName } from '@/data/emotion-themes';
import { Fonts } from '@/constants/theme';

import { MusicControl } from '../ui/music-control';
import * as Haptics from 'expo-haptics';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useBackButtonText } from '@/hooks/use-back-button-text';

interface EmotionsGameScreenProps {
  onBack: () => void;
  onGameComplete: () => void;
  selectedTheme?: EmotionTheme;
}

export function EmotionsGameScreen({ onBack, onGameComplete, selectedTheme = 'emoji' }: EmotionsGameScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();
  const backButtonText = useBackButtonText();

  // Initialize with an emotion immediately to avoid loading screen
  const initialEmotion = getRandomEmotion([]);
  const initialPromptIndex = getRandomPromptIndex();

  const [gameState, setGameState] = useState<EmotionGameState>({
    currentEmotion: initialEmotion,
    score: 0,
    level: 1,
    completedEmotions: [],
    currentPrompt: String(initialPromptIndex), // Store prompt index as string
    isGameActive: true,
    selectedTheme: selectedTheme
  });

  // Get the translated prompt based on current emotion and prompt index
  const currentPrompt = gameState.currentEmotion
    ? t(`emotions.prompts.${gameState.currentEmotion.id}.${gameState.currentPrompt}`)
    : '';

  const [timeLeft, setTimeLeft] = useState(EMOTION_GAME_CONFIG.timePerEmotion || 15);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [isCardAnimating, setIsCardAnimating] = useState(true);

  // Screen fade-in animation (like MainMenuEntrance)
  const screenOpacity = useSharedValue(0);

  // Animation values - start with card hidden for spin-in animation
  const cardScale = useSharedValue(0);
  const cardRotation = useSharedValue(360);
  const promptOpacity = useSharedValue(0);

  // Run screen fade-in and card spin-in animation on mount
  useEffect(() => {
    // Fade in the entire screen first (like MainMenuEntrance)
    screenOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic)
    });

    // Spin in the first card (starts after a small delay for screen fade)
    setTimeout(() => {
      cardRotation.value = withTiming(0, {
        duration: 600,
        easing: Easing.inOut(Easing.cubic)
      });

      cardScale.value = withSequence(
        withTiming(1.1, { duration: 400 }),
        withTiming(1, { duration: 200 })
      );
    }, 100);

    // Fade in prompt after delay
    setTimeout(() => {
      promptOpacity.value = withTiming(1, { duration: 400 });
    }, 400);

    // Enable button presses after animation completes
    setTimeout(() => {
      setIsCardAnimating(false);
    }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerActive(false);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerActive, timeLeft]);

  const handleEmotionPress = (selectedEmotion: Emotion) => {
    if (!gameState.isGameActive || !gameState.currentEmotion || isCardAnimating) return;

    setIsTimerActive(false);

    const isCorrect = selectedEmotion.id === gameState.currentEmotion.id;

    // Haptic feedback
    Haptics.impactAsync(isCorrect ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);

    if (isCorrect) {
      // Don't update completedEmotions here - do it in startSpinTransition
      setGameState(prev => ({ ...prev, isGameActive: false }));

      // Start spinning transition with the correct emotion
      startSpinTransition(selectedEmotion.id);
    } else {
      // For incorrect answers, just try again with same emotion
      setGameState(prev => ({ ...prev, isGameActive: true }));
      setTimeLeft(EMOTION_GAME_CONFIG.timePerEmotion || 15);
      setIsTimerActive(true);
    }
  };

  const handleTimeUp = () => {
    setGameState(prev => ({ ...prev, isGameActive: false }));
    // Start spinning transition to next emotion (no correct answer)
    startSpinTransition();
  };

  const startSpinTransition = (correctEmotionId?: string) => {
    setIsCardAnimating(true); // Disable button presses during transition

    // First, fade out the prompt text
    promptOpacity.value = withTiming(0, { duration: 200 });

    // Spin out the current card
    cardRotation.value = withTiming(cardRotation.value + 360, {
      duration: 600,
      easing: Easing.inOut(Easing.cubic)
    });

    cardScale.value = withSequence(
      withTiming(1.1, { duration: 200 }),
      withTiming(0, { duration: 400 })
    );

    // After the spin out animation, check if game should continue
    setTimeout(() => {
      // Update completed emotions if this was a correct answer
      let newCompletedEmotions = gameState.completedEmotions;
      if (correctEmotionId) {
        newCompletedEmotions = [...gameState.completedEmotions, correctEmotionId];
        setGameState(prev => ({
          ...prev,
          completedEmotions: newCompletedEmotions
        }));
      }

      if (newCompletedEmotions.length >= EMOTION_GAME_CONFIG.emotionsPerLevel) {
        // Level complete - show final progress for a moment before completing
        setTimeout(() => {
          onGameComplete();
        }, 1500); // Give user time to see 5/5 progress
      } else {
        // Spin in new emotion
        spinInNewEmotion(newCompletedEmotions);
      }
    }, 600);
  };

  const spinInNewEmotion = (completedEmotions: string[]) => {
    const newEmotion = getRandomEmotion(completedEmotions);
    const promptIndex = getRandomPromptIndex();

    // Update game state with new emotion
    setGameState(prev => ({
      ...prev,
      currentEmotion: newEmotion,
      currentPrompt: String(promptIndex), // Store prompt index as string
      isGameActive: true
    }));

    // Reset timer
    setTimeLeft(EMOTION_GAME_CONFIG.timePerEmotion || 15);
    setIsTimerActive(true);
    setIsCardAnimating(true); // Disable button presses during animation

    // Spin in the new card - continue from current rotation + 360 degrees
    const currentRotation = cardRotation.value;
    cardRotation.value = currentRotation + 360; // Add another 360 degrees
    cardScale.value = 0;

    cardRotation.value = withTiming(currentRotation, {
      duration: 600,
      easing: Easing.inOut(Easing.cubic)
    });

    cardScale.value = withSequence(
      withTiming(1.1, { duration: 400 }),
      withTiming(1, { duration: 200 })
    );

    // Fade in the new prompt text after a short delay
    setTimeout(() => {
      promptOpacity.value = withTiming(1, { duration: 400 });
    }, 300);

    // Enable button presses after animation completes (600ms spin + 200ms scale)
    setTimeout(() => {
      setIsCardAnimating(false);
    }, 800);
  };

  const handleExpressionComplete = () => {
    if (!gameState.currentEmotion || isCardAnimating) return;

    // Simulate successful expression
    handleEmotionPress(gameState.currentEmotion);
  };

  // Animated styles
  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const promptAnimatedStyle = useAnimatedStyle(() => ({
    opacity: promptOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { rotateY: `${cardRotation.value}deg` }
    ] as any,
  }));

  return (
    <Animated.View style={[{ flex: 1 }, screenAnimatedStyle]}>
      <LinearGradient
        colors={['#FFEAA7', '#96CEB4', '#45B7D1']}
        style={styles.container}
      >

        {/* Bear top background image */}
        <View style={mainMenuStyles.moonContainer} pointerEvents="none">
          <BearTopImage />
        </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50), zIndex: 50 }]}>
        <Pressable style={[styles.backButton, { minHeight: scaledButtonSize(40) }]} onPress={onBack}>
          <ThemedText style={[styles.backButtonText, { fontSize: scaledFontSize(16) }]}>{backButtonText}</ThemedText>
        </Pressable>

        <View style={{ width: 24 }} />
        <MusicControl
          size={24}
          color="#FFFFFF"
        />
      </View>

      {/* Game content */}
      <View style={[styles.gameContent, isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        {/* Current emotion card */}
        <Animated.View style={[styles.emotionContainer, cardAnimatedStyle]}>
          <EmotionCard
            emotion={gameState.currentEmotion!}
            onPress={() => {}}
            size="large"
            isSelected={false}
            theme={selectedTheme}
          />
        </Animated.View>

        {/* Expression prompt */}
        <Animated.View style={[styles.promptContainer, promptAnimatedStyle]}>
          <ThemedText style={[styles.promptText, { fontSize: scaledFontSize(20) }]}>
            {currentPrompt}
          </ThemedText>
        </Animated.View>

        {/* Action button */}
        <Pressable
          style={[
            styles.expressionButton,
            {
              backgroundColor: gameState.currentEmotion!.color,
              opacity: (!gameState.isGameActive || isCardAnimating) ? 0.5 : 1,
              minHeight: scaledButtonSize(50),
              paddingHorizontal: scaledPadding(24),
              paddingVertical: scaledPadding(15),
            }
          ]}
          onPress={handleExpressionComplete}
          disabled={!gameState.isGameActive || isCardAnimating}
        >
          <ThemedText style={[styles.expressionButtonText, { fontSize: scaledFontSize(18) }]}>
            {isCardAnimating
              ? t('emotions.loading')
              : t('emotions.expressing', {
                  emotion: getThemeNameKey(gameState.currentEmotion!.id, selectedTheme)
                    ? t(getThemeNameKey(gameState.currentEmotion!.id, selectedTheme)!)
                    : getThemeName(gameState.currentEmotion!.id, selectedTheme)
                })
            }
          </ThemedText>
        </Pressable>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <ThemedText style={[styles.progressText, { fontSize: scaledFontSize(16) }]}>
            {t('emotions.progress', { completed: gameState.completedEmotions.length, total: EMOTION_GAME_CONFIG.emotionsPerLevel })}
          </ThemedText>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(gameState.completedEmotions.length / EMOTION_GAME_CONFIG.emotionsPerLevel) * 100}%`
                }
              ]}
            />
          </View>
        </View>

        {/* Timer countdown */}
        <View style={styles.timerContainer}>
          <ThemedText style={[styles.timerLabel, { fontSize: scaledFontSize(18) }]}>
            {isTimerActive ? 'Time remaining:' : 'Ready to start!'}
          </ThemedText>
          <ThemedText style={[styles.timerText, { fontSize: scaledFontSize(18) }]}>
            {isTimerActive ? `${timeLeft}s` : ''}
          </ThemedText>
        </View>
      </View>


      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: Fonts.primary,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  timerLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: Fonts.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: Fonts.primary,
    fontWeight: 'bold',
  },
  gameContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emotionContainer: {
    marginBottom: 30,
  },
  promptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  promptText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    fontFamily: Fonts.primary,
    lineHeight: 28,
  },
  expressionButton: {
    paddingVertical: 15, // Match stories "Surprise Me!" button padding
    paddingHorizontal: 32, // Match stories "Surprise Me!" button padding
    borderRadius: 25,
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    maxWidth: 250, // Match stories "Surprise Me!" button width
    alignSelf: 'center', // Center the button since it now has maxWidth
  },
  expressionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    fontFamily: Fonts.primary,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
    fontFamily: Fonts.primary,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 4,
  },
});
