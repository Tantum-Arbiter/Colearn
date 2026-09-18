/**
 * BlobPanel
 *
 * A soft card whose edges bow gently outwards, closer to a hand-drawn shape than the
 * hard rounded rectangle `borderRadius` gives. Drawn as an SVG path behind its
 * children, sized from onLayout because the height comes from the content.
 *
 * `bow` is how far the middle of each edge pushes out, as a fraction of the shorter
 * side. Keep it small -- past about 0.05 the card starts to look inflated.
 */

import React, { ReactNode, useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const DEFAULT_BOW = 0.022;
const DEFAULT_CORNER = 0.14;
const MIN_CORNER = 24;
const MAX_CORNER = 60;

export interface BlobPanelProps {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  bow?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Also forwarded the layout, for callers that align something to the panel. */
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}

/**
 * Path for a rounded rectangle whose edges bow outwards by `bow`, drawn inside a box
 * inset by `bow` on every side so the bulge is never clipped.
 */
export function blobPath(width: number, height: number, corner: number, bow: number): string {
  const left = bow;
  const top = bow;
  const right = bow + width;
  const bottom = bow + height;
  const midX = bow + width / 2;
  const midY = bow + height / 2;
  const r = Math.min(corner, width / 2, height / 2);

  return [
    `M ${left + r} ${top}`,
    `Q ${midX} ${top - bow} ${right - r} ${top}`,
    `Q ${right} ${top} ${right} ${top + r}`,
    `Q ${right + bow} ${midY} ${right} ${bottom - r}`,
    `Q ${right} ${bottom} ${right - r} ${bottom}`,
    `Q ${midX} ${bottom + bow} ${left + r} ${bottom}`,
    `Q ${left} ${bottom} ${left} ${bottom - r}`,
    `Q ${left - bow} ${midY} ${left} ${top + r}`,
    `Q ${left} ${top} ${left + r} ${top}`,
    'Z',
  ].join(' ');
}

export function BlobPanel({
  fill,
  stroke,
  strokeWidth = 1,
  bow = DEFAULT_BOW,
  children,
  style,
  onLayout,
  testID,
}: BlobPanelProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize(current =>
      current.width === width && current.height === height ? current : { width, height });
    onLayout?.(event);
  }, [onLayout]);

  const bowAmount = Math.min(size.width, size.height) * bow;
  const corner = Math.max(
    MIN_CORNER, Math.min(MAX_CORNER, Math.min(size.width, size.height) * DEFAULT_CORNER));

  return (
    <View style={style} onLayout={handleLayout} testID={testID}>
      {size.width > 0 && size.height > 0 && (
        <Svg
          style={[styles.canvas, { left: -bowAmount, top: -bowAmount }]}
          width={size.width + bowAmount * 2}
          height={size.height + bowAmount * 2}
          pointerEvents="none"
          testID="blob-panel-shape"
        >
          <Path
            d={blobPath(size.width, size.height, corner, bowAmount)}
            fill={fill}
            stroke={stroke}
            strokeWidth={stroke ? strokeWidth : 0}
          />
        </Svg>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
  },
});
