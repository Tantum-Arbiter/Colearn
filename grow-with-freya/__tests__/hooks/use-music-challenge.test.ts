// Mock dependencies before importing
jest.mock('@/utils/logger', () => ({
  Logger: {
    create: () => ({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    }),
  },
}));

const mockPlay = jest.fn();
const mockRelease = jest.fn();
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: mockPlay,
    release: mockRelease,
  })),
  AudioPlayer: jest.fn(),
}));

jest.mock('@/services/music-asset-registry', () => ({
  getInstrument: jest.fn((id: string) => {
    // Accept both "flute" and "flute_basic" (alias) for test compatibility
    if (id === 'flute_basic' || id === 'flute') {
      return {
        id: 'flute',
        family: 'flute',
        displayName: 'Magic Flute',
        description: 'A gentle flute with a light, airy sound',
        image: 1,
        notes: { C: 10, D: 11, E: 12, F: 13 },
        noteCount: 4,
        noteLayout: [
          { note: 'C', label: '⭐', color: '#4FC3F7', icon: 'star' },
          { note: 'D', label: '🌙', color: '#FFD54F', icon: 'moon' },
          { note: 'E', label: '🍃', color: '#81C784', icon: 'leaf' },
          { note: 'F', label: '🌸', color: '#F48FB1', icon: 'flower' },
        ],
      };
    }
    return undefined;
  }),
  getSong: jest.fn((id: string) => {
    if (id === 'test_song') {
      return { id: 'test_song', displayName: 'Test Song', audio: 99, duration: 2 };
    }
    return undefined;
  }),
  getInstrumentSong: jest.fn((baseSongId: string, _instrumentId?: string) => {
    if (baseSongId === 'test_song') {
      return { id: 'test_song', displayName: 'Test Song', audio: 99, duration: 2 };
    }
    return undefined;
  }),
  validateMusicChallengeAssets: jest.fn(() => []),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useMusicChallenge } from '@/hooks/use-music-challenge';
import type { MusicChallenge } from '@/types/story';
import { validateMusicChallengeAssets } from '@/services/music-asset-registry';

const createTestConfig = (overrides: Partial<MusicChallenge> = {}): MusicChallenge => ({
  enabled: true,
  instrumentId: 'flute_basic',
  promptText: 'Play the flute!',
  mode: 'guided',
  requiredSequence: ['C', 'D', 'E'],
  successSongId: 'test_song',
  autoPlaySuccessSong: false, // disable to simplify tests (no setTimeout)
  allowSkip: false,
  micRequired: false, // disable mic requirement for simpler testing
  fallbackAllowed: true,
  hintLevel: 'standard',
  ...overrides,
});

describe('useMusicChallenge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateMusicChallengeAssets as jest.Mock).mockReturnValue([]);
  });

  it('should start in idle state with no config', () => {
    const { result } = renderHook(() => useMusicChallenge(undefined));
    expect(result.current.state).toBe('idle');
    expect(result.current.instrument).toBeNull();
    expect(result.current.isComplete).toBe(false);
  });

  it('should resolve instrument from config', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));
    expect(result.current.instrument).toBeDefined();
    expect(result.current.instrument!.id).toBe('flute');
  });

  it('should transition to awaiting_input when started', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('awaiting_input');
  });

  it('should track note progress through the sequence', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    act(() => result.current.start());

    act(() => result.current.playNote('C'));
    expect(result.current.currentNoteIndex).toBe(1);
    expect(result.current.lastInputCorrect).toBe(true);

    act(() => result.current.playNote('D'));
    expect(result.current.currentNoteIndex).toBe(2);
  });

  it('should complete the challenge when full sequence is played', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useMusicChallenge(createTestConfig(), onComplete)
    );

    act(() => result.current.start());
    act(() => result.current.playNote('C'));
    act(() => result.current.playNote('D'));
    act(() => result.current.playNote('E'));

    expect(result.current.isComplete).toBe(true);
    expect(result.current.state).toBe('completed');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should increment failedAttempts on wrong note', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    act(() => result.current.start());
    act(() => result.current.playNote('C')); // correct
    act(() => result.current.playNote('F')); // wrong

    expect(result.current.failedAttempts).toBe(1);
    expect(result.current.lastInputCorrect).toBe(false);
  });

  it('should reset progress on retry', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    act(() => result.current.start());
    act(() => result.current.playNote('C'));
    act(() => result.current.playNote('D'));

    act(() => result.current.retry());

    expect(result.current.state).toBe('awaiting_input');
    expect(result.current.currentNoteIndex).toBe(0);
    expect(result.current.lastInputCorrect).toBeNull();
  });

  it('should ignore note presses when mic is required and breath is not active', () => {
    const { result } = renderHook(() =>
      useMusicChallenge(createTestConfig({ micRequired: true }))
    );

    act(() => result.current.start());
    act(() => result.current.playNote('C')); // breath not active

    expect(result.current.currentNoteIndex).toBe(0); // no progress
  });

  it('should accept notes when mic is required and breath IS active', () => {
    const { result } = renderHook(() =>
      useMusicChallenge(createTestConfig({ micRequired: true }))
    );

    act(() => result.current.start());
    act(() => result.current.setBreathActive(true));
    act(() => result.current.playNote('C'));

    expect(result.current.currentNoteIndex).toBe(1);
  });

  it('should go to error state when assets are missing', () => {
    (validateMusicChallengeAssets as jest.Mock).mockReturnValue(['instrument:missing']);

    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    expect(result.current.hasError).toBe(true);
    expect(result.current.missingAssets).toContain('instrument:missing');
  });

  it('should not start when assets are missing', () => {
    (validateMusicChallengeAssets as jest.Mock).mockReturnValue(['instrument:missing']);

    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    act(() => result.current.start());

    expect(result.current.state).toBe('error'); // stays in error, not awaiting_input
  });

  it('should reset to idle on cleanup', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    act(() => result.current.start());
    expect(result.current.state).toBe('awaiting_input');

    act(() => result.current.cleanup());
    expect(result.current.state).toBe('idle');
  });

  it('should ignore note presses when not in awaiting_input state', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    // Still in 'idle' state — not started
    act(() => result.current.playNote('C'));
    expect(result.current.currentNoteIndex).toBe(0);
  });

  it('should preview a note without advancing progress', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));

    act(() => result.current.previewNote('C'));

    expect(mockPlay).toHaveBeenCalled();
    expect(result.current.currentNoteIndex).toBe(0);
    expect(result.current.state).toBe('idle');
  });

  it('should report correct totalNotes from config', () => {
    const { result } = renderHook(() =>
      useMusicChallenge(createTestConfig({ requiredSequence: ['C', 'D', 'E', 'F'] }))
    );
    expect(result.current.totalNotes).toBe(4);
  });
});