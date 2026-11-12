import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export const BOOK_PROGRESS = {
  small: { height: 26, icon: 14, bar: 10, label: 12 },
  regular: { height: 32, icon: 17, bar: 12, label: 13 },
  sparkles: [
    { at: 0.5, from: 1 },
    { at: 0.25, from: 20 },
    { at: 0.75, from: 50 },
  ],
  growMs: 700,
  glowMs: 1800,
  twinkleMs: 1300,
  shimmerMs: 2400,
  shimmerWidth: 28,
  pulseMs: 1100,
  colours: {
    capsule: 'rgba(12, 16, 58, 0.78)',
    capsuleEdge: 'rgba(186, 170, 255, 0.42)',
    barTrack: 'rgba(255, 255, 255, 0.08)',
    medal: ['#FFE9A3', '#F5C451', '#E0A126'] as const,
    medalEdge: 'rgba(255, 246, 214, 0.95)',
    ink: '#3B2A07',
    glow: '#F5C451',
    halo: 'rgba(245, 196, 81, 0.35)',
    fill: ['#5B47E6', '#7E63FF', '#B49CFF'] as const,
    shimmer: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.75)', 'rgba(255, 255, 255, 0)'] as const,
    head: '#FFFFFF',
    sparkle: '#FFF6D6',
    label: '#FFFFFF',
  },
} as const;

export type BookProgressSize = 'small' | 'regular';

export function bookProgressSparkles(percent: number): number[] {
  return BOOK_PROGRESS.sparkles.filter((sparkle) => percent >= sparkle.from).map((sparkle) => sparkle.at);
}

