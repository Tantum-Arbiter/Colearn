import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { EarthHorizon } from '@/components/ui/earth-horizon';
import { StarField } from './star-field';


export interface NightSkyProps {
  width: number;
  height: number;
  timeOfDay: TimeOfDay;
  active?: boolean;
  testID?: string;
}

export const NightSky = memo(function NightSky({
  width,
  height,
  timeOfDay,
  active = true,
  testID = 'night-sky',
}: NightSkyProps) {
  const theme = HOME_THEMES[timeOfDay];
  const starIntensity = Number(theme.starOpacity);
  const settled = useSettledAfterTransition(active);

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        testID={`${testID}-colour`}
        colors={[theme.skyTop, theme.skyMid, theme.skyBottom]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <StarField
        width={width}
        height={height}
        colour={theme.star}
        intensity={starIntensity}
        active={settled}
      />

      <EarthHorizon testID="home-horizon" edge="bottom" width={width} height={height} />
    </View>
  );
});

