import React, { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

export const TITLE_SHARE = 1 / 3;

interface BalancedHeaderRowProps {
  left: ReactNode;
  title: ReactNode;
  right: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function BalancedHeaderRow({ left, title, right, style, testID = 'balanced-header-row' }: BalancedHeaderRowProps) {
  const [leftWidth, setLeftWidth] = useState(0);
  const [rightWidth, setRightWidth] = useState(0);
  const [rowWidth, setRowWidth] = useState(0);
  const sideCap = rowWidth > 0 ? (rowWidth - rowWidth * TITLE_SHARE) / 2 : Number.POSITIVE_INFINITY;
  const sideWidth = Math.min(Math.max(leftWidth, rightWidth), sideCap);
  const sideLimit = Number.isFinite(sideCap) ? { maxWidth: sideCap } : null;

  const onLeftLayout = useCallback((event: LayoutChangeEvent) => setLeftWidth(Math.ceil(event.nativeEvent.layout.width)), []);
  const onRightLayout = useCallback((event: LayoutChangeEvent) => setRightWidth(Math.ceil(event.nativeEvent.layout.width)), []);
  const onRowLayout = useCallback((event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width), []);

  return (
    <View testID={testID} style={[styles.row, style]} pointerEvents="box-none" onLayout={onRowLayout}>
      <View testID={`${testID}-left`} style={[styles.side, styles.left, { minWidth: sideWidth }]} pointerEvents="box-none">
        <View testID={`${testID}-left-content`} style={[styles.content, sideLimit]} onLayout={onLeftLayout}>
          {left}
        </View>
      </View>
      <View style={styles.title} pointerEvents="none">
        {title}
      </View>
      <View testID={`${testID}-right`} style={[styles.side, styles.right, { minWidth: sideWidth }]} pointerEvents="box-none">
        <View testID={`${testID}-right-content`} style={[styles.content, sideLimit]} onLayout={onRightLayout}>
          {right}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  side: {
    flex: 1,
  },
  left: {
    alignItems: 'flex-start',
  },
  right: {
    alignItems: 'flex-end',
  },
  title: {
    flexShrink: 1,
  },
  content: {
    maxWidth: '100%',
  },
});
