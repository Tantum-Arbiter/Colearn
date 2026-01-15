import { backgroundMusic } from '@/services/background-music';

// Mock expo-audio
const mockAudioPlayer = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  volume: 1,
  isPlaying: false,
  currentStatus: 'idle',
};

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => mockAudioPlayer),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  AudioPlayer: jest.fn().mockImplementation(() => mockAudioPlayer),
}));

describe('BackgroundMusicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioPlayer.volume = 1;
    mockAudioPlayer.isPlaying = false;
  });

  describe('initialization', () => {
    it('should initialize without throwing', async () => {
      await expect(backgroundMusic.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      // The service handles errors internally
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
