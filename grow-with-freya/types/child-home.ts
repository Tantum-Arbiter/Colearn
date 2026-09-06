import type { ImageSourcePropType } from 'react-native';

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
  title: string;
  current: number;
  required: number;
  unit?: NextAchievementUnit;
  artwork?: ImageSourcePropType;
}

export interface ChildHomeData {
  firstName: string;
  currentStory?: ChildHomeStory;
  storiesCompleted: number;
  readingMinutes: number;
  readingStreakDays: number;
  screenTimeSafety?: number;
  newestAchievement?: ChildHomeAchievement;
  nextAchievement?: ChildHomeNextAchievement;
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
