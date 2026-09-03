/**
 * The counters are derived from what actually happened — read stories,
 * favourites and the recent activity sessions — not from engagement
 * metrics (§26). Weekly figures come from the last 7 days of a 30-day window.
 */

import { deriveCounters } from '@/components/progress/use-progress-data';
import { ScreenTimeSession } from '@/services/screen-time-service';
import { Story } from '@/types/story';

const NOW = new Date(2026, 7, 26, 20, 0, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

const story = (id: string, category: Story['category'], tags: string[] = []): Story => ({
  id,
  title: id,
  category,
  isAvailable: true,
  tags,
});

const session = (
  activity: ScreenTimeSession['activity'],
  hour: number,
  minutes: number,
  daysAgo = 0,
): ScreenTimeSession => {
  const start = new Date(NOW - daysAgo * DAY);
  start.setHours(hour, 0, 0, 0);
  return {
    id: `${activity}-${hour}-${daysAgo}`,
    startTime: start.getTime(),
    duration: minutes * 60,
    activity,
    date: start.toISOString().slice(0, 10),
  };
};

describe('deriveCounters', () => {
  const stories = [
    story('wombat', 'bedtime', ['bedtime', 'calming']),
    story('bear', 'adventure', ['adventure', 'friendship']),
    story('whale', 'bedtime', []),
    story('owl', 'learning', []),
  ];

  it('counts read stories by category, theme and breadth, plus favourites', () => {
    const underTest = deriveCounters(['wombat', 'bear', 'owl'], ['bear'], stories, [], NOW);

    expect(underTest.storiesRead).toBe(3);
    expect(underTest.bedtimeStoriesRead).toBe(1);
    expect(underTest.adventureStoriesRead).toBe(1);
    expect(underTest.kindStoriesRead).toBe(1);
    expect(underTest.categoriesExplored).toBe(3);
    expect(underTest.favourites).toBe(1);
  });

  it('derives weekly minutes and per-activity counts from the last seven days only', () => {
    const underTest = deriveCounters([], [], stories, [
      session('story', 19, 20),
      session('music', 16, 10),
      session('music', 9, 5, 2),
      session('emotions', 18, 7, 3),
      session('story', 9, 30, 20),
    ], NOW);

    expect(underTest.minutesThisWeek).toBe(42);
    expect(underTest.storySessions).toBe(1);
    expect(underTest.musicSessions).toBe(2);
    expect(underTest.calmMoments).toBe(1);
    expect(underTest.morningSessions).toBe(1);
    expect(underTest.eveningSessions).toBe(2);
  });

  it('keeps monthly counts across the whole window', () => {
    const underTest = deriveCounters([], [], stories, [
      session('story', 19, 20),
      session('story', 9, 30, 20),
      session('music', 16, 10, 25),
      session('emotions', 18, 7, 12),
    ], NOW);

    expect(underTest.storySessionsMonth).toBe(2);
    expect(underTest.musicSessionsMonth).toBe(1);
    expect(underTest.calmMomentsMonth).toBe(1);
    expect(underTest.morningSessionsMonth).toBe(1);
  });
});
