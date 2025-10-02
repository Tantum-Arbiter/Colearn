import React, { useEffect, useState } from 'react';
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

interface SmoothPageContainerProps {
  children: React.ReactNode;
  isActive: boolean;
  transitionType?: 'slide-up' | 'slide-down' | 'fade' | 'cross-fade';
  duration?: number;
  delay?: number;
  onTransitionComplete?: () => void;
  preloadDelay?: number; // Extra delay to ensure images are loaded
}

/**
 * SmoothPageContainer provides seamless page transitions that mask image loading delays
 * Specifically designed to hide bear image loading issues during navigation
 */
export const SmoothPageContainer: React.FC<SmoothPageContainerProps> = ({
  children,
  isActive,
  transitionType = 'slide-up',
  duration = 500,
  delay = 0,
  onTransitionComplete,
  preloadDelay = 100, // Extra time for images to load
}) => {
  const [isContentReady, setIsContentReady] = useState(false);
  
  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (isActive) {
      // Give images time to preload before starting transition
      const totalDelay = delay + preloadDelay;
      
      setTimeout(() => {
        setIsContentReady(true);
        
        // Start the transition animation
        const animationConfig = {
          duration,
          easing: Easing.out(Easing.cubic),
        };

        const completeCallback = onTransitionComplete 
          ? () => runOnJS(onTransitionComplete)() 
          : undefined;

        switch (transitionType) {
          case 'slide-up':
            opacity.value = withTiming(1, animationConfig, completeCallback);
            translateY.value = withTiming(0, animationConfig);
            scale.value = withTiming(1, animationConfig);
            break;
          case 'slide-down':
            translateY.value = -50;
            opacity.value = withTiming(1, animationConfig, completeCallback);
            translateY.value = withTiming(0, animationConfig);
            scale.value = withTiming(1, animationConfig);
            break;
          case 'fade':
            opacity.value = withTiming(1, animationConfig, completeCallback);
            scale.value = withTiming(1, animationConfig);
            break;
          case 'cross-fade':
            opacity.value = withTiming(1, { duration: duration * 0.8, easing: Easing.inOut(Easing.ease) }, completeCallback);
            break;
        }
      }, totalDelay);
    } else {
      // Reset values when not active
      setIsContentReady(false);
      opacity.value = 0;
      translateY.value = transitionType === 'slide-down' ? -50 : 50;
      scale.value = 0.95;
    }
  }, [isActive, transitionType, duration, delay, preloadDelay, onTransitionComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Don't render content until we're ready to show it
  if (!isActive && !isContentReady) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );
};

/**
 * PageTransitionManager handles transitions between multiple pages
 * Ensures smooth handoff between main menu and story selection
 */
interface PageTransitionManagerProps {
  currentPage: 'main' | 'stories';
  mainMenuComponent: React.ReactNode;
  storiesComponent: React.ReactNode;
  transitionDuration?: number;
}

export const PageTransitionManager: React.FC<PageTransitionManagerProps> = ({
  currentPage,
  mainMenuComponent,
  storiesComponent,
  transitionDuration = 500,
}) => {
  const [showMain, setShowMain] = useState(currentPage === 'main');
  const [showStories, setShowStories] = useState(currentPage === 'stories');

  useEffect(() => {
    if (currentPage === 'main') {
      setShowMain(true);
      // Hide stories after transition completes
      setTimeout(() => setShowStories(false), transitionDuration + 100);
    } else if (currentPage === 'stories') {
      setShowStories(true);
      // Hide main after transition completes
      setTimeout(() => setShowMain(false), transitionDuration + 100);
    }
  }, [currentPage, transitionDuration]);

  return (
    <View style={styles.manager}>
      {showMain && (
        <SmoothPageContainer
          isActive={currentPage === 'main'}
          transitionType="fade"
          duration={transitionDuration}
          preloadDelay={150} // Extra time for bear image
        >
          {mainMenuComponent}
        </SmoothPageContainer>
      )}
      
      {showStories && (
        <SmoothPageContainer
          isActive={currentPage === 'stories'}
          transitionType="slide-up"
          duration={transitionDuration}
          preloadDelay={50} // Stories don't need as much preload time
        >
          {storiesComponent}
        </SmoothPageContainer>
      )}
    </View>
  );
};

/**
 * LoadingMask provides a smooth overlay during transitions
 * Helps hide any visual glitches during image loading
 */
interface LoadingMaskProps {
  isVisible: boolean;
  duration?: number;
  backgroundColor?: string;
}

export const LoadingMask: React.FC<LoadingMaskProps> = ({
  isVisible,
  duration = 300,
  backgroundColor = 'rgba(255, 255, 255, 0.9)',
}) => {
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, {
      duration,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isVisible, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View 
      style={[
        styles.mask, 
        { backgroundColor },
        animatedStyle
      ]} 
      pointerEvents={isVisible ? 'auto' : 'none'}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  content: {
    flex: 1,
  },
  manager: {
    flex: 1,
    position: 'relative',
  },
  mask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});
