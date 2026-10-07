/**
 * The practise screen hears from the music challenge when a song has been played
 * through, and tells the learning plan, so a day of music on the island is
 * ticked off. Skipping a song is not finishing it: the skip button leaves the
 * challenge without a word, so only a true completion reaches the plan.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { PractiseScreen } from '@/components/music/practise-screen';
import { MUSIC_PRACTISE_ACTIVITY } from '@/data/learning-plan';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
jest.mock('expo-blur', () => ({ BlurView: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => <View style={style}>{children}</View> };
});
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: { name: string }) => <Text>{props.name}</Text> };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/stories/music-challenge-ui', () => ({ MusicChallengeUI: () => null }));
jest.mock('@/components/stories/music-sheet-overlay', () => ({ MusicSheetOverlay: () => null, MUSIC_SHEET_ANIM_MS: 10 }));
jest.mock('@/components/music/instrument-carousel', () => ({ InstrumentCarousel: () => null }));
jest.mock('@/components/ui/music-control', () => ({ MusicControl: () => null }));
jest.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }));
jest.mock('@/components/ui/earth-horizon', () => ({ EarthHorizon: () => null }));
jest.mock('@/components/ui/subscription-overlay', () => ({ SubscriptionOverlay: () => null }));
jest.mock('@/components/owl-guide', () => ({ OwlGuide: () => null }));
jest.mock('@/hooks/use-breath-detector', () => ({
  useBreathDetector: () => ({
    isBreathActive: false,
    isListening: false,
    useFallback: true,
    pauseForPlayback: jest.fn(async () => {}),
    resumeRecording: jest.fn(),
    ensurePlaybackMode: jest.fn(async () => {}),
    isInPlaybackMode: false,
  }),
}));
jest.mock('@/contexts/global-sound-context', () => ({
  useGlobalSound: () => ({ isMuted: false, masterVolume: 1, volume: 0.5, setVolume: jest.fn(), toggleMute: jest.fn() }),
}));
jest.mock('@/services/story-access-service', () => ({
  StoryAccessService: { isInstrumentUnlocked: () => true, isSongUnlocked: () => true },
}));

let completeFromChallenge: (() => void) | undefined;
jest.mock('@/hooks/use-music-challenge', () => ({
  useMusicChallenge: (_config: unknown, onComplete?: () => void) => {
    completeFromChallenge = onComplete;
    return {
      state: 'idle',
      hasCompleted: false,
      setBreathActive: jest.fn(),
      cleanup: jest.fn(),
    };
  },
}));

const mockRecordActivityFinished = jest.fn();
jest.mock('@/store/app-store', () => ({
  useAppStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      favoriteSongIds: [],
      toggleFavoriteSong: jest.fn(),
      recordActivityFinished: mockRecordActivityFinished,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('PractiseScreen, when a song has been played through', () => {
  beforeEach(() => {
    completeFromChallenge = undefined;
    mockRecordActivityFinished.mockClear();
  });

  it('tells the plan the practise activity was finished', () => {
    render(<PractiseScreen onBack={jest.fn()} isActive />);

    expect(completeFromChallenge).toBeDefined();
    act(() => { completeFromChallenge?.(); });

    expect(mockRecordActivityFinished).toHaveBeenCalledTimes(1);
    expect(mockRecordActivityFinished).toHaveBeenCalledWith(MUSIC_PRACTISE_ACTIVITY);
  });

  it('says nothing before the song is done', () => {
    render(<PractiseScreen onBack={jest.fn()} isActive />);

    expect(mockRecordActivityFinished).not.toHaveBeenCalled();
  });
});
