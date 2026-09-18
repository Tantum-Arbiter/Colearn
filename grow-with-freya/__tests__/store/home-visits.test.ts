/**
 * The home remembers just enough to welcome a family back: when it was last
 * seen, when each badge was first noticed, and when a story was last finished.
 */

const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

function resetStore(): void {
  useAppStore.setState({
    lastHomeVisitAt: null,
    achievementUnlockedAt: {},
    lastStoryCompletedAt: null,
    storyProgress: {},
  });
}

describe('home visits', () => {
  beforeEach(resetStore);

  it('should start with no visit on record', () => {
    expect(useAppStore.getState().lastHomeVisitAt).toBeNull();
  });

  it('should remember the latest visit', () => {
    useAppStore.getState().recordHomeVisit('2026-09-06T08:00:00.000Z');
    useAppStore.getState().recordHomeVisit('2026-09-06T09:00:00.000Z');

    const underTest = useAppStore.getState().lastHomeVisitAt;

    expect(underTest).toBe('2026-09-06T09:00:00.000Z');
  });
});

describe('achievement unlocks', () => {
  beforeEach(resetStore);

  it('should stamp a badge the first time it is seen earned', () => {
    useAppStore.getState().recordAchievementUnlocks(['first-story'], '2026-09-06T08:00:00.000Z');

    const underTest = useAppStore.getState().achievementUnlockedAt;

    expect(underTest).toEqual({ 'first-story': '2026-09-06T08:00:00.000Z' });
  });

  it('should keep the first stamp when a badge is seen again', () => {
    useAppStore.getState().recordAchievementUnlocks(['first-story'], '2026-09-06T08:00:00.000Z');
    useAppStore.getState().recordAchievementUnlocks(['first-story', 'kind-moments'], '2026-09-07T08:00:00.000Z');

    const underTest = useAppStore.getState().achievementUnlockedAt;

    expect(underTest).toEqual({
      'first-story': '2026-09-06T08:00:00.000Z',
      'kind-moments': '2026-09-07T08:00:00.000Z',
    });
  });

  it('should leave the state untouched when nothing is new', () => {
    useAppStore.getState().recordAchievementUnlocks(['first-story'], '2026-09-06T08:00:00.000Z');
    const before = useAppStore.getState().achievementUnlockedAt;

    useAppStore.getState().recordAchievementUnlocks(['first-story'], '2026-09-07T08:00:00.000Z');

    expect(useAppStore.getState().achievementUnlockedAt).toBe(before);
  });
});

describe('finishing a story', () => {
  beforeEach(resetStore);

  it('should stamp when the last story was finished', () => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-09-06T20:00:00.000Z');

    useAppStore.getState().markStoryCompleted('wombat');

    expect(useAppStore.getState().lastStoryCompletedAt).toBe('2026-09-06T20:00:00.000Z');
    jest.restoreAllMocks();
  });
});

describe('persistence', () => {
  it('should carry the home memory across launches', () => {
    const persisted = useAppStore.persist.getOptions().partialize?.(useAppStore.getState()) ?? {};

    expect(Object.keys(persisted)).toEqual(
      expect.arrayContaining(['lastHomeVisitAt', 'achievementUnlockedAt', 'lastStoryCompletedAt'])
    );
  });
});
