import {
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  SharedValue,
  Easing,
} from 'react-native-reanimated';
import { ANIMATION_TIMINGS, LAYOUT, SCREEN_WIDTH } from './constants';

export const createCloudAnimation = (
  cloudValue: SharedValue<number>,
  startDelay: number = 0,
  startPosition: number = LAYOUT.OFF_SCREEN_LEFT
) => {
  const exitPosition = SCREEN_WIDTH + LAYOUT.CLOUD_EXIT_MARGIN;

  const createLoopAnimation = () => {
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
  };

  if (startDelay > 0) {
    return withDelay(startDelay, createLoopAnimation());
  } else {
    return createLoopAnimation();
  }
};

export const createRocketAnimation = (
  rocketValue: SharedValue<number>,
  direction: 'right-to-left' | 'left-to-right',
  startDelay: number = 0
) => {
  const { ROCKET_DURATION, ROCKET_WAIT_TIME } = ANIMATION_TIMINGS;
  const { OFF_SCREEN_LEFT, HIDDEN_POSITION } = LAYOUT;
  const offScreenRight = SCREEN_WIDTH + LAYOUT.OFF_SCREEN_RIGHT_OFFSET;

  const startPos = direction === 'right-to-left' ? offScreenRight : OFF_SCREEN_LEFT;
  const endPos = direction === 'right-to-left' ? OFF_SCREEN_LEFT : offScreenRight;

  const createRocketSequence = () => {
    return withRepeat(
      withSequence(
        withTiming(startPos, { duration: 0 }),
        withTiming(endPos, {
          duration: ROCKET_DURATION,
          easing: Easing.linear
        }),
        withTiming(HIDDEN_POSITION, { duration: 0 }),
        withDelay(
          ROCKET_WAIT_TIME + ROCKET_DURATION + ROCKET_WAIT_TIME,
          withTiming(startPos, { duration: 0 })
        )
      ),
      -1,
      false
    );
  };

  if (startDelay > 0) {
    return withDelay(startDelay, createRocketSequence());
  } else {
    return createRocketSequence();
  }
};

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
