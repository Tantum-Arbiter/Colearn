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
    pause: jest.fn(),
    release: mockRelease,
    seekTo: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    volume: 1,
    loop: false,
  })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
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

  validateMusicChallengeAssets: jest.fn(() => []),
  getPracticeSong: jest.fn(() => undefined),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useMusicChallenge } from '@/hooks/use-music-challenge';
import type { MusicChallenge } from '@/types/story';
import { validateMusicChallengeAssets, getPracticeSong } from '@/services/music-asset-registry';

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
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useMusicChallenge(createTestConfig(), onComplete)
    );

    act(() => result.current.start());
    act(() => result.current.playNote('C'));
    act(() => result.current.playNote('D'));
    act(() => result.current.playNote('E'));

    // After completing the sequence, the hook plays back the notes before
    // transitioning to 'completed'. Advance timers to skip the playback.
    expect(result.current.state).toBe('playing_success_song');
    act(() => jest.runAllTimers());

    expect(result.current.isComplete).toBe(true);
    expect(result.current.state).toBe('completed');
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
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

    // Still in 'idle' state -not started
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
describe('useMusicChallenge note events', () => {
  it('announces a pressed note starting and ending', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));
    const seen: string[] = [];
    result.current.noteEvents.subscribe(event => seen.push(`${event.source}:${event.note}:${event.phase}`));

    act(() => result.current.start());
    act(() => result.current.playNote('C'));
    act(() => { jest.advanceTimersByTime(200); });
    act(() => result.current.stopNote('C'));

    expect(seen).toEqual(['press:C:start', 'press:C:end']);
    jest.useRealTimers();
  });

  it('lets a quick tap sound for its minimum length before announcing the end', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));
    const seen: string[] = [];
    result.current.noteEvents.subscribe(event => seen.push(event.phase));

    act(() => result.current.start());
    act(() => result.current.playNote('C'));
    act(() => result.current.stopNote('C'));
    expect(seen).toEqual(['start']);

    act(() => { jest.advanceTimersByTime(120); });
    expect(seen).toEqual(['start', 'end']);
    jest.useRealTimers();
  });

  it('announces a previewed note with the preview source', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig()));
    const seen: string[] = [];
    result.current.noteEvents.subscribe(event => seen.push(`${event.source}:${event.note}:${event.phase}`));

    act(() => result.current.previewNote('D'));

    expect(seen).toEqual(['preview:D:start']);
  });

  it('keeps the same event bus across renders', () => {
    const { result, rerender } = renderHook(() => useMusicChallenge(createTestConfig()));
    const first = result.current.noteEvents;

    rerender({});

    expect(result.current.noteEvents).toBe(first);
  });
});

