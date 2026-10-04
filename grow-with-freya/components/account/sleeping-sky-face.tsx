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
  SLEEPING_EYES,
  SLEEPING_EYE_STROKE,
  SLEEPING_MOUTH,
  SLEEPING_FACE_INK,
  SLEEP_RHYTHM,
  WAKE_TOTAL_MS,
  breathPose,
  flutterSqueeze,
  gazeAt,
  lidBreath,
  lidsOpenness,
  mouthDepth,
  shutLineOpacity,
  sleepingBody,
  swayDeg,
  zzzAt,
  type EyeSpot,
  type MouthSpot,
} from '@/constants/sleeping-sky-face';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SLEEPING_ART = {
  sun: require('../../assets/images/ui-elements/home-sun-sleeping-mouthless.webp'),
  moon: require('../../assets/images/ui-elements/home-moon-sleeping-mouthless.webp'),
} as const;

const SLEEP_GLOW = { sun: '#FFD86B', moon: '#C9D8FF' } as const;
const ZZZ_COLOUR = '#E6EEFF';
const ZZZ_LETTERS = ['z', 'z', 'Z'] as const;
const ZZZ_FONT = 0.16;
const ZZZ_STILL = 0.25;
const HALO_SCALE = 1.5;
const HALO_OPACITY = 0.32;
const SHUT_DEPTH = 0.24;
const EYE_WHITE = '#FFF9F0';
const OPEN_EYE = { size: 0.95, belowLine: 0.1, iris: 0.5, shine: 0.1, travelY: 0.6 } as const;
const FLUTTER_OFFSET = { left: 0, right: 0.012 } as const;

interface ShutEyeProps {
  spot: EyeSpot;
  size: number;
  breathe: SharedValue<number>;
  flutter: SharedValue<number>;
  flutterOffset: number;
  wake?: SharedValue<number>;
}

