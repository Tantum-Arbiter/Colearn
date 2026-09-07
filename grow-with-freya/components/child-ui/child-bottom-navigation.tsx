import React, { useEffect, useState, type RefObject } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { Ionicons } from '@expo/vector-icons';
import {
  ACCENT_BLUE,
  ACCENT_PURPLE,
  BORDER_DEFAULT,
  SURFACE_NAV,
} from '@/constants/night-palette';
import {
  CHILD_UI_MOTION,
  CHILD_UI_SCALE,
  CHILD_UI_SPRING,
  NAV_ANTICIPATION_SHARE,
  motionDuration,
} from '@/constants/child-ui-motion';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ScreenTimeRing } from '@/components/home/screen-time-ring';
import { TEXT_SECONDARY } from '@/constants/night-palette';
import { NavigationItem } from './navigation-item';
import { ProfileNavAvatar } from './profile-nav-avatar';
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

export type ChildNavItemId = 'home' | 'progress' | 'screensafe' | 'search' | 'profile';

interface ChildNavItem {
  id: ChildNavItemId;
  icon: keyof typeof Ionicons.glyphMap;
  selectedIcon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
}

export const CHILD_NAV_ITEMS: readonly ChildNavItem[] = [
  { id: 'home', icon: 'home-outline', selectedIcon: 'home', labelKey: 'childUi.nav.home' },
  { id: 'progress', icon: 'trending-up-outline', selectedIcon: 'trending-up', labelKey: 'childUi.nav.progress' },
  { id: 'screensafe', icon: 'shield-outline', selectedIcon: 'shield-checkmark', labelKey: 'childUi.nav.screensafe' },
  { id: 'search', icon: 'search-outline', selectedIcon: 'search', labelKey: 'childUi.nav.search' },
  { id: 'profile', icon: 'person-circle-outline', selectedIcon: 'person-circle', labelKey: 'childUi.nav.profile' },
] as const;

const PANEL_INSET = 6;

/**
 * The ring in the middle of the bar. It carries no label -- a dial of today's
 * usage says what it is -- so it takes the label's height as well as the
 * glyph's, and reads as the control the bar is built around rather than as
 * one of five equals.
 */
const NAV_RING_SIZE = 58;

/** Tamed from the home scene's 1.9: that halo reaches into both neighbours. */
const NAV_RING_HALO_SCALE = 1.24;
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

/**
 * Where a nav item sits on screen, so a panel can open out of the button that
 * asked for it rather than out of the middle of nowhere. Derived from the same
 * numbers the bar lays itself out with -- the bar is centred and its items
 * share its width evenly, so no measurement is needed.
 */
export function navItemCentre(
  id: ChildNavItemId,
  windowWidth: number,
  windowHeight: number,
  safeAreaBottom: number,
  isTablet: boolean,
): { x: number; y: number } {
  const index = Math.max(0, CHILD_NAV_ITEMS.findIndex((item) => item.id === id));
  const width = navWidth(windowWidth, isTablet);
  const itemWidth = width / CHILD_NAV_ITEMS.length;

  return {
    x: (windowWidth - width) / 2 + itemWidth * (index + 0.5),
    y: windowHeight - navBottomOffset(safeAreaBottom) - NAV_HEIGHT / 2,
  };
}

interface ChildBottomNavigationProps {
  selected: ChildNavItemId;
  onSelect: (id: ChildNavItemId) => void;
  /** Today's usage, so Screensafe can be the live ring rather than a glyph.
   *  Absent, or with no limit set, the item falls back to its shield. */
  screenTime?: { usageSeconds: number; limitSeconds: number } | null;
  /** Draws the bar into its own middle, where the ring is, so the screen-time
   *  window can open out of the space it leaves. */
  collapsed?: boolean;
  /** A ref per slot, for a tour that wants to point the owl at one. */
  itemRefs?: Partial<Record<ChildNavItemId, RefObject<View | null>>>;
}

export function ChildBottomNavigation({ selected, onSelect, screenTime, collapsed = false, itemRefs }: ChildBottomNavigationProps) {
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

  // The bar is centred on screen, so scaling it about its own origin draws it
  // toward the very point the ring sits at -- no measurement, and the gather
  // lands exactly where the orb rises.
  const collapse = useSharedValue(collapsed ? 1 : 0);
  // the fade is its own beat: tied to the spring, the overshoot of the
  // anticipation put the bar at full opacity in the very frame it began to
  // widen -- filmed as the bar snapping on beside the splash it should rise
  // out of
  const presence = useSharedValue(collapsed ? 0 : 1);

  useEffect(() => {
    const total = motionDuration(CHILD_UI_MOTION.navCollapse, reduceMotion);
    const fade = motionDuration(CHILD_UI_MOTION.navPresence, reduceMotion);
    presence.value = withTiming(collapsed ? 0 : 1, {
      duration: collapsed ? total : fade,
      easing: collapsed ? Easing.in(Easing.quad) : Easing.out(Easing.quad),
    });

    if (total === 0) {
      collapse.value = collapsed ? 1 : 0;
      return;
    }

    // In: a beat wider, then gathered -- the anticipation is what makes it a
    // bounce rather than a shrink, and the two beats together still take the
    // collapse's whole duration, which is what the window's opening waits on.
    // Out: a spring, so it overshoots its full width and settles back.
    collapse.value = collapsed
      ? withSequence(
        withTiming(-CHILD_UI_SCALE.navAnticipation, {
          duration: total * NAV_ANTICIPATION_SHARE,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1, {
          duration: total * (1 - NAV_ANTICIPATION_SHARE),
          easing: Easing.in(Easing.cubic),
        }),
      )
      : withSpring(0, CHILD_UI_SPRING.navExpand);
  }, [collapsed, reduceMotion, collapse, presence]);

  const collapseStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [{ scaleX: 1 - (1 - CHILD_UI_SCALE.navCollapsed) * collapse.value }],
  }));

  // the ring draws nothing without an allowance to draw, so the shield holds
  // the slot whenever screen time is off or not yet known
  const showsRing = !!screenTime && screenTime.limitSeconds > 0;

  return (
    <View
      style={[styles.positioner, { bottom: navBottomOffset(insets.bottom) }]}
      pointerEvents="box-none"
    >
      <Animated.View
        testID="child-bottom-navigation"
        accessibilityRole="tablist"
        pointerEvents={collapsed ? 'none' : 'auto'}
        style={[styles.container, { width: navWidth(windowWidth, isTablet) }, collapseStyle]}
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
          <View key={item.id} ref={itemRefs?.[item.id]} collapsable={false} style={styles.slot}>
          <NavigationItem
            id={item.id}
            icon={item.icon}
            selectedIcon={item.selectedIcon}
            label={t(item.labelKey)}
            selected={item.id === selected}
            glyph={
              item.id === 'screensafe' && showsRing ? (
                <ScreenTimeRing
                  testID="nav-screen-time-ring"
                  usageSeconds={screenTime.usageSeconds}
                  limitSeconds={screenTime.limitSeconds}
                  tint={TEXT_SECONDARY}
                  size={NAV_RING_SIZE}
                  haloScale={NAV_RING_HALO_SCALE}
                  showTrack={false}
                />
              ) : item.id === 'profile' ? (
                <ProfileNavAvatar selected={item.id === selected} />
              ) : undefined
            }
            onSelect={onSelect as (id: string) => void}
          />
          </View>
        ))}
      </View>
      </Animated.View>
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
  slot: {
    flex: 1,
    height: '100%',
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
