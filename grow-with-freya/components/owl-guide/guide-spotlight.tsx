import React, { memo, useEffect, useId } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { spotlightFrame, type SpotlightShape, type TargetRect } from '@/constants/owl-guide';

export const SPOTLIGHT_DIM = 'rgba(6, 10, 28, 0.66)';
export const SPOTLIGHT_RING = 'rgba(255, 224, 150, 0.9)';
export const RING_PULSE_MS = 1600;
export const RING_GROW = 6;

export interface GuideSpotlightProps {
  width: number;
  height: number;
  target: TargetRect | null;
  shape?: SpotlightShape;
  radius?: number;
  testID?: string;
}

export const GuideSpotlight = memo(function GuideSpotlight({
  width,
  height,
  target,
  shape = 'circle',
  radius = 20,
  testID = 'owl-guide-spotlight',
}: GuideSpotlightProps) {
  const maskId = useId();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!target || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: RING_PULSE_MS / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: RING_PULSE_MS / 2, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [pulse, target, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + (RING_GROW / 100) * pulse.value }],
  }));

  const frame = target ? spotlightFrame(target, shape, radius) : null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none" testID={testID}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id={maskId}>
            <Rect x="0" y="0" width={width} height={height} fill="white" />
            {frame ? (
              <Rect
                testID="owl-guide-cutout"
                x={frame.x}
                y={frame.y}
                width={frame.width}
                height={frame.height}
                rx={frame.radius}
                ry={frame.radius}
                fill="black"
              />
            ) : null}
          </Mask>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill={SPOTLIGHT_DIM} mask={`url(#${maskId})`} />
      </Svg>

      {frame ? (
        <Animated.View
          testID="owl-guide-ring"
          style={[
            styles.ring,
            {
              left: frame.x - 3,
              top: frame.y - 3,
              width: frame.width + 6,
              height: frame.height + 6,
              borderRadius: frame.radius + 3,
            },
            ringStyle,
          ]}
        />
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: SPOTLIGHT_RING,
  },
});
