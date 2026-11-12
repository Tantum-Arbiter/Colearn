import React, { memo, useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSteadySharedValue } from '@/hooks/use-steady-shared-value';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const RING_STROKE = 3;
export const RING_FILL_MS = 420;
export const RING_CLOSE_MS = 120;
export const RING_COLLAPSE_MS = 180;
export const RING_FILL = '#873FA0';

function closeAndCollapse(from: number, circumference: number) {
  const remaining = Math.max(0, Math.min(1, from / circumference));
  return withSequence(
    withTiming(0, { duration: Math.round(RING_CLOSE_MS * remaining), easing: Easing.out(Easing.cubic) }),
    withTiming(-circumference, { duration: RING_COLLAPSE_MS, easing: Easing.in(Easing.cubic) })
  );
}

export function ringOffset(progress: number, circumference: number): number {
  return circumference * (1 - Math.min(1, Math.max(0, progress)));
}

interface PageProgressRingProps {
  size: number;
  stroke?: number;
  page: number;
  progress: number;
  reduceMotion: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PageProgressRing = memo(function PageProgressRing({ size, stroke = RING_STROKE, page, progress, reduceMotion, style }: PageProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = useSteadySharedValue(ringOffset(progress, circumference));
  const lastPage = useRef(page);
  const gone = useRef(false);

  useEffect(() => {
    const target = ringOffset(progress, circumference);
    const turned = page > lastPage.current;
    lastPage.current = page;
    if (progress >= 1 && !turned) {
      gone.current = true;
      offset.value = reduceMotion ? circumference : closeAndCollapse(offset.value, circumference);
      return;
    }
    if (gone.current || reduceMotion) {
      gone.current = false;
      offset.value = target;
      return;
    }
    if (!turned) {
      offset.value = withTiming(target, { duration: RING_FILL_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    offset.value = withSequence(closeAndCollapse(offset.value, circumference), withTiming(target, { duration: 0 }));
  }, [progress, page, circumference, reduceMotion, offset]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <View testID="page-progress-ring" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={RING_FILL}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
});
