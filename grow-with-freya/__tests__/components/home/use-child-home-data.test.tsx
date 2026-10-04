/**
 * The home's data model is assembled from what the family actually did: the
 * store's reading record, the earned badges and the screen-time history.
 * It also remembers the visit, so the next welcome knows what is new.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import {
  useChildHomeData,
  achievementTally,
  newestEarned,
  pickNextAchievement,
  storyMinutes,
  weeklyStoryMinutes,
} from '@/components/home/use-child-home-data';
import { useAppStore, type AppState } from '@/store/app-store';
import type { Badge } from '@/components/progress/progress-model';

jest.mock('@/store/app-store');

const mockBadges: Badge[] = [];

jest.mock('@/components/progress/use-progress-data', () => ({
  useProgressData: () => ({ badges: mockBadges, counters: {}, summary: { earned: 0, total: 0 }, challenges: [], milestones: [] }),
}));

const mockSessions: { activity: string; duration: number; date?: string }[] = [];
const mockTotals: { date: string; seconds: number }[] = [];

jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getRecentUsage: () => Promise.resolve(mockSessions),
      getDailyTotals: () => Promise.resolve(mockTotals),
      getDailyLimit: () => 3600,
    }),
  },
}));

jest.mock('@/data/stories', () => ({
  ALL_STORIES: [
    { id: 'moonlight', title: 'The Moonlight Garden', coverImage: 'file:///cover.webp', category: 'bedtime', isAvailable: true },
    { id: 'river', title: 'Down by the River', coverImage: 'file:///river.webp', category: 'nature', isAvailable: true },
  ],
}));

const badge = (id: string, status: Badge['status'], current: number, target: number, category: Badge['category'] = 'stories'): Badge => ({
  id,
  titleKey: `progress.badges.${id}.title`,
  descriptionKey: `progress.badges.${id}.description`,
  artwork: 1,
  category,
  currentProgress: current,
  targetProgress: target,
  status,
});

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

const recordHomeVisit = jest.fn();
const recordAchievementUnlocks = jest.fn();

function applyState(next: Partial<AppState>) {
  const state = {
    userNickname: 'Freya',
    storyProgress: {},
    getContinueReadingStoryId: () => null,
    readStoryIds: [],
    finishedStoryIds: [],
    readingStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    achievementUnlockedAt: {},
    lastHomeVisitAt: null,
    lastStoryCompletedAt: null,
    childAgeInMonths: 36,
    recordHomeVisit,
    recordAchievementUnlocks,
    ...next,
  };

  mockUseAppStore.mockImplementation(((selector?: (s: AppState) => unknown) =>
    typeof selector === 'function' ? selector(state as unknown as AppState) : state
  ) as unknown as typeof useAppStore);
}

describe('storyMinutes', () => {
  it('should count only story time, in whole minutes', () => {
    const underTest = storyMinutes([
      { activity: 'story', duration: 1500 } as never,
      { activity: 'music', duration: 900 } as never,
      { activity: 'story', duration: 3540 } as never,
    ]);

    expect(underTest).toBe(84);
  });
});

describe('weeklyStoryMinutes', () => {
  const NOW = new Date(2026, 8, 9, 12, 0);

  it('should count only the sessions inside the window', () => {
    const underTest = weeklyStoryMinutes(
      [
        { activity: 'story', duration: 600, date: '2026-09-09' } as never, // today
        { activity: 'story', duration: 600, date: '2026-09-03' } as never, // 6 days ago, still in
        { activity: 'story', duration: 600, date: '2026-09-01' } as never, // 8 days ago, out
        { activity: 'music', duration: 600, date: '2026-09-09' } as never, // not reading
      ],
      NOW
    );

    expect(underTest).toBe(20);
  });

  it('should read as nothing when the week has no reading in it', () => {
    expect(weeklyStoryMinutes([{ activity: 'story', duration: 600, date: '2026-08-20' } as never], NOW)).toBe(0);
  });
});

describe('newestEarned', () => {
  it('should pick the badge unlocked most recently', () => {
    const underTest = newestEarned(
      [badge('a', 'earned', 1, 1), badge('b', 'earned', 1, 1), badge('c', 'started', 1, 5)],
      { a: '2026-09-01T00:00:00.000Z', b: '2026-09-05T00:00:00.000Z' }
    );

    expect(underTest?.id).toBe('b');
  });

  it('should find nothing when nothing is earned', () => {
    expect(newestEarned([badge('c', 'started', 1, 5)], {})).toBeUndefined();
  });
});

describe('pickNextAchievement', () => {
  it('should choose the badge closest to being earned', () => {
    const underTest = pickNextAchievement([
      badge('done', 'earned', 5, 5),
      badge('far', 'started', 1, 10),
      badge('near', 'in_progress', 3, 5),
    ]);

    expect(underTest?.id).toBe('near');
  });

  it('should prefer the easiest badge when none has started', () => {
    const underTest = pickNextAchievement([badge('big', 'undiscovered', 0, 10), badge('small', 'undiscovered', 0, 3)]);

    expect(underTest?.id).toBe('small');
  });
});

describe('useChildHomeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBadges.length = 0;
    mockSessions.length = 0;
    mockTotals.length = 0;
    applyState({});
  });

  it('should build the model from the store', async () => {
    mockSessions.push({ activity: 'story', duration: 84 * 60, date: new Date().toISOString().slice(0, 10) });
    mockTotals.push({ date: '2026-09-05', seconds: 1200 }, { date: '2026-09-06', seconds: 5000 });
    applyState({
      readStoryIds: ['a', 'b', 'c', 'opened-only'],
      finishedStoryIds: ['a', 'b', 'c'],
      readingStreak: 4,
      lastReadDate: new Date().toISOString().slice(0, 10),
      storyProgress: { moonlight: { pageIndex: 7, totalPages: 14, updatedAt: '2026-09-06T08:00:00.000Z', completedCount: 0 } },
      getContinueReadingStoryId: () => 'moonlight',
    });

    const { result } = renderHook(() => useChildHomeData());

    await waitFor(() => expect(result.current.data.readingMinutes).toBe(84));
    const underTest = result.current.data;

    expect(underTest.weeklyReadingMinutes).toBe(84);
    expect(underTest.firstName).toBe('Freya');
    expect(underTest.storiesCompleted).toBe(3);
    expect(underTest.readingStreakDays).toBe(4);
    expect(underTest.screenTimeSafety).toBe(50);
    expect(underTest.currentStory).toEqual({
      id: 'moonlight',
      title: 'The Moonlight Garden',
      currentPage: 7,
      totalPages: 13,
      coverImage: { uri: 'file:///cover.webp' },
    });
  });

  it.each([
    ['the longest run there has been, while today is shorter', 4, 9, 9],
    ['the run going now, once it is the longest', 9, 9, 9],
    ['the run going now, for a store from before the best was kept', 6, 0, 6],
  ])('should give as the best streak %s', (_, readingStreak, longestStreak, best) => {
    applyState({ readingStreak, longestStreak, lastReadDate: new Date().toISOString().slice(0, 10) });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.bestStreakDays).toBe(best);
  });

  it('should keep the best streak once the run going now has lapsed', () => {
    applyState({ readingStreak: 3, longestStreak: 7, lastReadDate: '2026-01-02' });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.readingStreakDays).toBe(0);
    expect(result.current.data.bestStreakDays).toBe(7);
  });

  it('should give the story to carry on with at the page the reader is on, its cover not among the pages', () => {
    applyState({
      storyProgress: { moonlight: { pageIndex: 3, totalPages: 11, updatedAt: '2026-09-06T08:00:00.000Z', completedCount: 0 } },
      getContinueReadingStoryId: () => 'moonlight',
    });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.currentStory).toMatchObject({ currentPage: 3, totalPages: 10 });
  });

  it('should carry on with the book read last, by the reading record it is shown, never a choice made before it changed', () => {
    applyState({
      storyProgress: {
        moonlight: { pageIndex: 3, totalPages: 11, updatedAt: '2026-09-06T08:00:00.000Z', completedCount: 0 },
        river: { pageIndex: 5, totalPages: 9, updatedAt: '2026-09-06T08:05:00.000Z', completedCount: 0 },
      },
      getContinueReadingStoryId: () => 'moonlight',
    });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.currentStory).toMatchObject({ id: 'river', title: 'Down by the River', currentPage: 5, totalPages: 8 });
  });

  it('should have nothing to carry on with when every book is on its cover or finished', () => {
    applyState({
      storyProgress: {
        moonlight: { pageIndex: 0, totalPages: 11, updatedAt: '2026-09-06T08:00:00.000Z', completedCount: 1 },
        river: { pageIndex: 9, totalPages: 9, updatedAt: '2026-09-06T08:05:00.000Z', completedCount: 0 },
      },
      getContinueReadingStoryId: () => 'river',
    });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.currentStory).toBeUndefined();
  });

  it.each([
    ['not once another story has been finished after it', '2026-09-06T09:00:00.000Z', false],
    ['when the last story finished came before it', '2026-09-06T07:00:00.000Z', true],
    ['when no story has been finished yet', null, true],
  ])('should offer the story left part-read %s', (_, lastStoryCompletedAt, offered) => {
    applyState({
      storyProgress: { moonlight: { pageIndex: 3, totalPages: 11, updatedAt: '2026-09-06T08:00:00.000Z', completedCount: 0 } },
      getContinueReadingStoryId: () => 'moonlight',
      lastStoryCompletedAt,
    });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.currentStory !== undefined).toBe(offered);
  });

  it('should surface the newest badge and the next one, with icons the card can draw', () => {
    mockBadges.push(badge('first-story', 'earned', 1, 1), badge('story-adventurer', 'in_progress', 8, 10), badge('first-notes', 'undiscovered', 0, 1, 'music'));
    applyState({ achievementUnlockedAt: { 'first-story': '2026-09-01T00:00:00.000Z' }, lastHomeVisitAt: '2026-09-05T00:00:00.000Z' });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.newestAchievement).toMatchObject({ id: 'first-story', icon: 'book', title: 'progress.badges.first-story.title' });
    expect(result.current.data.nextAchievement).toMatchObject({
      id: 'story-adventurer',
      title: 'progress.badges.story-adventurer.title',
      current: 8,
      required: 10,
      unit: 'stories',
    });
  });

  it('should count the badges unlocked and those still to go', () => {
    mockBadges.push(badge('first-story', 'earned', 1, 1), badge('story-adventurer', 'in_progress', 8, 10), badge('first-notes', 'undiscovered', 0, 1, 'music'));

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.achievementTally).toEqual({ unlocked: 1, remaining: 2 });
  });

  it('should have no tally to show when there are no badges at all', () => {
    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.achievementTally).toBeUndefined();
  });

  it('should show CMS badges by their own copy', () => {
    mockBadges.push(
      { ...badge('theme-calming', 'earned', 2, 2), titleKey: '', descriptionKey: '', title: 'Calm Collector', description: 'You finished two calming books' },
      { ...badge('theme-animals', 'in_progress', 1, 2), titleKey: '', descriptionKey: '', title: 'Animal Friend', description: 'Finish two animal books' },
    );
    applyState({ achievementUnlockedAt: { 'theme-calming': '2026-09-01T00:00:00.000Z' } });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.data.newestAchievement).toMatchObject({ title: 'Calm Collector', description: 'You finished two calming books' });
    expect(result.current.data.nextAchievement).toMatchObject({ title: 'Animal Friend' });
  });

  it('should remember the visit and stamp any badge seen earned for the first time', () => {
    mockBadges.push(badge('first-story', 'earned', 1, 1));

    renderHook(() => useChildHomeData());

    expect(recordAchievementUnlocks).toHaveBeenCalledWith(['first-story'], expect.any(String));
    expect(recordHomeVisit).toHaveBeenCalledWith(expect.any(String));
  });

  it('should celebrate a badge earned since the last visit', () => {
    mockBadges.push(badge('first-story', 'earned', 1, 1));
    applyState({ lastHomeVisitAt: '2026-09-05T00:00:00.000Z', achievementUnlockedAt: {} });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.celebrateAchievement).toBe(true);
    expect(result.current.welcome.state).toBe('newAchievement');
  });

  it('should not celebrate a badge that was already seen', () => {
    mockBadges.push(badge('first-story', 'earned', 1, 1));
    applyState({ lastHomeVisitAt: '2026-09-05T00:00:00.000Z', achievementUnlockedAt: { 'first-story': '2026-09-01T00:00:00.000Z' } });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.celebrateAchievement).toBe(false);
  });

  it('should not celebrate on the very first visit, when nothing can be new', () => {
    mockBadges.push(badge('first-story', 'earned', 1, 1));
    applyState({ lastHomeVisitAt: null });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.celebrateAchievement).toBe(false);
  });

  it('should notice a story finished since the last visit', () => {
    applyState({ lastHomeVisitAt: '2026-09-05T00:00:00.000Z', lastStoryCompletedAt: '2026-09-05T20:00:00.000Z' });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.welcome.state).toBe('storyCompleted');
  });

  it('should welcome a nameless child without a stray comma', () => {
    applyState({ userNickname: null });

    const { result } = renderHook(() => useChildHomeData());

    expect(result.current.welcome.titleKey).toBe('home.welcome.firstToday.titleAnonymous');
  });
});

describe('achievementTally', () => {
  it.each([
    ['nothing unlocked', ['undiscovered', 'started', 'in_progress'], { unlocked: 0, remaining: 3 }],
    ['some unlocked', ['earned', 'started', 'undiscovered'], { unlocked: 1, remaining: 2 }],
    ['everything unlocked', ['earned', 'earned'], { unlocked: 2, remaining: 0 }],
    ['a single badge, not yet unlocked', ['in_progress'], { unlocked: 0, remaining: 1 }],
  ] as [string, Badge['status'][], { unlocked: number; remaining: number }][])('counts %s', (_name, statuses, expected) => {
    const badges = statuses.map((status, index) => badge(`badge-${index}`, status, 0, 1));

    const underTest = achievementTally(badges);

    expect(underTest).toEqual(expected);
  });

  it('has nothing to count when there are no badges', () => {
    expect(achievementTally([])).toBeUndefined();
  });
});
