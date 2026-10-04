import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { GULL_COURSES, gullPlace, gullProgress, wingLift, type GullCourse } from '@/constants/island-life';
import type { IslandLayout } from '@/constants/island-scene';

export const GULL_COLOUR = '#FFFFFF';

const HEIGHT_OF_SPAN = 0.5;
const HINGE_DROP = 0.1;
const WING_BOX = '0 0 50 50';
const LEFT_WING = 'M50 27 C38 12 20 8 2 17 C18 17 32 24 44 36 L50 34 Z';
const RIGHT_WING = 'M0 27 C12 12 30 8 48 17 C32 17 18 24 6 36 L0 34 Z';

interface GullProps {
  course: GullCourse;
  index: number;
  layout: IslandLayout;
  sky: SharedValue<number>;
  beat: SharedValue<number>;
}

const Gull = memo(function Gull({ course, index, layout, sky, beat }: GullProps) {
  const span = course.size * layout.scale;
  const height = span * HEIGHT_OF_SPAN;
  const half = span / 2;
  const hinge = height * HINGE_DROP;
  const scale = layout.scale;
  const left = layout.picture.left;
  const top = layout.picture.top;

  const flight = useAnimatedStyle(() => {
    const place = gullPlace(gullProgress(sky.value, course), course);

    return {
      transform: [
        { translateX: left + place.x * scale - span / 2 },
        { translateY: top + place.y * scale - height / 2 },
        { scale: place.scale },
      ],
    };
  });

  const leftWing = useAnimatedStyle(() => ({
    transform: [
      { translateX: half / 2 },
      { translateY: hinge },
      { rotate: `${wingLift(beat.value, gullProgress(sky.value, course), index)}deg` },
      { translateX: -half / 2 },
      { translateY: -hinge },
    ],
  }));

  const rightWing = useAnimatedStyle(() => ({
    transform: [
      { translateX: -half / 2 },
      { translateY: hinge },
      { rotate: `${-wingLift(beat.value, gullProgress(sky.value, course), index)}deg` },
      { translateX: half / 2 },
      { translateY: -hinge },
    ],
  }));

  return (
    <Animated.View testID={`island-gull-${index}`} style={[styles.gull, { width: span, height }, flight]}>
      <Animated.View
        testID={`island-gull-${index}-wing-left`}
        style={[styles.wing, { left: 0, width: half, height }, leftWing]}
      >
        <Svg width={half} height={height} viewBox={WING_BOX} preserveAspectRatio="none">
          <Path d={LEFT_WING} fill={GULL_COLOUR} />
        </Svg>
      </Animated.View>
      <Animated.View
        testID={`island-gull-${index}-wing-right`}
        style={[styles.wing, { left: half, width: half, height }, rightWing]}
      >
        <Svg width={half} height={height} viewBox={WING_BOX} preserveAspectRatio="none">
          <Path d={RIGHT_WING} fill={GULL_COLOUR} />
        </Svg>
      </Animated.View>
      <Svg width={span} height={height} style={styles.body}>
        <Ellipse cx={half} cy={height * 0.62} rx={span * 0.085} ry={span * 0.06} fill={GULL_COLOUR} />
      </Svg>
    </Animated.View>
  );
});

export interface IslandGullsProps {
  courses?: readonly GullCourse[];
  layout: IslandLayout;
  sky: SharedValue<number>;
  beat: SharedValue<number>;
}

export const IslandGulls = memo(function IslandGulls({ courses = GULL_COURSES, layout, sky, beat }: IslandGullsProps) {
  return (
    <View
      testID="island-gulls"
      style={styles.flock}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {courses.map((course, index) => (
        <Gull key={index} course={course} index={index} layout={layout} sky={sky} beat={beat} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  flock: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  gull: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  wing: {
    position: 'absolute',
    top: 0,
  },
  body: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
