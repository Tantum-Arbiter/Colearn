import type { ImageSourcePropType } from 'react-native';
import type { LocalizedText, Story } from '@/types/story';
import { ART, RECOMMEND, type BadgeArtKey } from './badge-art';
import { badgeStatus, type ActivityCounters, type Badge, type BadgeCategory, type BadgeRecommendation } from './progress-model';

export type AchievementRule =
  | { kind: 'counter'; counter: keyof ActivityCounters; target: number }
  | { kind: 'finishedCount'; target: number }
  | { kind: 'finishedInCategory'; category: string; target: number }
  | { kind: 'finishedWithTag'; tags: string[]; target: number }
  | { kind: 'finishedDistinct'; by: 'tag' | 'category'; target: number }
  | { kind: 'challenges'; interaction: 'music' | 'jigsaw' | 'reading'; target: number }
  | { kind: 'storyAward' };

export type AchievementCopy =
  | { titleKey: string; descriptionKey: string }
  | { title: LocalizedText; earned: LocalizedText; next: LocalizedText };

export interface AchievementDefinition {
  id: string;
  version: number;
  status: 'active' | 'retired';
  family: 'sticker' | 'theme' | 'variety' | 'set' | 'doing' | 'together' | 'rhythm' | 'seasonal';
  category: BadgeCategory;
  rule: AchievementRule;
  points?: number;
  art: string;
  copy: AchievementCopy;
  recommendation?: BadgeRecommendation;
  minAppVersion?: string;
}

export interface AchievementFacts {
  counters: ActivityCounters;
  finishedStoryIds: string[];
  challengeCounts: Record<string, number>;
  earnedIds: string[];
}

const KNOWN_RULES = new Set<AchievementRule['kind']>([
  'counter', 'finishedCount', 'finishedInCategory', 'finishedWithTag', 'finishedDistinct', 'challenges', 'storyAward',
]);

function bundled(
  id: string, key: string, art: BadgeArtKey, category: BadgeCategory, counter: keyof ActivityCounters, target: number,
  recommendation: BadgeRecommendation,
): AchievementDefinition {
  return {
    id,
    version: 1,
    status: 'active',
    family: 'doing',
    category,
    rule: { kind: 'counter', counter, target },
    art,
    copy: { titleKey: `progress.badges.${key}.title`, descriptionKey: `progress.badges.${key}.description` },
    recommendation,
  };
}

export const BUNDLED_ACHIEVEMENTS: AchievementDefinition[] = [
  bundled('first-story', 'firstStory', 'bearHappy', 'stories', 'storiesRead', 1, RECOMMEND.discover),
  bundled('story-adventurer', 'storyAdventurer', 'bearExcited', 'stories', 'storiesRead', 10, RECOMMEND.discover),
  bundled('reading-together', 'readingTogether', 'bearProud', 'stories', 'storySessions', 3, RECOMMEND.together),
  bundled('new-worlds', 'newWorlds', 'bearSurprised', 'stories', 'categoriesExplored', 3, RECOMMEND.discover),
  bundled('favourite-finder', 'favouriteFinder', 'animalHappy', 'stories', 'favourites', 1, RECOMMEND.discover),
  bundled('first-notes', 'firstNotes', 'animalExcited', 'music', 'musicSessions', 1, RECOMMEND.together),
  bundled('music-explorer', 'musicExplorer', 'sunLaughing', 'music', 'musicSessionsMonth', 5, RECOMMEND.together),
  bundled('calm-moment', 'calmMoment', 'cloudRight', 'calm', 'calmMoments', 1, RECOMMEND.calming),
  bundled('calm-champion', 'calmChampion', 'cloudLeft', 'calm', 'calmMomentsMonth', 5, RECOMMEND.calming),
  bundled('bedtime-listener', 'bedtimeListener', 'moon', 'calm', 'bedtimeStoriesRead', 3, RECOMMEND.bedtime),
  bundled('gentle-evening', 'gentleEvening', 'moonLaughing', 'calm', 'eveningSessions', 3, RECOMMEND.bedtime),
  bundled('kind-moments', 'kindMoments', 'animalLoving', 'kindness', 'kindStoriesRead', 1, RECOMMEND.kindness),
  bundled('kind-heart', 'kindHeart', 'animalProud', 'kindness', 'kindStoriesRead', 5, RECOMMEND.kindness),
  bundled('morning-explorer', 'morningExplorer', 'sun', 'exploration', 'morningSessions', 1, RECOMMEND.together),
  bundled('curious-mind', 'curiousMind', 'animalSurprised', 'exploration', 'categoriesExplored', 5, RECOMMEND.discover),
  bundled('adventure-explorer', 'adventureExplorer', 'bearExcited', 'exploration', 'adventureStoriesRead', 3, RECOMMEND.adventure),
];

