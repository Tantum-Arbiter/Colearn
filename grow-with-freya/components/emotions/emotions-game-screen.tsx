import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { EmotionCard } from './emotion-card';
import { EMOTIONS, getRandomEmotion, getRandomPrompt, EMOTION_GAME_CONFIG } from '@/data/emotions';
import { Emotion, EmotionGameState, EmotionTheme } from '@/types/emotion';
import { Fonts } from '@/constants/theme';
import { MusicControl } from '@/components/ui/music-control';
import * as Haptics from 'expo-haptics';

interface EmotionsGameScreenProps {
  onBack: () => void;
  onGameComplete: () => void;
  selectedTheme?: EmotionTheme;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function EmotionsGameScreen({ onBack, onGameComplete, selectedTheme = 'emoji' }: EmotionsGameScreenProps) {
  const insets = useSafeAreaInsets();
  
  const [gameState, setGameState] = useState<EmotionGameState>({
    currentEmotion: null,
    score: 0,
    level: 1,
    completedEmotions: [],
    currentPrompt: '',
    isGameActive: false,
    selectedTheme: selectedTheme
  });

  const [timeLeft, setTimeLeft] = useState(15);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isCardAnimating, setIsCardAnimating] = useState(false);

  // Animation values
  const cardScale = useSharedValue(1);
  const cardRotation = useSharedValue(0);
  const promptOpacity = useSharedValue(0);

  // Initialize game
  useEffect(() => {
    startNewRound();
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
  }, [isTimerActive, timeLeft]);

  const startNewRound = () => {
    const newEmotion = getRandomEmotion(gameState.completedEmotions);
    const prompt = getRandomPrompt(newEmotion);

    setGameState(prev => ({
      ...prev,
      currentEmotion: newEmotion,
      currentPrompt: prompt,
      isGameActive: true
    }));

    setTimeLeft(EMOTION_GAME_CONFIG.timePerEmotion || 15);
    setIsTimerActive(true);
    setIsCardAnimating(true); // Disable button presses during animation

    // Animate card and prompt appearance with initial spin-in
    cardRotation.value = 360; // Start from 360 degrees
    cardScale.value = 0;

    // Spin in the first card
    cardRotation.value = withTiming(0, {
      duration: 600,
      easing: Easing.inOut(Easing.cubic)
    });

    cardScale.value = withSequence(
      withTiming(1.1, { duration: 400 }),
      withTiming(1, { duration: 200 })
    );

    // Fade in prompt after delay
    setTimeout(() => {
      promptOpacity.value = withTiming(1, { duration: 400 });
    }, 300);

    // Enable button presses after animation completes (600ms spin + 200ms scale)
    setTimeout(() => {
      setIsCardAnimating(false);
    }, 800);
  };

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
    const prompt = getRandomPrompt(newEmotion);

    // Update game state with new emotion
    setGameState(prev => ({
      ...prev,
      currentEmotion: newEmotion,
      currentPrompt: prompt,
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
  const promptAnimatedStyle = useAnimatedStyle(() => ({
    opacity: promptOpacity.value,
  }));



  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { rotateY: `${cardRotation.value}deg` }
    ] as any,
  }));



  if (!gameState.currentEmotion) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FFEAA7', '#96CEB4', '#45B7D1']}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </Pressable>

        <View style={{ width: 24 }} />
        <MusicControl
          size={24}
          color="#FFFFFF"
        />
      </View>

      {/* Game content */}
      <View style={styles.gameContent}>
        {/* Current emotion card */}
        <Animated.View style={[styles.emotionContainer, cardAnimatedStyle]}>
          <EmotionCard
            emotion={gameState.currentEmotion}
            onPress={() => {}} // Disabled during game
            size="large"
            isSelected={false}
            theme={selectedTheme}
          />
        </Animated.View>

        {/* Expression prompt */}
        <Animated.View style={[styles.promptContainer, promptAnimatedStyle]}>
          <ThemedText style={styles.promptText}>
            {gameState.currentPrompt}
          </ThemedText>
        </Animated.View>

        {/* Action button */}
        <Pressable
          style={[
            styles.expressionButton,
            {
              backgroundColor: gameState.currentEmotion.color,
              opacity: (!gameState.isGameActive || isCardAnimating) ? 0.5 : 1
            }
          ]}
          onPress={handleExpressionComplete}
          disabled={!gameState.isGameActive || isCardAnimating}
        >
          <ThemedText style={styles.expressionButtonText}>
            {isCardAnimating
              ? "Loading..."
              : `I'm expressing ${gameState.currentEmotion.name}!`
            }
          </ThemedText>
        </Pressable>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <ThemedText style={styles.progressText}>
            Progress: {gameState.completedEmotions.length} / {EMOTION_GAME_CONFIG.emotionsPerLevel}
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
          <ThemedText style={styles.timerLabel}>
            {isTimerActive ? 'Time remaining:' : 'Ready to start!'}
          </ThemedText>
          <ThemedText style={styles.timerText}>
            {isTimerActive ? `${timeLeft}s` : ''}
          </ThemedText>
        </View>
      </View>


    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    fontFamily: Fonts.primary,
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
