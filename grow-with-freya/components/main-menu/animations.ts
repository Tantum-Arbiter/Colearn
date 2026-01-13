import {
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  SharedValue,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { ANIMATION_TIMINGS, LAYOUT, getScreenDimensions } from './constants';

export const createCloudAnimation = (
  cloudValue: SharedValue<number>,
  startDelay: number = 0,
  startPosition: number = LAYOUT.OFF_SCREEN_LEFT,
  resumeFromCurrent: boolean = false
) => {
  // Use dynamic screen width to handle device differences and orientation changes
  const { width: screenWidth } = getScreenDimensions();
  const exitPosition = screenWidth + LAYOUT.CLOUD_EXIT_MARGIN;

  // CRITICAL: Cancel any existing animation to prevent conflicts
  cancelAnimation(cloudValue);

  // Safety check: if resumeFromCurrent is true but we have invalid values, force fresh start
  if (resumeFromCurrent) {
    const currentPos = cloudValue.value;
    if (!isFinite(currentPos) || isNaN(currentPos)) {
      console.warn('Cloud animation: Invalid current position, forcing fresh start');
      resumeFromCurrent = false;
    }
  }

  const createLoopAnimation = () => {
    if (resumeFromCurrent) {
      // Continue from current position without resetting
      const currentPosition = cloudValue.value;

      // Debug logging disabled for performance
      const isDev = false;

      if (currentPosition > startPosition && currentPosition < exitPosition) {
        const remainingDistance = exitPosition - currentPosition;
        const totalDistance = exitPosition - startPosition;
        const progressRatio = remainingDistance / totalDistance;

        // If cloud is very close to exit (within 20% of total distance), start fresh cycle
        // This prevents extremely slow animations when cloud is almost at the exit
        if (progressRatio < 0.2) {
          if (isDev) {
            console.log('Cloud very close to exit - starting fresh cycle to prevent slow animation');
          }
          return withRepeat(
            withSequence(
              withTiming(startPosition, { duration: 0 }),
              withTiming(exitPosition, {
                duration: ANIMATION_TIMINGS.CLOUD_DURATION,
                easing: Easing.linear
              })
            ),
            -1,
            false
          );
        }

        // Use a fixed reasonable duration instead of proportional calculation
        // This prevents extremely long durations when cloud is close to exit
        const fixedDuration = Math.min(ANIMATION_TIMINGS.CLOUD_DURATION * 0.3, 8000); // Max 8 seconds

        if (isDev) {
          console.log(`Cloud continuing smoothly: remaining=${remainingDistance}, duration=${fixedDuration} (fixed duration to prevent freezing) - CACHE_BUSTER_v2`);
        }

        // Force cache refresh

        return withRepeat(
          withSequence(
            withTiming(exitPosition, {
              duration: fixedDuration,
              easing: Easing.linear
            }),
            withTiming(startPosition, { duration: 0 }),
            withTiming(exitPosition, {
              duration: ANIMATION_TIMINGS.CLOUD_DURATION,
              easing: Easing.linear
            })
          ),
          -1,
          false
        );
      } else {
        if (isDev) {
          console.log('Cloud starting fresh cycle - boundary or invalid position');
        }
        return withRepeat(
          withSequence(
            withTiming(startPosition, { duration: 0 }),
            withTiming(exitPosition, {
              duration: ANIMATION_TIMINGS.CLOUD_DURATION,
              easing: Easing.linear
            })
          ),
          -1,
          false
        );
      }
    } else {
      return withRepeat(
        withSequence(
          withTiming(startPosition, { duration: 0 }),
          withTiming(exitPosition, {
            duration: ANIMATION_TIMINGS.CLOUD_DURATION,
            easing: Easing.linear
          })
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

// Rocket animation removed entirely

export const createIconPulseAnimation = (scale: SharedValue<number>, isLarge: boolean = false) => {
  const maxScale = isLarge ? 1.08 : 1.05;

  return withRepeat(
    withSequence(
      withTiming(maxScale, {
        duration: ANIMATION_TIMINGS.ICON_PULSE_DURATION,
        easing: Easing.inOut(Easing.ease)
      }),
      withTiming(1, {
        duration: ANIMATION_TIMINGS.ICON_PULSE_DURATION,
        easing: Easing.inOut(Easing.ease)
      })
    ),
    -1,
    false
  );
};

export const createGlowAnimation = (glow: SharedValue<number>) => {
  return withRepeat(
    withSequence(
      withTiming(1.5, {
        duration: ANIMATION_TIMINGS.ICON_GLOW_DURATION,
        easing: Easing.inOut(Easing.ease)
      }),
      withTiming(0.3, {
        duration: ANIMATION_TIMINGS.ICON_GLOW_DURATION,
        easing: Easing.inOut(Easing.ease)
      })
    ),
    -1,
    false
  );
};

export const createShimmerAnimation = (shimmer: SharedValue<number>) => {
  return withRepeat(
    withSequence(
      withTiming(1, {
        duration: ANIMATION_TIMINGS.ICON_SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease)
      }),
      withTiming(0, {
        duration: ANIMATION_TIMINGS.ICON_SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease)
      })
    ),
    -1,
    false
  );
};

export const createSelectionAnimation = (
  selectionScale: SharedValue<number>,
  selectionGlow: SharedValue<number>
) => {
  const scaleAnimation = withSequence(
    withTiming(1.2, {
      duration: ANIMATION_TIMINGS.SELECTION_SCALE_DURATION,
      easing: Easing.out(Easing.back(1.5))
    }),
    withTiming(1.08, { duration: 200 }),
    withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease)
    })
  );

  const glowAnimation = withSequence(
    withTiming(2.0, { duration: ANIMATION_TIMINGS.SELECTION_GLOW_DURATION }),
    withTiming(1.5, { duration: 300 }),
    withTiming(0, { duration: 500 })
  );

  return { scaleAnimation, glowAnimation };
};

export const createPressAnimation = (scale: SharedValue<number>, isLarge: boolean = false) => {
  const restScale = isLarge ? 1.05 : 1;

  return withSequence(
    withTiming(0.92, { duration: ANIMATION_TIMINGS.PRESS_SCALE_DURATION }),
    withTiming(restScale, { duration: ANIMATION_TIMINGS.PRESS_SCALE_DURATION })
  );
};

export const createGlowBurstAnimation = (glow: SharedValue<number>, originalValue: number) => {
  return withSequence(
    withTiming(0.8, { duration: ANIMATION_TIMINGS.GLOW_BURST_DURATION }),
    withTiming(originalValue, { duration: 200 })
  );
};
