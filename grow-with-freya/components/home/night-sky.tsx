import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { useShootingStar } from '@/hooks/use-shooting-star';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { EarthHorizon } from '@/components/ui/earth-horizon';
import { StarField } from './star-field';
import { ShootingStar } from './shooting-star';

// one dusk-purple pair for both times of day; the theme's cloudOpacity still
// softens them further in daylight
const CLOUD_LEFT = require('../../assets/images/ui-elements/night-cloud-left.webp');
const CLOUD_RIGHT = require('../../assets/images/ui-elements/night-cloud-right.webp');

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
  const flight = useShootingStar({ enabled: timeOfDay === 'night' && settled });
  // sized explicitly -- aspectRatio on images proved unreliable (see AuthSky)
  const cloudWidth = Math.round(width * 0.55);
  const cloudHeight = Math.round(cloudWidth * (616 / 531));

  return (
    <View testID={testID} style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
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

      {timeOfDay === 'night' ? (
        <ShootingStar flight={flight} width={width} height={height} colour={theme.star} />
      ) : null}

      <View testID="home-clouds" style={StyleSheet.absoluteFill}>
        {/* mist floor under the banks, matching the auth sky treatment */}
        <LinearGradient
          colors={['transparent', 'rgba(139, 129, 196, 0.35)', 'rgba(168, 158, 222, 0.62)']}
          locations={[0, 0.55, 1]}
          style={styles.mistFloor}
        />
        <Image
          source={CLOUD_LEFT}
          style={[styles.cloudLeft, { width: cloudWidth, height: cloudHeight, opacity: Number(theme.cloudOpacity) }]}
          contentFit="contain"
          transition={0}
        />
        <Image
          source={CLOUD_RIGHT}
          style={[styles.cloudRight, { width: cloudWidth, height: cloudHeight, opacity: Number(theme.cloudOpacity) }]}
          contentFit="contain"
          transition={0}
        />
      </View>

      <EarthHorizon testID="home-horizon" edge="bottom" width={width} height={height} />
    </View>
  );
});

const styles = StyleSheet.create({
  mistFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '24%',
  },
  // the pair frames the bottom corners, tucked behind the horizon art; widths
  // are relative with the assets' own aspect so nothing crops
  cloudLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  cloudRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
