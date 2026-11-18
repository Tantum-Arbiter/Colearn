import { ISLAND_ART, type IslandArt } from '@/constants/island-art';
import { ISLAND_ART_PHONE } from '@/constants/island-art-phone';
import { GULL_COURSES, GULL_COURSES_PHONE, type GullCourse } from '@/constants/island-life';
import {
  ISLAND_TRAIL,
  ISLAND_TRAIL_PHONE,
  ISLAND_TRAIL_VIA,
  ISLAND_TRAIL_VIA_PHONE,
  TRAIL_DASH,
  TRAIL_DASH_PHONE,
  type DashSpacing,
  type TrailPoint,
} from '@/constants/island-trail';

export interface IslandMap {
  readonly art: IslandArt;
  readonly trail: readonly TrailPoint[];
  readonly via: readonly (readonly TrailPoint[])[];
  readonly dash: DashSpacing;
  readonly trailScale: number;
  readonly gulls: readonly GullCourse[];
}

export const TABLET_ISLAND: IslandMap = {
  art: ISLAND_ART,
  trail: ISLAND_TRAIL,
  via: ISLAND_TRAIL_VIA,
  dash: TRAIL_DASH,
  trailScale: 1,
  gulls: GULL_COURSES,
};

export const PHONE_ISLAND: IslandMap = {
  art: ISLAND_ART_PHONE,
  trail: ISLAND_TRAIL_PHONE,
  via: ISLAND_TRAIL_VIA_PHONE,
  dash: TRAIL_DASH_PHONE,
  trailScale: 1.2,
  gulls: GULL_COURSES_PHONE,
};

export function islandMapFor(isTablet: boolean): IslandMap {
  return isTablet ? TABLET_ISLAND : PHONE_ISLAND;
}