describe('useMusicChallenge completion melody', () => {
  const song = { id: 'twinkle', sequence: ['C', 'D', 'E'], requiredNotes: ['C', 'D', 'E'], bpm: 120, rhythm: [1, 1, 2] };

  beforeEach(() => {
    jest.useFakeTimers();
    (getPracticeSong as jest.Mock).mockImplementation((id: string) => (id === 'twinkle' ? song : undefined));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function complete(result: { current: ReturnType<typeof useMusicChallenge> }) {
    act(() => result.current.start());
    act(() => result.current.playNote('C'));
    act(() => result.current.playNote('D'));
    act(() => result.current.playNote('E'));
  }

  it('plays the melody back in rhythm, announcing each note as it sounds', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle' })));
    const seen: string[] = [];
    result.current.noteEvents.subscribe(event => {
      if (event.source === 'melody') seen.push(`${event.note}:${event.phase}`);
    });

    complete(result);
    expect(seen).toEqual(['C:start']);
    expect(result.current.playbackPosition).toEqual({ index: 0, tick: 1 });

    act(() => { jest.advanceTimersByTime(500); });
    expect(seen).toEqual(['C:start', 'C:end', 'D:start']);
    expect(result.current.playbackPosition).toEqual({ index: 1, tick: 2 });

    act(() => { jest.advanceTimersByTime(500); });
    expect(seen.slice(-1)).toEqual(['E:start']);
    expect(result.current.playbackPosition).toEqual({ index: 2, tick: 3 });

    act(() => { jest.advanceTimersByTime(999); });
    expect(result.current.state).toBe('playing_success_song');

    act(() => { jest.runAllTimers(); });
    expect(seen.slice(-1)).toEqual(['E:end']);
    expect(result.current.state).toBe('completed');
    expect(result.current.playbackPosition).toBeNull();
  });

  it('tells the bell how long each melody note sounds', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle' })));
    const durations: number[] = [];
    result.current.noteEvents.subscribe(event => {
      if (event.source === 'melody' && event.phase === 'start') durations.push(event.durationMs!);
    });

    complete(result);
    act(() => { jest.runAllTimers(); });

    expect(durations[2]).toBeGreaterThan(durations[0] * 1.8);
  });

  it('stops every sounding melody note before the next one starts', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle' })));
    let sounding = 0;
    let overlapped = false;
    result.current.noteEvents.subscribe(event => {
      if (event.source !== 'melody') return;
      sounding += event.phase === 'start' ? 1 : -1;
      if (sounding > 1) overlapped = true;
    });

    complete(result);
    act(() => { jest.runAllTimers(); });

    expect(overlapped).toBe(false);
  });

  it('ignores presses, previews and retries while the melody plays', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle' })));
    const seen: string[] = [];

    complete(result);
    result.current.noteEvents.subscribe(event => seen.push(`${event.source}:${event.phase}`));
    mockPlay.mockClear();
    act(() => result.current.playNote('C'));
    act(() => result.current.previewNote('C'));
    act(() => result.current.retry());

    expect(mockPlay).not.toHaveBeenCalled();
    expect(result.current.state).toBe('playing_success_song');
    expect(seen.filter(e => e.startsWith('press') || e.startsWith('preview'))).toEqual([]);
  });

  it('starts one melody when the final note lands twice through the asynchronous blow path', async () => {
    const session = {
      pauseForPlayback: jest.fn(() => Promise.resolve()),
      resumeRecording: jest.fn(),
      ensurePlaybackMode: jest.fn(() => Promise.resolve()),
      isInPlaybackMode: () => true,
      isListening: true,
    };
    const { result } = renderHook(() =>
      useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle', micRequired: true }), undefined, 1, session)
    );
    let starts = 0;
    result.current.noteEvents.subscribe(event => {
      if (event.source === 'melody' && event.phase === 'start' && event.note === 'C') starts++;
    });

    act(() => result.current.start());
    act(() => result.current.setBreathActive(true));
    for (const note of ['C', 'D']) {
      act(() => result.current.playNote(note));
      await act(async () => { await Promise.resolve(); });
    }
    act(() => {
      result.current.playNote('E');
      result.current.playNote('E');
    });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(result.current.state).toBe('playing_success_song');
    expect(starts).toBe(1);
  });

  it('never starts a second melody when the sequence completes twice in a row', () => {
    const { result } = renderHook(() => useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle' })));
    let starts = 0;
    result.current.noteEvents.subscribe(event => {
      if (event.source === 'melody' && event.phase === 'start' && event.note === 'C') starts++;
    });

    complete(result);
    act(() => result.current.playNote('E'));
    act(() => { jest.runAllTimers(); });

    expect(starts).toBe(1);
  });

  it('cancels the melody and its timers on cleanup without completing', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle' }), onComplete));
    const seen: string[] = [];
    result.current.noteEvents.subscribe(event => {
      if (event.source === 'melody') seen.push(`${event.note}:${event.phase}`);
    });

    complete(result);
    act(() => { jest.advanceTimersByTime(600); });
    act(() => result.current.cleanup());
    act(() => { jest.runAllTimers(); });

    expect(seen.slice(-1)).toEqual(['D:end']);
    expect(seen.filter(e => e === 'E:start')).toEqual([]);
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
    expect(result.current.playbackPosition).toBeNull();
  });

  it('releases the melody players when unmounted mid-song', () => {
    const { result, unmount } = renderHook(() => useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle' })));

    complete(result);
    mockRelease.mockClear();
    unmount();
    act(() => { jest.runAllTimers(); });

    expect(mockRelease).toHaveBeenCalled();
  });

  it('plays every entry for one beat when the song has no rhythm', () => {
    (getPracticeSong as jest.Mock).mockImplementation(() => ({ ...song, rhythm: undefined }));
    const { result } = renderHook(() => useMusicChallenge(createTestConfig({ requiredSequence: [], songId: 'twinkle' })));
    const starts: number[] = [];
    result.current.noteEvents.subscribe(event => {
      if (event.source === 'melody' && event.phase === 'start') starts.push(Date.now());
    });

    complete(result);
    act(() => { jest.runAllTimers(); });

    expect(starts[1] - starts[0]).toBe(500);
    expect(starts[2] - starts[1]).toBe(500);
  });
});
