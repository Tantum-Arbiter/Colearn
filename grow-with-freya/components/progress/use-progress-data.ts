import { useEffect, useMemo, useState } from 'react';
import { ALL_STORIES } from '@/data/stories';
import { Story } from '@/types/story';
import { useAppStore } from '@/store/app-store';
import { StoryLoader } from '@/services/story-loader';
import ScreenTimeService, { ScreenTimeSession } from '@/services/screen-time-service';
import {
  ActivityCounters,
  Badge,
  BadgeSummary,
  Challenge,
  EMPTY_COUNTERS,
  Milestone,
  buildBadges,
  buildChallenges,
  buildMilestones,
  summariseBadges,
} from './progress-model';

const KIND_TAGS = ['friendship', 'family-exercises', 'emotions'];
const MORNING_END_HOUR = 12;
const EVENING_START_HOUR = 18;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const HISTORY_DAYS = 30;

const hourOf = (session: ScreenTimeSession) => new Date(session.startTime).getHours();

export function deriveCounters(
  readStoryIds: string[],
  favouriteStoryIds: string[],
  stories: Story[],
  recentUsage: ScreenTimeSession[],
  now: number = Date.now(),
): ActivityCounters {
  const readStories = stories.filter((story) => readStoryIds.includes(story.id));
  const weeklyUsage = recentUsage.filter((session) => session.startTime >= now - WEEK_MS);
  const secondsThisWeek = weeklyUsage.reduce((total, session) => total + session.duration, 0);
  const count = (sessions: ScreenTimeSession[], predicate: (session: ScreenTimeSession) => boolean) =>
    sessions.filter(predicate).length;

  return {
    minutesThisWeek: Math.round(secondsThisWeek / 60),
    storiesRead: readStoryIds.length,
    bedtimeStoriesRead: readStories.filter((story) => story.category === 'bedtime').length,
    adventureStoriesRead: readStories.filter((story) => story.category === 'adventure').length,
    kindStoriesRead: readStories.filter((story) => story.tags?.some((tag) => KIND_TAGS.includes(tag))).length,
    categoriesExplored: new Set(readStories.map((story) => story.category)).size,
    favourites: favouriteStoryIds.length,
    storySessions: count(weeklyUsage, (s) => s.activity === 'story'),
    musicSessions: count(weeklyUsage, (s) => s.activity === 'music'),
    calmMoments: count(weeklyUsage, (s) => s.activity === 'emotions'),
    morningSessions: count(weeklyUsage, (s) => hourOf(s) < MORNING_END_HOUR),
    eveningSessions: count(weeklyUsage, (s) => hourOf(s) >= EVENING_START_HOUR),
    storySessionsMonth: count(recentUsage, (s) => s.activity === 'story'),
    musicSessionsMonth: count(recentUsage, (s) => s.activity === 'music'),
    calmMomentsMonth: count(recentUsage, (s) => s.activity === 'emotions'),
    morningSessionsMonth: count(recentUsage, (s) => hourOf(s) < MORNING_END_HOUR),
  };
}

export interface ProgressData {
  counters: ActivityCounters;
  badges: Badge[];
  summary: BadgeSummary;
  challenges: Challenge[];
  milestones: Milestone[];
}

export function useProgressData(): ProgressData {
  const readStoryIds = useAppStore((state) => state.readStoryIds);
  const favouriteStoryIds = useAppStore((state) => state.favoriteStoryIds);
  const [recentUsage, setRecentUsage] = useState<ScreenTimeSession[]>([]);

  useEffect(() => {
    let mounted = true;
    ScreenTimeService.getInstance()
      .getRecentUsage(HISTORY_DAYS)
      .then((sessions: ScreenTimeSession[]) => {
        if (mounted) setRecentUsage(sessions);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const counters = useMemo(() => {
    const stories = StoryLoader.getCachedStories() ?? ALL_STORIES;
    if (readStoryIds.length === 0 && favouriteStoryIds.length === 0 && recentUsage.length === 0) {
      return EMPTY_COUNTERS;
    }
    return deriveCounters(readStoryIds, favouriteStoryIds, stories, recentUsage);
  }, [readStoryIds, favouriteStoryIds, recentUsage]);

  return useMemo(() => {
    const badges = buildBadges(counters);
    return {
      counters,
      badges,
      summary: summariseBadges(badges),
      challenges: buildChallenges(counters),
      milestones: buildMilestones(counters),
    };
  }, [counters]);
}
