import React, { ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChildBottomNavigation, ChildNavItemId } from './child-bottom-navigation';

interface JourneyShellProps {
  selected: ChildNavItemId;
  onSelect: (id: ChildNavItemId) => void;
  navigationHidden?: boolean;
  screenTime?: { usageSeconds: number; limitSeconds: number } | null;
  navigationCollapsed?: boolean;
  navigationItemRefs?: Partial<Record<ChildNavItemId, RefObject<View | null>>>;
  /** The page this shell is, for the shared journey bar. */
  navigationSlotKey?: string;
  children: ReactNode;
}

export function JourneyShell({ selected, onSelect, navigationHidden = false, screenTime, navigationCollapsed = false, navigationItemRefs, navigationSlotKey, children }: JourneyShellProps) {
  return (
    <View style={styles.fill} testID="journey-shell">
      {children}
      {!navigationHidden && (
        <ChildBottomNavigation
          selected={selected}
          onSelect={onSelect}
          screenTime={screenTime}
          collapsed={navigationCollapsed}
          itemRefs={navigationItemRefs}
          slotKey={navigationSlotKey}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
