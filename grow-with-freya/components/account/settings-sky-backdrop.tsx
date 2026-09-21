import React, { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HOME_THEMES } from '@/constants/home-scene';
import { buildHeroSky, heroMotionMode, heroSunFrame, heroSunScale, starBasis } from '@/constants/home-sky';
import { SETTINGS_SKY } from '@/constants/night-palette';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { HeroStarsLayer } from '@/components/home/hero-stars-layer';
import { StarField } from '@/components/home/star-field';

const NIGHT = HOME_THEMES.night;

export interface SettingsSkyBackdropProps {
  active?: boolean;
  testID?: string;
}

export const SettingsSkyBackdrop = memo(function SettingsSkyBackdrop({
  active = true,
  testID = 'settings-sky-backdrop',
}: SettingsSkyBackdropProps) {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const settled = useSettledAfterTransition(active);
  const stars = useMemo(() => {
    const sun = heroSunFrame(width, height, top);

    return buildHeroSky(width, sun, starBasis(sun.size, heroSunScale(width, height))).stars;
  }, [width, top, height]);

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={SETTINGS_SKY} style={StyleSheet.absoluteFill} />
      <StarField width={width} height={height} colour={NIGHT.star} intensity={Number(NIGHT.starOpacity)} active={settled} />
      <HeroStarsLayer stars={stars} mode={heroMotionMode(settled, reduceMotion)} />
    </View>
  );
});
