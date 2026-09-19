import React, { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HOME_THEMES } from '@/constants/home-scene';
import { buildHeroSky, heroMotionMode, starBasis, sunFrame } from '@/constants/home-sky';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { HeroStarsLayer } from './hero-stars-layer';
import { StarField } from './star-field';

const TABLET_MIN_SHORT_SIDE = 768;
const PORTRAIT_TABLET_SCALE = 1.3;

export interface HomeSkyBackdropProps {
  active?: boolean;
  /** The page sits above home and slides away upwards off its top, so the sky runs the other way. */
  above?: boolean;
  testID?: string;
}

export const HomeSkyBackdrop = memo(function HomeSkyBackdrop({
  active = true,
  above = false,
  testID = 'home-sky-backdrop',
}: HomeSkyBackdropProps) {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const theme = HOME_THEMES[useTimeOfDay()];
  const reduceMotion = useReducedMotion();
  const settled = useSettledAfterTransition(active);
  const portraitTablet = Math.min(width, height) >= TABLET_MIN_SHORT_SIDE && height > width;
  const scale = portraitTablet ? PORTRAIT_TABLET_SCALE : 1;
  const stars = useMemo(() => {
    const sun = sunFrame(width, top, height, scale);

    return buildHeroSky(width, sun, starBasis(sun.size, scale)).stars;
  }, [width, top, height, scale]);

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={above ? [theme.skyBottom, theme.skyMid, theme.skyTop] : [theme.skyTop, theme.skyMid, theme.skyBottom]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <StarField width={width} height={height} colour={theme.star} intensity={Number(theme.starOpacity)} active={settled} />
      <HeroStarsLayer stars={stars} mode={heroMotionMode(settled, reduceMotion)} />
    </View>
  );
});
