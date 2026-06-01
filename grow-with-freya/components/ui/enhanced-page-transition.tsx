import React, { useEffect, useRef, useState, memo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { getScreenDimensions } from '@/components/main-menu/constants';

interface EnhancedPageTransitionProps {
  currentPage: string;
  pages: Record<string, React.ReactNode>;
  duration?: number;
  /** When false, page positions are set instantly (no slide animation). Default: true */
  animate?: boolean;
}

interface AnimatedPageProps {
  pageKey: string;
  pageComponent: React.ReactNode;
  isActive: boolean;
  animationValue: SharedValue<number>;
  /** When true, block all touch input (transition in progress) */
  touchDisabled: boolean;
}

// Memoized page component to prevent unnecessary re-renders
const AnimatedPage: React.FC<AnimatedPageProps> = memo(function AnimatedPage({
  pageKey, pageComponent, isActive, animationValue, touchDisabled,
}) {
  // Normal slide animation
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: animationValue.value }],
  }));

  return (
    <Animated.View
      key={pageKey}
      style={[
        styles.page,
        slideStyle,
        { zIndex: isActive ? 1 : 0 },
      ]}
      pointerEvents={isActive && !touchDisabled ? 'auto' : 'none'}
    >
      {pageComponent || (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>Missing component for {pageKey}</Text>
        </View>
      )}
    </Animated.View>
  );
});

/**
 * EnhancedPageTransition provides vertical scroll transitions between any pages
 * - Main menu stays at top (translateY: 0 when active, -screenHeight when inactive)
 * - All other pages scroll up from bottom (translateY: screenHeight when inactive, 0 when active)
 */
