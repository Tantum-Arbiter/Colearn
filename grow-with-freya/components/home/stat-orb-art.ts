import type { StatOrbKind } from '@/constants/stat-orbs';

export const STAT_ORB_ART = {
  streak: require('../../assets/images/home-stats/orb-streak.webp'),
  continue: require('../../assets/images/home-stats/orb-continue.webp'),
  badges: require('../../assets/images/home-stats/orb-badges.webp'),
} as const satisfies Record<StatOrbKind, number>;

export const STAT_ORB_FRONT: number = require('../../assets/images/home-stats/orb-continue-front.webp');
