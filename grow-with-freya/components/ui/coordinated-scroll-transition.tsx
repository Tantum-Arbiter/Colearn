import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoordinatedScrollTransitionProps {
  currentPage: 'main' | 'stories';
  mainMenuComponent: React.ReactNode;
  storiesComponent: React.ReactNode;
  transitionDuration?: number;
  onTransitionComplete?: (page: 'main' | 'stories') => void;
}

/**
 * CoordinatedScrollTransition creates a seamless scroll effect between pages
 * - When going to stories: main menu scrolls down, stories page scrolls down into view
 * - When going back: stories page scrolls down out of view, main menu scrolls up into view
 */
export const CoordinatedScrollTransition: React.FC<CoordinatedScrollTransitionProps> = ({
  currentPage,
  mainMenuComponent,
  storiesComponent,
  transitionDuration = 600,
  onTransitionComplete,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousPage, setPreviousPage] = useState<'main' | 'stories'>(currentPage);

  // Animation values for both pages
  const mainMenuTranslateY = useSharedValue(currentPage === 'main' ? 0 : -SCREEN_HEIGHT);
  const storiesTranslateY = useSharedValue(currentPage === 'stories' ? 0 : SCREEN_HEIGHT);

  useEffect(() => {
    if (previousPage !== currentPage) {
      performScrollTransition(previousPage, currentPage);
      setPreviousPage(currentPage);
    }
  }, [currentPage]);

  const performScrollTransition = (fromPage: 'main' | 'stories', toPage: 'main' | 'stories') => {
    setIsTransitioning(true);

    const animationConfig = {
      duration: transitionDuration,
      easing: Easing.out(Easing.cubic),
    };

    if (toPage === 'stories') {
      // Going to stories: both pages scroll down
      // Main menu scrolls down and out of view
      mainMenuTranslateY.value = withTiming(-SCREEN_HEIGHT, animationConfig);
      
      // Stories page scrolls down into view (from below screen)
      storiesTranslateY.value = withTiming(0, animationConfig, (finished) => {
        if (finished) {
          runOnJS(() => {
            setIsTransitioning(false);
            onTransitionComplete?.(toPage);
          })();
        }
      });
    } else {
      // Going back to main: stories scrolls down out, main scrolls up in
      // Stories page scrolls down and out of view
      storiesTranslateY.value = withTiming(SCREEN_HEIGHT, animationConfig);
      
      // Main menu scrolls up into view (from above screen)
      mainMenuTranslateY.value = withTiming(0, animationConfig, (finished) => {
        if (finished) {
          runOnJS(() => {
            setIsTransitioning(false);
            onTransitionComplete?.(toPage);
          })();
        }
      });
    }
  };

  const mainMenuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mainMenuTranslateY.value }],
  }));

  const storiesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: storiesTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Main Menu Page */}
      <Animated.View 
        style={[styles.page, mainMenuAnimatedStyle]}
        pointerEvents={currentPage === 'main' && !isTransitioning ? 'auto' : 'none'}
      >
        {mainMenuComponent}
      </Animated.View>

      {/* Stories Page */}
      <Animated.View 
        style={[styles.page, storiesAnimatedStyle]}
        pointerEvents={currentPage === 'stories' && !isTransitioning ? 'auto' : 'none'}
      >
        {storiesComponent}
      </Animated.View>
    </View>
  );
};

/**
 * ScrollTransitionContainer provides a simpler interface for the coordinated scroll
 */
interface ScrollTransitionContainerProps {
  children: React.ReactNode;
  pageType: 'main' | 'stories';
  isActive: boolean;
  transitionDirection?: 'up' | 'down';
  duration?: number;
}

export const ScrollTransitionContainer: React.FC<ScrollTransitionContainerProps> = ({
  children,
  pageType,
  isActive,
  transitionDirection = 'down',
  duration = 600,
}) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    const animationConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    if (isActive) {
      // Page is becoming active - scroll into view
      translateY.value = withTiming(0, animationConfig);
    } else {
      // Page is becoming inactive - scroll out of view
      const exitPosition = transitionDirection === 'up' ? -SCREEN_HEIGHT : SCREEN_HEIGHT;
      translateY.value = withTiming(exitPosition, animationConfig);
    }
  }, [isActive, transitionDirection, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View 
      style={[styles.page, animatedStyle]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
};

/**
 * VerticalPageTransition provides vertical scroll transitions between pages
 */
interface VerticalPageTransitionProps {
  currentPage: 'main' | 'stories';
  pages: {
    main: React.ReactNode;
    stories: React.ReactNode;
  };
  duration?: number;
}

export const VerticalPageTransition: React.FC<VerticalPageTransitionProps> = ({
  currentPage,
  pages,
  duration = 600,
}) => {
  const mainTranslateY = useSharedValue(currentPage === 'main' ? 0 : -SCREEN_HEIGHT);
  const storiesTranslateY = useSharedValue(currentPage === 'stories' ? 0 : SCREEN_HEIGHT);

  useEffect(() => {
    const animationConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    if (currentPage === 'main') {
      // Show main menu, hide stories
      mainTranslateY.value = withTiming(0, animationConfig);
      storiesTranslateY.value = withTiming(SCREEN_HEIGHT, animationConfig);
    } else {
      // Show stories, hide main menu
      mainTranslateY.value = withTiming(-SCREEN_HEIGHT, animationConfig);
      storiesTranslateY.value = withTiming(0, animationConfig);
    }
  }, [currentPage, duration]);

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mainTranslateY.value }],
  }));

  const storiesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: storiesTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Always render main page - positioned off-screen when not active */}
      <Animated.View
        style={[styles.page, mainAnimatedStyle]}
        pointerEvents={currentPage === 'main' ? 'auto' : 'none'}
      >
        {pages.main}
      </Animated.View>

      {/* Always render stories page - positioned off-screen when not active */}
      <Animated.View
        style={[styles.page, storiesAnimatedStyle]}
        pointerEvents={currentPage === 'stories' ? 'auto' : 'none'}
      >
        {pages.stories}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f8f9ff', // Light background to prevent black flickers
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#f8f9ff', // Match container background
  },
});
