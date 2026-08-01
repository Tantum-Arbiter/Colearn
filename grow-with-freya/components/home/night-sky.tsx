import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { CLOUD_LAYER, cloudBandTop, horizonSize } from '@/constants/night-sky';
import { useShootingStar } from '@/hooks/use-shooting-star';
import { StarField } from './star-field';
import { ShootingStar } from './shooting-star';

const HORIZON_ART = {
  night: require('../../assets/images/ui-elements/home-earth-night.webp'),
  day: require('../../assets/images/ui-elements/home-earth-day.webp'),
} as const;

const CLOUD_ART = {
  night: require('../../assets/images/ui-elements/home-clouds-night.webp'),
  day: require('../../assets/images/ui-elements/home-clouds-day.webp'),
} as const;

export interface NightSkyProps {
  width: number;
  height: number;
  timeOfDay: TimeOfDay;
  testID?: string;
}

export const NightSky = memo(function NightSky({
  width,
  height,
  timeOfDay,
  testID = 'night-sky',
}: NightSkyProps) {
  const theme = HOME_THEMES[timeOfDay];
  const starIntensity = Number(theme.starOpacity);
  const horizon = horizonSize(width);
  const flight = useShootingStar({ enabled: timeOfDay === 'night' });
  const cloudTop = cloudBandTop(height);

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
        sparkleColour={theme.ribbonStar}
        intensity={starIntensity}
      />

      {timeOfDay === 'night' ? (
        <ShootingStar flight={flight} width={width} height={height} colour={theme.star} />
      ) : null}

      <View testID="home-cloud-band" style={[styles.cloudBand, { top: cloudTop }]}>
        <Image
          testID="home-clouds"
          source={CLOUD_ART[timeOfDay]}
          style={[styles.clouds, { width, height, top: -cloudTop, opacity: Number(theme.cloudOpacity) }]}
          contentFit="fill"
          transition={0}
        />

        <LinearGradient
          colors={[theme.skyMid, 'transparent']}
          style={[styles.cloudFeather, { height: CLOUD_LAYER.featherHeight }]}
        />
      </View>

      <Image
        testID="home-horizon"
        source={HORIZON_ART[timeOfDay]}
        style={[
          styles.horizon,
          { width: horizon.width, height: horizon.height, left: (width - horizon.width) / 2 },
        ]}
        contentFit="cover"
        contentPosition="top"
        transition={0}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  cloudBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  clouds: {
    position: 'absolute',
    left: 0,
  },
  cloudFeather: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  horizon: {
    position: 'absolute',
    bottom: 0,
  },
});
