import { useEffect, useMemo, useState } from 'react';
import { ALL_STORIES } from '@/data/stories';
import { Story } from '@/types/story';
import { useAppStore } from '@/store/app-store';
import { StoryLoader } from '@/services/story-loader';
import ScreenTimeService, { ScreenTimeSession, ScreenTimeStats } from '@/services/screen-time-service';
import {
  ActivityCounters,
  Badge,
  EMPTY_COUNTERS,
  Milestone,
  buildBadges,
  buildMilestones,
} from './progress-model';

const KIND_TAGS = ['friendship', 'family', 'emotions'];
const MORNING_END_HOUR = 12;

export function deriveCounters(
  readStoryIds: string[],
  stories: Story[],
  weeklyUsage: ScreenTimeSession[],
): ActivityCounters {
  const readStories = stories.filter((story) => readStoryIds.includes(story.id));
  const secondsThisWeek = weeklyUsage.reduce((total, session) => total + session.duration, 0);

  return {
    minutesThisWeek: Math.round(secondsThisWeek / 60),
    storiesRead: readStoryIds.length,
    bedtimeStoriesRead: readStories.filter((story) => story.category === 'bedtime').length,
    kindStoriesRead: readStories.filter((story) => story.tags?.some((tag) => KIND_TAGS.includes(tag))).length,
    musicSessions: weeklyUsage.filter((session) => session.activity === 'music').length,
    calmMoments: weeklyUsage.filter((session) => session.activity === 'emotions').length,
    morningSessions: weeklyUsage.filter(
      (session) => new Date(session.startTime).getHours() < MORNING_END_HOUR,
    ).length,
  };
}

export interface ProgressData {
  counters: ActivityCounters;
  badges: Badge[];
  milestones: Milestone[];
}

export function useProgressData(): ProgressData {
  const readStoryIds = useAppStore((state) => state.readStoryIds);
  const childAgeInMonths = useAppStore((state) => state.childAgeInMonths);
  const [weeklyUsage, setWeeklyUsage] = useState<ScreenTimeSession[]>([]);

  useEffect(() => {
    let mounted = true;
    ScreenTimeService.getInstance()
      .getScreenTimeStats(childAgeInMonths ?? 24)
      .then((stats: ScreenTimeStats) => {
        if (mounted) setWeeklyUsage(stats.weeklyUsage);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [childAgeInMonths]);

  const counters = useMemo(() => {
    const stories = StoryLoader.getCachedStories() ?? ALL_STORIES;
    if (readStoryIds.length === 0 && weeklyUsage.length === 0) return EMPTY_COUNTERS;
    return deriveCounters(readStoryIds, stories, weeklyUsage);
  }, [readStoryIds, weeklyUsage]);

  return useMemo(() => ({
    counters,
    badges: buildBadges(counters),
    milestones: buildMilestones(counters),
  }), [counters]);
}
