import React, { memo } from 'react';
import { StyleSheet, type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { ISLAND_ART, type IslandArt } from '@/constants/island-art';
import { waterGlow } from '@/constants/island-life';
import type { IslandLayout } from '@/constants/island-scene';
import { MoonlitImage } from './moonlit-image';

interface SheetProps {
  source: ImageSourcePropType;
  index: number;
  sheets: number;
  layout: IslandLayout;
  ripple: SharedValue<number>;
}

const Sheet = memo(function Sheet({ source, index, sheets, layout, ripple }: SheetProps) {
  const glow = useAnimatedStyle(() => ({ opacity: waterGlow(ripple.value, index, sheets) }));

  return (
    <Animated.View testID={`island-water-${index}`} pointerEvents="none" style={[styles.sheet, layout.picture, glow]}>
      <MoonlitImage
        testID={`island-water-${index}-art`}
        source={source}
        frame={{ left: 0, top: 0, width: layout.picture.width, height: layout.picture.height }}
        night={false}
      />
    </Animated.View>
  );
});

export interface IslandWaterProps {
  art?: IslandArt;
  layout: IslandLayout;
  ripple: SharedValue<number>;
}

export const IslandWater = memo(function IslandWater({ art = ISLAND_ART, layout, ripple }: IslandWaterProps) {
  return (
    <>
      {art.water.map((source, index) => (
        <Sheet key={index} source={source} index={index} sheets={art.water.length} layout={layout} ripple={ripple} />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
  },
});
