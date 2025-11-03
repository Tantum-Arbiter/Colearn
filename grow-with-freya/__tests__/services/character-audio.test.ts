import { CharacterAudioManager, characterAudioManager } from '@/services/character-audio';
import { Audio } from 'expo-av';

// Mock expo-av
const mockSound = {
  playAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
  setVolumeAsync: jest.fn().mockResolvedValue(undefined),
  setOnPlaybackStatusUpdate: jest.fn(),
  getStatusAsync: jest.fn().mockResolvedValue({
    isLoaded: true,
    isPlaying: false,
    didJustFinish: false,
  }),
};

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: mockSound,
        status: {
          isLoaded: true,
          isPlaying: false,
        },
      }),
    },
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    INTERRUPTION_MODE_ANDROID_DUCK_OTHERS: 'duck_others',
    INTERRUPTION_MODE_IOS_DUCK_OTHERS: 'duck_others',
  },
}));

describe('CharacterAudioManager', () => {
  let audioManager: CharacterAudioManager;

  beforeEach(() => {
    audioManager = new CharacterAudioManager();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await audioManager.unloadAllCharacterAudio();
  });

  describe('loadCharacterAudio', () => {
    it('loads audio successfully', async () => {
      const result = await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );

      expect(result).toBe(true);
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
        { uri: 'https://example.com/sound.mp3' },
        expect.objectContaining({
          shouldPlay: false,
          volume: 1.0,
        })
      );
    });

    it('loads audio with custom options', async () => {
      const result = await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3',
        {
          volume: 0.5,
          fadeInDuration: 1000,
        }
      );

      expect(result).toBe(true);
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
        { uri: 'https://example.com/sound.mp3' },
        expect.objectContaining({
          shouldPlay: false,
          volume: 0.5,
        })
      );
    });

    it('handles loading errors gracefully', async () => {
      (Audio.Sound.createAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to load audio')
      );

      const result = await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/invalid.mp3'
      );

      expect(result).toBe(false);
    });

    it('does not reload already loaded audio', async () => {
      // Load audio first time
      await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );

      // Clear mock calls
      (Audio.Sound.createAsync as jest.Mock).mockClear();

      // Try to load same audio again
      const result = await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );

      expect(result).toBe(true);
      expect(Audio.Sound.createAsync).not.toHaveBeenCalled();
    });
  });

  describe('playCharacterAudio', () => {
    beforeEach(async () => {
      await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );
    });

    it('plays loaded audio successfully', async () => {
      const result = await audioManager.playCharacterAudio('test-character');

      expect(result).toBe(true);
      expect(mockSound.playAsync).toHaveBeenCalled();
    });

    it('plays audio with fade in', async () => {
      const result = await audioManager.playCharacterAudio('test-character', {
        fadeInDuration: 500,
      });

      expect(result).toBe(true);
      expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(0);
      expect(mockSound.playAsync).toHaveBeenCalled();
    });

    it('handles playing non-existent character audio', async () => {
      const result = await audioManager.playCharacterAudio('non-existent');

      expect(result).toBe(false);
      expect(mockSound.playAsync).not.toHaveBeenCalled();
    });

    it('handles playback errors gracefully', async () => {
      mockSound.playAsync.mockRejectedValueOnce(new Error('Playback failed'));

      const result = await audioManager.playCharacterAudio('test-character');

      expect(result).toBe(false);
    });
  });

  describe('stopCharacterAudio', () => {
    beforeEach(async () => {
      await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );
      await audioManager.playCharacterAudio('test-character');
    });

    it('stops playing audio successfully', async () => {
      const result = await audioManager.stopCharacterAudio('test-character');

      expect(result).toBe(true);
      expect(mockSound.stopAsync).toHaveBeenCalled();
    });

    it('stops audio with fade out', async () => {
      const result = await audioManager.stopCharacterAudio('test-character', {
        fadeOutDuration: 300,
      });

      expect(result).toBe(true);
      expect(mockSound.setVolumeAsync).toHaveBeenCalled();
      expect(mockSound.stopAsync).toHaveBeenCalled();
    });

    it('handles stopping non-existent character audio', async () => {
      const result = await audioManager.stopCharacterAudio('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('unloadCharacterAudio', () => {
    beforeEach(async () => {
      await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );
    });

    it('unloads character audio successfully', async () => {
      await audioManager.unloadCharacterAudio('test-character');

      expect(mockSound.unloadAsync).toHaveBeenCalled();
    });

    it('handles unloading non-existent character audio', async () => {
      await audioManager.unloadCharacterAudio('non-existent');

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe('unloadAllCharacterAudio', () => {
    beforeEach(async () => {
      await audioManager.loadCharacterAudio(
        'character1',
        'https://example.com/sound1.mp3'
      );
      await audioManager.loadCharacterAudio(
        'character2',
        'https://example.com/sound2.mp3'
      );
    });

    it('unloads all character audio', async () => {
      await audioManager.unloadAllCharacterAudio();

      expect(mockSound.unloadAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('setCharacterVolume', () => {
    beforeEach(async () => {
      await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );
    });

    it('sets character volume successfully', async () => {
      const result = await audioManager.setCharacterVolume('test-character', 0.7);

      expect(result).toBe(true);
      expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(0.7);
    });

    it('handles setting volume for non-existent character', async () => {
      const result = await audioManager.setCharacterVolume('non-existent', 0.5);

      expect(result).toBe(false);
    });

    it('clamps volume to valid range', async () => {
      await audioManager.setCharacterVolume('test-character', 1.5);
      expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(1.0);

      await audioManager.setCharacterVolume('test-character', -0.5);
      expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(0.0);
    });
  });

  describe('isCharacterAudioLoaded', () => {
    it('returns false for non-existent character', () => {
      const isLoaded = audioManager.isCharacterAudioLoaded('non-existent');
      expect(isLoaded).toBe(false);
    });

    it('returns true for loaded character', async () => {
      await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );

      const isLoaded = audioManager.isCharacterAudioLoaded('test-character');
      expect(isLoaded).toBe(true);
    });
  });

  describe('isCharacterAudioPlaying', () => {
    beforeEach(async () => {
      await audioManager.loadCharacterAudio(
        'test-character',
        'https://example.com/sound.mp3'
      );
    });

    it('returns false for non-playing character', async () => {
      const isPlaying = await audioManager.isCharacterAudioPlaying('test-character');
      expect(isPlaying).toBe(false);
    });

    it('returns false for non-existent character', async () => {
      const isPlaying = await audioManager.isCharacterAudioPlaying('non-existent');
      expect(isPlaying).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('exports a singleton instance', () => {
      expect(characterAudioManager).toBeInstanceOf(CharacterAudioManager);
    });

    it('singleton instance works correctly', async () => {
      const result = await characterAudioManager.loadCharacterAudio(
        'singleton-test',
        'https://example.com/sound.mp3'
      );

      expect(result).toBe(true);
      expect(characterAudioManager.isCharacterAudioLoaded('singleton-test')).toBe(true);
    });
  });
});
