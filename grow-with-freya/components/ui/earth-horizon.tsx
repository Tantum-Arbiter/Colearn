import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { cloudLayout, earthLayout, type EarthEdge } from '@/constants/earth';
import { HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';
import { useTimeOfDay } from '@/hooks/use-time-of-day';

const EARTH_ART = require('../../assets/images/ui-elements/shared-earth.webp');
const CLOUD_LEFT = require('../../assets/images/ui-elements/night-cloud-left.webp');
const CLOUD_RIGHT = require('../../assets/images/ui-elements/night-cloud-right.webp');
const MIST = ['transparent', 'rgba(139, 129, 196, 0.35)', 'rgba(168, 158, 222, 0.62)'] as const;
const MIST_STOPS = [0, 0.55, 1] as const;

export interface EarthHorizonProps {
  edge: EarthEdge;
  width?: number;
  height?: number;
  timeOfDay?: TimeOfDay;
  testID?: string;
}

export const EarthHorizon = memo(function EarthHorizon({
  edge,
  width: widthProp,
  height: heightProp,
  timeOfDay: timeOfDayProp,
  testID = 'earth-horizon',
}: EarthHorizonProps) {
  const window = useWindowDimensions();
  const clockTimeOfDay = useTimeOfDay();
  const width = widthProp ?? window.width;
  const height = heightProp ?? window.height;
  const cloudOpacity = Number(HOME_THEMES[timeOfDayProp ?? clockTimeOfDay].cloudOpacity);
  const layout = earthLayout(width, height, edge);
  const clouds = cloudLayout(width, height);
  const edgeStyle = edge === 'bottom' ? styles.bottomEdge : styles.topEdge;
  const globe = {
    width: layout.diameter,
    height: layout.diameter,
    borderRadius: layout.diameter / 2,
    left: layout.left,
    top: layout.top,
  };
  const bank = { width: clouds.width, height: clouds.height, opacity: cloudOpacity };

  return (
    <>
      <View
        testID={`${testID}-clouds`}
        style={[styles.cloudLayer, edgeStyle, { height: clouds.height }, edge === 'top' ? styles.upsideDown : null]}
        pointerEvents="none"
      >
        <LinearGradient colors={[...MIST]} locations={[...MIST_STOPS]} style={[styles.mist, { height: clouds.mistHeight }]} />
        <Image source={CLOUD_LEFT} style={[styles.cloudLeft, bank]} contentFit="contain" transition={0} />
        <Image source={CLOUD_RIGHT} style={[styles.cloudRight, bank]} contentFit="contain" transition={0} />
      </View>
      <View testID={testID} style={[styles.window, edgeStyle, { height: layout.cap }]} pointerEvents="none">
        <Image
          testID={`${testID}-globe`}
          source={EARTH_ART}
          style={[styles.globe, globe]}
          contentFit="contain"
          transition={0}
        />
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  cloudLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  upsideDown: {
    transform: [{ scaleY: -1 }],
  },
  bottomEdge: {
    bottom: 0,
  },
  topEdge: {
    top: 0,
  },
  mist: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
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
  globe: {
    position: 'absolute',
  },
});
