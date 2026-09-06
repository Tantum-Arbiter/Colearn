import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TimeOfDay } from '@/constants/home-scene';
import { buildHeroSky, heroMotionMode, sunFrame } from '@/constants/home-sky';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { HeroSkyBackground } from './hero-sky-background';
import { HeroStarsLayer } from './hero-stars-layer';
import { HeroSunContainer } from './hero-sun-container';

export interface HomeHeroSkyProps {
  width: number;
  topInset: number;
  timeOfDay: TimeOfDay;
  active?: boolean;
  testID?: string;
}

export const HomeHeroSky = memo(function HomeHeroSky({
  width,
  topInset,
  timeOfDay,
  active = true,
  testID = 'home-hero-sky',
}: HomeHeroSkyProps) {
  const reduceMotion = useReducedMotion();
  const settled = useSettledAfterTransition(active);
  const mode = heroMotionMode(settled, reduceMotion);
  const sun = useMemo(() => sunFrame(width, topInset), [width, topInset]);
  const layout = useMemo(() => buildHeroSky(width, sun), [width, sun]);

  return (
    <>
      <View testID={testID} style={[styles.sky, { width, height: layout.height }]} pointerEvents="none">
        <HeroSkyBackground halo={layout.halo} timeOfDay={timeOfDay} />
        <HeroStarsLayer stars={layout.stars} mode={mode} />
      </View>
      <HeroSunContainer sun={sun} timeOfDay={timeOfDay} mode={mode} />
    </>
  );
});

const styles = StyleSheet.create({
  sky: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
