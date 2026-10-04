/**
 * The facts badges are judged from: which books were finished (not merely
 * opened), how many page challenges of each kind were done, and which badges
 * have been earned. Facts only grow, and an earned badge is never taken away.
 */

const { useAppStore, migrateAppState } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

function resetStore(): void {
  useAppStore.setState({
    storyProgress: {},
    finishedStoryIds: [],
    challengeCounts: {},
    earnedAchievementIds: [],
    achievementUnlockedAt: {},
  });
}

describe('achievement facts', () => {
  beforeEach(resetStore);

  it('records a book as finished when it is finished', () => {
    useAppStore.getState().markStoryCompleted('snowy');

    expect(useAppStore.getState().finishedStoryIds).toEqual(['snowy']);
  });

  it('records a book finished twice once', () => {
    useAppStore.getState().markStoryCompleted('snowy');
    useAppStore.getState().markStoryCompleted('snowy');

    expect(useAppStore.getState().finishedStoryIds).toEqual(['snowy']);
  });

  it('does not count a book that was only opened', () => {
    useAppStore.getState().setStoryProgress('snowy', 2, 9);

    expect(useAppStore.getState().finishedStoryIds).toEqual([]);
  });

  it.each(['music', 'jigsaw', 'reading'] as const)('counts each %s challenge completed', (kind) => {
    useAppStore.getState().recordChallengeCompleted(kind);
    useAppStore.getState().recordChallengeCompleted(kind);

    expect(useAppStore.getState().challengeCounts[kind]).toBe(2);
  });

  it('keeps the kinds of challenge apart', () => {
    useAppStore.getState().recordChallengeCompleted('music');
    useAppStore.getState().recordChallengeCompleted('reading');

    expect(useAppStore.getState().challengeCounts).toEqual({ music: 1, reading: 1 });
  });

  it('grants a badge once and keeps it', () => {
    useAppStore.getState().grantAchievements(['first-story']);
    useAppStore.getState().grantAchievements(['first-story', 'bedtime-hero']);

    expect(useAppStore.getState().earnedAchievementIds).toEqual(['first-story', 'bedtime-hero']);
  });

  it('leaves the state untouched when nothing new is granted', () => {
    useAppStore.getState().grantAchievements(['first-story']);
    const before = useAppStore.getState().earnedAchievementIds;

    useAppStore.getState().grantAchievements(['first-story']);

    expect(useAppStore.getState().earnedAchievementIds).toBe(before);
  });

  it('counts a badge stamped as unlocked as earned', () => {
    useAppStore.getState().recordAchievementUnlocks(['kind-moments'], '2026-09-01T10:00:00Z');

    expect(useAppStore.getState().earnedAchievementIds).toEqual(['kind-moments']);
  });
});

describe('the one-time move from "opened" to "finished"', () => {
  it('counts as finished every book the child had already finished at least once', () => {
    const underTest = migrateAppState({
      storyProgress: {
        done: { pageIndex: 0, totalPages: 9, completedCount: 2, updatedAt: 'x' },
        begun: { pageIndex: 3, totalPages: 9, completedCount: 0, updatedAt: 'x' },
      },
      readStoryIds: ['done', 'begun', 'opened-only'],
    }, 0);

    expect(underTest.finishedStoryIds).toEqual(['done']);
  });

  it('keeps anything already recorded as finished', () => {
    const underTest = migrateAppState({ storyProgress: {}, finishedStoryIds: ['kept'] }, 0);

    expect(underTest.finishedStoryIds).toEqual(['kept']);
  });

  it('copes with a store saved before story progress existed', () => {
    const underTest = migrateAppState({}, 0);

    expect(underTest.finishedStoryIds).toEqual([]);
  });

  it('runs only for stores saved before version 1', () => {
    const state = { storyProgress: { done: { pageIndex: 0, totalPages: 9, completedCount: 1, updatedAt: 'x' } }, finishedStoryIds: [] };

    expect(migrateAppState(state, 1).finishedStoryIds).toEqual([]);
  });
});