export const EnhancedPageTransition: React.FC<EnhancedPageTransitionProps> = ({
  currentPage,
  pages,
  duration = 600,
  animate = true,
}) => {
  // Get initial screen height and track changes
  const [screenHeight, setScreenHeight] = React.useState(() => getScreenDimensions().height);

  // Block touch input during page transitions so buttons can't be pressed mid-slide
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPageRef = useRef(currentPage);

  // Update screen height when dimensions change (orientation changes)
  useEffect(() => {
    const updateDimensions = () => {
      const { height } = getScreenDimensions();
      setScreenHeight(height);
    };

    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', updateDimensions);

    return () => subscription?.remove();
  }, []);

  // Create animation values for specific pages we know about
  const mainTranslateY = useSharedValue(
    currentPage === 'main' ? 0 :
    currentPage === 'account' ? screenHeight :
    -screenHeight
  );
  const storiesTranslateY = useSharedValue(currentPage === 'stories' ? 0 : screenHeight);
  const sensoryTranslateY = useSharedValue(currentPage === 'sensory' ? 0 : screenHeight);
  const screenTimeTranslateY = useSharedValue(currentPage === 'screen_time' ? 0 : screenHeight);
  const practiseTranslateY = useSharedValue(currentPage === 'practise' ? 0 : screenHeight);
  const freeplayTranslateY = useSharedValue(currentPage === 'freeplay' ? 0 : screenHeight);
  const spellingTranslateY = useSharedValue(currentPage === 'spelling' ? 0 : screenHeight);
  const numbersTranslateY = useSharedValue(currentPage === 'numbers' ? 0 : screenHeight);
  const feelingsTranslateY = useSharedValue(currentPage === 'feelings' ? 0 : screenHeight);
  const spellingGameTranslateY = useSharedValue(currentPage === 'spelling-game' ? 0 : screenHeight);
  const accountTranslateY = useSharedValue(currentPage === 'account' ? 0 : -screenHeight);

  // Map page keys to their animation values
  // Page animations mapping - force cache refresh
  const pageAnimations: Record<string, any> = {
    main: mainTranslateY,
    stories: storiesTranslateY,
    sensory: sensoryTranslateY,
    'screen_time': screenTimeTranslateY,
    practise: practiseTranslateY,
    freeplay: freeplayTranslateY,
    spelling: spellingTranslateY,
    numbers: numbersTranslateY,
    feelings: feelingsTranslateY,
    'spelling-game': spellingGameTranslateY,
    account: accountTranslateY,
  };

  // Update animation values when screen height changes (orientation change)
  // Set values immediately without animation to prevent visual glitches
  useEffect(() => {
    // Update positions for inactive pages when screen height changes
    // Use direct assignment (no withTiming) to avoid animation during orientation change
    if (currentPage !== 'main') {
      mainTranslateY.value = currentPage === 'account' ? screenHeight : -screenHeight;
    }
    if (currentPage !== 'stories') {
      storiesTranslateY.value = screenHeight;
    }
    if (currentPage !== 'sensory') {
      sensoryTranslateY.value = screenHeight;
    }
    if (currentPage !== 'screen_time') {
      screenTimeTranslateY.value = screenHeight;
    }
    if (currentPage !== 'practise') {
      practiseTranslateY.value = screenHeight;
    }
    if (currentPage !== 'freeplay') {
      freeplayTranslateY.value = screenHeight;
    }
    if (currentPage !== 'spelling') {
      spellingTranslateY.value = currentPage === 'spelling-game' ? -screenHeight : screenHeight;
    }
    if (currentPage !== 'numbers') {
      numbersTranslateY.value = currentPage === 'spelling-game' ? -screenHeight : screenHeight;
    }
    if (currentPage !== 'feelings') {
      feelingsTranslateY.value = screenHeight;
    }
    if (currentPage !== 'spelling-game') {
      spellingGameTranslateY.value = screenHeight;
    }
    if (currentPage !== 'account') {
      // Account page slides down from top
      accountTranslateY.value = -screenHeight;
    }
  }, [screenHeight]);

  useEffect(() => {
    // Use bezier curve for smoother animation that doesn't "snap" at the end
    const animationConfig = {
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-out curve
    };

    // Helper: set value with or without animation
    const set = (sv: SharedValue<number>, target: number) => {
      sv.value = animate ? withTiming(target, animationConfig) : target;
    };

    // Block touch input while the slide animation is in progress
    if (animate && prevPageRef.current !== currentPage) {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      setIsTransitioning(true);
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        transitionTimerRef.current = null;
      }, duration);
    }
    prevPageRef.current = currentPage;

    // Animate main menu
    if (currentPage === 'account') {
      // Account page: main menu slides down (positive translateY)
      set(mainTranslateY, screenHeight);
    } else {
      // Other pages: main menu slides up when not active (negative translateY)
      set(mainTranslateY, currentPage === 'main' ? 0 : -screenHeight);
    }

    // Animate all other pages
    set(storiesTranslateY, currentPage === 'stories' ? 0 : screenHeight);
    set(sensoryTranslateY, currentPage === 'sensory' ? 0 : screenHeight);
    set(screenTimeTranslateY, currentPage === 'screen_time' ? 0 : screenHeight);
    set(practiseTranslateY, currentPage === 'practise' ? 0 : screenHeight);
    set(freeplayTranslateY, currentPage === 'freeplay' ? 0 : screenHeight);

    // Learning screens slide UP when their child (spelling-game) is active,
    // otherwise slide DOWN when a sibling page is active
    set(spellingTranslateY,
      currentPage === 'spelling' ? 0 :
      currentPage === 'spelling-game' ? -screenHeight : screenHeight
    );
    set(numbersTranslateY,
      currentPage === 'numbers' ? 0 :
      currentPage === 'spelling-game' ? -screenHeight : screenHeight
    );

    set(feelingsTranslateY, currentPage === 'feelings' ? 0 : screenHeight);
    set(spellingGameTranslateY, currentPage === 'spelling-game' ? 0 : screenHeight);

    // Account page slides down from top
    set(accountTranslateY, currentPage === 'account' ? 0 : -screenHeight);
  }, [currentPage, duration, animate]);

  return (
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6', '#4ECDC4']}
      style={styles.container}
    >
      {Object.entries(pages).map(([pageKey, pageComponent]) => {
        // Only render pages that have animation values
        if (!pageAnimations[pageKey]) {
          return null;
        }

        const isActive = currentPage === pageKey;

        return (
          <AnimatedPage
            key={pageKey}
            pageKey={pageKey}
            pageComponent={pageComponent}
            isActive={isActive}
            animationValue={pageAnimations[pageKey]}
            touchDisabled={isTransitioning}
          />
        );
      })}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
