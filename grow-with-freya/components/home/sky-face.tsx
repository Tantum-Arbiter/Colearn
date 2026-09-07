import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  SKY_FACE_RHYTHM,
  SKY_FACE_SPARKLES,
  laughFace,
  laughGlow,
  laughPose,
  sparkleAt,
} from '@/constants/sky-face';
import type { TimeOfDay } from '@/constants/home-scene';
import { useSkyFace } from '@/hooks/use-sky-face';

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SKY_FACE_ART = {
  day: {
    resting: require('../../assets/images/ui-elements/home-sun.webp'),
    laughing: require('../../assets/images/ui-elements/home-sun-laughing.webp'),
  },
  night: {
    resting: require('../../assets/images/ui-elements/home-moon.webp'),
    laughing: require('../../assets/images/ui-elements/home-moon-laughing.webp'),
  },
} as const;

const SKY_FACE_LIGHT = {
  day: { glow: '#FFD86B', sparkle: '#FFF3C4' },
  night: { glow: '#C9D8FF', sparkle: '#E6EEFF' },
} as const;

const HALO_SCALE = 1.6;
const HALO_OPACITY = 0.62;
const SPARKLE_BOX = 0.24;

interface SparkleProps {
  index: number;
  laugh: SharedValue<number>;
  size: number;
  colour: string;
  testID: string;
}

function Sparkle({ index, laugh, size, colour, testID }: SparkleProps) {
  const box = size * SPARKLE_BOX;

  const style = useAnimatedStyle(() => {
    const pose = sparkleAt(index, laugh.value);
    return {
      opacity: pose.opacity,
      transform: [
        { translateX: pose.x * size - box / 2 },
        { translateY: pose.y * size - box / 2 },
        { rotate: `${pose.rotate}deg` },
        { scale: pose.scale },
      ],
    };
  });

  return (
    <Animated.Text
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.sparkle, { width: box, height: box, fontSize: box * 0.9, lineHeight: box, color: colour }, style]}
    >
      ✦
    </Animated.Text>
  );
}

export interface SkyFaceProps {
  size: number;
  timeOfDay: TimeOfDay;
  animated?: boolean;
  testID?: string;
}

export const SkyFace = memo(function SkyFace({
  size,
  timeOfDay,
  animated = true,
  testID = 'sky-face',
}: SkyFaceProps) {
  const { t } = useTranslation();
  const [nudges, setNudges] = useState(0);
  const expression = useSkyFace({ enabled: animated, nudge: nudges });
  const handlePress = useCallback(() => setNudges((count) => count + 1), []);
  const laugh = useSharedValue(0);

  useEffect(() => {
    if (expression !== 'laughing') return;
    laugh.value = 0;
    laugh.value = withTiming(1, { duration: SKY_FACE_RHYTHM.laughMs, easing: Easing.linear });
  }, [expression, nudges, laugh]);

  const poseStyle = useAnimatedStyle(() => {
    const pose = laughPose(laugh.value);
    return {
      transform: [
        { translateY: pose.lift },
        { rotate: `${pose.rotate}deg` },
        { scaleX: pose.scaleX },
        { scaleY: pose.scaleY },
      ],
    };
  });

  const faceStyle = useAnimatedStyle(() => ({ opacity: laughFace(laugh.value) }));

  const glowStyle = useAnimatedStyle(() => {
    const glow = laughGlow(laugh.value);
    return {
      opacity: glow,
      transform: [{ scale: 0.88 + 0.16 * glow }],
    };
  });

  const art = SKY_FACE_ART[timeOfDay];
  const light = SKY_FACE_LIGHT[timeOfDay];
  const dimensions = { width: size, height: size };
  const halo = size * HALO_SCALE;
  const gradientId = `sky-face-glow-${timeOfDay}`;

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t(timeOfDay === 'day' ? 'home.sun' : 'home.moon')}
      onPress={handlePress}
      style={[dimensions, poseStyle]}
    >
      <Animated.View
        testID="sky-face-glow"
        pointerEvents="none"
        style={[styles.glow, { width: halo, height: halo, left: (size - halo) / 2, top: (size - halo) / 2 }, glowStyle]}
      >
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={light.glow} stopOpacity={HALO_OPACITY} />
              <Stop offset="0.42" stopColor={light.glow} stopOpacity={HALO_OPACITY * 0.38} />
              <Stop offset="1" stopColor={light.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={`url(#${gradientId})`} />
        </Svg>
      </Animated.View>

      <Image
        testID="sky-face-resting"
        source={art.resting}
        style={[styles.layer, dimensions]}
        contentFit="contain"
        transition={0}
      />

      <AnimatedImage
        testID="sky-face-laughing"
        source={art.laughing}
        style={[styles.layer, dimensions, faceStyle]}
        contentFit="contain"
        transition={0}
      />

      {SKY_FACE_SPARKLES.map((_, index) => (
        <Sparkle
          key={index}
          testID="sky-face-sparkle"
          index={index}
          laugh={laugh}
          size={size}
          colour={light.sparkle}
        />
      ))}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  glow: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
    left: 0,
    top: 0,
    textAlign: 'center',
    fontWeight: '700',
  },
});
