import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { SHOOTING_STAR, STAR_DRIFT, moteOpacity, shootingStarPath } from '@/constants/splash-sky';
import { EarthHorizon } from '@/components/ui/earth-horizon';
import { StarField } from '@/components/home/star-field';

const STREAK = ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'] as const;

interface ShootingStarProps {
  width: number;
  height: number;
}

function ShootingStar({ width, height }: ShootingStarProps) {
  const flight = useSharedValue(0);
  const path = useMemo(() => shootingStarPath(width, height), [width, height]);
  const { fromX, fromY, toX, toY, angleDeg } = path;
  const peakOpacity = SHOOTING_STAR.peakOpacity;
  const halfLength = SHOOTING_STAR.lengthPx / 2;
  const halfThickness = SHOOTING_STAR.thicknessPx / 2;

  useEffect(() => {
    flight.value = withDelay(
      SHOOTING_STAR.delayMs,
      withTiming(1, { duration: SHOOTING_STAR.durationMs, easing: Easing.out(Easing.quad) })
    );

    return () => {
      cancelAnimation(flight);
    };
  }, [flight]);

  const style = useAnimatedStyle(() => ({
    opacity: moteOpacity(flight.value, peakOpacity),
    transform: [
      { translateX: fromX + (toX - fromX) * flight.value - halfLength },
      { translateY: fromY + (toY - fromY) * flight.value - halfThickness },
      { rotate: `${angleDeg}deg` },
    ],
  }));

  return (
    <Animated.View testID="splash-shooting-star" style={[styles.streak, style]}>
      <LinearGradient colors={[...STREAK]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export interface SplashSkyProps {
  width: number;
  height: number;
  timeOfDay: TimeOfDay;
  playing: boolean;
  reduceMotion: boolean;
  testID?: string;
}

export const SplashSky = memo(function SplashSky({
  width,
  height,
  timeOfDay,
  playing,
  reduceMotion,
  testID = 'splash-sky',
}: SplashSkyProps) {
  const theme = HOME_THEMES[timeOfDay];
  const drift = useSharedValue(0);
  const driftPx = STAR_DRIFT.risePx;
  const lively = playing && !reduceMotion;

  useEffect(() => {
    if (!lively) {
      return;
    }
    drift.value = withTiming(1, { duration: STAR_DRIFT.durationMs, easing: Easing.out(Easing.quad) });

    return () => {
      cancelAnimation(drift);
    };
  }, [lively, drift]);

  const driftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: driftPx * (1 - drift.value) }] }));

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[theme.skyTop, theme.skyMid, theme.skyBottom]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[StyleSheet.absoluteFill, driftStyle]}>
        <StarField
          width={width}
          height={height}
          colour={theme.star}
          intensity={Number(theme.starOpacity)}
          active={playing}
        />
      </Animated.View>

      {lively ? <ShootingStar width={width} height={height} /> : null}

      <EarthHorizon testID="splash-horizon" edge="bottom" width={width} height={height} timeOfDay={timeOfDay} />
    </View>
  );
});

const styles = StyleSheet.create({
  streak: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SHOOTING_STAR.lengthPx,
    height: SHOOTING_STAR.thicknessPx,
    borderRadius: SHOOTING_STAR.thicknessPx / 2,
    overflow: 'hidden',
  },
});
