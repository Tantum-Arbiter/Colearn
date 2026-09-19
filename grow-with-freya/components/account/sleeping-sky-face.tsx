import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import type { TimeOfDay } from '@/constants/home-scene';
import {
  PEEK_TOTAL_MS,
  SLEEPING_EYES,
  SLEEPING_EYE_STROKE,
  SLEEPING_FACE_INK,
  SLEEP_RHYTHM,
  peekOpenness,
  sleepingBody,
  zzzAt,
  type EyeSpot,
} from '@/constants/sleeping-sky-face';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SLEEPING_ART = {
  sun: require('../../assets/images/ui-elements/home-sun-sleeping.webp'),
  moon: require('../../assets/images/ui-elements/home-moon-sleeping.webp'),
} as const;

const SLEEP_GLOW = { sun: '#FFD86B', moon: '#C9D8FF' } as const;
const ZZZ_COLOUR = '#E6EEFF';
const ZZZ_LETTERS = ['z', 'z', 'Z'] as const;
const ZZZ_FONT = 0.16;
const ZZZ_STILL = 0.25;
const HALO_SCALE = 1.5;
const HALO_OPACITY = 0.32;
const SHUT_DEPTH = 0.42;
const OPEN_EYE = { width: 0.5, height: 0.62, lift: 0.12, shine: 0.14 } as const;

interface ShutEyeProps {
  spot: EyeSpot;
  size: number;
  peek?: SharedValue<number>;
}

function ShutEye({ spot, size, peek }: ShutEyeProps) {
  const width = spot.width * size;
  const stroke = SLEEPING_EYE_STROKE * size;
  const depth = width * SHUT_DEPTH;
  const height = depth + stroke;

  const style = useAnimatedStyle(() => ({
    opacity: peek ? 1 - peekOpenness(peek.value) : 1,
  }));

  return (
    <Animated.View
      testID="sleeping-sky-face-eye-shut"
      pointerEvents="none"
      style={[styles.part, { left: spot.x * size - width / 2, top: spot.y * size - height / 2, width, height }, style]}
    >
      <Svg width={width} height={height}>
        <Path
          d={`M ${stroke / 2} ${stroke / 2} Q ${width / 2} ${2 * depth + stroke / 2} ${width - stroke / 2} ${stroke / 2}`}
          stroke={SLEEPING_FACE_INK}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

interface OpenEyeProps {
  spot: EyeSpot;
  size: number;
  peek: SharedValue<number>;
}

function OpenEye({ spot, size, peek }: OpenEyeProps) {
  const span = spot.width * size;
  const width = span * OPEN_EYE.width;
  const height = span * OPEN_EYE.height;
  const centreY = spot.y * size - span * OPEN_EYE.lift;

  const style = useAnimatedStyle(() => {
    const open = peekOpenness(peek.value);
    return { opacity: open > 0 ? 1 : 0, transform: [{ scaleY: open }] };
  });

  return (
    <Animated.View
      testID="sleeping-sky-face-eye-open"
      pointerEvents="none"
      style={[styles.part, { left: spot.x * size - width / 2, top: centreY - height / 2, width, height }, style]}
    >
      <Svg width={width} height={height}>
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={SLEEPING_FACE_INK} />
        <Circle cx={width * 0.64} cy={height * 0.32} r={span * OPEN_EYE.shine} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

interface ZzzProps {
  index: number;
  drift: SharedValue<number>;
  size: number;
}

function Zzz({ index, drift, size }: ZzzProps) {
  const fontSize = size * ZZZ_FONT;
  const box = fontSize * 1.2;

  const style = useAnimatedStyle(() => {
    const pose = zzzAt(index, drift.value);
    return {
      opacity: pose.opacity,
      transform: [
        { translateX: pose.x * size - box / 2 },
        { translateY: pose.y * size - box / 2 },
        { scale: pose.scale },
      ],
    };
  });

  return (
    <Animated.Text
      testID="sleeping-sky-face-zzz"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.zzz, { width: box, height: box, fontSize, lineHeight: box }, style]}
    >
      {ZZZ_LETTERS[index]}
    </Animated.Text>
  );
}

export interface SleepingSkyFaceProps {
  size: number;
  timeOfDay: TimeOfDay;
  animated?: boolean;
  testID?: string;
}

export const SleepingSkyFace = memo(function SleepingSkyFace({
  size,
  timeOfDay,
  animated = true,
  testID = 'sleeping-sky-face',
}: SleepingSkyFaceProps) {
  const { t } = useTranslation();
  const body = sleepingBody(timeOfDay);
  const eyes = SLEEPING_EYES[body];
  const [peeking, setPeeking] = useState(false);
  const peekingRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peek = useSharedValue(0);
  const breathe = useSharedValue(0);
  const drift = useSharedValue(ZZZ_STILL);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(breathe);
      cancelAnimation(drift);
      breathe.value = 0;
      drift.value = ZZZ_STILL;
      return undefined;
    }
    breathe.value = withRepeat(
      withTiming(1, { duration: SLEEP_RHYTHM.breatheMs / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    drift.value = 0;
    drift.value = withRepeat(withTiming(1, { duration: SLEEP_RHYTHM.zzzMs, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(breathe);
      cancelAnimation(drift);
    };
  }, [animated, breathe, drift]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handlePress = useCallback(() => {
    if (peekingRef.current) return;
    peekingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeeking(true);
    peek.value = 0;
    peek.value = withTiming(PEEK_TOTAL_MS, { duration: PEEK_TOTAL_MS, easing: Easing.linear });
    timer.current = setTimeout(() => {
      timer.current = null;
      peekingRef.current = false;
      setPeeking(false);
    }, PEEK_TOTAL_MS);
  }, [peek]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + SLEEP_RHYTHM.breatheScale * breathe.value }],
  }));

  const halo = size * HALO_SCALE;
  const gradientId = `sleeping-sky-face-glow-${body}`;

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t(body === 'sun' ? 'account.sleepingSun' : 'account.sleepingMoon')}
      onPress={handlePress}
      style={[{ width: size, height: size }, breatheStyle]}
    >
      <Svg
        width={halo}
        height={halo}
        pointerEvents="none"
        style={[styles.part, { left: (size - halo) / 2, top: (size - halo) / 2 }]}
      >
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={SLEEP_GLOW[body]} stopOpacity={HALO_OPACITY} />
            <Stop offset="0.45" stopColor={SLEEP_GLOW[body]} stopOpacity={HALO_OPACITY * 0.35} />
            <Stop offset="1" stopColor={SLEEP_GLOW[body]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={`url(#${gradientId})`} />
      </Svg>

      <Image
        testID="sleeping-sky-face-art"
        source={SLEEPING_ART[body]}
        style={[styles.part, { left: 0, top: 0, width: size, height: size }]}
        contentFit="contain"
        transition={0}
      />

      <ShutEye spot={eyes.left} size={size} />
      <ShutEye spot={eyes.right} size={size} peek={peek} />
      {peeking ? <OpenEye spot={eyes.right} size={size} peek={peek} /> : null}

      {peeking
        ? null
        : ZZZ_LETTERS.map((_, index) => <Zzz key={index} index={index} drift={drift} size={size} />)}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  part: {
    position: 'absolute',
  },
  zzz: {
    position: 'absolute',
    left: 0,
    top: 0,
    textAlign: 'center',
    color: ZZZ_COLOUR,
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
});
