import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { skyFoot } from '@/constants/night-palette';
import { navClearance } from './nav-metrics';
import { SPACE_6 } from './tokens';

export const SHELF_FOOT_FADE = SPACE_6;

export function ShelfFoot() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const clearance = navClearance(insets.bottom);
  const edge = height - clearance;
  const sky = useMemo(() => skyFoot(edge - SHELF_FOOT_FADE, edge, height), [edge, height]);

  return (
    <View testID="shelf-foot" pointerEvents="none" style={[styles.foot, { bottom: clearance }]}>
      <LinearGradient colors={sky.colours} locations={sky.locations} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  foot: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SHELF_FOOT_FADE,
  },
});
