export interface MotionBeat {
  readonly duration: number;
  readonly reducedDuration: number;
}

export const STORY_GARDEN_MOTION = {
  shelfSnapSettle: { duration: 260, reducedDuration: 150 },
  touchAcknowledgement: { duration: 120, reducedDuration: 120 },
  bookLift: { duration: 330, reducedDuration: 0 },
  focusSettle: { duration: 300, reducedDuration: 200 },
  coverExpansion: { duration: 350, reducedDuration: 250 },
  preOpen: { duration: 250, reducedDuration: 0 },
  rotationBridgeFallback: { duration: 400, reducedDuration: 300 },
  landscapeSettle: { duration: 400, reducedDuration: 300 },
  pageTurn: { duration: 480, reducedDuration: 250 },
  controlsReveal: { duration: 200, reducedDuration: 200 },
  controlsHide: { duration: 300, reducedDuration: 300 },
  closingBreath: { duration: 800, reducedDuration: 400 },
  bookClose: { duration: 700, reducedDuration: 300 },
} as const satisfies Record<string, MotionBeat>;

export const OPEN_RITUAL_DURATION =
  STORY_GARDEN_MOTION.coverExpansion.duration
  + STORY_GARDEN_MOTION.preOpen.duration
  + STORY_GARDEN_MOTION.landscapeSettle.duration;

export const STORY_GARDEN_DELAYS = {
  controlsAutoHide: 4500,
  rotationPrompt: 2000,
  narrationStart: 400,
  hotspotObservation: 1200,
} as const;

export const STORY_GARDEN_SCALE = {
  shelfCoverWidthRatio: 0.52,
  focusedCoverWidthRatio: 0.68,
  coverAspectRatio: 3 / 4,
  shelfCentredBook: 1.1,
  shelfNeighbourBook: 1.0,
  shelfNeighbourOpacity: 0.82,
  touchCompression: 0.98,
  environmentDim: 0.15,
  preOpenAngleDegrees: 25,
} as const;

export const MIN_TOUCH_TARGET = 56;

export function motionDuration(beat: MotionBeat, reduceMotion: boolean): number {
  return reduceMotion ? beat.reducedDuration : beat.duration;
}
