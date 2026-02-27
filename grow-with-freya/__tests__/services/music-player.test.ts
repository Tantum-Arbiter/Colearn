import { musicPlayer } from '@/services/music-player';
import { MusicTrack, MusicPlaylist } from '@/types/music';

// Get the mock functions from the expo-audio mock
const {
  createAudioPlayer,
  setAudioModeAsync,
  createMockAudioPlayer,
} = jest.requireMock('expo-audio');

// Mock background music service to prevent interference
jest.mock('@/services/background-music', () => ({
  backgroundMusic: {
    getIsPlaying: jest.fn().mockReturnValue(false),
    getIsLoaded: jest.fn().mockReturnValue(true),
    stop: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock track data
const mockTrack: MusicTrack = {
  id: 'test-track',
  title: 'Test Track',
  artist: 'Test Artist',
  category: 'bedtime',
  duration: 180,
  audioSource: { uri: 'test://audio.mp3' },
  isAvailable: true,
  volume: 0.5,
};

const mockTrack2: MusicTrack = {
  id: 'test-track-2',
  title: 'Test Track 2',
  artist: 'Test Artist',
  category: 'bedtime',
  duration: 240,
  audioSource: { uri: 'test://audio2.mp3' },
  isAvailable: true,
  volume: 0.6,
};

const mockPlaylist: MusicPlaylist = {
  id: 'test-playlist',
  title: 'Test Playlist',
  category: 'bedtime',
  tracks: [mockTrack, mockTrack2],
  isAvailable: true,
};

describe('MusicPlayerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the service state
    musicPlayer.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await musicPlayer.initialize();
      // Music player doesn't call setAudioModeAsync directly - it lets background music handle it
      const state = musicPlayer.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should return initial state', () => {
      const state = musicPlayer.getState();
      
      expect(state.currentTrack).toBeNull();
      expect(state.currentPlaylist).toBeNull();
      expect(state.playbackState).toBe('stopped');
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.volume).toBe(0.7);
      expect(state.isMuted).toBe(false);
      expect(state.repeatMode).toBe('none');
      expect(state.isShuffled).toBe(false);
    });

    it('should notify state change listeners', async () => {
      const listener = jest.fn();
      musicPlayer.onStateChange(listener);
      
      await musicPlayer.initialize();
      await musicPlayer.loadTrack(mockTrack);
      
      expect(listener).toHaveBeenCalled();
      
      musicPlayer.removeStateChangeListener(listener);
    });
  });

  describe('Track Loading', () => {
    beforeEach(async () => {
      await musicPlayer.initialize();
    });

    it('should load a track successfully', async () => {
      await musicPlayer.loadTrack(mockTrack);

      expect(createAudioPlayer).toHaveBeenCalledWith(
        mockTrack.audioSource,
        expect.objectContaining({
          updateInterval: 500,
        })
      );

      const state = musicPlayer.getState();
      expect(state.currentTrack).toEqual(mockTrack);
      expect(state.playbackState).toBe('stopped');
      expect(state.isLoading).toBe(false);
    });

    it('should handle missing audio source', async () => {
      const trackWithoutAudio = { ...mockTrack, audioSource: null };

      try {
        await musicPlayer.loadTrack(trackWithoutAudio);
      } catch {
        // Expected to throw
      }

      const state = musicPlayer.getState();
      expect(state.error).toContain('Audio file may be missing');
      expect(state.isLoading).toBe(false);
    });

    it('should handle track loading errors', async () => {
      createAudioPlayer.mockImplementationOnce(() => {
        throw new Error('Load failed');
      });

      try {
        await musicPlayer.loadTrack(mockTrack);
      } catch {
        // Expected to throw
      }

      const state = musicPlayer.getState();
      expect(state.error).toContain('Failed to load track');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Playlist Loading', () => {
    beforeEach(async () => {
      await musicPlayer.initialize();
    });

    it('should load a playlist successfully', async () => {
      await musicPlayer.loadPlaylist(mockPlaylist, 0);
      
      const state = musicPlayer.getState();
      expect(state.currentPlaylist).toEqual(mockPlaylist);
      expect(state.currentTrack).toEqual(mockTrack);
      expect(state.currentTrackIndex).toBe(0);
    });

    it('should load playlist at specific index', async () => {
      await musicPlayer.loadPlaylist(mockPlaylist, 1);
      
      const state = musicPlayer.getState();
      expect(state.currentTrack).toEqual(mockTrack2);
      expect(state.currentTrackIndex).toBe(1);
    });

    it('should handle empty playlist', async () => {
      const emptyPlaylist = { ...mockPlaylist, tracks: [] };
      
      await musicPlayer.loadPlaylist(emptyPlaylist);
      
      const state = musicPlayer.getState();
      expect(state.error).toBe('Playlist is empty');
    });

    it('should clamp invalid start index', async () => {
      await musicPlayer.loadPlaylist(mockPlaylist, 10);
      
      const state = musicPlayer.getState();
      expect(state.currentTrackIndex).toBe(1); // Last valid index
    });
  });

  describe('Playback Controls', () => {
    beforeEach(async () => {
      await musicPlayer.initialize();
      await musicPlayer.loadTrack(mockTrack);
    });

    it('should play track', async () => {
      await musicPlayer.play();

      // Verify state changes to playing
      const state = musicPlayer.getState();
      expect(state.playbackState).toBe('playing');
    });

    it('should pause track', async () => {
      await musicPlayer.play();
      await musicPlayer.pause();

      const state = musicPlayer.getState();
      expect(state.playbackState).toBe('paused');
    });

    it('should stop track', async () => {
      await musicPlayer.play();
      await musicPlayer.stop();

      const state = musicPlayer.getState();
      expect(state.playbackState).toBe('stopped');
      expect(state.currentTime).toBe(0);
    });

    it('should seek to position', async () => {
      await musicPlayer.seekTo(30);

      // Position is updated in state (debounced actual seek)
      const state = musicPlayer.getState();
      expect(state.currentTime).toBe(30);
    });

    it('should handle playback errors gracefully', async () => {
      // Create a player that throws on play
      createAudioPlayer.mockImplementationOnce(() => ({
        play: jest.fn(() => { throw new Error('Play failed'); }),
        pause: jest.fn(),
        release: jest.fn(),
        seekTo: jest.fn(),
        addListener: jest.fn(() => ({ remove: jest.fn() })),
        volume: 1,
        playing: false,
        currentTime: 0,
        duration: 0,
        loop: false,
      }));

      await musicPlayer.loadTrack(mockTrack);
      await musicPlayer.play();

      const state = musicPlayer.getState();
      expect(state.error).toBe('Failed to play track');
    });
  });

  describe('Volume Controls', () => {
    beforeEach(async () => {
      await musicPlayer.initialize();
      await musicPlayer.loadTrack(mockTrack);
    });

    it('should set volume', async () => {
      await musicPlayer.setVolume(0.8);

      const state = musicPlayer.getState();
      expect(state.volume).toBe(0.8);
    });

    it('should clamp volume to valid range', async () => {
      await musicPlayer.setVolume(1.5);

      const state = musicPlayer.getState();
      expect(state.volume).toBe(1);
    });

    it('should toggle mute', async () => {
      await musicPlayer.toggleMute();

      let state = musicPlayer.getState();
      expect(state.isMuted).toBe(true);

      await musicPlayer.toggleMute();

      state = musicPlayer.getState();
      expect(state.isMuted).toBe(false);
    });
  });

  describe('Playlist Navigation', () => {
    beforeEach(async () => {
      await musicPlayer.initialize();
      await musicPlayer.loadPlaylist(mockPlaylist, 0);
    });

    it('should go to next track', async () => {
      await musicPlayer.next();

      const state = musicPlayer.getState();
      expect(state.currentTrack).toEqual(mockTrack2);
      expect(state.currentTrackIndex).toBe(1);
    });

    it('should go to previous track', async () => {
      await musicPlayer.loadPlaylist(mockPlaylist, 1);
      await musicPlayer.previous();

      const state = musicPlayer.getState();
      expect(state.currentTrack).toEqual(mockTrack);
      expect(state.currentTrackIndex).toBe(0);
    });

    it('should restart current track if more than 3 seconds in', async () => {
      // Play and seek to 5 seconds into the track
      await musicPlayer.play();
      await musicPlayer.seekTo(5);

      await musicPlayer.previous();

      // Should restart the track (position goes back to 0)
      const state = musicPlayer.getState();
      expect(state.currentTime).toBe(0);
    });
  });

  describe('Repeat and Shuffle', () => {
    beforeEach(async () => {
      await musicPlayer.initialize();
    });

    it('should set repeat mode', async () => {
      await musicPlayer.setRepeatMode('one');
      
      const state = musicPlayer.getState();
      expect(state.repeatMode).toBe('one');
    });

    it('should toggle shuffle', async () => {
      await musicPlayer.toggleShuffle();
      
      let state = musicPlayer.getState();
      expect(state.isShuffled).toBe(true);
      
      await musicPlayer.toggleShuffle();
      
      state = musicPlayer.getState();
      expect(state.isShuffled).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      await musicPlayer.initialize();
      await musicPlayer.loadTrack(mockTrack);

      // Add a state change listener to verify it gets cleared
      const listener = jest.fn();
      musicPlayer.onStateChange(listener);
      listener.mockClear();

      await musicPlayer.cleanup();

      // Verify playback stops and player is released
      const state = musicPlayer.getState();
      expect(state.playbackState).toBe('stopped');

      // After cleanup, state change listeners should be cleared
      // So changing state shouldn't trigger the listener
      await musicPlayer.setVolume(0.5);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
