import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
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

import * as Haptics from 'expo-haptics';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';
import { PageHeader } from '@/components/ui/page-header';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { RealWorldBridgeOverlay } from '@/components/learning/real-world-bridge-overlay';
import { useScreenTime } from '@/components/screen-time';

/** Map emotion themes to the most relevant feelings bridge activity ID */
const THEME_TO_BRIDGE_ACTIVITY: Record<EmotionTheme, string> = {
  emoji: 'emotion-faces',
  animals: 'animal-feelings',
  bear: 'my-feelings',
};

interface EmotionsGameScreenProps {
  onBack: () => void;
  onGameComplete: () => void;
  selectedTheme?: EmotionTheme;
}

export function EmotionsGameScreen({ onBack, onGameComplete, selectedTheme = 'emoji' }: EmotionsGameScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth, textSizeScale } = useAccessibility();
  const { setLastCompletedActivityId } = useScreenTime();

  // Generate star positions for background (matching unified screen pattern)
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);
  const starRotation = useSharedValue(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      starRotation.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      );
    }, 600);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

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

  const [timeLeft, setTimeLeft] = useState(EMOTION_GAME_CONFIG.timePerEmotion || 60);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [isCardAnimating, setIsCardAnimating] = useState(true);

  // Screen fade-in animation (like MainMenuEntrance)
  const screenOpacity = useSharedValue(0);

  // Animation values - start with card hidden for spin-in animation
  const cardScale = useSharedValue(0);
  const cardRotation = useSharedValue(360);
  const promptOpacity = useSharedValue(0);

  // Content fade-out animation for game completion
  const contentOpacity = useSharedValue(1);

  // Real World Bridge overlay — shown after game content fades out
  const [showBridge, setShowBridge] = useState(false);

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
      setTimeLeft(EMOTION_GAME_CONFIG.timePerEmotion || 60);
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

    // Fade out ALL game content (card + prompt + button + progress + timer)
    contentOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    // After fade-out completes, update state and fade back in
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
        // Level complete — content stays faded out, bridge takes over
        triggerGoodJobAnimation();
      } else {
        // Set up new emotion and fade everything back in
        fadeInNewEmotion(newCompletedEmotions);
      }
    }, 450);
  };

  const fadeInNewEmotion = (completedEmotions: string[]) => {
    const newEmotion = getRandomEmotion(completedEmotions);
    const promptIndex = getRandomPromptIndex();

    // Update game state with new emotion
    setGameState(prev => ({
      ...prev,
      currentEmotion: newEmotion,
      currentPrompt: String(promptIndex),
      isGameActive: true
    }));

    // Reset timer
    setTimeLeft(EMOTION_GAME_CONFIG.timePerEmotion || 60);
    setIsTimerActive(true);
    setIsCardAnimating(true);

    // Reset card to initial spin-in position
    cardRotation.value = 360;
    cardScale.value = 0;
    promptOpacity.value = 0;

    // Fade content back in
    contentOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    // Spin the card in within the fading content
    cardRotation.value = withTiming(0, {
      duration: 500,
      easing: Easing.inOut(Easing.cubic)
    });
    cardScale.value = withSequence(
      withTiming(1.1, { duration: 350 }),
      withTiming(1, { duration: 150 })
    );

    // Fade in prompt after card settles
    setTimeout(() => {
      promptOpacity.value = withTiming(1, { duration: 300 });
    }, 300);

    // Enable button presses after all animations
    setTimeout(() => {
      setIsCardAnimating(false);
    }, 600);
  };

  const handleExpressionComplete = () => {
    if (!gameState.currentEmotion || isCardAnimating) return;

    // Simulate successful expression
    handleEmotionPress(gameState.currentEmotion);
  };

  const triggerGoodJobAnimation = () => {
    // Stop the timer
    setIsTimerActive(false);

    // Report the completed activity to the screen time provider
    const activityId = THEME_TO_BRIDGE_ACTIVITY[selectedTheme];
    setLastCompletedActivityId(activityId);

    // Content is already faded out from startSpinTransition — show bridge directly
    setTimeout(() => {
      setShowBridge(true);
    }, 200);
  };

  /** Called when user dismisses the Real World Bridge overlay — returns to feelings hub */
  const handleBridgeDismiss = () => {
    setShowBridge(false);
    onBack();
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

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));



  return (
    <Animated.View style={[{ flex: 1 }, screenAnimatedStyle]}>
      <LinearGradient
        colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
        style={styles.container}
      >

        {/* Bear top background image */}
        <View style={mainMenuStyles.moonContainer} pointerEvents="none">
          <BearTopImage />
        </View>

        {/* Animated stars background (matching unified screen pattern) */}
        {starPositions.map((star) => (
          <Animated.View
            key={`star-${star.id}`}
            style={[
              starAnimatedStyle,
              {
                position: 'absolute',
                width: VISUAL_EFFECTS.STAR_SIZE,
                height: VISUAL_EFFECTS.STAR_SIZE,
                backgroundColor: 'white',
                borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
                opacity: star.opacity,
                left: star.left,
                top: star.top,
                zIndex: 2,
              },
            ]}
          />
        ))}

      {/* Animated content wrapper - fades out when game completes */}
      <Animated.View style={[{ flex: 1, zIndex: 10 }, contentAnimatedStyle]}>
        {/* Shared page header component */}
        <PageHeader
          title={t('emotions.title')}
          onBack={onBack}
          useBackArrow
        />

        {/* Game content - dynamic padding for PageHeader */}
        <View style={[styles.gameContent, { paddingTop: insets.top + 80 + (textSizeScale - 1) * 40 }, isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
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
      </Animated.View>

      {/* Real World Bridge — shows after game content fades out */}
      <RealWorldBridgeOverlay
        visible={showBridge}
        activityId={THEME_TO_BRIDGE_ACTIVITY[selectedTheme]}
        gameSection="feelings"
        onDismiss={handleBridgeDismiss}
      />

      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
