import type { MotionBeat } from '@/constants/story-garden-motion';

export const CHILD_UI_MOTION = {
  cardTap: { duration: 150, reducedDuration: 0 },
  filterSelect: { duration: 180, reducedDuration: 0 },
  readPress: { duration: 150, reducedDuration: 0 },
  navSlide: { duration: 220, reducedDuration: 0 },
  viewSwap: { duration: 300, reducedDuration: 0 },
} as const satisfies Record<string, MotionBeat>;

export const CHILD_UI_SCALE = {
  cardPressed: 0.97,
  readPressed: 0.94,
  filterIconShift: 2,
} as const;

export { motionDuration } from '@/constants/story-garden-motion';
