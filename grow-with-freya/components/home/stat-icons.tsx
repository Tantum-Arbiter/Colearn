import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { HOME_JOURNEY_MOTION, STAT_ICON_TINTS, type StatIconKind } from '@/constants/home-journey';

export function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];

  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;

    points.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }

  return points.join(' ');
}

const VIEWBOX = '0 0 64 64';
const BOOK_LEFT = 'M31 16 C24 11 14 11 8 14 C6 15 5 16 5 18 V46 C5 48 7 49 9 48 C15 45 24 45 31 49 Z';
const BOOK_RIGHT = 'M33 16 C40 11 50 11 56 14 C58 15 59 16 59 18 V46 C59 48 57 49 55 48 C49 45 40 45 33 49 Z';
const PAGE_LEFT = 'M29 20 C24 17 17 17 11 19 V43 C17 41 24 41 29 44 Z';
const PAGE_RIGHT = 'M35 20 C40 17 47 17 53 19 V43 C47 41 40 41 35 44 Z';
const SHIELD = 'M32 6 C40 12 48 14 56 14 V32 C56 46 46 54 32 60 C18 54 8 46 8 32 V14 C16 14 24 12 32 6 Z';
const SHIELD_INNER = 'M32 12 C38 16 44 18 50 18 V32 C50 42 42 48 32 53 C22 48 14 42 14 32 V18 C20 18 26 16 32 12 Z';
const LEAF = 'M32 22 C40 24 44 32 40 41 C36 46 30 46 26 42 C22 36 25 27 32 22 Z M32 22 L31 42';
const FLAME_OUTER =
  'M33 4 C36 14 46 18 46 32 C46 42 40 50 33 52 C22 51 14 43 16 30 C17 24 21 21 22 15 C25 21 30 22 30 28 C34 22 31 12 33 4 Z';
const FLAME_INNER = 'M33 28 C36 34 40 36 39 43 C38 48 35 50 32 50 C28 49 25 46 26 41 C27 37 31 34 33 28 Z';

function useLoop(animated: boolean, delayMs: number, build: () => number): SharedValue<number> {
  const value = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(value);
      value.value = 0;
      return;
    }

    value.value = withDelay(delayMs, withRepeat(build(), -1, false));

    return () => {
      cancelAnimation(value);
    };
  }, [animated, build, delayMs, value]);

  return value;
}

const pageFlick = () =>
  withSequence(
    withDelay(HOME_JOURNEY_MOTION.bookRestMs, withTiming(1, { duration: 260, easing: Easing.in(Easing.quad) })),
    withTiming(0, { duration: 420, easing: Easing.out(Easing.back(1.4)) })
  );

const clockTurn = () => withTiming(1, { duration: HOME_JOURNEY_MOTION.clockTurnMs, easing: Easing.linear });

const leafSway = () =>
  withSequence(
    withTiming(1, { duration: HOME_JOURNEY_MOTION.leafSwayMs, easing: Easing.inOut(Easing.sin) }),
    withTiming(0, { duration: HOME_JOURNEY_MOTION.leafSwayMs, easing: Easing.inOut(Easing.sin) })
  );

const flicker = () =>
  withSequence(
    withTiming(1, { duration: 180, easing: Easing.inOut(Easing.quad) }),
    withTiming(0.35, { duration: 140, easing: Easing.inOut(Easing.quad) }),
    withTiming(0.8, { duration: 220, easing: Easing.inOut(Easing.quad) }),
    withTiming(0.15, { duration: 160, easing: Easing.inOut(Easing.quad) }),
    withTiming(0.6, { duration: 260, easing: Easing.inOut(Easing.quad) }),
    withTiming(0, { duration: 200, easing: Easing.inOut(Easing.quad) })
  );

interface LayerProps {
  size: number;
  kind: StatIconKind;
  animated: boolean;
  delayMs: number;
}

function Gradient({ id, kind }: { id: string; kind: StatIconKind }) {
  const tint = STAT_ICON_TINTS[kind];

  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={tint.from} />
        <Stop offset="1" stopColor={tint.to} />
      </LinearGradient>
    </Defs>
  );
}

