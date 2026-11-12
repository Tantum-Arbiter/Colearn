import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/app-store';
import ScreenTimeService, { type ScreenTimeSession } from '@/services/screen-time-service';
import { useProgressData } from '@/components/progress/use-progress-data';
import { useContinueStory } from './use-continue-story';
import { badgeDescription, badgeTitle, type Badge, type BadgeCategory } from '@/components/progress/progress-model';
import {
  READING_HISTORY_DAYS,
  SAFETY_HISTORY_DAYS,
  daysApart,
  effectiveStreak,
  resolveReturnVisit,
  screenTimeSafetyPercent,
  welcomeCopy,
} from '@/constants/home-journey';
import type {
  ChildHomeAchievementTally,
  ChildHomeData,
  NextAchievementUnit,
  ReturnVisitContext,
  WelcomeCopy,
} from '@/types/child-home';

const ICON_BY_CATEGORY: Record<BadgeCategory, string> = {
  stories: 'book',
  music: 'musical-notes',
  calm: 'cloud',
  kindness: 'heart',
  exploration: 'compass',
};

const UNIT_BY_CATEGORY: Record<BadgeCategory, NextAchievementUnit> = {
  stories: 'stories',
  music: 'tunes',
  calm: 'calmMoments',
  kindness: 'stories',
  exploration: 'adventures',
};

export function newestEarned(badges: Badge[], unlockedAt: Record<string, string>): Badge | undefined {
  const earned = badges.filter((badge) => badge.status === 'earned');

  return [...earned].sort((a, b) => (unlockedAt[b.id] ?? '').localeCompare(unlockedAt[a.id] ?? ''))[0];
}

export function pickNextAchievement(badges: Badge[]): Badge | undefined {
  const fraction = (badge: Badge) => (badge.targetProgress > 0 ? badge.currentProgress / badge.targetProgress : 0);

  return badges
    .filter((badge) => badge.status !== 'earned')
    .sort((a, b) => fraction(b) - fraction(a) || a.targetProgress - b.targetProgress)[0];
}

export function achievementTally(badges: Badge[]): ChildHomeAchievementTally | undefined {
  if (badges.length === 0) {
    return undefined;
  }

  const unlocked = badges.filter((badge) => badge.status === 'earned').length;

  return { unlocked, remaining: badges.length - unlocked };
}

export function storyMinutes(sessions: ScreenTimeSession[]): number {
  const seconds = sessions
    .filter((session) => session.activity === 'story')
    .reduce((total, session) => total + session.duration, 0);

  return Math.round(seconds / 60);
}

/**
 * The same tally, narrowed to the last `windowDays` -- a livelier number for
 * a weekly glance than the lifetime total `storyMinutes` gives on its own.
 * Filters the one list `getRecentUsage` already fetched rather than a
 * second call for a shorter range.
 */
export function weeklyStoryMinutes(
  sessions: ScreenTimeSession[],
  now: Date,
  windowDays: number = SAFETY_HISTORY_DAYS
): number {
  const recent = sessions.filter((session) => {
    const gap = daysApart(new Date(`${session.date}T12:00:00`), now);
    return gap >= 0 && gap < windowDays;
  });

  return storyMinutes(recent);
}

export interface ChildHome {
  data: ChildHomeData;
  badges: Badge[];
  welcome: WelcomeCopy;
  celebrateAchievement: boolean;
}