function ShutEye({ spot, size, breathe, flutter, flutterOffset, wake }: ShutEyeProps) {
  const width = spot.width * size;
  const stroke = SLEEPING_EYE_STROKE * size;
  const depth = width * SHUT_DEPTH;
  const height = depth + stroke;

  const style = useAnimatedStyle(() => {
    const lid = lidBreath(breathe.value, size);

    return {
      opacity: wake ? shutLineOpacity(lidsOpenness(wake.value)) : 1,
      transform: [{ translateY: lid.lift }, { scaleY: lid.depth * flutterSqueeze(flutter.value, flutterOffset) }],
    };
  });

  return (
    <Animated.View
      testID="sleeping-sky-face-eye-shut"
      pointerEvents="none"
      style={[styles.part, { left: spot.x * size - width / 2, top: spot.y * size - height / 2, width, height }, style]}
    >
      <Svg width={width} height={height}>
        <Path
          d={`M ${stroke / 2} ${stroke / 2} C ${width * 0.3} ${depth * 1.6 + stroke / 2} ${width * 0.7} ${depth * 1.6 + stroke / 2} ${width - stroke / 2} ${stroke / 2}`}
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
  wake: SharedValue<number>;
}

function OpenEye({ spot, size, wake }: OpenEyeProps) {
  const span = spot.width * size;
  const diameter = span * OPEN_EYE.size;
  const left = spot.x * size - diameter / 2;
  const top = spot.y * size + span * OPEN_EYE.belowLine - diameter;
  const irisR = (diameter / 2) * OPEN_EYE.iris;
  const travelX = diameter / 2 - irisR;
  const travelY = travelX * OPEN_EYE.travelY;

  const lid = useAnimatedStyle(() => {
    const open = lidsOpenness(wake.value);

    return { opacity: open > 0 ? 1 : 0, top: (1 - open) * diameter, height: open * diameter };
  });

  const behindLid = useAnimatedStyle(() => ({
    transform: [{ translateY: -(1 - lidsOpenness(wake.value)) * diameter }],
  }));

  const look = useAnimatedStyle(() => {
    const gaze = gazeAt(wake.value);

    return { transform: [{ translateX: gaze.x * travelX }, { translateY: gaze.y * travelY }] };
  });

  return (
    <Animated.View
      testID="sleeping-sky-face-eye-open"
      pointerEvents="none"
      style={[styles.part, { left, top, width: diameter, height: diameter }]}
    >
      <Animated.View testID="sleeping-sky-face-lid" style={[styles.lid, lid]}>
        <Animated.View style={[styles.eyeball, { width: diameter, height: diameter, borderRadius: diameter / 2 }, behindLid]}>
          <Animated.View testID="sleeping-sky-face-iris" style={[styles.fill, look]}>
            <Svg width={diameter} height={diameter}>
              <Ellipse cx={diameter / 2} cy={diameter / 2} rx={irisR} ry={irisR} fill={SLEEPING_FACE_INK} />
              <Circle cx={diameter / 2 + irisR * 0.35} cy={diameter / 2 - irisR * 0.4} r={span * OPEN_EYE.shine} fill="#FFFFFF" />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

interface MouthProps {
  spot: MouthSpot;
  size: number;
  wake: SharedValue<number>;
}

function Mouth({ spot, size, wake }: MouthProps) {
  const width = spot.width * size;
  const stroke = spot.stroke * size;
  const depth = spot.depth * size;
  const height = depth + stroke;

  const smile = useAnimatedStyle(() => ({
    transform: [{ scaleY: Math.max(mouthDepth(lidsOpenness(wake.value)), stroke / height) }],
  }));

  return (
    <Animated.View
      testID="sleeping-sky-face-mouth"
      pointerEvents="none"
      style={[styles.part, styles.mouth, { left: spot.x * size - width / 2, top: spot.y * size - stroke / 2, width, height }, smile]}
    >
      <Svg width={width} height={height}>
        <Path
          d={`M ${stroke / 2} ${stroke / 2} C ${width * 0.3} ${depth / 0.75 + stroke / 2} ${width * 0.7} ${depth / 0.75 + stroke / 2} ${width - stroke / 2} ${stroke / 2}`}
          stroke={SLEEPING_FACE_INK}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
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
        { rotate: `${pose.tiltDeg}deg` },
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
  const [awake, setAwake] = useState(false);
  const awakeRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useSharedValue(0);
  const breathe = useSharedValue(0);
  const sway = useSharedValue(0);
  const flutter = useSharedValue(0.5);
  const drift = useSharedValue(ZZZ_STILL);

  useEffect(() => {
    const moving = [breathe, sway, flutter, drift];
    if (!animated) {
      moving.forEach(cancelAnimation);
      breathe.value = 0;
      sway.value = 0;
      flutter.value = 0.5;
      drift.value = ZZZ_STILL;
      return undefined;
    }
    breathe.value = withRepeat(
      withTiming(1, { duration: SLEEP_RHYTHM.breatheMs / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    sway.value = 0;
    sway.value = withRepeat(withTiming(1, { duration: SLEEP_RHYTHM.swayMs, easing: Easing.linear }), -1, false);
    flutter.value = 0.5;
    flutter.value = withRepeat(withTiming(1.5, { duration: SLEEP_RHYTHM.flutterEveryMs, easing: Easing.linear }), -1, false);
    drift.value = 0;
    drift.value = withRepeat(withTiming(1, { duration: SLEEP_RHYTHM.zzzMs, easing: Easing.linear }), -1, false);

    return () => {
      moving.forEach(cancelAnimation);
    };
  }, [animated, breathe, sway, flutter, drift]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handlePress = useCallback(() => {
    if (awakeRef.current) return;
    awakeRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAwake(true);
    wake.value = 0;
    wake.value = withTiming(WAKE_TOTAL_MS, { duration: WAKE_TOTAL_MS, easing: Easing.linear });
    timer.current = setTimeout(() => {
      timer.current = null;
      awakeRef.current = false;
      setAwake(false);
    }, WAKE_TOTAL_MS);
  }, [wake]);

  const bodyStyle = useAnimatedStyle(() => {
    const breath = breathPose(breathe.value, size);

    return {
      transform: [
        { translateY: breath.rise },
        { rotate: `${swayDeg(sway.value)}deg` },
        { scaleX: breath.scaleX },
        { scaleY: breath.scaleY },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({ opacity: breathPose(breathe.value, size).glow }));

  const halo = size * HALO_SCALE;
  const gradientId = `sleeping-sky-face-glow-${body}`;

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t(body === 'sun' ? 'account.sleepingSun' : 'account.sleepingMoon')}
      onPress={handlePress}
      style={[{ width: size, height: size }, bodyStyle]}
    >
      <Animated.View
        testID="sleeping-sky-face-glow"
        pointerEvents="none"
        style={[styles.part, { left: (size - halo) / 2, top: (size - halo) / 2, width: halo, height: halo }, glowStyle]}
      >
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={SLEEP_GLOW[body]} stopOpacity={HALO_OPACITY} />
              <Stop offset="0.45" stopColor={SLEEP_GLOW[body]} stopOpacity={HALO_OPACITY * 0.35} />
              <Stop offset="1" stopColor={SLEEP_GLOW[body]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={`url(#${gradientId})`} />
        </Svg>
      </Animated.View>

      <Image
        testID="sleeping-sky-face-art"
        source={SLEEPING_ART[body]}
        style={[styles.part, { left: 0, top: 0, width: size, height: size }]}
        contentFit="contain"
        transition={0}
      />

      <Mouth spot={SLEEPING_MOUTH[body]} size={size} wake={wake} />
      <ShutEye spot={eyes.left} size={size} breathe={breathe} flutter={flutter} flutterOffset={FLUTTER_OFFSET.left} />
      <ShutEye
        spot={eyes.right}
        size={size}
        breathe={breathe}
        flutter={flutter}
        flutterOffset={FLUTTER_OFFSET.right}
        wake={wake}
      />
      {awake ? <OpenEye spot={eyes.right} size={size} wake={wake} /> : null}

      {awake ? null : ZZZ_LETTERS.map((_, index) => <Zzz key={index} index={index} drift={drift} size={size} />)}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  part: {
    position: 'absolute',
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  mouth: {
    transformOrigin: 'top',
  },
  lid: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  eyeball: {
    overflow: 'hidden',
    backgroundColor: EYE_WHITE,
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
