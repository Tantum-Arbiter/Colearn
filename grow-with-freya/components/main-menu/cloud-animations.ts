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

export const createCloudAnimationNew = (
  cloudValue: SharedValue<number>,
  startDelay: number = 0,
  startPosition: number = LAYOUT.OFF_SCREEN_LEFT,
  resumeFromCurrent: boolean = false
) => {
  const { width: screenWidth } = getScreenDimensions();
  const exitPosition = screenWidth + LAYOUT.CLOUD_EXIT_MARGIN;

  const isDev = false; // Disabled verbose cloud logging

  cancelAnimation(cloudValue);

  const createLoopAnimation = () => {
    if (resumeFromCurrent) {
      const currentPosition = cloudValue.value;
      const isValidPosition = isFinite(currentPosition) && !isNaN(currentPosition);

      // More strict bounds checking: cloud should be in the active animation area
      // Allow some tolerance but prevent clouds from resuming from random middle positions
      const minValidPosition = startPosition + 50; // Must be at least 50px past start
      const maxValidPosition = exitPosition - 100; // Must be at least 100px before exit
      const isInActiveArea = currentPosition >= minValidPosition && currentPosition <= maxValidPosition;

      // Additional check: ensure the remaining duration won't be too short (causing fast movement)
      const remainingDistance = exitPosition - currentPosition;
      const totalDistance = exitPosition - startPosition;
      const wouldBeTooFast = remainingDistance < (totalDistance * 0.3); // Less than 30% remaining = too fast

      if (isValidPosition && isInActiveArea && !wouldBeTooFast) {
        const proportionalDuration = Math.max(
          3000, // Increased minimum to 3 seconds to prevent fast movement
          Math.min(
            ANIMATION_TIMINGS.CLOUD_DURATION,
            (remainingDistance / totalDistance) * ANIMATION_TIMINGS.CLOUD_DURATION
          )
        );

        if (isDev) {
          console.log(`NEW Cloud resume: current=${currentPosition}, start=${startPosition}, exit=${exitPosition}`);
          console.log(`NEW Cloud continuing with proportional duration: ${Math.round(proportionalDuration)}ms`);
        }

        return withRepeat(
          withSequence(
            withTiming(exitPosition, { duration: proportionalDuration, easing: Easing.linear }),
            withTiming(startPosition, { duration: 0 }),
            withTiming(exitPosition, { duration: ANIMATION_TIMINGS.CLOUD_DURATION, easing: Easing.linear })
          ),
          -1,
          false
        );
      } else {
        if (isDev) {
          console.log(`NEW Cloud invalid position, resetting: current=${currentPosition}, valid=${isValidPosition}, inActiveArea=${isInActiveArea}, wouldBeTooFast=${wouldBeTooFast}`);
        }
        // Always reset to start position for invalid cases
        cloudValue.value = startPosition;
        return withRepeat(
          withSequence(
            withTiming(startPosition, { duration: 0 }),
            withTiming(exitPosition, { duration: ANIMATION_TIMINGS.CLOUD_DURATION, easing: Easing.linear })
          ),
          -1,
          false
        );
      }
    } else {
      if (isDev) {
        console.log(`NEW Cloud fresh start: start=${startPosition}, exit=${exitPosition}`);
      }
      // Always ensure we start from the correct position
      cloudValue.value = startPosition;
      return withRepeat(
        withSequence(
          withTiming(startPosition, { duration: 0 }),
          withTiming(exitPosition, { duration: ANIMATION_TIMINGS.CLOUD_DURATION, easing: Easing.linear })
        ),
        -1,
        false
      );
    }
  };

  if (startDelay > 0) {
    return withDelay(startDelay, createLoopAnimation());
  } else {
    return createLoopAnimation();
  }
};
