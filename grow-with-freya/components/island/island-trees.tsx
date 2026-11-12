import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { IslandTreeArt } from '@/constants/island-art';
import { treeSway } from '@/constants/island-life';
import { artFrame, artPoint, type IslandLayout } from '@/constants/island-scene';
import { MoonlitImage } from './moonlit-image';

export interface SwayingTreeProps {
  tree: IslandTreeArt;
  layout: IslandLayout;
  wind: SharedValue<number>;
  index: number;
  night?: boolean;
}

export const SwayingTree = memo(function SwayingTree({ tree, layout, wind, index, night = false }: SwayingTreeProps) {
  const frame = artFrame(tree.frame, layout);
  const foot = artPoint(tree.pivotX, tree.pivotY, layout);
  const across = foot.x - (frame.left + frame.width / 2);
  const down = foot.y - (frame.top + frame.height / 2);
  const sway = tree.sway;

  const lean = useAnimatedStyle(() => ({
    transform: [
      { translateX: across },
      { translateY: down },
      { rotate: `${treeSway(wind.value, index, sway)}deg` },
      { translateX: -across },
      { translateY: -down },
    ],
  }));

  return (
    <Animated.View testID={tree.id} pointerEvents="none" style={[styles.piece, frame, lean]}>
      <MoonlitImage
        testID={`${tree.id}-art`}
        source={tree.source}
        frame={{ left: 0, top: 0, width: frame.width, height: frame.height }}
        night={night}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
});
