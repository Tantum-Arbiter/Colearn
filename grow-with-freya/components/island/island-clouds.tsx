import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { IslandBillowArt, IslandCloudArt } from '@/constants/island-art';
import { billowSwell, cloudDrift } from '@/constants/island-life';
import { artFrame, type IslandLayout } from '@/constants/island-scene';
import { MoonlitImage } from './moonlit-image';

export interface DriftingCloudProps {
  cloud: IslandCloudArt;
  layout: IslandLayout;
  tide: SharedValue<number>;
  night?: boolean;
}

export const DriftingCloud = memo(function DriftingCloud({ cloud, layout, tide, night = false }: DriftingCloudProps) {
  const frame = artFrame(cloud.frame, layout);
  const { reach, beats, lag } = cloud;
  const scale = layout.scale;

  const drift = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudDrift(tide.value, reach, beats, lag) * scale }],
  }));

  return (
    <Animated.View testID={cloud.id} pointerEvents="none" style={[styles.piece, frame, drift]}>
      <MoonlitImage
        testID={`${cloud.id}-art`}
        source={cloud.source}
        frame={{ left: 0, top: 0, width: frame.width, height: frame.height }}
        night={night}
      />
    </Animated.View>
  );
});

export interface BillowingCloudProps {
  billow: IslandBillowArt;
  layout: IslandLayout;
  tide: SharedValue<number>;
  index: number;
}

export const BillowingCloud = memo(function BillowingCloud({ billow, layout, tide, index }: BillowingCloudProps) {
  const frame = artFrame(billow.frame, layout);
  const across = (billow.anchorX - 0.5) * frame.width;
  const down = (billow.anchorY - 0.5) * frame.height;

  const swell = useAnimatedStyle(() => ({
    transform: [
      { translateX: across },
      { translateY: down },
      { scale: billowSwell(tide.value, index) },
      { translateX: -across },
      { translateY: -down },
    ],
  }));

  return (
    <Animated.View testID={billow.id} pointerEvents="none" style={[styles.piece, frame, swell]}>
      <MoonlitImage
        testID={`${billow.id}-art`}
        source={billow.source}
        frame={{ left: 0, top: 0, width: frame.width, height: frame.height }}
        night={false}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
});
