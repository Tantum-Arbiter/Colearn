/**
 * Tests for BackgroundMusicService.
 *
 * The previous version of this suite mocked useAudioPlayer/AudioPlayer, but the
 * service calls createAudioPlayer -- so it was undefined, initialize() threw
 * into its own catch, and every test passed against a service that had never
 * loaded a player. The mock now matches what the service actually imports.
 */

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { backgroundMusic } from '@/services/background-music';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  AudioPlayer: jest.fn(),
}));

describe('BackgroundMusicService', () => {
  let player: {
    play: jest.Mock;
    pause: jest.Mock;
    release: jest.Mock;
    seekTo: jest.Mock;
    addListener: jest.Mock;
    volume: number;
    loop: boolean;
    playing: boolean;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    player = {
      play: jest.fn(),
      pause: jest.fn(),
      release: jest.fn(),
      seekTo: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      volume: 1,
      loop: false,
      playing: false,
    };
    (createAudioPlayer as jest.Mock).mockReturnValue(player);

    // a module-level singleton, so unload whatever a previous test left behind
    await backgroundMusic.cleanup();
    jest.clearAllMocks();
    (createAudioPlayer as jest.Mock).mockReturnValue(player);
  });

  describe('initialising', () => {
    it('creates a looping player and claims exclusive audio', async () => {
      await backgroundMusic.initialize();

      expect(setAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({ interruptionMode: 'doNotMix', playsInSilentMode: true })
      );
      expect(createAudioPlayer).toHaveBeenCalled();
      expect(player.loop).toBe(true);
      expect(backgroundMusic.getIsLoaded()).toBe(true);
    });

    it('does not build a second player when already loaded', async () => {
      await backgroundMusic.initialize();
      (createAudioPlayer as jest.Mock).mockClear();

      await backgroundMusic.initialize();

      expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('leaves the app usable when the audio session cannot be set', async () => {
      (setAudioModeAsync as jest.Mock).mockRejectedValueOnce(new Error('no audio'));

      await expect(backgroundMusic.initialize()).resolves.toBeUndefined();

      // it swallows rather than throwing, so the app can carry on silently
      expect(backgroundMusic.getIsLoaded()).toBe(false);
    });
  });

  describe('playing', () => {
    it('starts the player and reports itself playing', async () => {
      await backgroundMusic.initialize();

      await backgroundMusic.play();

      expect(player.play).toHaveBeenCalled();
      expect(backgroundMusic.getIsPlaying()).toBe(true);
    });

    it('loads itself on demand when play is called cold', async () => {
      await backgroundMusic.play();

      expect(createAudioPlayer).toHaveBeenCalled();
      expect(player.play).toHaveBeenCalled();
    });

    it('does not restart a player that is already going', async () => {
      await backgroundMusic.initialize();
      player.playing = true;

      await backgroundMusic.play();

      expect(player.play).not.toHaveBeenCalled();
      expect(backgroundMusic.getIsPlaying()).toBe(true);
    });

    it('pauses and reports itself stopped', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.play();

      await backgroundMusic.pause();

      expect(player.pause).toHaveBeenCalled();
      expect(backgroundMusic.getIsPlaying()).toBe(false);
    });

    it('rewinds to the start when stopped', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.play();

      await backgroundMusic.stop();

      expect(player.seekTo).toHaveBeenCalledWith(0);
      expect(backgroundMusic.getIsPlaying()).toBe(false);
    });

    it('ignores pause and stop before anything is loaded', async () => {
      await expect(backgroundMusic.pause()).resolves.toBeUndefined();
      await expect(backgroundMusic.stop()).resolves.toBeUndefined();
      expect(player.pause).not.toHaveBeenCalled();
    });
  });

  describe('muting', () => {
    it('pauses the music and stays muted', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.play();

      await backgroundMusic.mute();

      expect(backgroundMusic.getIsMuted()).toBe(true);
      expect(backgroundMusic.getIsPlaying()).toBe(false);
    });

    it('resumes on unmute by default', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.mute();
      player.play.mockClear();

      await backgroundMusic.unmute();

      expect(backgroundMusic.getIsMuted()).toBe(false);
      expect(player.play).toHaveBeenCalled();
    });

    it('can unmute without resuming', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.mute();
      player.play.mockClear();

      await backgroundMusic.unmute(false);

      expect(backgroundMusic.getIsMuted()).toBe(false);
      expect(player.play).not.toHaveBeenCalled();
    });

    it('clears the muted flag when play is called directly', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.mute();

      await backgroundMusic.play();

      expect(backgroundMusic.getIsMuted()).toBe(false);
    });
  });

  describe('volume', () => {
    it.each([
      [1.5, 1],
      [-0.5, 0],
      [0.42, 0.42],
    ])('clamps %s to %s and passes it to the player', async (input, expected) => {
      await backgroundMusic.initialize();

      await backgroundMusic.setVolume(input);

      expect(backgroundMusic.getVolume()).toBe(expected);
      expect(player.volume).toBe(expected);
    });

    it('remembers the volume even with no player loaded', async () => {
      await backgroundMusic.setVolume(0.33);

      expect(backgroundMusic.getVolume()).toBe(0.33);
    });

    it('does not reset the player volume on play once the user has set one', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.setVolume(0.9);
      // as if a fade had since moved the player's own level
      player.volume = 0.1;

      await backgroundMusic.play();

      // play must leave it alone rather than stamping the stored 0.9 back on
      expect(player.volume).toBe(0.1);
    });

  });

  describe('subscribers', () => {
    it('tells state listeners when playback changes, until they unsubscribe', async () => {
      await backgroundMusic.initialize();
      const listener = jest.fn();
      const unsubscribe = backgroundMusic.onStateChange(listener);

      await backgroundMusic.play();
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      listener.mockClear();
      await backgroundMusic.pause();

      expect(listener).not.toHaveBeenCalled();
    });

    it('tells volume listeners the new level, until they unsubscribe', async () => {
      const listener = jest.fn();
      const unsubscribe = backgroundMusic.onVolumeChange(listener);

      await backgroundMusic.setVolume(0.5);
      expect(listener).toHaveBeenCalledWith(0.5);

      unsubscribe();
      listener.mockClear();
      await backgroundMusic.setVolume(0.2);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('releases the player and reports itself unloaded', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.play();

      await backgroundMusic.cleanup();

      expect(player.pause).toHaveBeenCalled();
      expect(player.release).toHaveBeenCalled();
      expect(backgroundMusic.getIsLoaded()).toBe(false);
      expect(backgroundMusic.getIsPlaying()).toBe(false);
    });

    it('is safe to call twice', async () => {
      await backgroundMusic.initialize();

      await backgroundMusic.cleanup();

      await expect(backgroundMusic.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('fading', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('does nothing when nothing is loaded', async () => {
      await backgroundMusic.fadeIn(100);
      await backgroundMusic.fadeOut(100);

      expect(player.play).not.toHaveBeenCalled();
    });

    it('starts playback from silence and climbs to the target volume', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.setVolume(0.8);
      jest.useFakeTimers();

      await backgroundMusic.fadeIn(1000);
      expect(player.play).toHaveBeenCalled();

      // ten steps over the duration
      await jest.advanceTimersByTimeAsync(1000);

      expect(player.volume).toBeCloseTo(0.8, 5);
    });

    it('climbs in steps rather than jumping straight to the target', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.setVolume(1);
      jest.useFakeTimers();

      await backgroundMusic.fadeIn(1000);
      await jest.advanceTimersByTimeAsync(300);

      const partway = player.volume;
      expect(partway).toBeGreaterThan(0);
      expect(partway).toBeLessThan(1);
    });

    it('winds down to silence, pauses, then restores the volume', async () => {
      await backgroundMusic.initialize();
      await backgroundMusic.setVolume(0.6);
      await backgroundMusic.play();
      jest.useFakeTimers();

      const faded = backgroundMusic.fadeOut(500);
      await jest.advanceTimersByTimeAsync(600);
      await faded;

      expect(player.pause).toHaveBeenCalled();
      expect(backgroundMusic.getIsPlaying()).toBe(false);
      // the stored level is put back so the next play is not silent
      expect(player.volume).toBeCloseTo(0.6, 5);
    });

    it('does not fade out when it is not playing', async () => {
      await backgroundMusic.initialize();
      player.pause.mockClear();

      await backgroundMusic.fadeOut(100);

      expect(player.pause).not.toHaveBeenCalled();
    });
  });
});