function versionParts(version: string): number[] {
  return version.split(/[.+-]/).slice(0, 3).map((part) => parseInt(part, 10) || 0);
}

function atLeast(appVersion: string, required: string): boolean {
  const have = versionParts(appVersion);
  const need = versionParts(required);
  for (let i = 0; i < 3; i++) {
    if ((have[i] ?? 0) !== (need[i] ?? 0)) return (have[i] ?? 0) > (need[i] ?? 0);
  }
  return true;
}

function understood(definition: AchievementDefinition, appVersion: string): boolean {
  return KNOWN_RULES.has(definition.rule?.kind) && (!definition.minAppVersion || atLeast(appVersion, definition.minAppVersion));
}

function progressOf(rule: AchievementRule, facts: AchievementFacts, finished: Story[]): { current: number; target: number } {
  switch (rule.kind) {
    case 'counter':
      return { current: facts.counters[rule.counter] ?? 0, target: rule.target };
    case 'finishedCount':
      return { current: facts.finishedStoryIds.length, target: rule.target };
    case 'finishedInCategory':
      return { current: finished.filter((s) => s.category === rule.category).length, target: rule.target };
    case 'finishedWithTag':
      return { current: finished.filter((s) => s.tags?.some((tag) => rule.tags.includes(tag))).length, target: rule.target };
    case 'finishedDistinct': {
      const values = rule.by === 'category' ? finished.map((s) => s.category) : finished.flatMap((s) => s.tags ?? []);
      return { current: new Set(values).size, target: rule.target };
    }
    case 'challenges':
      return { current: facts.challengeCounts[rule.interaction] ?? 0, target: rule.target };
    case 'storyAward':
      return { current: 0, target: 1 };
  }
}

function localize(text: LocalizedText, language: string): string {
  return (text as unknown as Record<string, string | undefined>)[language] || text.en;
}

function artworkOf(art: string): ImageSourcePropType {
  if (art in ART) return ART[art as BadgeArtKey];
  if (/^(https?|file):\/\//.test(art)) return { uri: art };
  return ART.bearHappy;
}

export function evaluateAchievements(
  definitions: AchievementDefinition[],
  facts: AchievementFacts,
  catalogue: Story[],
  options: { appVersion: string; language: string },
): Badge[] {
  const finished = catalogue.filter((story) => facts.finishedStoryIds.includes(story.id));
  const badges: Badge[] = [];
  for (const definition of definitions) {
    if (!understood(definition, options.appVersion)) continue;
    const alreadyEarned = facts.earnedIds.includes(definition.id);
    if (definition.status === 'retired' && !alreadyEarned) continue;

    const { current, target } = progressOf(definition.rule, facts, finished);
    const currentProgress = alreadyEarned ? target : Math.min(current, target);
    const status = badgeStatus(currentProgress, target);
    const badge: Badge = {
      id: definition.id,
      titleKey: 'titleKey' in definition.copy ? definition.copy.titleKey : '',
      descriptionKey: 'descriptionKey' in definition.copy ? definition.copy.descriptionKey : '',
      artwork: artworkOf(definition.art),
      category: definition.category,
      currentProgress,
      targetProgress: target,
      status,
      recommendation: definition.recommendation,
    };
    if ('title' in definition.copy) {
      badge.title = localize(definition.copy.title, options.language);
      badge.description = localize(status === 'earned' ? definition.copy.earned : definition.copy.next, options.language);
    }
    if (definition.points !== undefined) badge.points = definition.points;
    badges.push(badge);
  }
  return badges;
}

export function mergeDefinitions(bundledDefinitions: AchievementDefinition[], remote: AchievementDefinition[]): AchievementDefinition[] {
  const byId = new Map(remote.map((definition) => [definition.id, definition]));
  const merged = bundledDefinitions.map((definition) => {
    const replacement = byId.get(definition.id);
    return replacement && replacement.version >= definition.version ? replacement : definition;
  });
  const bundledIds = new Set(bundledDefinitions.map((definition) => definition.id));
  return [...merged, ...remote.filter((definition) => !bundledIds.has(definition.id))];
}

export function awardsFor(story: Story, event: { finished: true } | { challengePageId: string }): string[] {
  return (story.awards ?? [])
    .filter((award) => ('finished' in event
      ? award.trigger === 'finish'
      : typeof award.trigger === 'object' && award.trigger.challengePageId === event.challengePageId))
    .map((award) => award.achievementId);
}
