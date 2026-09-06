export const RADIUS_SMALL = 14;
export const RADIUS_CONTROL = 22;
export const RADIUS_CARD = 22;
export const RADIUS_LARGE = 26;
export const RADIUS_NAV = 30;
export const RADIUS_NAV_ITEM = 22;

export const SPACE_1 = 4;
export const SPACE_2 = 8;
export const SPACE_3 = 12;
export const SPACE_4 = 16;
export const SPACE_5 = 24;
export const SPACE_6 = 32;

export const CONTENT_MARGIN_PHONE = 22;
export const CONTENT_MARGIN_TABLET = 32;

export function contentMargin(isTablet: boolean): number {
  return isTablet ? CONTENT_MARGIN_TABLET : CONTENT_MARGIN_PHONE;
}

export interface TypeRole {
  readonly phone: number;
  readonly tablet: number;
  readonly weight: '600' | '700' | '800';
}

export const TYPE_ROLES = {
  pageTitle: { phone: 34, tablet: 41, weight: '800' },
  featuredTitle: { phone: 29, tablet: 34, weight: '700' },
  sectionHeading: { phone: 23, tablet: 26, weight: '700' },
  cardTitle: { phone: 15, tablet: 17, weight: '700' },
  filterLabel: { phone: 15, tablet: 16, weight: '600' },
  navLabel: { phone: 13, tablet: 14, weight: '600' },
} as const satisfies Record<string, TypeRole>;

export function typeSize(role: keyof typeof TYPE_ROLES, isTablet: boolean): number {
  const spec = TYPE_ROLES[role];
  return isTablet ? spec.tablet : spec.phone;
}

export const CIRCLE_BUTTON_DIAMETER_PHONE = 56;
export const CIRCLE_BUTTON_DIAMETER_TABLET = 62;

export const FILTER_PILL_HEIGHT = 46;
export const FILTER_PILL_PADDING_H = 22;
export const FILTER_TOGGLE_SIZE = 46;

export const FEATURED_ASPECT_RATIO = 1.6;
/** A tablet's panel spans the whole shelf, so it runs wider than tall than a phone's does. */
export const FEATURED_ASPECT_RATIO_TABLET = 1.9;
export const COVER_ASPECT_RATIO = 1.6;
export const COVER_GRID_GAP = 12;

export const NAV_HEIGHT = 84;
export const NAV_BOTTOM_MARGIN = 10;
export const NAV_HOME_INDICATOR_OVERLAP = 8;
export const NAV_MAX_WIDTH = 520;

export const PLAY_DIAMETER_FEATURED = 68;
export const PLAY_DIAMETER_CARD = 44;

export const MIN_TOUCH_TARGET = 44;
