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

  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log(`NEW Cloud animation setup: screenWidth=${screenWidth}, exitPosition=${exitPosition}, startPosition=${startPosition}`);
  }

  cancelAnimation(cloudValue);

  const createLoopAnimation = () => {
    if (resumeFromCurrent) {
      const currentPosition = cloudValue.value;
      const isValidPosition = isFinite(currentPosition) && !isNaN(currentPosition);
      const isWithinBounds = currentPosition > (startPosition - 100) && currentPosition < (exitPosition + 100);
      
      if (isValidPosition && isWithinBounds && currentPosition > startPosition && currentPosition < exitPosition) {
        const remainingDistance = exitPosition - currentPosition;
        const totalDistance = exitPosition - startPosition;
        const proportionalDuration = Math.max(
          2000, // Minimum 2 seconds
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
          console.log(`NEW Cloud invalid position, resetting: current=${currentPosition}, valid=${isValidPosition}, bounds=${isWithinBounds}`);
        }
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
