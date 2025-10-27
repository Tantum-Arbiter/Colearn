import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useMusicPlayer } from '@/hooks/use-music-player';
import { MusicPlayerState } from '@/types/music';
import { musicPlayer } from '@/services/music-player';
import { MusicTrack } from '@/types/music';

// Mock the music player service
jest.mock('@/services/music-player', () => ({
  musicPlayer: {
    initialize: jest.fn(),
    getState: jest.fn(),
    onStateChange: jest.fn(),
    removeStateChangeListener: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    next: jest.fn(),
    previous: jest.fn(),
    seekTo: jest.fn(),
    setVolume: jest.fn(),
    toggleMute: jest.fn(),
    setRepeatMode: jest.fn(),
    toggleShuffle: jest.fn(),
    loadTrack: jest.fn(),
    loadPlaylist: jest.fn(),
  },
}));

// Mock AppState
const mockAppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};

jest.mock('react-native', () => ({
  AppState: mockAppState,
}));

const mockInitialState = {
  currentTrack: null,
  currentPlaylist: null,
  playbackState: 'stopped' as const,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  repeatMode: 'none' as const,
  isShuffled: false,
  currentTrackIndex: 0,
  isLoading: false,
  error: null,
  repeatCount: 0,
};

const mockTrack: MusicTrack = {
  id: 'test-track',
  title: 'Test Track',
  artist: 'Test Artist',
  category: 'bedtime',
  duration: 180,
  audioSource: { uri: 'test://audio.mp3' },
  isAvailable: true,
};

describe('useMusicPlayer', () => {
  const mockMusicPlayer = musicPlayer as jest.Mocked<typeof musicPlayer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMusicPlayer.getState.mockReturnValue(mockInitialState);
    mockMusicPlayer.initialize.mockResolvedValue();
  });

  it('should initialize music player on mount', async () => {
    renderHook(() => useMusicPlayer());

    await act(async () => {
      // Wait for initialization
    });

    expect(mockMusicPlayer.initialize).toHaveBeenCalled();
    expect(mockMusicPlayer.onStateChange).toHaveBeenCalled();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useMusicPlayer());

    expect(result.current.currentTrack).toBeNull();
    expect(result.current.playbackState).toBe('stopped');
    expect(result.current.volume).toBe(0.7);
    expect(result.current.isInitialized).toBe(false);
  });

  it('should update state when music player state changes', async () => {
    let stateChangeCallback: (state: MusicPlayerState) => void = () => {};
    
    mockMusicPlayer.onStateChange.mockImplementation((callback: (state: MusicPlayerState) => void) => {
      stateChangeCallback = callback;
    });

    const { result } = renderHook(() => useMusicPlayer());

    await act(async () => {
      // Simulate state change
      const newState = { ...mockInitialState, playbackState: 'playing' as const };
      stateChangeCallback(newState);
    });

    expect(result.current.playbackState).toBe('playing');
  });

  it('should provide playback control functions', () => {
    const { result } = renderHook(() => useMusicPlayer());

    expect(typeof result.current.play).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.next).toBe('function');
    expect(typeof result.current.previous).toBe('function');
    expect(typeof result.current.seekTo).toBe('function');
  });

  it('should provide volume control functions', () => {
    const { result } = renderHook(() => useMusicPlayer());

    expect(typeof result.current.setVolume).toBe('function');
    expect(typeof result.current.toggleMute).toBe('function');
  });

  it('should provide playlist control functions', () => {
    const { result } = renderHook(() => useMusicPlayer());

    expect(typeof result.current.setRepeatMode).toBe('function');
    expect(typeof result.current.toggleShuffle).toBe('function');
    expect(typeof result.current.loadTrack).toBe('function');
    expect(typeof result.current.loadPlaylist).toBe('function');
  });

  it('should call music player methods when control functions are used', async () => {
    const { result } = renderHook(() => useMusicPlayer());

    await act(async () => {
      await result.current.play();
    });
    expect(mockMusicPlayer.play).toHaveBeenCalled();

    await act(async () => {
      await result.current.pause();
    });
    expect(mockMusicPlayer.pause).toHaveBeenCalled();

    await act(async () => {
      await result.current.stop();
    });
    expect(mockMusicPlayer.stop).toHaveBeenCalled();

    await act(async () => {
      await result.current.seekTo(30);
    });
    expect(mockMusicPlayer.seekTo).toHaveBeenCalledWith(30);
  });

  it('should handle volume controls', async () => {
    const { result } = renderHook(() => useMusicPlayer());

    await act(async () => {
      await result.current.setVolume(0.8);
    });
    expect(mockMusicPlayer.setVolume).toHaveBeenCalledWith(0.8);

    await act(async () => {
      await result.current.toggleMute();
    });
    expect(mockMusicPlayer.toggleMute).toHaveBeenCalled();
  });

  it('should handle track loading', async () => {
    const { result } = renderHook(() => useMusicPlayer());

    await act(async () => {
      await result.current.loadTrack(mockTrack);
    });
    expect(mockMusicPlayer.loadTrack).toHaveBeenCalledWith(mockTrack);
  });

  it('should provide toggle play/pause functionality', async () => {
    const { result } = renderHook(() => useMusicPlayer());

    // Test pause when playing
    mockMusicPlayer.getState.mockReturnValue({
      ...mockInitialState,
      playbackState: 'playing',
    });

    await act(async () => {
      await result.current.togglePlayPause();
    });
    expect(mockMusicPlayer.pause).toHaveBeenCalled();

    // Test play when paused
    mockMusicPlayer.getState.mockReturnValue({
      ...mockInitialState,
      playbackState: 'paused',
    });

    await act(async () => {
      await result.current.togglePlayPause();
    });
    expect(mockMusicPlayer.play).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockMusicPlayer.play.mockRejectedValue(new Error('Play failed'));

    const { result } = renderHook(() => useMusicPlayer());

    await act(async () => {
      await result.current.play();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to play:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useMusicPlayer());

    unmount();

    expect(mockMusicPlayer.removeStateChangeListener).toHaveBeenCalled();
  });

  it('should handle app state changes', () => {
    renderHook(() => useMusicPlayer());

    expect(mockAppState.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });
});
