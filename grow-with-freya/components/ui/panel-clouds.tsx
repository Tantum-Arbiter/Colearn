/**
 * PanelClouds
 *
 * The bank of cloud that settles along the bottom of a night-sky panel. A
 * drawn pair rather than one piece flipped, so each side keeps the lighting
 * its own art was given.
 *
 * Decorative only — it never takes a touch, and the panel it sits in has to
 * clip its own corners for the cloud to follow them.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

const CLOUD_LEFT = require('@/assets/images/ui-elements/panel-cloud-left.webp');
const CLOUD_RIGHT = require('@/assets/images/ui-elements/panel-cloud-right.webp');
const LEFT_ASPECT = 560 / 452;
const RIGHT_ASPECT = 560 / 443;

export const CLOUD_SCALE = 0.34;

/**
 * How tall the cloud bank stands in a panel of this width. The taller of the
 * two drawings wins, so anything kept above this line clears both corners.
 */
export function cloudBandHeight(panelWidth: number, scale: number = CLOUD_SCALE): number {
  return (panelWidth * scale) / Math.min(LEFT_ASPECT, RIGHT_ASPECT);
}

interface PanelCloudsProps {
  /** Cloud width as a fraction of the panel's own width. */
  scale?: number;
  opacity?: number;
  testID?: string;
}

export function PanelClouds({ scale = CLOUD_SCALE, opacity = 0.55, testID = 'panel-clouds' }: PanelCloudsProps) {
  return (
    <View style={styles.row} pointerEvents="none" testID={testID}>
      <Image
        testID={`${testID}-left`}
        source={CLOUD_LEFT}
        style={[styles.cloud, { width: `${scale * 100}%`, aspectRatio: LEFT_ASPECT, opacity }]}
        contentFit="contain"
      />
      <Image
        testID={`${testID}-right`}
        source={CLOUD_RIGHT}
        style={[styles.cloud, { width: `${scale * 100}%`, aspectRatio: RIGHT_ASPECT, opacity }]}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cloud: {
    height: undefined,
  },
});
