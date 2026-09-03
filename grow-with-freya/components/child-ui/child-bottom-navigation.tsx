import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { Ionicons } from '@expo/vector-icons';
import {
  ACCENT_BLUE,
  ACCENT_PURPLE,
  BORDER_DEFAULT,
  SURFACE_NAV,
} from '@/constants/night-palette';
import { CHILD_UI_MOTION, motionDuration } from '@/constants/child-ui-motion';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { NavigationItem } from './navigation-item';
import {
  NAV_BOTTOM_MARGIN,
  NAV_HEIGHT,
  NAV_HOME_INDICATOR_OVERLAP,
  NAV_MAX_WIDTH,
  RADIUS_NAV,
  RADIUS_NAV_ITEM,
  SPACE_2,
  SPACE_4,
  contentMargin,
} from './tokens';

export type ChildNavItemId = 'home' | 'library' | 'progress';

interface ChildNavItem {
  id: ChildNavItemId;
  icon: keyof typeof Ionicons.glyphMap;
  selectedIcon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}

export const CHILD_NAV_ITEMS: readonly ChildNavItem[] = [
  { id: 'home', icon: 'home-outline', selectedIcon: 'home', labelKey: 'childUi.nav.home' },
  { id: 'library', icon: 'book-outline', selectedIcon: 'book', labelKey: 'childUi.nav.library' },
  { id: 'progress', icon: 'trending-up-outline', selectedIcon: 'trending-up', labelKey: 'childUi.nav.progress' },
] as const;

const PANEL_INSET = 6;
const SELECTED_PANEL_GRADIENT = [`${ACCENT_BLUE}73`, `${ACCENT_PURPLE}73`] as const;

export function navBottomOffset(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom - NAV_HOME_INDICATOR_OVERLAP, NAV_BOTTOM_MARGIN);
}

export function navClearance(safeAreaBottom: number): number {
  return NAV_HEIGHT + navBottomOffset(safeAreaBottom) + SPACE_4;
}

export function navWidth(windowWidth: number, isTablet: boolean): number {
  return Math.min(windowWidth - contentMargin(isTablet) * 2, NAV_MAX_WIDTH);
}

interface ChildBottomNavigationProps {
  selected: ChildNavItemId;
  onSelect: (id: ChildNavItemId) => void;
}

export function ChildBottomNavigation({ selected, onSelect }: ChildBottomNavigationProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { isTablet } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const [rowWidth, setRowWidth] = useState(0);

  const selectedIndex = Math.max(0, CHILD_NAV_ITEMS.findIndex((item) => item.id === selected));
  const itemWidth = rowWidth / CHILD_NAV_ITEMS.length;
  const panelX = useSharedValue(selectedIndex * itemWidth);

  useEffect(() => {
    if (itemWidth === 0) return;
    panelX.value = withTiming(selectedIndex * itemWidth, {
      duration: motionDuration(CHILD_UI_MOTION.navSlide, reduceMotion),
      easing: Easing.out(Easing.cubic),
    });
  }, [selectedIndex, itemWidth, reduceMotion, panelX]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panelX.value }],
  }));

  return (
    <View
      style={[styles.positioner, { bottom: navBottomOffset(insets.bottom) }]}
      pointerEvents="box-none"
    >
      <View
        testID="child-bottom-navigation"
        accessibilityRole="tablist"
        style={[styles.container, { width: navWidth(windowWidth, isTablet) }]}
      >
      <View
        style={styles.row}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      >
        {rowWidth > 0 && (
          <Animated.View
            testID="child-nav-selected-panel"
            pointerEvents="none"
            style={[styles.selectedPanel, { width: itemWidth }, panelStyle]}
          >
            <LinearGradient
              colors={SELECTED_PANEL_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.selectedPanelFill}
            />
          </Animated.View>
        )}
        {CHILD_NAV_ITEMS.map((item) => (
          <NavigationItem
            key={item.id}
            id={item.id}
            icon={item.icon}
            selectedIcon={item.selectedIcon}
            label={t(item.labelKey)}
            selected={item.id === selected}
            onSelect={onSelect as (id: string) => void}
          />
        ))}
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  container: {
    height: NAV_HEIGHT,
    borderRadius: RADIUS_NAV,
    backgroundColor: SURFACE_NAV,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPanel: {
    position: 'absolute',
    top: PANEL_INSET,
    bottom: PANEL_INSET,
    left: 0,
    paddingHorizontal: SPACE_2,
  },
  selectedPanelFill: {
    flex: 1,
    borderRadius: RADIUS_NAV_ITEM,
  },
});
