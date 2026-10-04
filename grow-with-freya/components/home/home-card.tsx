import React, { memo, useCallback } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { HOME_JOURNEY_MOTION } from '@/constants/home-journey';
import { HeroCardFrame } from './hero-card-frame';

export function useArrowNudge() {
  const nudge = useSharedValue(0);

  const play = useCallback(() => {
    nudge.value = withSequence(
      withTiming(1, { duration: HOME_JOURNEY_MOTION.arrowNudgeMs, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: HOME_JOURNEY_MOTION.arrowNudgeMs * 1.6, easing: Easing.inOut(Easing.quad) })
    );
  }, [nudge]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: HOME_JOURNEY_MOTION.arrowNudge * nudge.value }],
  }));

  return { play, style };
}

export interface HomeCardProps {
  width: number;
  onPress: () => void;
  onPressed?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  fill?: readonly [string, string];
  backdrop?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

/**
 * The frame every panel on the home scene shares.
 *
 * It used to draw a flatter frame of its own -- a hairline edge, a gloss, and
 * an `emphasis` glow nothing ever switched on -- while the continue card wore
 * the storybook frame. Three panels in two frames read as two designs, so
 * this now hands straight through to that frame: one stroke, one bloom, and
 * nothing else on any of them that glows.
 */
export const HomeCard = memo(function HomeCard({
  width,
  onPress,
  onPressed,
  accessibilityLabel,
  accessibilityHint,
  fill,
  backdrop,
  children,
  testID = 'home-card',
}: HomeCardProps) {
  return (
    <HeroCardFrame
      testID={testID}
      width={width}
      onPress={onPress}
      onPressed={onPressed}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      fill={fill}
      backdrop={backdrop}
    >
      {children}
    </HeroCardFrame>
  );
});
