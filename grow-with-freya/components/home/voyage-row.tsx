import React, { type ReactNode } from 'react';
import { useWindowDimensions, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { VOYAGE_ROWS, rowPose, voyageMaxZoom, zoomScale } from '@/constants/island-voyage';
import { useIslandVoyage } from '@/contexts/island-voyage-context';

export interface VoyageRowProps {
  row: keyof typeof VOYAGE_ROWS;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps['pointerEvents'];
  testID?: string;
}

export function VoyageRow({ row, children, style, pointerEvents, testID }: VoyageRowProps) {
  const { travel } = useIslandVoyage();
  const { width, height } = useWindowDimensions();
  const { order, exit } = VOYAGE_ROWS[row];

  const leaving = useAnimatedStyle(() => {
    const pose = rowPose(travel.value, order, exit, width, height);

    return {
      opacity: pose.opacity,
      transform: [{ translateX: pose.translateX }, { translateY: pose.translateY }],
    };
  });

  return (
    <Animated.View testID={testID} pointerEvents={pointerEvents} style={[style, leaving]}>
      {children}
    </Animated.View>
  );
}

export function useVoyageZoom(width: number, height: number) {
  const { travel } = useIslandVoyage();
  const maxZoom = voyageMaxZoom(width, height);

  return useAnimatedStyle(() => ({
    transform: [
      { translateY: height / 2 },
      { scale: zoomScale(travel.value, maxZoom) },
      { translateY: -height / 2 },
    ],
  }));
}
