import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';

/**
 * Custom hook for cycling loading circle animation
 * Rotates continuously, then plays click effect when complete
 */
export function useLoadingCircleAnimation() {
  const rotation = useSharedValue(0);

  const startAnimation = () => {
    // Reset rotation to 0 before starting to ensure consistent speed
    cancelAnimation(rotation);
    rotation.value = 0;

    // Use withRepeat for continuous rotation
    // Duration of 1000ms (1 second) per rotation for a nice smooth spin
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );
  };

  const stopAnimation = () => {
    cancelAnimation(rotation);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return { rotation, startAnimation, stopAnimation, animatedStyle };
}

/**
 * Custom hook for checkmark completion animation
 * Shows checkmark when loading completes - no fade, appears immediately
 */
export function useCheckmarkAnimation() {
  const checkmarkOpacity = useSharedValue(0);

  const playCheckmarkEffect = (onComplete?: () => void) => {
    // Show checkmark immediately (no fade) and call onComplete after a short delay
    // to let the Lottie animation play
    checkmarkOpacity.value = 1;

    // Small delay to let the checkmark Lottie animation be visible before scrolling out
    if (onComplete) {
      setTimeout(() => {
        runOnJS(onComplete)();
      }, 600);
    }
  };

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
  }));

  return { checkmarkOpacity, playCheckmarkEffect, checkmarkAnimatedStyle };
}

/**
 * Custom hook for fade in/out animation for text
 */
export function useTextFadeAnimation() {
  const opacity = useSharedValue(0);

  const startFadeIn = () => {
    opacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  };

  const startFadeOut = () => {
    opacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { opacity, startFadeIn, startFadeOut, animatedStyle };
}

