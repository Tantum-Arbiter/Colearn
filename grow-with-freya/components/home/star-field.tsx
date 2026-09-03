import React, { memo, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { STAR_FIELD, buildStarField, type StarSeed } from '@/constants/night-sky';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface TwinklingStarProps {
  seed: StarSeed;
  colour: string;
  intensity: number;
  animated: boolean;
}

const TwinklingStar = memo(function TwinklingStar({
  seed,
  colour,
  intensity,
  animated,
}: TwinklingStarProps) {
  const glow = useSharedValue(1);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(glow);
      glow.value = 1;
      return;
    }

    glow.value = withDelay(
      seed.delayMs,
      withRepeat(
        withSequence(
          withTiming(STAR_FIELD.twinkleFloor, {
            duration: seed.twinkleMs,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, { duration: seed.twinkleMs, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(glow);
    };
  }, [animated, glow, seed.delayMs, seed.twinkleMs]);

  const style = useAnimatedStyle(() => ({ opacity: seed.opacity * intensity * glow.value }));

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: seed.x,
          top: seed.y,
          width: seed.radius * 2,
          height: seed.radius * 2,
          borderRadius: seed.radius,
          backgroundColor: colour,
        },
        style,
      ]}
    />
  );
});

export interface StarFieldProps {
  active?: boolean;
  width: number;
  height: number;
  colour: string;
  intensity: number;
  testID?: string;
}

export const StarField = memo(function StarField({
  active = true,
  width,
  height,
  colour,
  intensity,
  testID = 'star-field',
}: StarFieldProps) {
  const reduceMotion = useReducedMotion();
  const stars = useMemo(() => buildStarField(width, height), [width, height]);

  if (intensity <= 0) {
    return null;
  }

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((seed, index) => (
        <TwinklingStar
          key={`star-${index}`}
          seed={seed}
          colour={colour}
          intensity={intensity}
          animated={!reduceMotion && active}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
  },
});
