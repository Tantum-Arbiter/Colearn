import {
  SharedValue,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';

import { ANIMATION_TIMINGS, LAYOUT, getScreenDimensions } from './constants';

/**
 * Creates a smooth cloud animation that moves from left to right.
 *
 * The animation uses a very short (but non-zero) reset duration to avoid
 * the visual glitch that occurs with duration: 0 instant jumps.
 * The reset happens when the cloud is off-screen, so it's invisible to users.
 */
export const createCloudAnimationNew = (
  cloudValue: SharedValue<number>,
  startDelay: number = 0,
  startPosition: number = LAYOUT.OFF_SCREEN_LEFT,
  _resumeFromCurrent: boolean = false // Kept for API compatibility but ignored for cleaner animation
) => {
  const { width: screenWidth } = getScreenDimensions();
  const exitPosition = screenWidth + LAYOUT.CLOUD_EXIT_MARGIN;

  // Cancel any existing animation to prevent conflicts
  cancelAnimation(cloudValue);

  // Always start from the designated start position for consistent behavior
  cloudValue.value = startPosition;

  // Use a very short duration (16ms = 1 frame) for the reset instead of 0
  // This prevents the glitch that occurs with instant value changes
  // The reset happens when the cloud is off-screen right, so it's invisible
  const RESET_DURATION = 16; // 1 frame at 60fps

  const animation = withRepeat(
    withSequence(
      // Move from start to exit (the visible animation)
      withTiming(exitPosition, {
        duration: ANIMATION_TIMINGS.CLOUD_DURATION,
        easing: Easing.linear
      }),
      // Quick reset back to start (happens off-screen)
      withTiming(startPosition, {
        duration: RESET_DURATION,
        easing: Easing.linear
      })
    ),
    -1, // Infinite repeats
    false // Don't reverse
  );

  if (startDelay > 0) {
    return withDelay(startDelay, animation);
  }

  return animation;
};
