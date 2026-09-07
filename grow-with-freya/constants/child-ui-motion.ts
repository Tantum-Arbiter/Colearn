/** A duration pair: how long a movement takes, and how long when the viewer
 *  has asked for reduced motion. A reduced duration of 0 means "cut, do not move". */
export interface MotionBeat {
  readonly duration: number;
  readonly reducedDuration: number;
}

export const CHILD_UI_MOTION = {
  cardTap: { duration: 150, reducedDuration: 0 },
  filterSelect: { duration: 180, reducedDuration: 0 },
  readPress: { duration: 150, reducedDuration: 0 },
  navSlide: { duration: 220, reducedDuration: 0 },
  viewSwap: { duration: 300, reducedDuration: 0 },
  /** The bar drawing into the middle before the screen-time window opens out
   *  of the ring it leaves behind, and back out of the splash on the way home. */
  navCollapse: { duration: 260, reducedDuration: 0 },
  /** The bar's own fade as it rises out of the splash, or sinks into the ring. */
  navPresence: { duration: 220, reducedDuration: 0 },
} as const satisfies Record<string, MotionBeat>;

/**
 * The bar's bounce. It draws itself a little wider before it gathers -- the
 * anticipation that makes the gather read as a movement rather than a cut --
 * and springs back out past its full width on the way home, which is what
 * "bounds out" of the splash actually looks like.
 */
export const CHILD_UI_SPRING = {
  // slowed to rise over the glance's splash (460ms) rather than in a frame
  navExpand: { damping: 9, stiffness: 65, mass: 0.8 },
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

export function motionDuration(beat: MotionBeat, reduceMotion: boolean): number {
  return reduceMotion ? beat.reducedDuration : beat.duration;
}

/**
 * How long an underdamped spring takes to first reach its target -- half a
 * damped period. The nav bar's rise has to be measured against the splash
 * it rises out of, and this is the number to measure.
 */
export function springRiseMs(spring: { damping: number; stiffness: number; mass: number }): number {
  const natural = Math.sqrt(spring.stiffness / spring.mass);
  const ratio = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
  const damped = natural * Math.sqrt(Math.max(0, 1 - ratio * ratio));
  return damped > 0 ? Math.round((Math.PI / damped) * 1000) : Number.POSITIVE_INFINITY;
}
