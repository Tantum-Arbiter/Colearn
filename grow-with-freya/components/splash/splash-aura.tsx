import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { growEase } from '@/constants/splash-logo';
import { SPLASH_GLOW, SPLASH_MOTES, buildMotes, glowFrame, moteOpacity, type MoteSeed } from '@/constants/splash-sky';

interface GlowProps {
  left: number;
  top: number;
  size: number;
  colour: string;
  playing: boolean;
  reduceMotion: boolean;
}

function Glow({ left, top, size, colour, playing, reduceMotion }: GlowProps) {
  const glow = useSharedValue(0);
  const gradientId = `splash-glow-${colour.replace('#', '')}`;

  useEffect(() => {
    if (!playing) {
      return;
    }
    cancelAnimation(glow);

    if (reduceMotion) {
      glow.value = SPLASH_GLOW.restOpacity;

      return;
    }
    const breathe = { duration: SPLASH_GLOW.breatheMs, easing: Easing.inOut(Easing.sin) };

    glow.value = withSequence(
      withTiming(SPLASH_GLOW.peakOpacity, { duration: SPLASH_GLOW.bloomMs, easing: growEase }),
      withRepeat(withTiming(SPLASH_GLOW.restOpacity, breathe), -1, true)
    );

    return () => {
      cancelAnimation(glow);
    };
  }, [playing, reduceMotion, glow]);

  const style = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View testID="splash-glow" style={[styles.pinned, { left, top, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colour} stopOpacity={1} />
            <Stop offset="0.4" stopColor={colour} stopOpacity={0.36} />
            <Stop offset="1" stopColor={colour} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

interface MoteProps {
  seed: MoteSeed;
  originLeft: number;
  originTop: number;
}

function Mote({ seed, originLeft, originTop }: MoteProps) {
  const flight = useSharedValue(0);
  const { risePx, driftPx, peakOpacity } = seed;

  useEffect(() => {
    flight.value = withDelay(
      seed.delayMs,
      withRepeat(withTiming(1, { duration: seed.durationMs, easing: Easing.out(Easing.quad) }), -1, false)
    );

    return () => {
      cancelAnimation(flight);
    };
  }, [flight, seed.delayMs, seed.durationMs]);

  const style = useAnimatedStyle(() => ({
    opacity: moteOpacity(flight.value, peakOpacity),
    transform: [{ translateX: driftPx * flight.value }, { translateY: -risePx * flight.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.pinned,
        styles.mote,
        {
          left: originLeft + seed.x - seed.size / 2,
          top: originTop + seed.startY - seed.size / 2,
          width: seed.size,
          height: seed.size,
          borderRadius: seed.size / 2,
        },
        style,
      ]}
    />
  );
}

export interface SplashAuraProps {
  logoLeft: number;
  logoTop: number;
  logoSize: number;
  playing: boolean;
  reduceMotion: boolean;
  testID?: string;
}

export const SplashAura = memo(function SplashAura({
  logoLeft,
  logoTop,
  logoSize,
  playing,
  reduceMotion,
  testID = 'splash-aura',
}: SplashAuraProps) {
  const glow = useMemo(() => glowFrame(logoLeft, logoTop, logoSize), [logoLeft, logoTop, logoSize]);
  const motes = useMemo(() => buildMotes(logoSize), [logoSize]);

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Glow
        left={glow.left}
        top={glow.top}
        size={glow.size}
        colour={SPLASH_GLOW.colour}
        playing={playing}
        reduceMotion={reduceMotion}
      />

      {playing && !reduceMotion
        ? motes.map((seed, index) => (
            <Mote key={`mote-${index}`} seed={seed} originLeft={logoLeft} originTop={logoTop} />
          ))
        : null}
    </View>
  );
});

const styles = StyleSheet.create({
  pinned: {
    position: 'absolute',
  },
  mote: {
    backgroundColor: SPLASH_MOTES.colour,
  },
});
