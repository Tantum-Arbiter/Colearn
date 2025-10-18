import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface EntranceAnimationProps {
  children: React.ReactNode;
  animationType?: 'fade' | 'slide-up' | 'slide-down' | 'scale';
  duration?: number;
  delay?: number;
  style?: any;
  testID?: string;
}

/**
 * EntranceAnimation provides simple, reliable entrance animations for pages
 * Always starts from hidden/off-screen and animates to visible/on-screen
 */
export const EntranceAnimation: React.FC<EntranceAnimationProps> = ({
  children,
  animationType = 'fade',
  duration = 400,
  delay = 0,
  style,
  testID,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Set initial values based on animation type
    switch (animationType) {
      case 'slide-up':
        opacity.value = 1;
        translateY.value = 50;
        break;
      case 'slide-down':
        opacity.value = 1;
        translateY.value = -50;
        break;
      case 'scale':
        opacity.value = 0;
        scale.value = 0.8;
        break;
      case 'fade':
      default:
        opacity.value = 0;
        translateY.value = 0;
        scale.value = 1;
        break;
    }

    // Animate to final values
    const animationConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    const startAnimation = () => {
      opacity.value = withTiming(1, animationConfig);
      translateY.value = withTiming(0, animationConfig);
      scale.value = withTiming(1, animationConfig);
    };

    if (delay > 0) {
      setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }
  }, [animationType, duration, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]} testID={testID}>
      {children}
    </Animated.View>
  );
};

/**
 * PageEntranceWrapper provides consistent entrance animations for full pages
 */
interface PageEntranceWrapperProps {
  children: React.ReactNode;
  pageType?: 'main' | 'stories' | 'settings';
  testID?: string;
}

export const PageEntranceWrapper: React.FC<PageEntranceWrapperProps> = ({
  children,
  pageType = 'main',
  testID,
}) => {
  // Different animation types for different pages
  const getAnimationConfig = () => {
    switch (pageType) {
      case 'stories':
        return {
          animationType: 'slide-up' as const,
          duration: 500,
          delay: 0,
        };
      case 'settings':
        return {
          animationType: 'slide-down' as const,
          duration: 400,
          delay: 0,
        };
      case 'main':
      default:
        return {
          animationType: 'fade' as const,
          duration: 300,
          delay: 100, // Small delay for main menu to let bear image load
        };
    }
  };

  const config = getAnimationConfig();

  return (
    <EntranceAnimation
      animationType={config.animationType}
      duration={config.duration}
      delay={config.delay}
      testID={testID}
    >
      {children}
    </EntranceAnimation>
  );
};

/**
 * StoryPageEntrance specifically for stories page with slide-up animation
 */
export const StoryPageEntrance: React.FC<{ children: React.ReactNode; testID?: string }> = ({ children, testID }) => {
  return (
    <EntranceAnimation
      animationType="slide-up"
      duration={500}
      delay={0}
      testID={testID}
    >
      {children}
    </EntranceAnimation>
  );
};

/**
 * MainMenuEntrance specifically for main menu with fade animation
 */
export const MainMenuEntrance: React.FC<{ children: React.ReactNode; testID?: string }> = ({ children, testID }) => {
  return (
    <EntranceAnimation
      animationType="fade"
      duration={400}
      delay={50} // Small delay to let bear image settle
      testID={testID}
    >
      {children}
    </EntranceAnimation>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
