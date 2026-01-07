import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

/**
 * Create a cycling loading circle animation
 * Rotates continuously, then plays click effect when complete
 */
export function createLoadingCircleAnimation() {
  const rotation = useSharedValue(0);

  const startAnimation = () => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return { rotation, startAnimation, animatedStyle };
}

/**
 * Create a checkmark completion animation
 * Shows checkmark when loading completes
 */
export function createCheckmarkAnimation() {
  const checkmarkOpacity = useSharedValue(0);

  const playCheckmarkEffect = (onComplete?: () => void) => {
    // Fade in checkmark
    checkmarkOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished && onComplete) {
        runOnJS(onComplete)();
      }
    });
  };

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
  }));

  return { checkmarkOpacity, playCheckmarkEffect, checkmarkAnimatedStyle };
}

/**
 * Create a fade in/out animation for text
 */
export function createTextFadeAnimation() {
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

