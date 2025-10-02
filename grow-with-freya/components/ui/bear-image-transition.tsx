import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface BearImageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  preloadDelay?: number;
  fadeDuration?: number;
}

/**
 * BearImageTransition specifically handles smooth transitions for the bear image
 * Provides a fade-in effect that masks any loading delays
 */
export const BearImageTransition: React.FC<BearImageTransitionProps> = ({
  children,
  isVisible,
  preloadDelay = 200,
  fadeDuration = 400,
}) => {
  const opacity = useSharedValue(0);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Give bear image time to preload
      setTimeout(() => {
        setShouldRender(true);
        
        // Start fade-in animation
        opacity.value = withTiming(1, {
          duration: fadeDuration,
          easing: Easing.out(Easing.ease),
        });
      }, preloadDelay);
    } else {
      // Fade out quickly
      opacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.ease),
      });
      
      // Hide after fade out
      setTimeout(() => setShouldRender(false), 200);
    }
  }, [isVisible, preloadDelay, fadeDuration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

/**
 * MainMenuTransition provides smooth entrance for the main menu
 * Specifically designed to hide bear image loading issues
 */
interface MainMenuTransitionProps {
  children: React.ReactNode;
  isActive: boolean;
}

export const MainMenuTransition: React.FC<MainMenuTransitionProps> = ({
  children,
  isActive,
}) => {
  const containerOpacity = useSharedValue(0);
  const bearOpacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Staggered animation for smooth appearance
      
      // 1. Background appears first (fast)
      backgroundOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });

      // 2. Main container appears
      containerOpacity.value = withDelay(100, withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      }));

      // 3. Bear image appears last (after preload time)
      bearOpacity.value = withDelay(300, withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      }));
    } else {
      // Quick fade out
      const quickFade = {
        duration: 200,
        easing: Easing.in(Easing.ease),
      };
      
      containerOpacity.value = withTiming(0, quickFade);
      bearOpacity.value = withTiming(0, quickFade);
      backgroundOpacity.value = withTiming(0, quickFade);
    }
  }, [isActive]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const bearStyle = useAnimatedStyle(() => ({
    opacity: bearOpacity.value,
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  return (
    <View style={styles.mainMenuContainer}>
      {/* Background layer */}
      <Animated.View style={[styles.backgroundLayer, backgroundStyle]}>
        {/* Background elements like clouds and stars */}
      </Animated.View>

      {/* Main content layer */}
      <Animated.View style={[styles.contentLayer, containerStyle]}>
        {children}
      </Animated.View>

      {/* Bear image layer - appears last */}
      <Animated.View style={[styles.bearLayer, bearStyle]} pointerEvents="none">
        {/* Bear image will be rendered here */}
      </Animated.View>
    </View>
  );
};

/**
 * Simple fade transition for page changes
 */
interface FadeTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  duration?: number;
  delay?: number;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  isVisible,
  duration = 300,
  delay = 0,
}) => {
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    const animationConfig = {
      duration,
      easing: Easing.inOut(Easing.ease),
    };

    if (delay > 0) {
      opacity.value = withDelay(delay, withTiming(isVisible ? 1 : 0, animationConfig));
    } else {
      opacity.value = withTiming(isVisible ? 1 : 0, animationConfig);
    }
  }, [isVisible, duration, delay]);

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
  mainMenuContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  contentLayer: {
    flex: 1,
    zIndex: 2,
  },
  bearLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '15%',
    zIndex: 3,
  },
});
