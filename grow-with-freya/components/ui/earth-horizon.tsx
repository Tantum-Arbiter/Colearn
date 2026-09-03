import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { earthLayout, type EarthEdge } from '@/constants/earth';

const EARTH_ART = require('../../assets/images/ui-elements/shared-earth.webp');

export interface EarthHorizonProps {
  edge: EarthEdge;
  width?: number;
  height?: number;
  scrim?: string;
  testID?: string;
}

export const EarthHorizon = memo(function EarthHorizon({
  edge,
  width: widthProp,
  height: heightProp,
  scrim,
  testID = 'earth-horizon',
}: EarthHorizonProps) {
  const window = useWindowDimensions();
  const width = widthProp ?? window.width;
  const height = heightProp ?? window.height;
  const layout = earthLayout(width, height, edge);
  const globe = {
    width: layout.diameter,
    height: layout.diameter,
    borderRadius: layout.diameter / 2,
    left: layout.left,
    top: layout.top,
  };

  return (
    <View
      testID={testID}
      style={[styles.window, edge === 'bottom' ? styles.bottomEdge : styles.topEdge, { height: layout.cap }]}
      pointerEvents="none"
    >
      <Image
        testID={`${testID}-globe`}
        source={EARTH_ART}
        style={[styles.globe, globe]}
        contentFit="contain"
        transition={0}
      />
      {scrim ? <View testID={`${testID}-scrim`} style={[styles.globe, globe, { backgroundColor: scrim }]} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  bottomEdge: {
    bottom: 0,
  },
  topEdge: {
    top: 0,
  },
  globe: {
    position: 'absolute',
  },
});