export function useChildHomeData(): ChildHome {
  const { t } = useTranslation();
  const userNickname = useAppStore((state) => state.userNickname);
  const finishedStoryIds = useAppStore((state) => state.finishedStoryIds);
  const readingStreak = useAppStore((state) => state.readingStreak);
  const longestStreak = useAppStore((state) => state.longestStreak);
  const lastReadDate = useAppStore((state) => state.lastReadDate);
  const achievementUnlockedAt = useAppStore((state) => state.achievementUnlockedAt);
  const lastHomeVisitAt = useAppStore((state) => state.lastHomeVisitAt);
  const lastStoryCompletedAt = useAppStore((state) => state.lastStoryCompletedAt);
  const recordHomeVisit = useAppStore((state) => state.recordHomeVisit);
  const recordAchievementUnlocks = useAppStore((state) => state.recordAchievementUnlocks);
  const childAgeInMonths = useAppStore((state) => state.childAgeInMonths);
  const { badges } = useProgressData();

  const previousVisitRef = useRef<string | null>(lastHomeVisitAt);
  const [readingMinutes, setReadingMinutes] = useState(0);
  const [weeklyReadingMinutes, setWeeklyReadingMinutes] = useState(0);
  const [screenTimeSafety, setScreenTimeSafety] = useState<number | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const service = ScreenTimeService.getInstance();

    service
      .getRecentUsage(READING_HISTORY_DAYS)
      .then((sessions: ScreenTimeSession[]) => {
        if (mounted) {
          setReadingMinutes(storyMinutes(sessions));
          setWeeklyReadingMinutes(weeklyStoryMinutes(sessions, new Date()));
        }
      })
      .catch(() => undefined);

    service
      .getDailyTotals(SAFETY_HISTORY_DAYS)
      .then((totals) => {
        if (mounted) {
          setScreenTimeSafety(
            screenTimeSafetyPercent(
              totals.map((day) => day.seconds),
              service.getDailyLimit(childAgeInMonths ?? 24)
            )
          );
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [childAgeInMonths]);

  const earnedKey = badges
    .filter((badge) => badge.status === 'earned')
    .map((badge) => badge.id)
    .join(',');

  useEffect(() => {
    const at = new Date().toISOString();
    const earnedIds = earnedKey ? earnedKey.split(',') : [];

    if (earnedIds.length > 0) {
      recordAchievementUnlocks(earnedIds, at);
    }
    recordHomeVisit(at);
  }, [earnedKey, recordAchievementUnlocks, recordHomeVisit]);


  const currentStory = useContinueStory();

  return useMemo(() => {
    const now = new Date();
    const previousVisitAt = previousVisitRef.current;
    const newest = newestEarned(badges, achievementUnlockedAt);
    const next = pickNextAchievement(badges);
    const streakDays = effectiveStreak(readingStreak, lastReadDate, now);

    const data: ChildHomeData = {
      firstName: userNickname?.trim() ?? '',
      currentStory,
      storiesCompleted: finishedStoryIds.length,
      readingMinutes,
      weeklyReadingMinutes,
      readingStreakDays: streakDays,
      bestStreakDays: Math.max(longestStreak, streakDays),
      screenTimeSafety,
      newestAchievement: newest
        ? {
            id: newest.id,
            title: badgeTitle(newest, t),
            description: badgeDescription(newest, t),
            icon: ICON_BY_CATEGORY[newest.category],
            artwork: newest.artwork,
          }
        : undefined,
      nextAchievement: next
        ? {
            id: next.id,
            title: badgeTitle(next, t),
            current: next.currentProgress,
            required: next.targetProgress,
            unit: UNIT_BY_CATEGORY[next.category],
            artwork: next.artwork,
          }
        : undefined,
      achievementTally: achievementTally(badges),
    };

    const hasNewAchievement =
      previousVisitAt !== null &&
      badges.some((badge) => {
        if (badge.status !== 'earned') {
          return false;
        }
        const unlockedAt = achievementUnlockedAt[badge.id];

        return !unlockedAt || unlockedAt > previousVisitAt;
      });

    const context: ReturnVisitContext = {
      now,
      previousVisitAt,
      hasNewAchievement,
      storyCompletedSinceLastVisit:
        previousVisitAt !== null && lastStoryCompletedAt !== null && lastStoryCompletedAt > previousVisitAt,
    };

    return {
      data,
      badges,
      welcome: welcomeCopy(resolveReturnVisit(data, context), data),
      celebrateAchievement: hasNewAchievement && data.newestAchievement !== undefined,
    };
  }, [
    badges,
    achievementUnlockedAt,
    userNickname,
    currentStory,
    finishedStoryIds.length,
    readingMinutes,
    weeklyReadingMinutes,
    screenTimeSafety,
    readingStreak,
    longestStreak,
    lastReadDate,
    lastStoryCompletedAt,
    t,
  ]);
}