const BookIcon = memo(function BookIcon({ size, animated, delayMs }: LayerProps) {
  const tint = STAT_ICON_TINTS.book;
  const flick = useLoop(animated, delayMs, pageFlick);

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - 0.55 * flick.value }, { skewY: `${-8 * flick.value}deg` }],
  }));

  const bookStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * flick.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, bookStyle]}>
      <Svg width={size} height={size} viewBox={VIEWBOX}>
        <Gradient id="stat-book" kind="book" />
        <Path d={BOOK_LEFT} stroke={tint.glow} strokeWidth={8} strokeLinejoin="round" fill="none" opacity={0.3} />
        <Path d={BOOK_RIGHT} stroke={tint.glow} strokeWidth={8} strokeLinejoin="round" fill="none" opacity={0.3} />
        <Path d={BOOK_LEFT} fill="url(#stat-book)" />
        <Path d={BOOK_RIGHT} fill="url(#stat-book)" />
        <Path d={PAGE_LEFT} fill={tint.light} opacity={0.92} />
        <Rect x="30.5" y="18" width="3" height="30" rx="1.5" fill={tint.to} />
      </Svg>
      <Animated.View testID="stat-book-page" style={[StyleSheet.absoluteFill, pageStyle]}>
        <Svg width={size} height={size} viewBox={VIEWBOX}>
          <Path d={PAGE_RIGHT} fill={tint.light} opacity={0.92} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
});

