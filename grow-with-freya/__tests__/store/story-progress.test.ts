/**
 * Tests for the story reading-progress slice.
 *
 * This slice is what makes "Continue Reading" and the ribbon bookmark possible.
 * Before it existed the app only knew whether a story had ever been opened.
 *
 * Key behaviors tested:
 * 1. Progress is recorded per story
 * 2. Continue Reading picks the most recently touched unfinished book
 * 3. Finished books drop out of Continue Reading but keep a completion count
 */

// The app store is globally mocked in jest.setup.js; this suite exercises the real slice.
const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

function resetStore(): void {
  useAppStore.setState({
    storyProgress: {},
  });
}

describe('story progress', () => {
  beforeEach(() => {
    resetStore();
    jest.restoreAllMocks();
  });

  describe('recording progress', () => {
    it('should store the page a story was left on', () => {
      useAppStore.getState().setStoryProgress('wombat', 3, 9);

      const underTest = useAppStore.getState().storyProgress['wombat'];

      expect(underTest.pageIndex).toBe(3);
      expect(underTest.totalPages).toBe(9);
    });

    it('should stamp the time so the newest book wins Continue Reading', () => {
      useAppStore.getState().setStoryProgress('wombat', 3, 9);

      const underTest = useAppStore.getState().storyProgress['wombat'];

      expect(() => new Date(underTest.updatedAt).toISOString()).not.toThrow();
    });

    it('should overwrite earlier progress for the same story', () => {
      useAppStore.getState().setStoryProgress('wombat', 3, 9);
      useAppStore.getState().setStoryProgress('wombat', 5, 9);

      const underTest = useAppStore.getState().storyProgress['wombat'];

      expect(underTest.pageIndex).toBe(5);
    });

    it('should keep progress for other stories untouched', () => {
      useAppStore.getState().setStoryProgress('wombat', 3, 9);
      useAppStore.getState().setStoryProgress('fairy-garden', 1, 9);

      const underTest = useAppStore.getState().storyProgress;

      expect(Object.keys(underTest).sort()).toEqual(['fairy-garden', 'wombat']);
    });
  });

  describe('continue reading', () => {
    it('should return null when nothing has been started', () => {
      const underTest = useAppStore.getState().getContinueReadingStoryId();

      expect(underTest).toBeNull();
    });

    it('should return the only unfinished book', () => {
      useAppStore.getState().setStoryProgress('wombat', 3, 9);

      const underTest = useAppStore.getState().getContinueReadingStoryId();

      expect(underTest).toBe('wombat');
    });

    it('should prefer the most recently read unfinished book', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1_000)
        .mockReturnValueOnce(2_000);

      useAppStore.setState({
        storyProgress: {
          wombat: { pageIndex: 3, totalPages: 9, updatedAt: '2026-07-01T00:00:00.000Z', completedCount: 0 },
          'fairy-garden': { pageIndex: 2, totalPages: 9, updatedAt: '2026-07-20T00:00:00.000Z', completedCount: 0 },
        },
      });

      const underTest = useAppStore.getState().getContinueReadingStoryId();

      expect(underTest).toBe('fairy-garden');
    });

    it('should ignore a book that was only opened at the cover', () => {
      useAppStore.getState().setStoryProgress('wombat', 0, 9);

      const underTest = useAppStore.getState().getContinueReadingStoryId();

      expect(underTest).toBeNull();
    });

    it('should ignore a finished book', () => {
      useAppStore.getState().setStoryProgress('wombat', 3, 9);
      useAppStore.getState().markStoryCompleted('wombat');

      const underTest = useAppStore.getState().getContinueReadingStoryId();

      expect(underTest).toBeNull();
    });
  });

  describe('completion', () => {
    it('should reset the page so the book starts fresh next time', () => {
      useAppStore.getState().setStoryProgress('wombat', 8, 9);
      useAppStore.getState().markStoryCompleted('wombat');

      const underTest = useAppStore.getState().storyProgress['wombat'];

      expect(underTest.pageIndex).toBe(0);
    });

    it('should count how many times the book has been finished', () => {
      useAppStore.getState().setStoryProgress('wombat', 8, 9);
      useAppStore.getState().markStoryCompleted('wombat');
      useAppStore.getState().setStoryProgress('wombat', 8, 9);
      useAppStore.getState().markStoryCompleted('wombat');

      const underTest = useAppStore.getState().storyProgress['wombat'];

      expect(underTest.completedCount).toBe(2);
    });

    it('should record a completion even for a book with no prior progress', () => {
      useAppStore.getState().markStoryCompleted('wombat');

      const underTest = useAppStore.getState().storyProgress['wombat'];

      expect(underTest.completedCount).toBe(1);
    });
  });

  describe('clearing', () => {
    it('should remove a single story without touching the rest', () => {
      useAppStore.getState().setStoryProgress('wombat', 3, 9);
      useAppStore.getState().setStoryProgress('fairy-garden', 1, 9);

      useAppStore.getState().clearStoryProgress('wombat');

      const underTest = useAppStore.getState().storyProgress;

      expect(underTest['wombat']).toBeUndefined();
      expect(underTest['fairy-garden']).toBeDefined();
    });

    it('should be a no-op for an unknown story', () => {
      expect(() => useAppStore.getState().clearStoryProgress('nope')).not.toThrow();
    });
  });
});
