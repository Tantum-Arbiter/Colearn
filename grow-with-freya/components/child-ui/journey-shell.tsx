import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChildBottomNavigation, ChildNavItemId } from './child-bottom-navigation';

interface JourneyShellProps {
  selected: ChildNavItemId;
  onSelect: (id: ChildNavItemId) => void;
  navigationHidden?: boolean;
  screenTime?: { usageSeconds: number; limitSeconds: number } | null;
  navigationCollapsed?: boolean;
  children: ReactNode;
}

export function JourneyShell({ selected, onSelect, navigationHidden = false, screenTime, navigationCollapsed = false, children }: JourneyShellProps) {
  return (
    <View style={styles.fill} testID="journey-shell">
      {children}
      {!navigationHidden && (
        <ChildBottomNavigation
          selected={selected}
          onSelect={onSelect}
          screenTime={screenTime}
          collapsed={navigationCollapsed}
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
