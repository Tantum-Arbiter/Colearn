import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type PageType = 'main' | 'stories' | 'settings' | 'profiles';
type TransitionDirection = 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'fade';

interface PageConfig {
  component: React.ReactNode;
  transitionIn?: TransitionDirection;
  transitionOut?: TransitionDirection;
  duration?: number;
}

interface PageNavigatorProps {
  currentPage: PageType;
  pages: Record<PageType, PageConfig>;
  onTransitionComplete?: (page: PageType) => void;
}

/**
 * PageNavigator provides smooth transitions between full-screen pages
 * Handles navigation between main menu, stories, settings, etc.
 */
export const PageNavigator: React.FC<PageNavigatorProps> = ({
  currentPage,
  pages,
  onTransitionComplete,
}) => {
  const [visiblePages, setVisiblePages] = useState<Set<PageType>>(new Set([currentPage]));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousPage, setPreviousPage] = useState<PageType | null>(null);

  // Animation values for each possible page
  const pageAnimations = {
    main: {
      opacity: useSharedValue(currentPage === 'main' ? 1 : 0),
      translateX: useSharedValue(0),
      translateY: useSharedValue(0),
    },
    stories: {
      opacity: useSharedValue(currentPage === 'stories' ? 1 : 0),
      translateX: useSharedValue(0),
      translateY: useSharedValue(0),
    },
    settings: {
      opacity: useSharedValue(currentPage === 'settings' ? 1 : 0),
      translateX: useSharedValue(0),
      translateY: useSharedValue(0),
    },
    profiles: {
      opacity: useSharedValue(currentPage === 'profiles' ? 1 : 0),
      translateX: useSharedValue(0),
      translateY: useSharedValue(0),
    },
  };

  useEffect(() => {
    if (previousPage && previousPage !== currentPage) {
      performTransition(previousPage, currentPage);
    } else if (!previousPage) {
      // Initial load
      setVisiblePages(new Set([currentPage]));
    }
    setPreviousPage(currentPage);
  }, [currentPage]);

  const getTransitionValues = (direction: TransitionDirection, isEntering: boolean) => {
    const distance = direction.includes('slide') ? SCREEN_WIDTH : 0;
    
    switch (direction) {
      case 'slide-left':
        return {
          translateX: isEntering ? -distance : distance,
          translateY: 0,
          opacity: 1,
        };
      case 'slide-right':
        return {
          translateX: isEntering ? distance : -distance,
          translateY: 0,
          opacity: 1,
        };
      case 'slide-up':
        return {
          translateX: 0,
          translateY: isEntering ? -SCREEN_HEIGHT : SCREEN_HEIGHT,
          opacity: 1,
        };
      case 'slide-down':
        return {
          translateX: 0,
          translateY: isEntering ? SCREEN_HEIGHT : -SCREEN_HEIGHT,
          opacity: 1,
        };
      case 'fade':
      default:
        return {
          translateX: 0,
          translateY: 0,
          opacity: isEntering ? 0 : 1,
        };
    }
  };

  const performTransition = (fromPage: PageType, toPage: PageType) => {
    setIsTransitioning(true);
    setVisiblePages(new Set([fromPage, toPage]));

    const fromConfig = pages[fromPage];
    const toConfig = pages[toPage];
    
    const duration = toConfig.duration || 400;
    const transitionOut = fromConfig.transitionOut || 'slide-left';
    const transitionIn = toConfig.transitionIn || 'slide-right';

    // Set initial positions
    const fromInitial = getTransitionValues(transitionOut, false);
    const toInitial = getTransitionValues(transitionIn, true);

    // Set starting positions for incoming page
    pageAnimations[toPage].translateX.value = toInitial.translateX;
    pageAnimations[toPage].translateY.value = toInitial.translateY;
    pageAnimations[toPage].opacity.value = toInitial.opacity;

    const animationConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    // Animate out the old page
    pageAnimations[fromPage].translateX.value = withTiming(fromInitial.translateX, animationConfig);
    pageAnimations[fromPage].translateY.value = withTiming(fromInitial.translateY, animationConfig);
    pageAnimations[fromPage].opacity.value = withTiming(
      transitionOut === 'fade' ? 0 : 1,
      animationConfig
    );

    // Animate in the new page
    pageAnimations[toPage].translateX.value = withTiming(0, animationConfig);
    pageAnimations[toPage].translateY.value = withTiming(0, animationConfig);
    pageAnimations[toPage].opacity.value = withTiming(1, animationConfig, (finished) => {
      if (finished) {
        runOnJS(() => {
          setIsTransitioning(false);
          setVisiblePages(new Set([toPage]));
          onTransitionComplete?.(toPage);
        })();
      }
    });
  };

  const createAnimatedStyle = (page: PageType) => {
    return useAnimatedStyle(() => ({
      opacity: pageAnimations[page].opacity.value,
      transform: [
        { translateX: pageAnimations[page].translateX.value },
        { translateY: pageAnimations[page].translateY.value },
      ],
    }));
  };

  return (
    <View style={styles.container}>
      {Array.from(visiblePages).map((page) => {
        const pageConfig = pages[page];
        if (!pageConfig) return null;

        return (
          <Animated.View
            key={page}
            style={[styles.page, createAnimatedStyle(page)]}
            pointerEvents={page === currentPage && !isTransitioning ? 'auto' : 'none'}
          >
            {pageConfig.component}
          </Animated.View>
        );
      })}
    </View>
  );
};

/**
 * Simplified page transition hook for easy integration
 */
export const usePageTransition = (initialPage: PageType = 'main') => {
  const [currentPage, setCurrentPage] = useState<PageType>(initialPage);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigateToPage = (page: PageType) => {
    if (page !== currentPage && !isTransitioning) {
      setCurrentPage(page);
    }
  };

  const handleTransitionComplete = (page: PageType) => {
    setIsTransitioning(false);
  };

  return {
    currentPage,
    navigateToPage,
    isTransitioning,
    handleTransitionComplete,
  };
};

/**
 * Pre-configured transitions for common navigation patterns
 */
export const TRANSITION_CONFIGS = {
  // Main menu to stories (slide up like modal)
  mainToStories: {
    transitionOut: 'fade' as TransitionDirection,
    transitionIn: 'slide-up' as TransitionDirection,
    duration: 500,
  },
  
  // Stories back to main (slide down)
  storiesToMain: {
    transitionOut: 'slide-down' as TransitionDirection,
    transitionIn: 'fade' as TransitionDirection,
    duration: 400,
  },
  
  // Settings slide from right
  mainToSettings: {
    transitionOut: 'slide-left' as TransitionDirection,
    transitionIn: 'slide-right' as TransitionDirection,
    duration: 350,
  },
  
  // Back from settings
  settingsToMain: {
    transitionOut: 'slide-right' as TransitionDirection,
    transitionIn: 'slide-left' as TransitionDirection,
    duration: 350,
  },
  
  // Simple fade for quick transitions
  fade: {
    transitionOut: 'fade' as TransitionDirection,
    transitionIn: 'fade' as TransitionDirection,
    duration: 300,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
