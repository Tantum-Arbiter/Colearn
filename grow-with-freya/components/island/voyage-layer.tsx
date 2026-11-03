import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { CLOUD_PUFFS, VOYAGE_COVER, fogOpacity, isTravelling, puffPose } from '@/constants/island-voyage';
import { useIslandVoyage } from '@/contexts/island-voyage-context';

export const VOYAGE_LAYER_Z = 1600;

const CLOUD_BOX = { width: 240, height: 150 };
const CLOUD_ASPECT = CLOUD_BOX.height / CLOUD_BOX.width;
const CLOUD_SHADE = '#D5E0FF';
const CLOUD_SHADE_DROP = 9;

const CLOUD_BODY = [
  { cx: 62, cy: 90, r: 40 },
  { cx: 106, cy: 64, r: 52 },
  { cx: 154, cy: 74, r: 46 },
  { cx: 192, cy: 98, r: 34 },
] as const;

interface PuffProps {
  index: number;
  clouds: SharedValue<number>;
  width: number;
  height: number;
}

const Puff = memo(function Puff({ index, clouds, width, height }: PuffProps) {
  const span = Math.min(width, height) * CLOUD_PUFFS[index].size;
  const rise = span * CLOUD_ASPECT;

  const style = useAnimatedStyle(() => {
    const pose = puffPose(clouds.value, index, width, height);

    return {
      opacity: pose.opacity,
      transform: [{ translateX: pose.translateX }, { translateY: pose.translateY }, { scale: pose.scale }],
    };
  });

  return (
    <Animated.View
      testID="voyage-cloud"
      pointerEvents="none"
      style={[styles.puff, { width: span, height: rise, left: (width - span) / 2, top: (height - rise) / 2 }, style]}
    >
      <Svg width={span} height={rise} viewBox={`0 0 ${CLOUD_BOX.width} ${CLOUD_BOX.height}`}>
        {CLOUD_BODY.map((part) => (
          <Circle key={`shade-${part.cx}`} cx={part.cx} cy={part.cy + CLOUD_SHADE_DROP} r={part.r} fill={CLOUD_SHADE} />
        ))}
        <Ellipse cx={124} cy={108 + CLOUD_SHADE_DROP} rx={98} ry={30} fill={CLOUD_SHADE} />
        {CLOUD_BODY.map((part) => (
          <Circle key={`body-${part.cx}`} cx={part.cx} cy={part.cy} r={part.r} fill="#FFFFFF" />
        ))}
        <Ellipse cx={124} cy={108} rx={98} ry={30} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
});

export function VoyageLayer() {
  const voyage = useIslandVoyage();
  const { width, height } = useWindowDimensions();
  const clouds = voyage.clouds;

  const fog = useAnimatedStyle(() => ({ opacity: fogOpacity(clouds.value) }));

  if (!isTravelling(voyage.phase)) return null;

  return (
    <View
      testID="voyage-layer"
      style={styles.layer}
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {voyage.reduceMotion
        ? null
        : CLOUD_PUFFS.map((_, index) => (
            <Puff key={index} index={index} clouds={clouds} width={width} height={height} />
          ))}
      <Animated.View testID="voyage-fog" pointerEvents="none" style={[styles.fog, fog]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: VOYAGE_LAYER_Z,
    overflow: 'hidden',
  },
  puff: {
    position: 'absolute',
  },
  fog: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: VOYAGE_COVER,
  },
});
