/**
 * What the reader reports when a page challenge is done or a book is
 * finished: the facts badges are judged from, and any badge the book itself
 * awards for that moment.
 */

import { act, renderHook } from '@testing-library/react-native';
import { useAchievementEvents } from '@/components/progress/use-achievement-events';
import type { Story } from '@/types/story';

jest.unmock('@/store/app-store');
const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

const snowy = {
  id: 'snowy',
  title: 'Snowy',
  category: 'bedtime',
  isAvailable: true,
  awards: [
    { achievementId: 'snowman-friend', trigger: 'finish' },
    { achievementId: 'snow-song', trigger: { challengePageId: 'snowy-4' } },
  ],
} as Story;

beforeEach(() => {
  useAppStore.setState({ storyProgress: {}, finishedStoryIds: [], challengeCounts: {}, earnedAchievementIds: [] });
});

describe('useAchievementEvents', () => {
  it('counts a page challenge by its kind and grants that page\'s award', () => {
    const { result } = renderHook(() => useAchievementEvents(snowy));

    act(() => result.current.challengeDone('snowy-4', 'music'));

    expect(useAppStore.getState().challengeCounts).toEqual({ music: 1 });
    expect(useAppStore.getState().earnedAchievementIds).toEqual(['snow-song']);
  });

  it('counts a challenge on a page with no award, and grants nothing', () => {
    const { result } = renderHook(() => useAchievementEvents(snowy));

    act(() => result.current.challengeDone('snowy-2', 'jigsaw'));

    expect(useAppStore.getState().challengeCounts).toEqual({ jigsaw: 1 });
    expect(useAppStore.getState().earnedAchievementIds).toEqual([]);
  });

  it('records the book as finished and grants its finish award', () => {
    const { result } = renderHook(() => useAchievementEvents(snowy));

    act(() => result.current.storyFinished());

    expect(useAppStore.getState().finishedStoryIds).toEqual(['snowy']);
    expect(useAppStore.getState().earnedAchievementIds).toEqual(['snowman-friend']);
  });

  it('finishes a book with no awards without granting anything', () => {
    const { result } = renderHook(() => useAchievementEvents({ ...snowy, awards: undefined }));

    act(() => result.current.storyFinished());

    expect(useAppStore.getState().finishedStoryIds).toEqual(['snowy']);
    expect(useAppStore.getState().earnedAchievementIds).toEqual([]);
  });
});
