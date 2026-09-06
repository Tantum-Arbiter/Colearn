import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { TimeOfDay } from '@/constants/home-scene';
import { HERO_HALO, HERO_HALO_OPACITY, type HeroHalo } from '@/constants/home-sky';

export interface HeroSkyBackgroundProps {
  halo: HeroHalo;
  timeOfDay: TimeOfDay;
  testID?: string;
}

export const HeroSkyBackground = memo(function HeroSkyBackground({
  halo,
  timeOfDay,
  testID = 'hero-sky-background',
}: HeroSkyBackgroundProps) {
  const colour = HERO_HALO[timeOfDay];
  const opacity = HERO_HALO_OPACITY[timeOfDay];
  const gradientId = `hero-halo-${timeOfDay}`;

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      <View testID="hero-sky-halo" style={[styles.halo, { left: halo.x, top: halo.y, width: halo.size, height: halo.size }]}>
        <Svg width={halo.size} height={halo.size}>
          <Defs>
            <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colour} stopOpacity={opacity} />
              <Stop offset="0.45" stopColor={colour} stopOpacity={opacity * 0.32} />
              <Stop offset="1" stopColor={colour} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo.size / 2} cy={halo.size / 2} r={halo.size / 2} fill={`url(#${gradientId})`} />
        </Svg>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
  },
});
