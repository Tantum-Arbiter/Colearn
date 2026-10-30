/**
 * PanelStarfield
 *
 * The scatter of stars behind a night-sky panel's content.
 *
 * Positions are fractions of the panel's *clear* area rather than of the panel
 * itself: the field measures its own box, subtracts however tall the cloud
 * bank stands at that width, and lays the stars out above the line. A star can
 * therefore never land on a cloud, whatever shape the panel ends up.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { ACCENT_GOLD } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CLOUD_SCALE, cloudBandHeight } from './panel-clouds';

const WHITE = '#FFFFFF';

/** x and y are fractions of the clear area, not of the panel. */
const STARS: { x: number; y: number; size: number; color: string; glyph: string; opacity: number }[] = [
  { x: 0.07, y: 0.12, size: 15, color: ACCENT_GOLD, glyph: '★', opacity: 0.95 },
  { x: 0.88, y: 0.18, size: 13, color: ACCENT_GOLD, glyph: '★', opacity: 0.85 },
  { x: 0.03, y: 0.48, size: 16, color: ACCENT_GOLD, glyph: '✦', opacity: 0.8 },
  { x: 0.93, y: 0.44, size: 15, color: ACCENT_GOLD, glyph: '✦', opacity: 0.9 },
  { x: 0.02, y: 0.8, size: 11, color: WHITE, glyph: '✦', opacity: 0.45 },
  { x: 0.94, y: 0.83, size: 12, color: WHITE, glyph: '★', opacity: 0.4 },
  { x: 0.46, y: 0.04, size: 10, color: WHITE, glyph: '✦', opacity: 0.35 },
];

const DOTS: { x: number; y: number; size: number; opacity: number }[] = [
  { x: 0.19, y: 0.22, size: 3, opacity: 0.5 },
  { x: 0.75, y: 0.08, size: 4, opacity: 0.4 },
  { x: 0.05, y: 0.65, size: 3, opacity: 0.35 },
  { x: 0.96, y: 0.6, size: 3, opacity: 0.45 },
  { x: 0.12, y: 0.92, size: 4, opacity: 0.3 },
  { x: 0.88, y: 0.95, size: 3, opacity: 0.35 },
];

interface PanelStarfieldProps {
  /** Matches the scale given to the panel's clouds, so the reserve is right. */
  cloudScale?: number;
  /** Set when the panel has no clouds and the stars may use its whole height. */
  withoutClouds?: boolean;
  testID?: string;
}

export function PanelStarfield({
  cloudScale = CLOUD_SCALE,
  withoutClouds = false,
  testID = 'panel-starfield',
}: PanelStarfieldProps) {
  const [box, setBox] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox({ width, height });
  }, []);

  // Until the panel has been measured there is no safe area to place into.
  const reserved = withoutClouds ? 0 : cloudBandHeight(box.width, cloudScale);
  const clear = Math.max(0, box.height - reserved);
  const ready = box.width > 0 && clear > 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleLayout} testID={testID}>
      {ready && STARS.map((star, index) => (
        <Text
          key={`star-${index}`}
          style={[
            styles.star,
            {
              left: star.x * box.width,
              top: star.y * clear,
              fontSize: star.size,
              color: star.color,
              opacity: star.opacity,
            },
          ]}
        >
          {star.glyph}
        </Text>
      ))}
      {ready && DOTS.map((dot, index) => (
        <View
          key={`dot-${index}`}
          style={[
            styles.dot,
            {
              left: dot.x * box.width,
              top: dot.y * clear,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              opacity: dot.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    fontFamily: Fonts.sans,
  },
  dot: {
    position: 'absolute',
    backgroundColor: WHITE,
  },
});
