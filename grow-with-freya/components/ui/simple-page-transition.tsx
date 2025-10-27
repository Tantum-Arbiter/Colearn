import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Dynamic screen dimensions
const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Static screen dimensions for animations
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SimplePageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  transitionType?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right';
  duration?: number;
  style?: any;
}

/**
 * SimplePageTransition provides smooth page transitions without complex state management
 * Designed to be reliable and crash-free
 */
export const SimplePageTransition: React.FC<SimplePageTransitionProps> = ({
  children,
  isVisible,
  transitionType = 'fade',
  duration = 400,
  style,
}) => {
  const opacity = useSharedValue(isVisible ? 1 : 0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const animationConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    if (isVisible) {
      // Animate in
      opacity.value = withTiming(1, animationConfig);
      translateX.value = withTiming(0, animationConfig);
      translateY.value = withTiming(0, animationConfig);
    } else {
      // Animate out
      opacity.value = withTiming(0, animationConfig);
      
      // Set exit positions based on transition type
      switch (transitionType) {
        case 'slide-up':
          translateY.value = withTiming(-SCREEN_HEIGHT, animationConfig);
          break;
        case 'slide-down':
          translateY.value = withTiming(SCREEN_HEIGHT, animationConfig);
          break;
        case 'slide-left':
          translateX.value = withTiming(-SCREEN_WIDTH, animationConfig);
          break;
        case 'slide-right':
          translateX.value = withTiming(SCREEN_WIDTH, animationConfig);
          break;
        case 'fade':
        default:
          // Only opacity animation for fade
          break;
      }
    }
  }, [isVisible, transitionType, duration]);

  // Set initial positions for entering animations only once
  useEffect(() => {
    if (isVisible) {
      // Set initial off-screen position
      const { width: screenWidth, height: screenHeight } = getScreenDimensions();
      switch (transitionType) {
        case 'slide-up':
          translateY.value = screenHeight;
          opacity.value = 1;
          break;
        case 'slide-down':
          translateY.value = -screenHeight;
          opacity.value = 1;
          break;
        case 'slide-left':
          translateX.value = screenWidth;
          opacity.value = 1;
          break;
        case 'slide-right':
          translateX.value = -screenWidth;
          opacity.value = 1;
          break;
        case 'fade':
        default:
          translateX.value = 0;
          translateY.value = 0;
          opacity.value = 0;
          break;
      }

      // Then immediately animate to final position
      const animationConfig = {
        duration,
        easing: Easing.out(Easing.cubic),
      };

      opacity.value = withTiming(1, animationConfig);
      translateX.value = withTiming(0, animationConfig);
      translateY.value = withTiming(0, animationConfig);
    }
  }, []); // Only run once on mount

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

/**
 * PageContainer wraps pages with consistent styling and transitions
 */
interface PageContainerProps {
  children: React.ReactNode;
  isActive: boolean;
  transitionType?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right';
  duration?: number;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  isActive,
  transitionType = 'fade',
  duration = 400,
}) => {
  if (!isActive) {
    return null;
  }

  return (
    <SimplePageTransition
      isVisible={isActive}
      transitionType={transitionType}
      duration={duration}
      style={styles.page}
    >
      {children}
    </SimplePageTransition>
  );
};

/**
 * CrossFade provides simple fade transition between two states
 */
interface CrossFadeProps {
  children: React.ReactNode;
  isVisible: boolean;
  duration?: number;
}

export const CrossFade: React.FC<CrossFadeProps> = ({
  children,
  isVisible,
  duration = 300,
}) => {
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, {
      duration,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isVisible, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
    width: getScreenDimensions().width,
    height: getScreenDimensions().height,
  },
});
