import type { MotionBeat } from '@/constants/story-garden-motion';

export const CHILD_UI_MOTION = {
  cardTap: { duration: 150, reducedDuration: 0 },
  filterSelect: { duration: 180, reducedDuration: 0 },
  readPress: { duration: 150, reducedDuration: 0 },
  navSlide: { duration: 220, reducedDuration: 0 },
  viewSwap: { duration: 300, reducedDuration: 0 },
  /** The bar drawing into the middle before the screen-time window opens out
   *  of the ring it leaves behind, and back out of the splash on the way home. */
  navCollapse: { duration: 260, reducedDuration: 0 },
} as const satisfies Record<string, MotionBeat>;

/**
 * The bar's bounce. It draws itself a little wider before it gathers -- the
 * anticipation that makes the gather read as a movement rather than a cut --
 * and springs back out past its full width on the way home, which is what
 * "bounds out" of the splash actually looks like.
 */
export const CHILD_UI_SPRING = {
  navExpand: { damping: 11, stiffness: 180, mass: 0.6 },
} as const;

/** How much of the collapse is spent drawing wider before gathering in. */
export const NAV_ANTICIPATION_SHARE = 0.3;

export const CHILD_UI_SCALE = {
  /** What the bar narrows to: about the width of the ring at its middle, so
   *  it reads as gathering around the orb rather than vanishing. */
  navCollapsed: 0.12,
  /** How far past full width the bar draws before it gathers. */
  navAnticipation: 0.07,
  cardPressed: 0.97,
  readPressed: 0.94,
  filterIconShift: 2,
} as const;

export { motionDuration } from '@/constants/story-garden-motion';
