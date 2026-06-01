import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { useTranslation } from 'react-i18next';
import { EmotionsGameScreen } from './emotions-game-screen';
import { EmotionsUnifiedScreen } from './emotions-unified-screen';
import { SleepSelectionScreen } from '@/components/music/sleep-selection-screen';
import { PageHeader } from '@/components/ui/page-header';
import { EmotionTheme } from '@/types/emotion';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';

// Gradient colour sets
const FEELINGS_COLORS = ['#4ECDC4', '#3B82F6', '#1E3A8A'] as const;
const RELAX_COLORS = ['#6B73FF', '#8E95FF', '#B3B9FF'] as const;

interface EmotionsScreenProps {
  onBack: () => void;
}

export function EmotionsScreen({ onBack }: EmotionsScreenProps) {
  const [currentView, setCurrentView] = useState<'menu' | 'game' | 'parents'>('menu');
  const [selectedTheme, setSelectedTheme] = useState<EmotionTheme>('emoji');
  const { t } = useTranslation();

  // Shared background: stars
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);
  const starRotation = useSharedValue(0);

  useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1, false
    );
  }, []);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // Cross-fade between feelings and relax gradients
  const gradientBlend = useSharedValue(0); // 0 = feelings, 1 = relax

  // Animated overlay for the relax gradient
  const relaxOverlayStyle = useAnimatedStyle(() => ({
    opacity: gradientBlend.value,
  }));

  // Content opacity animations
  const menuOpacity = useSharedValue(1);
  const parentsOpacity = useSharedValue(0);

  // Game screen slide-from-top animation
  const gameSlideY = useSharedValue(-SCREEN_HEIGHT);
  const [isGameMounted, setIsGameMounted] = useState(false);

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
  }));

  const parentsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: parentsOpacity.value,
  }));

  const gameSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: gameSlideY.value }],
  }));

  const handleStartGame = (theme: EmotionTheme) => {
    setSelectedTheme(theme);
    // Menu stays visible underneath (no opacity change needed — game slides on top)
    setCurrentView('game');
    // Pre-position off-screen, mount, then slide in
    gameSlideY.value = -SCREEN_HEIGHT;
    setIsGameMounted(true);
    // Use withDelay so the component mounts at the off-screen position first
    gameSlideY.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  };

  /** Slide the game screen back up, then unmount it */
  const handleBackToMenu = () => {
    gameSlideY.value = withTiming(-SCREEN_HEIGHT, {
      duration: 450,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(finishBackToMenu)();
      }
    });
  };

  const finishBackToMenu = useCallback(() => {
    setIsGameMounted(false);
    setCurrentView('menu');
  }, []);

  const handleNavigateToParents = () => {
    // Fade out menu, fade in relax gradient + content
    menuOpacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    gradientBlend.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.cubic) });
    parentsOpacity.value = 0;

    // Show parents view immediately (menu stays mounted but invisible)
    setCurrentView('parents');
    setTimeout(() => {
      parentsOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    }, 400);
  };

  const handleBackFromParents = useCallback(() => {
    // Fade out relax content, fade gradient back, fade menu back in
    parentsOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    gradientBlend.value = withTiming(0, { duration: 800, easing: Easing.inOut(Easing.cubic) });

    // Menu is already mounted — just fade it back in
    menuOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });

    // Once relax content is faded out, switch view to clean up
    setTimeout(() => {
      setCurrentView('menu');
    }, 500);
  }, []);

  /** Game complete — slide game up, reveal menu */
  const handleGameComplete = useCallback(() => {
    gameSlideY.value = withTiming(-SCREEN_HEIGHT, {
      duration: 450,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(finishBackToMenu)();
      }
    });
  }, [finishBackToMenu]);

  // Reset state before navigating away so re-entering always shows the menu
  const handleBack = useCallback(() => {
    setCurrentView('menu');
    menuOpacity.value = 1;
    gradientBlend.value = 0;
    parentsOpacity.value = 0;
    onBack();
  }, [onBack]);

  return (
    <View style={styles.container}>
      {/* Base gradient (feelings) */}
      <LinearGradient
        colors={[...FEELINGS_COLORS]}
        style={StyleSheet.absoluteFill}
      />

      {/* Overlay gradient (relax) — fades in/out */}
      <Animated.View style={[StyleSheet.absoluteFill, relaxOverlayStyle]}>
        <LinearGradient
          colors={[...RELAX_COLORS]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Shared bear image — persistent, never reloads */}
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>

      {/* Shared animated stars */}
      {starPositions.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          testID={`star-${star.id}`}
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

      {/* Menu — always mounted to keep images cached, hidden via opacity + pointerEvents */}
      <Animated.View
        style={[styles.fullSize, menuAnimatedStyle]}
        pointerEvents={currentView === 'menu' ? 'auto' : 'none'}
      >
        <EmotionsUnifiedScreen
          onStartGame={handleStartGame}
          onNavigateToParents={handleNavigateToParents}
          onBack={handleBack}
          skipBackground
        />
      </Animated.View>

      {/* Game — slides in from top when active, slides back up when complete */}
      {isGameMounted && (
        <Animated.View style={[styles.gameSlideContainer, gameSlideStyle]}>
          <EmotionsGameScreen
            onBack={handleBackToMenu}
            onGameComplete={handleGameComplete}
            selectedTheme={selectedTheme}
          />
        </Animated.View>
      )}

      {/* Relax — mounted when navigating to/from, unmounted when back on menu */}
      {(currentView === 'parents') && (
        <Animated.View style={[styles.fullSize, parentsAnimatedStyle]}>
          <SleepSelectionScreen
            onTrackSelect={() => {}}
            onBack={handleBackFromParents}
            skipBackground
          />
        </Animated.View>
      )}

      {/* Page header — rendered LAST so it sits on top of all content, matching Stories pattern */}
      <PageHeader
        title={t('emotions.title')}
        subtitle={t('emotions.subtitle')}
        onBack={handleBack}
        useBackArrow
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullSize: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  gameSlideContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});
