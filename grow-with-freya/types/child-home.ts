import type { ImageSourcePropType } from 'react-native';
import type { PlanStepState } from '@/constants/learning-plan';
import type { PlanSkill, PlanStepKind } from '@/types/learning-plan';

export interface ChildHomeStory {
  id: string;
  title: string;
  currentPage: number;
  totalPages: number;
  coverImage?: ImageSourcePropType;
}

export interface ChildHomeAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  artwork?: ImageSourcePropType;
}

export type NextAchievementUnit = 'stories' | 'storyTimes' | 'calmMoments' | 'tunes' | 'adventures';

export interface ChildHomeNextAchievement {
  id: string;
  title: string;
  current: number;
  required: number;
  unit?: NextAchievementUnit;
  artwork?: ImageSourcePropType;
}

export interface ChildHomeJourneyStep {
  id: string;
  day: number;
  of: number;
  kind: PlanStepKind;
  state: PlanStepState;
  domainKey: string;
  skill: PlanSkill;
}

export interface ChildHomeAchievementTally {
  unlocked: number;
  remaining: number;
}

export interface ChildHomeData {
  firstName: string;
  currentStory?: ChildHomeStory;
  storiesCompleted: number;
  readingMinutes: number;
  /** Reading minutes over the last 7 days -- a livelier figure than the
   *  lifetime total for a weekly glance on the home scene. */
  weeklyReadingMinutes: number;
  readingStreakDays: number;
  bestStreakDays: number;
  screenTimeSafety?: number;
  newestAchievement?: ChildHomeAchievement;
  nextAchievement?: ChildHomeNextAchievement;
  achievementTally?: ChildHomeAchievementTally;
}

export type ReturnVisitState =
  | 'normal'
  | 'firstToday'
  | 'newAchievement'
  | 'storyCompleted'
  | 'streak'
  | 'longAbsence';

export interface ReturnVisitContext {
  now: Date;
  previousVisitAt: string | null;
  hasNewAchievement: boolean;
  storyCompletedSinceLastVisit: boolean;
}

export interface WelcomeCopy {
  state: ReturnVisitState;
  titleKey: string;
  subtitleKey: string;
  params: { name: string; count: number; achievement: string };
}
