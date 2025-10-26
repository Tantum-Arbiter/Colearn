import { MusicPlayerService } from '@/services/music-player';
import { MusicTrack, MusicPlaylist } from '@/types/music';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn(),
    },
  },
}));

describe('MusicPlayerService Error Handling', () => {
  let musicPlayer: MusicPlayerService;
  
  beforeEach(async () => {
    // Create a new instance for each test
    musicPlayer = new (MusicPlayerService as any)();
    await musicPlayer.initialize();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await musicPlayer.clearTrack();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadTrack error handling', () => {
    it('should clear currentTrack when track fails to load', async () => {
      const mockTrack: MusicTrack = {
        id: 'test-track',
        title: 'Test Track',
        duration: 180,
        audioSource: { uri: 'mock://audio/file.mp3' } as any, // Mock audio source
        category: 'binaural-beats',
        subcategory: 'tantrum',
        isAvailable: true,
      };

      // Mock Audio.Sound.createAsync to throw an error
      const { Audio } = require('expo-av');
      Audio.Sound.createAsync.mockRejectedValueOnce(new Error('AVPlayerItem error -11800'));

      // Verify initial state
      expect(musicPlayer.getState().currentTrack).toBeNull();

      // Try to load track (should fail)
      await expect(musicPlayer.loadTrack(mockTrack)).rejects.toThrow();

      // Verify state is properly reset after error
      const state = musicPlayer.getState();
      expect(state.currentTrack).toBeNull();
      expect(state.currentPlaylist).toBeNull();
      expect(state.currentTrackIndex).toBe(0);
      expect(state.playbackState).toBe('stopped');
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toContain('Failed to load track: Test Track');
    });

    it('should handle missing audio source gracefully', async () => {
      const mockTrack: MusicTrack = {
        id: 'test-track',
        title: 'Test Track',
        duration: 180,
        audioSource: null as any, // Missing audio source
        category: 'binaural-beats',
        subcategory: 'tantrum',
        isAvailable: true,
      };

      // Try to load track with missing audio source
      await expect(musicPlayer.loadTrack(mockTrack)).rejects.toThrow('Audio file not found for track: Test Track');

      // Verify state is properly reset
      const state = musicPlayer.getState();
      expect(state.currentTrack).toBeNull();
      expect(state.error).toContain('Failed to load track: Test Track');
    });
  });

  describe('loadPlaylist error handling', () => {
    it('should clear currentTrack when playlist fails to load', async () => {
      const mockPlaylist: MusicPlaylist = {
        id: 'test-playlist',
        title: 'Test Playlist',
        tracks: [{
          id: 'test-track',
          title: 'Test Track',
          duration: 180,
          audioSource: { uri: 'mock://audio/file.mp3' } as any, // Mock audio source
          category: 'binaural-beats',
          subcategory: 'tantrum',
          isAvailable: true,
        }],
        category: 'binaural-beats',
      };

      // Mock Audio.Sound.createAsync to throw an error
      const { Audio } = require('expo-av');
      Audio.Sound.createAsync.mockRejectedValueOnce(new Error('AVPlayerItem error -11800'));

      // Try to load playlist (should fail)
      await expect(musicPlayer.loadPlaylist(mockPlaylist)).rejects.toThrow();

      // Verify state is properly reset after error
      const state = musicPlayer.getState();
      expect(state.currentTrack).toBeNull();
      expect(state.currentPlaylist).toBeNull();
      expect(state.currentTrackIndex).toBe(0);
      expect(state.playbackState).toBe('stopped');
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toContain('Failed to load playlist: Test Playlist');
    });

    it('should handle empty playlist gracefully', async () => {
      const emptyPlaylist: MusicPlaylist = {
        id: 'empty-playlist',
        title: 'Empty Playlist',
        tracks: [],
        category: 'binaural-beats',
      };

      // Try to load empty playlist
      await musicPlayer.loadPlaylist(emptyPlaylist);

      // Verify error is set but no exception is thrown
      const state = musicPlayer.getState();
      expect(state.error).toBe('Playlist is empty');
      expect(state.currentTrack).toBeNull();
      expect(state.currentPlaylist).toBeNull();
    });
  });

  describe('clearTrack functionality', () => {
    it('should reset all state when clearTrack is called', async () => {
      // First set some state manually to simulate a loaded track
      musicPlayer['updateState']({
        currentTrack: {
          id: 'test-track',
          title: 'Test Track',
          duration: 180,
          audioSource: null,
          category: 'binaural-beats',
          subcategory: 'tantrum',
          isAvailable: true,
        },
        currentPlaylist: null,
        currentTrackIndex: 1,
        playbackState: 'playing',
        currentTime: 30,
        duration: 180,
        error: 'Some error',
        isLoading: true,
      });

      // Call clearTrack
      await musicPlayer.clearTrack();

      // Verify all state is reset
      const state = musicPlayer.getState();
      expect(state.currentTrack).toBeNull();
      expect(state.currentPlaylist).toBeNull();
      expect(state.currentTrackIndex).toBe(0);
      expect(state.playbackState).toBe('stopped');
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should handle sound unload errors gracefully', async () => {
      // Mock a sound object that fails to unload
      const mockSound = {
        unloadAsync: jest.fn().mockRejectedValue(new Error('Unload failed')),
      };
      musicPlayer['sound'] = mockSound as any;

      // Set some state
      musicPlayer['updateState']({
        currentTrack: {
          id: 'test-track',
          title: 'Test Track',
          duration: 180,
          audioSource: null,
          category: 'binaural-beats',
          subcategory: 'tantrum',
          isAvailable: true,
        },
      });

      // Call clearTrack - should not throw even if unload fails
      await expect(musicPlayer.clearTrack()).resolves.not.toThrow();

      // Verify state is still reset despite unload error
      const state = musicPlayer.getState();
      expect(state.currentTrack).toBeNull();
      expect(musicPlayer['sound']).toBeNull();
    });
  });
});
