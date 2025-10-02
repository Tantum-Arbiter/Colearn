import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface PageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  direction?: 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'fade' | 'scale';
  duration?: number;
  delay?: number;
  onTransitionComplete?: () => void;
  style?: any;
}

/**
 * PageTransition component provides smooth animated transitions between pages
 * Helps mask image loading delays and creates seamless navigation experience
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  isVisible,
  direction = 'slide-up',
  duration = 400,
  delay = 0,
  onTransitionComplete,
  style,
}) => {
  const opacity = useSharedValue(isVisible ? 1 : 0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const animateIn = () => {
      // Reset values based on direction
      switch (direction) {
        case 'slide-up':
          translateY.value = isVisible ? 50 : 0;
          break;
        case 'slide-down':
          translateY.value = isVisible ? -50 : 0;
          break;
        case 'slide-left':
          translateX.value = isVisible ? 50 : 0;
          break;
        case 'slide-right':
          translateX.value = isVisible ? -50 : 0;
          break;
        case 'scale':
          scale.value = isVisible ? 0.9 : 1;
          break;
        case 'fade':
        default:
          // Only opacity animation
          break;
      }

      // Animate to target values
      const animationConfig = {
        duration,
        easing: Easing.out(Easing.cubic),
      };

      const completeCallback = onTransitionComplete ? () => runOnJS(onTransitionComplete)() : undefined;

      if (delay > 0) {
        opacity.value = withDelay(delay, withTiming(isVisible ? 1 : 0, animationConfig, completeCallback));
        translateX.value = withDelay(delay, withTiming(0, animationConfig));
        translateY.value = withDelay(delay, withTiming(0, animationConfig));
        scale.value = withDelay(delay, withTiming(1, animationConfig));
      } else {
        opacity.value = withTiming(isVisible ? 1 : 0, animationConfig, completeCallback);
        translateX.value = withTiming(0, animationConfig);
        translateY.value = withTiming(0, animationConfig);
        scale.value = withTiming(1, animationConfig);
      }
    };

    animateIn();
  }, [isVisible, direction, duration, delay, onTransitionComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
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
 * CrossFadeTransition provides smooth cross-fade between two views
 * Perfect for transitioning between main menu and story selection
 */
interface CrossFadeTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  duration?: number;
  style?: any;
}

export const CrossFadeTransition: React.FC<CrossFadeTransitionProps> = ({
  children,
  isVisible,
  duration = 300,
  style,
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
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

/**
 * SlideTransition provides slide-based transitions with customizable direction
 */
interface SlideTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  direction: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  style?: any;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  isVisible,
  direction,
  distance = 100,
  duration = 400,
  style,
}) => {
  const opacity = useSharedValue(isVisible ? 1 : 0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Set initial position based on direction
    const initialX = direction === 'left' ? -distance : direction === 'right' ? distance : 0;
    const initialY = direction === 'up' ? -distance : direction === 'down' ? distance : 0;

    if (!isVisible) {
      translateX.value = initialX;
      translateY.value = initialY;
    }

    // Animate to final position
    const animationConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    opacity.value = withTiming(isVisible ? 1 : 0, animationConfig);
    translateX.value = withTiming(isVisible ? 0 : initialX, animationConfig);
    translateY.value = withTiming(isVisible ? 0 : initialY, animationConfig);
  }, [isVisible, direction, distance, duration]);

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
