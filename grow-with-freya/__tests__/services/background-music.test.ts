import { backgroundMusic } from '@/services/background-music';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn().mockResolvedValue(undefined),
          pauseAsync: jest.fn().mockResolvedValue(undefined),
          stopAsync: jest.fn().mockResolvedValue(undefined),
          setVolumeAsync: jest.fn().mockResolvedValue(undefined),
          unloadAsync: jest.fn().mockResolvedValue(undefined),
          setOnPlaybackStatusUpdate: jest.fn(),
        }
      })
    },
    INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS: 'mixWithOthers',
    INTERRUPTION_MODE_ANDROID_DUCK_OTHERS: 'duckOthers',
  }
}));

describe('BackgroundMusicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without throwing', async () => {
      await expect(backgroundMusic.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      const { Audio } = require('expo-av');
      Audio.Sound.createAsync.mockRejectedValueOnce(new Error('Failed to load'));
      
      await expect(backgroundMusic.initialize()).resolves.not.toThrow();
    });
  });

  describe('playback control', () => {
    beforeEach(async () => {
      await backgroundMusic.initialize();
    });

    it('should start playing music', async () => {
      await expect(backgroundMusic.play()).resolves.not.toThrow();
    });

    it('should pause music', async () => {
      await expect(backgroundMusic.pause()).resolves.not.toThrow();
    });

    it('should stop music', async () => {
      await expect(backgroundMusic.stop()).resolves.not.toThrow();
    });
  });

  describe('volume control', () => {
    beforeEach(async () => {
      await backgroundMusic.initialize();
    });

    it('should set volume within valid range', async () => {
      await backgroundMusic.setVolume(0.5);
      expect(backgroundMusic.getVolume()).toBe(0.5);
    });

    it('should clamp volume to valid range', async () => {
      await backgroundMusic.setVolume(1.5);
      expect(backgroundMusic.getVolume()).toBe(1);

      await backgroundMusic.setVolume(-0.5);
      expect(backgroundMusic.getVolume()).toBe(0);
    });
  });

  describe('fade effects', () => {
    beforeEach(async () => {
      await backgroundMusic.initialize();
    });

    it('should fade in without throwing', async () => {
      await expect(backgroundMusic.fadeIn(100)).resolves.not.toThrow();
    });

    it('should fade out without throwing', async () => {
      await expect(backgroundMusic.fadeOut(100)).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await backgroundMusic.initialize();
      await expect(backgroundMusic.cleanup()).resolves.not.toThrow();
    });
  });
});
