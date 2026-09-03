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
import Svg, { Polygon } from 'react-native-svg';
import { SPARKLES, STAR_FIELD, buildStarField, type StarSeed } from '@/constants/night-sky';
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

interface SparkleProps {
  x: number;
  y: number;
  size: number;
  colour: string;
  intensity: number;
  animated: boolean;
  index: number;
}

const Sparkle = memo(function Sparkle({
  x,
  y,
  size,
  colour,
  intensity,
  animated,
  index,
}: SparkleProps) {
  const glow = useSharedValue(1);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(glow);
      glow.value = 1;
      return;
    }

    const duration = 3200 + index * 480;

    glow.value = withDelay(
      index * 720,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(glow);
    };
  }, [animated, glow, index]);

  const style = useAnimatedStyle(() => ({ opacity: intensity * glow.value }));
  const points = `${size},0 ${size * 1.18},${size * 0.82} ${size * 2},${size} ${size * 1.18},${size * 1.18} ${size},${size * 2} ${size * 0.82},${size * 1.18} 0,${size} ${size * 0.82},${size * 0.82}`;

  return (
    <Animated.View style={[styles.sparkle, { left: x, top: y }, style]}>
      <Svg width={size * 2} height={size * 2}>
        <Polygon points={points} fill={colour} />
      </Svg>
    </Animated.View>
  );
});

export interface StarFieldProps {
  active?: boolean;
  width: number;
  height: number;
  colour: string;
  sparkleColour: string;
  intensity: number;
  testID?: string;
}

export const StarField = memo(function StarField({
  active = true,
  width,
  height,
  colour,
  sparkleColour,
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

      {SPARKLES.map((sparkle, index) => (
        <Sparkle
          key={`sparkle-${index}`}
          x={sparkle.xRatio * width}
          y={sparkle.yRatio * height}
          size={sparkle.size}
          colour={sparkleColour}
          intensity={intensity}
          animated={!reduceMotion && active}
          index={index}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
  },
});
