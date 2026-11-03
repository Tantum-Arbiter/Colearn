import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { planetHorizonLayout, type EarthEdge } from '@/constants/earth';
import { PLANET_ART } from '@/constants/planet-art';

export interface EarthHorizonProps {
  edge: EarthEdge;
  width?: number;
  height?: number;
  testID?: string;
}

export const EarthHorizon = memo(function EarthHorizon({
  edge,
  width: widthProp,
  height: heightProp,
  testID = 'earth-horizon',
}: EarthHorizonProps) {
  const window = useWindowDimensions();
  const width = widthProp ?? window.width;
  const height = heightProp ?? window.height;
  const layout = planetHorizonLayout(width, height, edge);
  const hanging = edge === 'top';

  return (
    <View
      testID={testID}
      style={[
        styles.window,
        hanging ? { top: -layout.overhang } : { bottom: -layout.overhang },
        { height: layout.rise + layout.overhang },
      ]}
      pointerEvents="none"
    >
      <Image
        testID={`${testID}-planet`}
        source={PLANET_ART.source}
        style={[
          styles.painting,
          { left: layout.left, width: layout.width, height: layout.height },
          hanging ? { top: layout.rise + layout.overhang - layout.height, transform: [{ scaleY: -1 }] } : styles.standing,
        ]}
        contentFit="fill"
        transition={0}
        alt=""
      />
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
  painting: {
    position: 'absolute',
  },
  standing: {
    top: 0,
  },
});
