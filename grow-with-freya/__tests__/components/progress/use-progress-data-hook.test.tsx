/**
 * The badge library is judged from finished books, page challenges and the
 * badges already earned, against the bundled definitions merged with whatever
 * the CMS has sent.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useProgressData } from '@/components/progress/use-progress-data';
import { useAppStore, type AppState } from '@/store/app-store';
import type { AchievementDefinition } from '@/components/progress/achievements';

jest.mock('@/store/app-store');

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.4.0' } } }));

jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: { getInstance: () => ({ getRecentUsage: () => Promise.resolve([]) }) },
}));

jest.mock('@/services/story-loader', () => ({
  StoryLoader: { getCachedStories: () => null },
}));

jest.mock('@/data/stories', () => ({
  ALL_STORIES: [
    { id: 'wombat', title: 'wombat', category: 'bedtime', tags: ['calming'], isAvailable: true },
    { id: 'bear', title: 'bear', category: 'adventure', tags: [], isAvailable: true },
  ],
}));

let mockRemote: AchievementDefinition[] = [];
const mockListeners: (() => void)[] = [];

jest.mock('@/services/achievement-definitions-service', () => ({
  AchievementDefinitionsService: {
    getDefinitions: () => Promise.resolve(mockRemote),
    onDefinitionsUpdated: (listener: () => void) => {
      mockListeners.push(listener);
      return () => mockListeners.splice(mockListeners.indexOf(listener), 1);
    },
  },
}));

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function applyState(next: Partial<AppState>) {
  const state = {
    readStoryIds: [],
    finishedStoryIds: [],
    favoriteStoryIds: [],
    challengeCounts: {},
    earnedAchievementIds: [],
    ...next,
  };
  mockUseAppStore.mockImplementation(((selector?: (s: AppState) => unknown) =>
    typeof selector === 'function' ? selector(state as unknown as AppState) : state
  ) as unknown as typeof useAppStore);
}

const calmCollector: AchievementDefinition = {
  id: 'theme-calming',
  version: 1,
  status: 'active',
  family: 'theme',
  category: 'calm',
  rule: { kind: 'finishedWithTag', tags: ['calming'], target: 1 },
  art: 'moon',
  copy: { title: { en: 'Calm Collector' }, earned: { en: 'Done' }, next: { en: 'Finish a calming book' } },
};

beforeEach(() => {
  mockRemote = [];
  mockListeners.length = 0;
});

describe('useProgressData', () => {
  it('counts finished books, not books that were only opened', () => {
    applyState({ readStoryIds: ['wombat', 'bear'], finishedStoryIds: ['wombat'] });

    const { result } = renderHook(() => useProgressData());

    expect(result.current.counters.storiesRead).toBe(1);
    expect(result.current.badges.find(b => b.id === 'first-story')?.status).toBe('earned');
  });

  it('still counts a finished book the catalogue no longer carries', () => {
    applyState({ finishedStoryIds: ['wombat', 'withdrawn'] });

    const { result } = renderHook(() => useProgressData());

    expect(result.current.counters.storiesRead).toBe(2);
  });

  it('shows an opened-but-unfinished book as no progress', () => {
    applyState({ readStoryIds: ['wombat'] });

    const { result } = renderHook(() => useProgressData());

    expect(result.current.badges.find(b => b.id === 'first-story')?.status).not.toBe('earned');
  });

  it('keeps a badge earned on another device, even when this one has not met it', () => {
    applyState({ earnedAchievementIds: ['story-adventurer'] });

    const { result } = renderHook(() => useProgressData());

    expect(result.current.badges.find(b => b.id === 'story-adventurer')?.status).toBe('earned');
  });

  it('adds the CMS badges once they have been read from the device', async () => {
    mockRemote = [calmCollector];
    applyState({ finishedStoryIds: ['wombat'] });

    const { result } = renderHook(() => useProgressData());

    await waitFor(() => expect(result.current.badges.find(b => b.id === 'theme-calming')?.status).toBe('earned'));
    expect(result.current.badges.find(b => b.id === 'theme-calming')?.title).toBe('Calm Collector');
  });

  it('picks up definitions a later sync brings', async () => {
    applyState({});
    const { result } = renderHook(() => useProgressData());
    await waitFor(() => expect(mockListeners).toHaveLength(1));

    mockRemote = [calmCollector];
    await act(async () => {
      mockListeners.forEach(listener => listener());
    });

    await waitFor(() => expect(result.current.badges.some(b => b.id === 'theme-calming')).toBe(true));
  });

  it('judges page challenges from the recorded counts', async () => {
    mockRemote = [{ ...calmCollector, id: 'music-maker', rule: { kind: 'challenges', interaction: 'music', target: 2 } }];
    applyState({ challengeCounts: { music: 2 } });

    const { result } = renderHook(() => useProgressData());

    await waitFor(() => expect(result.current.badges.find(b => b.id === 'music-maker')?.status).toBe('earned'));
  });

  it('stops listening when it goes away', async () => {
    applyState({});
    const { unmount } = renderHook(() => useProgressData());
    await waitFor(() => expect(mockListeners).toHaveLength(1));

    unmount();

    expect(mockListeners).toHaveLength(0);
  });
});
