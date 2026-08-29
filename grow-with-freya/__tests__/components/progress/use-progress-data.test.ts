/**
 * The counters are derived from what actually happened — read stories and
 * the week's activity sessions — not from engagement metrics (§26).
 */

import { deriveCounters } from '@/components/progress/use-progress-data';
import { ScreenTimeSession } from '@/services/screen-time-service';
import { Story } from '@/types/story';

const story = (id: string, category: Story['category'], tags: string[] = []): Story => ({
  id,
  title: id,
  category,
  isAvailable: true,
  tags,
});

const session = (activity: ScreenTimeSession['activity'], hour: number, minutes: number): ScreenTimeSession => ({
  id: `${activity}-${hour}`,
  startTime: new Date(2026, 7, 24, hour, 0, 0).getTime(),
  duration: minutes * 60,
  activity,
  date: '2026-08-24',
});

describe('deriveCounters', () => {
  const stories = [
    story('wombat', 'bedtime', ['bedtime', 'calming']),
    story('bear', 'adventure', ['adventure', 'friendship']),
    story('whale', 'bedtime', []),
  ];

  it('counts read stories, bedtime reads and kindness-themed reads', () => {
    const underTest = deriveCounters(['wombat', 'bear'], stories, []);

    expect(underTest.storiesRead).toBe(2);
    expect(underTest.bedtimeStoriesRead).toBe(1);
    expect(underTest.kindStoriesRead).toBe(1);
  });

  it('derives weekly minutes and per-activity counts from sessions', () => {
    const underTest = deriveCounters([], stories, [
      session('story', 19, 20),
      session('music', 16, 10),
      session('music', 9, 5),
      session('emotions', 18, 7),
    ]);

    expect(underTest.minutesThisWeek).toBe(42);
    expect(underTest.musicSessions).toBe(2);
    expect(underTest.calmMoments).toBe(1);
    expect(underTest.morningSessions).toBe(1);
  });
});
