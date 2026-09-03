import { ImageSourcePropType } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { StoryFilterTag } from '@/types/story';

export type BadgeStatus = 'undiscovered' | 'started' | 'in_progress' | 'earned';

export type BadgeCategory = 'stories' | 'music' | 'calm' | 'kindness' | 'exploration';

export interface ActivityCounters {
  minutesThisWeek: number;
  storiesRead: number;
  bedtimeStoriesRead: number;
  adventureStoriesRead: number;
  kindStoriesRead: number;
  categoriesExplored: number;
  favourites: number;
  storySessions: number;
  musicSessions: number;
  calmMoments: number;
  morningSessions: number;
  eveningSessions: number;
  storySessionsMonth: number;
  musicSessionsMonth: number;
  calmMomentsMonth: number;
  morningSessionsMonth: number;
}

export const EMPTY_COUNTERS: ActivityCounters = {
  minutesThisWeek: 0,
  storiesRead: 0,
  bedtimeStoriesRead: 0,
  adventureStoriesRead: 0,
  kindStoriesRead: 0,
  categoriesExplored: 0,
  favourites: 0,
  storySessions: 0,
  musicSessions: 0,
  calmMoments: 0,
  morningSessions: 0,
  eveningSessions: 0,
  storySessionsMonth: 0,
  musicSessionsMonth: 0,
  calmMomentsMonth: 0,
  morningSessionsMonth: 0,
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

export type ChallengePeriod = 'weekly' | 'monthly';

export interface Challenge extends Badge {
  period: ChallengePeriod;
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

const ART = {
  sun: require('@/assets/images/ui-elements/home-sun.webp'),
  sunLaughing: require('@/assets/images/ui-elements/home-sun-laughing.webp'),
  moon: require('@/assets/images/ui-elements/home-moon.webp'),
  moonLaughing: require('@/assets/images/ui-elements/home-moon-laughing.webp'),
  cloudLeft: require('@/assets/images/ui-elements/night-cloud-left.webp'),
  cloudRight: require('@/assets/images/ui-elements/night-cloud-right.webp'),
  bearHappy: require('@/assets/images/emotions/bear-happy.webp'),
  bearExcited: require('@/assets/images/emotions/bear-excited.webp'),
  bearProud: require('@/assets/images/emotions/bear-proud.webp'),
  bearSurprised: require('@/assets/images/emotions/bear-surprised.webp'),
  animalLoving: require('@/assets/images/emotions/animal-loving.webp'),
  animalHappy: require('@/assets/images/emotions/animal-happy.webp'),
  animalExcited: require('@/assets/images/emotions/animal-excited.webp'),
  animalProud: require('@/assets/images/emotions/animal-proud.webp'),
  animalSurprised: require('@/assets/images/emotions/animal-surprised.webp'),
} as const;

const RECOMMEND = {
  together: { labelKey: 'progress.recommendations.together', tag: null },
  discover: { labelKey: 'progress.recommendations.discover', tag: null },
  calming: { labelKey: 'progress.recommendations.calming', tag: 'calming' },
  kindness: { labelKey: 'progress.recommendations.kindness', tag: 'friendship' },
  bedtime: { labelKey: 'progress.recommendations.bedtime', tag: 'bedtime' },
  adventure: { labelKey: 'progress.recommendations.adventure', tag: 'adventure' },
} as const satisfies Record<string, BadgeRecommendation>;

interface BadgeDefinition {
  id: string;
  key: string;
  artwork: ImageSourcePropType;
  category: BadgeCategory;
  targetProgress: number;
  progressOf: (counters: ActivityCounters) => number;
  recommendation?: BadgeRecommendation;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first-story', key: 'firstStory', artwork: ART.bearHappy, category: 'stories', targetProgress: 1, progressOf: (c) => c.storiesRead, recommendation: RECOMMEND.discover },
  { id: 'story-adventurer', key: 'storyAdventurer', artwork: ART.bearExcited, category: 'stories', targetProgress: 10, progressOf: (c) => c.storiesRead, recommendation: RECOMMEND.discover },
  { id: 'reading-together', key: 'readingTogether', artwork: ART.bearProud, category: 'stories', targetProgress: 3, progressOf: (c) => c.storySessions, recommendation: RECOMMEND.together },
  { id: 'new-worlds', key: 'newWorlds', artwork: ART.bearSurprised, category: 'stories', targetProgress: 3, progressOf: (c) => c.categoriesExplored, recommendation: RECOMMEND.discover },
  { id: 'favourite-finder', key: 'favouriteFinder', artwork: ART.animalHappy, category: 'stories', targetProgress: 1, progressOf: (c) => c.favourites, recommendation: RECOMMEND.discover },
  { id: 'first-notes', key: 'firstNotes', artwork: ART.animalExcited, category: 'music', targetProgress: 1, progressOf: (c) => c.musicSessions, recommendation: RECOMMEND.together },
  { id: 'music-explorer', key: 'musicExplorer', artwork: ART.sunLaughing, category: 'music', targetProgress: 5, progressOf: (c) => c.musicSessionsMonth, recommendation: RECOMMEND.together },
  { id: 'calm-moment', key: 'calmMoment', artwork: ART.cloudRight, category: 'calm', targetProgress: 1, progressOf: (c) => c.calmMoments, recommendation: RECOMMEND.calming },
  { id: 'calm-champion', key: 'calmChampion', artwork: ART.cloudLeft, category: 'calm', targetProgress: 5, progressOf: (c) => c.calmMomentsMonth, recommendation: RECOMMEND.calming },
  { id: 'bedtime-listener', key: 'bedtimeListener', artwork: ART.moon, category: 'calm', targetProgress: 3, progressOf: (c) => c.bedtimeStoriesRead, recommendation: RECOMMEND.bedtime },
  { id: 'gentle-evening', key: 'gentleEvening', artwork: ART.moonLaughing, category: 'calm', targetProgress: 3, progressOf: (c) => c.eveningSessions, recommendation: RECOMMEND.bedtime },
  { id: 'kind-moments', key: 'kindMoments', artwork: ART.animalLoving, category: 'kindness', targetProgress: 1, progressOf: (c) => c.kindStoriesRead, recommendation: RECOMMEND.kindness },
  { id: 'kind-heart', key: 'kindHeart', artwork: ART.animalProud, category: 'kindness', targetProgress: 5, progressOf: (c) => c.kindStoriesRead, recommendation: RECOMMEND.kindness },
  { id: 'morning-explorer', key: 'morningExplorer', artwork: ART.sun, category: 'exploration', targetProgress: 1, progressOf: (c) => c.morningSessions, recommendation: RECOMMEND.together },
  { id: 'curious-mind', key: 'curiousMind', artwork: ART.animalSurprised, category: 'exploration', targetProgress: 5, progressOf: (c) => c.categoriesExplored, recommendation: RECOMMEND.discover },
  { id: 'adventure-explorer', key: 'adventureExplorer', artwork: ART.bearExcited, category: 'exploration', targetProgress: 3, progressOf: (c) => c.adventureStoriesRead, recommendation: RECOMMEND.adventure },
];

function toBadge(definition: BadgeDefinition, counters: ActivityCounters, keyPrefix: string): Badge {
  const currentProgress = Math.min(definition.progressOf(counters), definition.targetProgress);
  return {
    id: definition.id,
    titleKey: `${keyPrefix}.${definition.key}.title`,
    descriptionKey: `${keyPrefix}.${definition.key}.description`,
    artwork: definition.artwork,
    category: definition.category,
    currentProgress,
    targetProgress: definition.targetProgress,
    status: badgeStatus(currentProgress, definition.targetProgress),
    recommendation: definition.recommendation,
  };
}

export function buildBadges(counters: ActivityCounters): Badge[] {
  return BADGE_DEFINITIONS.map((definition) => toBadge(definition, counters, 'progress.badges'));
}

const STATUS_ORDER: Record<BadgeStatus, number> = {
  in_progress: 0,
  started: 1,
  undiscovered: 2,
  earned: 3,
};

export function sortBadgesForDiscovery(badges: Badge[]): Badge[] {
  return [...badges].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export type BadgeFilter = 'all' | BadgeCategory;

export interface BadgeCategoryInfo {
  id: BadgeFilter;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  labelKey: string;
}

export const BADGE_CATEGORIES: readonly BadgeCategoryInfo[] = [
  { id: 'all', icon: 'sparkles', color: '#E8B84B', labelKey: 'progress.categories.all' },
  { id: 'stories', icon: 'book', color: '#8E72F3', labelKey: 'progress.categories.stories' },
  { id: 'music', icon: 'musical-notes', color: '#7EC8E3', labelKey: 'progress.categories.music' },
  { id: 'calm', icon: 'cloud', color: '#B7A6F7', labelKey: 'progress.categories.calm' },
  { id: 'kindness', icon: 'heart', color: '#F4A6B8', labelKey: 'progress.categories.kindness' },
  { id: 'exploration', icon: 'compass', color: '#6FCF7F', labelKey: 'progress.categories.exploration' },
];

export function filterBadges(badges: Badge[], filter: BadgeFilter): Badge[] {
  if (filter === 'all') return badges;
  return badges.filter((badge) => badge.category === filter);
}

export interface BadgeSummary {
  earned: number;
  total: number;
}

export function summariseBadges(badges: Badge[]): BadgeSummary {
  return {
    earned: badges.filter((badge) => badge.status === 'earned').length,
    total: badges.length,
  };
}

const WEEKLY_CHALLENGES: BadgeDefinition[] = [
  { id: 'week-three-story-times', key: 'threeStoryTimes', artwork: ART.bearHappy, category: 'stories', targetProgress: 3, progressOf: (c) => c.storySessions, recommendation: RECOMMEND.together },
  { id: 'week-calm-moment', key: 'calmMoment', artwork: ART.cloudRight, category: 'calm', targetProgress: 1, progressOf: (c) => c.calmMoments, recommendation: RECOMMEND.calming },
  { id: 'week-make-music', key: 'makeMusic', artwork: ART.animalExcited, category: 'music', targetProgress: 2, progressOf: (c) => c.musicSessions, recommendation: RECOMMEND.together },
  { id: 'week-morning-story', key: 'morningStory', artwork: ART.sun, category: 'exploration', targetProgress: 1, progressOf: (c) => c.morningSessions, recommendation: RECOMMEND.together },
  { id: 'week-bedtime-story', key: 'bedtimeStory', artwork: ART.moon, category: 'calm', targetProgress: 2, progressOf: (c) => c.eveningSessions, recommendation: RECOMMEND.bedtime },
];

const MONTHLY_CHALLENGES: BadgeDefinition[] = [
  { id: 'month-ten-story-times', key: 'tenStoryTimes', artwork: ART.bearProud, category: 'stories', targetProgress: 10, progressOf: (c) => c.storySessionsMonth, recommendation: RECOMMEND.discover },
  { id: 'month-music-month', key: 'musicMonth', artwork: ART.sunLaughing, category: 'music', targetProgress: 5, progressOf: (c) => c.musicSessionsMonth, recommendation: RECOMMEND.together },
  { id: 'month-calm-collector', key: 'calmCollector', artwork: ART.cloudLeft, category: 'calm', targetProgress: 4, progressOf: (c) => c.calmMomentsMonth, recommendation: RECOMMEND.calming },
  { id: 'month-morning-mornings', key: 'brightMornings', artwork: ART.sun, category: 'exploration', targetProgress: 3, progressOf: (c) => c.morningSessionsMonth, recommendation: RECOMMEND.together },
];

function isoWeekSeed(date: Date): number {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(utc.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((utc.getTime() - yearStart) / 86400000 + 1) / 7);
  return utc.getUTCFullYear() * 100 + week;
}

function monthSeed(date: Date): number {
  return date.getFullYear() * 100 + date.getMonth() + 1;
}

function pickBySeed<T>(pool: readonly T[], seed: number): T {
  const scrambled = Math.abs(Math.sin(seed) * 10000);
  return pool[Math.floor(scrambled) % pool.length];
}

export function buildChallenges(counters: ActivityCounters, now: Date = new Date()): Challenge[] {
  const weekly = pickBySeed(WEEKLY_CHALLENGES, isoWeekSeed(now));
  const monthly = pickBySeed(MONTHLY_CHALLENGES, monthSeed(now));
  return [
    { ...toBadge(weekly, counters, 'progress.challenges'), period: 'weekly' },
    { ...toBadge(monthly, counters, 'progress.challenges'), period: 'monthly' },
  ];
}

interface MilestoneDefinition {
  id: string;
  key: string;
  artwork: ImageSourcePropType;
  achievedBy: (counters: ActivityCounters) => boolean;
}

const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  { id: 'first-five-stories', key: 'firstFiveStories', artwork: ART.bearHappy, achievedBy: (c) => c.storiesRead >= 5 },
  { id: 'bedtime-listener', key: 'bedtimeListener', artwork: ART.moon, achievedBy: (c) => c.bedtimeStoriesRead >= 3 },
  { id: 'kind-moments', key: 'kindMoments', artwork: ART.animalLoving, achievedBy: (c) => c.kindStoriesRead >= 1 },
];

export function buildMilestones(counters: ActivityCounters): Milestone[] {
  return MILESTONE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    titleKey: `progress.milestones.${definition.key}.title`,
    descriptionKey: `progress.milestones.${definition.key}.description`,
    artwork: definition.artwork,
    achieved: definition.achievedBy(counters),
  }));
}

export const RING_FULL_MINUTES = 120;

export function ringFraction(minutesThisWeek: number): number {
  if (minutesThisWeek <= 0) return 0;
  return Math.min(1, minutesThisWeek / RING_FULL_MINUTES);
}
