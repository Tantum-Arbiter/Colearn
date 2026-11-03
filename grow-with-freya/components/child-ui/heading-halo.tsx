import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { NIGHT_VOID } from '@/constants/night-palette';

export interface HaloSpread {
  x: number;
  y: number;
}

export const HEADING_HALO = {
  strength: 0.72,
  stops: [
    { at: 0, share: 1 },
    { at: 0.45, share: 0.85 },
    { at: 0.75, share: 0.35 },
    { at: 1, share: 0 },
  ],
  title: { x: 64, y: 30 },
  tagline: { x: 52, y: 22 },
  header: { x: 56, y: 26 },
} as const;

let haloCount = 0;

export interface HeadingHaloProps {
  spread: HaloSpread;
  testID?: string;
}

export const HeadingHalo = memo(function HeadingHalo({ spread, testID = 'heading-halo' }: HeadingHaloProps) {
  const [id] = useState(() => `heading-halo-${(haloCount += 1)}`);

  return (
    <View
      testID={testID}
      style={[styles.halo, { left: -spread.x, right: -spread.x, top: -spread.y, bottom: -spread.y }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {HEADING_HALO.stops.map((stop) => (
              <Stop key={stop.at} offset={stop.at} stopColor={NIGHT_VOID} stopOpacity={HEADING_HALO.strength * stop.share} />
            ))}
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
  },
});
