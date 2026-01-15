import { musicPlayer } from '@/services/music-player';
import { MusicTrack, MusicPlaylist } from '@/types/music';

// Create mock sound object
const mockSound = {
  playAsync: jest.fn().mockResolvedValue(undefined),
  pauseAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
  setVolumeAsync: jest.fn().mockResolvedValue(undefined),
  setPositionAsync: jest.fn().mockResolvedValue(undefined),
  setOnPlaybackStatusUpdate: jest.fn(),
};

const mockAudio = {
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  Sound: {
    createAsync: jest.fn().mockResolvedValue({ sound: mockSound }),
  },
  INTERRUPTION_MODE_IOS_DO_NOT_MIX: 'DO_NOT_MIX',
  INTERRUPTION_MODE_ANDROID_DO_NOT_MIX: 'DO_NOT_MIX',
};

// Mock expo-av (the music player still uses expo-av)
jest.mock('expo-av', () => ({
  Audio: mockAudio,
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
      expect(mockAudio.setAudioModeAsync).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockAudio.setAudioModeAsync.mockRejectedValueOnce(new Error('Init failed'));
      
      await musicPlayer.initialize();
      
      const state = musicPlayer.getState();
      expect(state.error).toBe('Failed to initialize music player');
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
      
      expect(mockAudio.Sound.createAsync).toHaveBeenCalledWith(
        mockTrack.audioSource,
        expect.objectContaining({
          shouldPlay: false,
          isLooping: false,
          volume: mockTrack.volume,
        })
      );
      
      const state = musicPlayer.getState();
      expect(state.currentTrack).toEqual(mockTrack);
      expect(state.playbackState).toBe('stopped');
      expect(state.isLoading).toBe(false);
    });

    it('should handle missing audio source', async () => {
      const trackWithoutAudio = { ...mockTrack, audioSource: null };
      
      await musicPlayer.loadTrack(trackWithoutAudio);
      
      const state = musicPlayer.getState();
      expect(state.error).toContain('Audio file may be missing');
      expect(state.isLoading).toBe(false);
    });

    it('should handle track loading errors', async () => {
      mockAudio.Sound.createAsync.mockRejectedValueOnce(new Error('Load failed'));
      
      await musicPlayer.loadTrack(mockTrack);
      
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
      
      expect(mockSound.playAsync).toHaveBeenCalled();
    });

    it('should pause track', async () => {
      await musicPlayer.pause();
      
      expect(mockSound.pauseAsync).toHaveBeenCalled();
    });

    it('should stop track', async () => {
      await musicPlayer.stop();
      
      expect(mockSound.stopAsync).toHaveBeenCalled();
    });

    it('should seek to position', async () => {
      await musicPlayer.seekTo(30);
      
      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(30000); // milliseconds
    });

    it('should handle playback errors gracefully', async () => {
      mockSound.playAsync.mockRejectedValueOnce(new Error('Play failed'));
      
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
      
      expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(0.8);
      
      const state = musicPlayer.getState();
      expect(state.volume).toBe(0.8);
    });

    it('should clamp volume to valid range', async () => {
      await musicPlayer.setVolume(1.5);
      
      const state = musicPlayer.getState();
      expect(state.volume).toBe(1);
    });

    it('should toggle mute', async () => {
      const initialVolume = musicPlayer.getState().volume;
      
      await musicPlayer.toggleMute();
      
      expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(0);
      
      let state = musicPlayer.getState();
      expect(state.isMuted).toBe(true);
      
      await musicPlayer.toggleMute();
      
      expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(initialVolume);
      
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
      // Simulate being 5 seconds into the track
      const state = musicPlayer.getState();
      state.currentTime = 5;
      
      await musicPlayer.previous();
      
      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(0);
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
      
      await musicPlayer.cleanup();
      
      expect(mockSound.unloadAsync).toHaveBeenCalled();
    });
  });
});
