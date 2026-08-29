import { ImageSourcePropType } from 'react-native';
import { StoryFilterTag } from '@/types/story';

export type BadgeStatus = 'undiscovered' | 'started' | 'in_progress' | 'earned';

export type BadgeCategory = 'stories' | 'music' | 'calm' | 'kindness' | 'learning' | 'exploration';

export interface ActivityCounters {
  minutesThisWeek: number;
  storiesRead: number;
  bedtimeStoriesRead: number;
  kindStoriesRead: number;
  musicSessions: number;
  calmMoments: number;
  morningSessions: number;
}

export const EMPTY_COUNTERS: ActivityCounters = {
  minutesThisWeek: 0,
  storiesRead: 0,
  bedtimeStoriesRead: 0,
  kindStoriesRead: 0,
  musicSessions: 0,
  calmMoments: 0,
  morningSessions: 0,
};

export interface BadgeRecommendation {
  labelKey: string;
  tag: StoryFilterTag | null;
}

export interface Badge {
  id: string;
  titleKey: string;
  descriptionKey: string;
  artwork: ImageSourcePropType;
  category: BadgeCategory;
  currentProgress: number;
  targetProgress: number;
  status: BadgeStatus;
  recommendation?: BadgeRecommendation;
}

export interface Milestone {
  id: string;
  titleKey: string;
  descriptionKey: string;
  artwork: ImageSourcePropType;
  achieved: boolean;
}

const IN_PROGRESS_THRESHOLD = 0.4;

export function badgeStatus(current: number, target: number): BadgeStatus {
  if (target > 0 && current >= target) return 'earned';
  if (current <= 0) return 'undiscovered';
  if (current / target >= IN_PROGRESS_THRESHOLD) return 'in_progress';
  return 'started';
}

interface BadgeDefinition {
  id: string;
  titleKey: string;
  descriptionKey: string;
  artwork: ImageSourcePropType;
  category: BadgeCategory;
  targetProgress: number;
  progressOf: (counters: ActivityCounters) => number;
  recommendation?: BadgeRecommendation;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'morning-explorer',
    titleKey: 'progress.badges.morningExplorer.title',
    descriptionKey: 'progress.badges.morningExplorer.description',
    artwork: require('@/assets/images/ui-elements/home-sun.webp'),
    category: 'exploration',
    targetProgress: 1,
    progressOf: (counters) => counters.morningSessions,
    recommendation: { labelKey: 'progress.recommendations.together', tag: null },
  },
  {
    id: 'story-adventurer',
    titleKey: 'progress.badges.storyAdventurer.title',
    descriptionKey: 'progress.badges.storyAdventurer.description',
    artwork: require('@/assets/images/emotions/bear-excited.webp'),
    category: 'stories',
    targetProgress: 10,
    progressOf: (counters) => counters.storiesRead,
    recommendation: { labelKey: 'progress.recommendations.discover', tag: null },
  },
  {
    id: 'calm-champion',
    titleKey: 'progress.badges.calmChampion.title',
    descriptionKey: 'progress.badges.calmChampion.description',
    artwork: require('@/assets/images/ui-elements/night-cloud-left.webp'),
    category: 'calm',
    targetProgress: 5,
    progressOf: (counters) => counters.calmMoments,
    recommendation: { labelKey: 'progress.recommendations.calming', tag: 'calming' },
  },
  {
    id: 'kind-heart',
    titleKey: 'progress.badges.kindHeart.title',
    descriptionKey: 'progress.badges.kindHeart.description',
    artwork: require('@/assets/images/emotions/animal-loving.webp'),
    category: 'kindness',
    targetProgress: 5,
    progressOf: (counters) => counters.kindStoriesRead,
    recommendation: { labelKey: 'progress.recommendations.kindness', tag: 'friendship' },
  },
];

export function buildBadges(counters: ActivityCounters): Badge[] {
  return BADGE_DEFINITIONS.map((definition) => {
    const currentProgress = Math.min(definition.progressOf(counters), definition.targetProgress);
    return {
      id: definition.id,
      titleKey: definition.titleKey,
      descriptionKey: definition.descriptionKey,
      artwork: definition.artwork,
      category: definition.category,
      currentProgress,
      targetProgress: definition.targetProgress,
      status: badgeStatus(currentProgress, definition.targetProgress),
      recommendation: definition.recommendation,
    };
  });
}

interface MilestoneDefinition {
  id: string;
  titleKey: string;
  descriptionKey: string;
  artwork: ImageSourcePropType;
  achievedBy: (counters: ActivityCounters) => boolean;
}

const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    id: 'first-five-stories',
    titleKey: 'progress.milestones.firstFiveStories.title',
    descriptionKey: 'progress.milestones.firstFiveStories.description',
    artwork: require('@/assets/images/emotions/bear-happy.webp'),
    achievedBy: (counters) => counters.storiesRead >= 5,
  },
  {
    id: 'bedtime-listener',
    titleKey: 'progress.milestones.bedtimeListener.title',
    descriptionKey: 'progress.milestones.bedtimeListener.description',
    artwork: require('@/assets/images/ui-elements/home-moon.webp'),
    achievedBy: (counters) => counters.bedtimeStoriesRead >= 3,
  },
  {
    id: 'kind-moments',
    titleKey: 'progress.milestones.kindMoments.title',
    descriptionKey: 'progress.milestones.kindMoments.description',
    artwork: require('@/assets/images/emotions/animal-loving.webp'),
    achievedBy: (counters) => counters.kindStoriesRead >= 1,
  },
];

export function buildMilestones(counters: ActivityCounters): Milestone[] {
  return MILESTONE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    titleKey: definition.titleKey,
    descriptionKey: definition.descriptionKey,
    artwork: definition.artwork,
    achieved: definition.achievedBy(counters),
  }));
}

export const RING_FULL_MINUTES = 120;

export function ringFraction(minutesThisWeek: number): number {
  if (minutesThisWeek <= 0) return 0;
  return Math.min(1, minutesThisWeek / RING_FULL_MINUTES);
}
