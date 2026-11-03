import React, { memo, useMemo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import type { TimeOfDay } from '@/constants/home-scene';
import { buildHeroSky, heroMotionMode, starBasis, sunFrame } from '@/constants/home-sky';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { HeroSkyBackground } from './hero-sky-background';
import { HeroStarsLayer } from './hero-stars-layer';
import { HeroSunContainer } from './hero-sun-container';

export interface HomeHeroSkyProps {
  width: number;
  /** Defaults to `width` (a square viewport) when the caller doesn't know it. */
  height?: number;
  topInset: number;
  timeOfDay: TimeOfDay;
  active?: boolean;
  /** Grows the sun (and everything scaled off it -- the halo, the stars)
   *  beyond its ordinary share of the shorter axis. See `sunFrame`. */
  sizeScale?: number;
  /** The page's scroll offset, which the sun rides up with. */
  lift?: SharedValue<number>;
  zoomStyle?: ComponentProps<typeof Animated.View>['style'];
  testID?: string;
}

export const HomeHeroSky = memo(function HomeHeroSky({
  width,
  height = width,
  topInset,
  timeOfDay,
  active = true,
  sizeScale = 1,
  lift,
  zoomStyle,
  testID = 'home-hero-sky',
}: HomeHeroSkyProps) {
  const reduceMotion = useReducedMotion();
  const settled = useSettledAfterTransition(active);
  const mode = heroMotionMode(settled, reduceMotion);
  const sun = useMemo(() => sunFrame(width, topInset, height, sizeScale), [width, topInset, height, sizeScale]);
  const layout = useMemo(() => buildHeroSky(width, sun, starBasis(sun.size, sizeScale)), [width, sun, sizeScale]);

  const sky = (
    <View testID={testID} style={[styles.sky, { width, height: layout.height }]} pointerEvents="none">
      <HeroSkyBackground halo={layout.halo} timeOfDay={timeOfDay} />
      <HeroStarsLayer stars={layout.stars} mode={mode} />
    </View>
  );
  const sunArt = <HeroSunContainer sun={sun} timeOfDay={timeOfDay} mode={mode} lift={lift} />;

  if (!zoomStyle) {
    return (
      <>
        {sky}
        {sunArt}
      </>
    );
  }

  return (
    <>
      <Animated.View testID="hero-sky-zoom" style={[styles.zoom, zoomStyle]} pointerEvents="none">
        {sky}
      </Animated.View>
      <Animated.View testID="hero-sun-zoom" style={[styles.zoom, styles.sunZoom, zoomStyle]} pointerEvents="box-none">
        {sunArt}
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  sky: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  zoom: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sunZoom: {
    zIndex: 10,
  },
});