const ClockIcon = memo(function ClockIcon({ size, animated, delayMs }: LayerProps) {
  const tint = STAT_ICON_TINTS.clock;
  const turn = useLoop(animated, delayMs, clockTurn);

  const minuteStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));

  const hourStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${35 + turn.value * 30}deg` }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={VIEWBOX}>
        <Gradient id="stat-clock" kind="clock" />
        <Circle cx="32" cy="32" r="24" stroke={tint.glow} strokeWidth={8} fill="none" opacity={0.3} />
        <Circle cx="32" cy="32" r="24" fill="url(#stat-clock)" />
        <Circle cx="32" cy="32" r="17" fill={tint.light} />
        <Rect x="30.5" y="17" width="3" height="5" rx="1.5" fill={tint.accent} />
        <Rect x="30.5" y="42" width="3" height="5" rx="1.5" fill={tint.accent} />
        <Rect x="17" y="30.5" width="5" height="3" rx="1.5" fill={tint.accent} />
        <Rect x="42" y="30.5" width="5" height="3" rx="1.5" fill={tint.accent} />
      </Svg>
      <Animated.View testID="stat-clock-hour" style={[StyleSheet.absoluteFill, hourStyle]}>
        <Svg width={size} height={size} viewBox={VIEWBOX}>
          <Rect x="30" y="22" width="4" height="11" rx="2" fill={tint.accent} />
        </Svg>
      </Animated.View>
      <Animated.View testID="stat-clock-minute" style={[StyleSheet.absoluteFill, minuteStyle]}>
        <Svg width={size} height={size} viewBox={VIEWBOX}>
          <Rect x="30.5" y="18" width="3" height="15" rx="1.5" fill={tint.accent} />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
        <Circle cx="32" cy="32" r="3" fill={tint.accent} />
      </Svg>
    </View>
  );
});

const ShieldIcon = memo(function ShieldIcon({ size, animated, delayMs }: LayerProps) {
  const tint = STAT_ICON_TINTS.shield;
  const sway = useLoop(animated, delayMs, leafSway);
  const pivot = (size / 64) * 10;

  const leafStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: pivot },
      { rotate: `${-7 + 14 * sway.value}deg` },
      { translateY: -pivot },
    ],
  }));

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.03 * Math.sin(sway.value * Math.PI) }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, shieldStyle]}>
      <Svg width={size} height={size} viewBox={VIEWBOX}>
        <Gradient id="stat-shield" kind="shield" />
        <Path d={SHIELD} stroke={tint.glow} strokeWidth={8} strokeLinejoin="round" fill="none" opacity={0.3} />
        <Path d={SHIELD} fill="url(#stat-shield)" />
        <Path d={SHIELD_INNER} fill={tint.light} opacity={0.28} />
      </Svg>
      <Animated.View testID="stat-shield-leaf" style={[StyleSheet.absoluteFill, leafStyle]}>
        <Svg width={size} height={size} viewBox={VIEWBOX}>
          <Path d={LEAF} fill={tint.accent} stroke={tint.light} strokeWidth={1.2} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
});

const FlameIcon = memo(function FlameIcon({ size, animated, delayMs }: LayerProps) {
  const tint = STAT_ICON_TINTS.flame;
  const heat = useLoop(animated, delayMs, flicker);
  const base = (size / 64) * 18;

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: base },
      { scaleY: 1 + 0.06 * heat.value },
      { scaleX: 1 - 0.03 * heat.value },
      { rotate: `${-2 + 4 * heat.value}deg` },
      { translateY: -base },
    ],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: base },
      { scaleY: 0.9 + 0.22 * heat.value },
      { rotate: `${3 - 6 * heat.value}deg` },
      { translateY: -base },
    ],
    opacity: 0.85 + 0.15 * heat.value,
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View testID="stat-flame-outer" style={[StyleSheet.absoluteFill, outerStyle]}>
        <Svg width={size} height={size} viewBox={VIEWBOX}>
          <Gradient id="stat-flame" kind="flame" />
          <Path d={FLAME_OUTER} stroke={tint.glow} strokeWidth={8} strokeLinejoin="round" fill="none" opacity={0.3} />
          <Path d={FLAME_OUTER} fill="url(#stat-flame)" />
        </Svg>
      </Animated.View>
      <Animated.View testID="stat-flame-inner" style={[StyleSheet.absoluteFill, innerStyle]}>
        <Svg width={size} height={size} viewBox={VIEWBOX}>
          <Path d={FLAME_INNER} fill={tint.light} />
          <Ellipse cx="32" cy="45" rx="4" ry="4.5" fill={tint.accent} opacity={0.85} />
        </Svg>
      </Animated.View>
    </View>
  );
});

export interface StatIconProps {
  kind: StatIconKind;
  size: number;
  index?: number;
  animated: boolean;
  testID?: string;
}

export const StatIcon = memo(function StatIcon({ kind, size, index = 0, animated, testID }: StatIconProps) {
  const delayMs = index * HOME_JOURNEY_MOTION.iconStaggerMs;

  return (
    <View testID={testID ?? `stat-icon-${kind}`} style={styles.icon}>
      {kind === 'book' ? <BookIcon kind={kind} size={size} animated={animated} delayMs={delayMs} /> : null}
      {kind === 'clock' ? <ClockIcon kind={kind} size={size} animated={animated} delayMs={delayMs} /> : null}
      {kind === 'shield' ? <ShieldIcon kind={kind} size={size} animated={animated} delayMs={delayMs} /> : null}
      {kind === 'flame' ? <FlameIcon kind={kind} size={size} animated={animated} delayMs={delayMs} /> : null}
    </View>
  );
});

export interface SparkleProps {
  size: number;
  colour: string;
  testID?: string;
}

export const Sparkle = memo(function Sparkle({ size, colour, testID = 'sparkle' }: SparkleProps) {
  return (
    <Svg testID={testID} width={size} height={size} viewBox="0 0 16 16">
      <Path d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4 Z" fill={colour} />
    </Svg>
  );
});

export interface GoldStarProps {
  size: number;
  colour: string;
  testID?: string;
}

export const GoldStar = memo(function GoldStar({ size, colour, testID = 'gold-star' }: GoldStarProps) {
  return (
    <Svg testID={testID} width={size} height={size} viewBox="0 0 20 20">
      <Polygon points={starPoints(10, 10.5, 9.5, 4.2)} fill={colour} />
    </Svg>
  );
});

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