function Sparkle({ at, index, still, testID }: { at: number; index: number; still: boolean; testID: string }) {
  const shine = useSharedValue(still ? 0.85 : 0.25);
  useEffect(() => {
    if (still) {
      shine.value = 0.85;
      return;
    }
    const half = BOOK_PROGRESS.twinkleMs / 2;
    shine.value = withDelay(
      index * (BOOK_PROGRESS.twinkleMs / 3),
      withRepeat(
        withSequence(
          withTiming(1, { duration: half, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.25, { duration: half, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [still, index, shine]);
  const style = useAnimatedStyle(() => ({ opacity: shine.value, transform: [{ scale: 0.7 + shine.value * 0.5 }] }));

  return <Animated.View testID={testID} pointerEvents="none" style={[styles.sparkle, { left: `${at * 100}%` }, style]} />;
}

interface BookProgressProps {
  fraction: number;
  label?: string;
  accessibilityLabel?: string;
  size?: BookProgressSize;
  testID?: string;
}

export function BookProgress({ fraction, label, accessibilityLabel, size = 'regular', testID = 'book-progress' }: BookProgressProps) {
  const still = useReducedMotion();
  const { scaledFontSize } = useAccessibility();
  const metrics = BOOK_PROGRESS[size];
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  const sparkles = bookProgressSparkles(percent);
  const [fillWidth, setFillWidth] = useState(0);
  const measureFill = useCallback((event: LayoutChangeEvent) => {
    setFillWidth(event.nativeEvent.layout.width);
  }, []);

  const glow = useSharedValue(0.45);
  const sweep = useSharedValue(0);
  const pulse = useSharedValue(1);
  const grow = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) {
      glow.value = 0.45;
      sweep.value = 0;
      pulse.value = 1;
      return;
    }
    const breath = BOOK_PROGRESS.glowMs / 2;
    glow.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: breath, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: breath, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: BOOK_PROGRESS.shimmerMs, easing: Easing.inOut(Easing.quad) }), -1);
    const beat = BOOK_PROGRESS.pulseMs / 2;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: beat, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.85, { duration: beat, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [still, glow, sweep, pulse]);

  useEffect(() => {
    if (still) {
      grow.value = 1;
      return;
    }
    if (fillWidth > 0) grow.value = withTiming(1, { duration: BOOK_PROGRESS.growMs, easing: Easing.out(Easing.cubic) });
  }, [still, fillWidth, grow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const grownStyle = useAnimatedStyle(() => ({ width: fillWidth * grow.value }));
  const shimmerWidth = BOOK_PROGRESS.shimmerWidth;
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: Math.sin(Math.PI * sweep.value),
    transform: [{ translateX: -shimmerWidth + sweep.value * (fillWidth + shimmerWidth) }],
  }));
  const headStyle = useAnimatedStyle(() => ({ transform: [{ rotate: '45deg' }, { scale: pulse.value }] }));

  const halo = Math.round(metrics.height * 1.5);
  const star = Math.round(metrics.bar * 0.9);

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.capsule, { height: metrics.height, borderRadius: metrics.height / 2 }]}
    >
      <View style={{ width: metrics.height, height: metrics.height }}>
        <Animated.View
          testID={`${testID}-glow`}
          pointerEvents="none"
          style={[
            styles.glow,
            { width: halo, height: halo, borderRadius: halo / 2, left: (metrics.height - halo) / 2, top: (metrics.height - halo) / 2 },
            glowStyle,
          ]}
        />
        <View
          testID={`${testID}-medal`}
          style={[styles.medal, { width: metrics.height, height: metrics.height, borderRadius: metrics.height / 2 }]}
        >
          <LinearGradient
            colors={BOOK_PROGRESS.colours.medal}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: metrics.height / 2 }]}
          />
          <Ionicons name="book" size={metrics.icon} color={BOOK_PROGRESS.colours.ink} />
        </View>
      </View>

      <View
        testID={`${testID}-track`}
        style={[styles.track, { height: metrics.bar, borderRadius: metrics.bar / 2, marginRight: label === undefined ? 10 : 8 }]}
      >
        <View testID={`${testID}-fill`} onLayout={measureFill} style={[styles.fill, { width: `${percent}%` }]}>
          <Animated.View style={[styles.grown, !still && grownStyle]}>
            <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: metrics.bar / 2 }]}>
              <LinearGradient colors={BOOK_PROGRESS.colours.fill} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              {!still && percent > 0 && (
                <Animated.View testID={`${testID}-shimmer`} pointerEvents="none" style={[styles.shimmer, shimmerStyle]}>
                  <LinearGradient
                    colors={BOOK_PROGRESS.colours.shimmer}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              )}
            </View>
            {sparkles.map((at, index) => (
              <Sparkle key={at} at={at} index={index} still={still} testID={`${testID}-sparkle-${index}`} />
            ))}
            {percent > 0 && (
              <Animated.View
                testID={`${testID}-head`}
                pointerEvents="none"
                style={[
                  styles.head,
                  { width: star, height: star, right: -star / 2, marginTop: -star / 2 },
                  !still && headStyle,
                ]}
              />
            )}
          </Animated.View>
        </View>
      </View>

      {label !== undefined && (
        <Text testID={`${testID}-label`} style={[styles.label, { fontSize: scaledFontSize(metrics.label) }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BOOK_PROGRESS.colours.capsule,
    borderWidth: 1,
    borderColor: BOOK_PROGRESS.colours.capsuleEdge,
  },
  glow: {
    position: 'absolute',
    backgroundColor: BOOK_PROGRESS.colours.halo,
    shadowColor: BOOK_PROGRESS.colours.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  medal: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: BOOK_PROGRESS.colours.medalEdge,
  },
  track: {
    flex: 1,
    marginLeft: 6,
    backgroundColor: BOOK_PROGRESS.colours.barTrack,
  },
  fill: {
    height: '100%',
  },
  grown: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    shadowColor: BOOK_PROGRESS.colours.fill[2],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  clip: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: BOOK_PROGRESS.shimmerWidth,
  },
  sparkle: {
    position: 'absolute',
    top: '50%',
    width: 3,
    height: 3,
    marginTop: -1.5,
    marginLeft: -1.5,
    borderRadius: 1.5,
    backgroundColor: BOOK_PROGRESS.colours.sparkle,
    shadowColor: BOOK_PROGRESS.colours.sparkle,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  head: {
    position: 'absolute',
    top: '50%',
    borderRadius: 2,
    backgroundColor: BOOK_PROGRESS.colours.head,
    transform: [{ rotate: '45deg' }],
    shadowColor: BOOK_PROGRESS.colours.head,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  label: {
    marginRight: 12,
    color: BOOK_PROGRESS.colours.label,
    fontFamily: Fonts.primary,
    fontWeight: '800',
  },
});
