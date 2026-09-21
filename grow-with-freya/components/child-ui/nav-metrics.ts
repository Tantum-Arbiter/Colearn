import {
  NAV_BOTTOM_MARGIN,
  NAV_HEIGHT,
  NAV_HOME_INDICATOR_OVERLAP,
  NAV_MAX_WIDTH,
  SPACE_4,
  contentMargin,
} from './tokens';

export type ChildNavItemId = 'home' | 'progress' | 'screensafe' | 'search' | 'profile';

export const CHILD_NAV_ITEM_ORDER: readonly ChildNavItemId[] = ['home', 'progress', 'screensafe', 'search', 'profile'];

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
  const index = Math.max(0, CHILD_NAV_ITEM_ORDER.indexOf(id));
  const width = navWidth(windowWidth, isTablet);
  const itemWidth = width / CHILD_NAV_ITEM_ORDER.length;

  return {
    x: (windowWidth - width) / 2 + itemWidth * (index + 0.5),
    y: windowHeight - navBottomOffset(safeAreaBottom) - NAV_HEIGHT / 2,
  };
}
