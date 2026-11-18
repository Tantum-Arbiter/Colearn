import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { ISLAND_ART, type IslandArt, type IslandSheetArt } from '@/constants/island-art';
import { starGlow } from '@/constants/island-life';
import { artFrame, type IslandLayout } from '@/constants/island-scene';
import { MoonlitImage } from './moonlit-image';

interface StarSheetProps {
  sheet: IslandSheetArt;
  index: number;
  sheets: number;
  layout: IslandLayout;
  lamp: SharedValue<number>;
}

const StarSheet = memo(function StarSheet({ sheet, index, sheets, layout, lamp }: StarSheetProps) {
  const frame = artFrame(sheet.frame, layout);
  const twinkle = useAnimatedStyle(() => ({ opacity: starGlow(lamp.value, index, sheets) }));

  return (
    <Animated.View testID={sheet.id} pointerEvents="none" style={[styles.piece, frame, twinkle]}>
      <MoonlitImage
        testID={`${sheet.id}-art`}
        source={sheet.source}
        frame={{ left: 0, top: 0, width: frame.width, height: frame.height }}
        night={false}
      />
    </Animated.View>
  );
});

export interface IslandStarsProps {
  art?: IslandArt;
  layout: IslandLayout;
  lamp: SharedValue<number>;
}

export const IslandStars = memo(function IslandStars({ art = ISLAND_ART, layout, lamp }: IslandStarsProps) {
  return (
    <View
      testID="island-stars"
      style={styles.sky}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {art.stars.map((sheet, index) => (
        <StarSheet key={sheet.id} sheet={sheet} index={index} sheets={art.stars.length} layout={layout} lamp={lamp} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  sky: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  piece: {
    position: 'absolute',
  },
});
