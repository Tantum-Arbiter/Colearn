/**
 * Tests for MusicPlayerService.
 *
 * The player wraps expo-audio and coordinates with the background music
 * service: a track takes exclusive audio while it plays and hands it back when
 * it stops. Most of what matters is the state it publishes to subscribers and
 * which player calls it makes, so both are asserted rather than the audio.
 */

import { createAudioPlayer } from 'expo-audio';

import { MusicPlayerService } from '../../services/music-player';
import { backgroundMusic } from '../../services/background-music';
import type { MusicTrack, MusicPlaylist } from '@/types/music';

jest.mock('../../services/background-music', () => ({
  backgroundMusic: {
    getIsPlaying: jest.fn(() => false),
    stop: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    setVolume: jest.fn().mockResolvedValue(undefined),
  },
}));

const makeTrack = (overrides: Partial<MusicTrack> = {}): MusicTrack =>
  ({
    id: 'track-1',
    title: 'Gentle Rain',
    category: 'sleep',
    duration: 180,
    audioSource: 'gentle-rain.mp3',
    isAvailable: true,
    ...overrides,
  }) as MusicTrack;

const makePlaylist = (count = 3): MusicPlaylist =>
  ({
    id: 'playlist-1',
    title: 'Bedtime',
    tracks: Array.from({ length: count }, (_, i) =>
      makeTrack({ id: `track-${i}`, title: `Track ${i}` })
    ),
  }) as MusicPlaylist;

describe('MusicPlayerService', () => {
  let underTest: MusicPlayerService;
  let player: {
    play: jest.Mock;
    pause: jest.Mock;
    release: jest.Mock;
    seekTo: jest.Mock;
    addListener: jest.Mock;
    volume: number;
    loop: boolean;
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
    };
    (createAudioPlayer as jest.Mock).mockReturnValue(player);
    (backgroundMusic.getIsPlaying as jest.Mock).mockReturnValue(false);

    // a singleton, and cleanup() releases the player without resetting the
    // published state -- repeatMode in particular survives and changes what
    // track completion does, so put the modes back too
    underTest = MusicPlayerService.getInstance();
    await underTest.cleanup();
    await underTest.clearTrack();
    await underTest.setRepeatMode('none');
    if (underTest.getState().isShuffled) await underTest.toggleShuffle();
    if (underTest.getState().isMuted) await underTest.toggleMute();
    await underTest.setVolume(0.7);
    jest.clearAllMocks();
    (createAudioPlayer as jest.Mock).mockReturnValue(player);
    (backgroundMusic.getIsPlaying as jest.Mock).mockReturnValue(false);
  });

  describe('state and subscribers', () => {
    it('hands out a copy of its state', () => {
      const first = underTest.getState();
      first.volume = 0.1;

      expect(underTest.getState().volume).not.toBe(0.1);
    });

    it('notifies subscribers when the state moves', async () => {
      const listener = jest.fn();
      underTest.onStateChange(listener);

      await underTest.loadTrack(makeTrack());

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ currentTrack: expect.objectContaining({ id: 'track-1' }) })
      );
    });

    it('stops notifying once a listener is removed', async () => {
      const listener = jest.fn();
      underTest.onStateChange(listener);
      underTest.removeStateChangeListener(listener);

      await underTest.loadTrack(makeTrack());

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('loading a track', () => {
    it('creates a player and publishes the track', async () => {
      const track = makeTrack();

      await underTest.loadTrack(track);

      expect(createAudioPlayer).toHaveBeenCalledWith('gentle-rain.mp3', { updateInterval: 500 });
      expect(underTest.getState()).toMatchObject({
        currentTrack: track,
        playbackState: 'stopped',
        isLoading: false,
        currentTime: 0,
      });
    });

    it('loops a sleep track but not a sequence', async () => {
      await underTest.loadTrack(makeTrack({ subcategory: 'sleep' }));
      expect(player.loop).toBe(true);

      await underTest.loadTrack(makeTrack({ subcategory: 'sleep', isSequence: true }));
      expect(player.loop).toBe(false);
    });

    it('prefers the track volume over the player volume', async () => {
      await underTest.loadTrack(makeTrack({ volume: 0.25 }));

      expect(player.volume).toBe(0.25);
    });

    it('releases the previous player before loading another', async () => {
      await underTest.loadTrack(makeTrack({ id: 'first' }));
      player.release.mockClear();

      await underTest.loadTrack(makeTrack({ id: 'second' }));

      expect(player.release).toHaveBeenCalled();
    });

    it('reports a track with no audio and rethrows for the UI', async () => {
      await expect(
        underTest.loadTrack(makeTrack({ audioSource: undefined }))
      ).rejects.toThrow('Audio file not found');

      // the state carries the failure too, so a subscriber can show it
      expect(underTest.getState().error).toContain('Failed to load track');
      expect(underTest.getState().isLoading).toBe(false);
    });
  });

  describe('loading a playlist', () => {
    it('refuses an empty playlist', async () => {
      await underTest.loadPlaylist({ ...makePlaylist(0) });

      expect(underTest.getState().error).toBe('Playlist is empty');
      expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('clamps a start index beyond the end', async () => {
      await underTest.loadPlaylist(makePlaylist(3), 99);

      expect(underTest.getState().currentTrackIndex).toBe(2);
    });

    it('clamps a negative start index', async () => {
      await underTest.loadPlaylist(makePlaylist(3), -5);

      expect(underTest.getState().currentTrackIndex).toBe(0);
    });
  });

  describe('moving through a playlist', () => {
    it('wraps around to the first track after the last', async () => {
      await underTest.loadPlaylist(makePlaylist(3), 2);

      await underTest.next();

      expect(underTest.getState().currentTrackIndex).toBe(0);
    });

    it('wraps back to the last track from the first', async () => {
      await underTest.loadPlaylist(makePlaylist(3), 0);

      await underTest.previous();

      expect(underTest.getState().currentTrackIndex).toBe(2);
    });

    it('restarts the track instead of skipping back after three seconds', async () => {
      await underTest.loadPlaylist(makePlaylist(3), 1);
      await underTest.seekTo(10); // seekTo publishes currentTime straight away

      await underTest.previous();

      // stays on the same track, rewound to the start
      expect(underTest.getState().currentTrackIndex).toBe(1);
      expect(underTest.getState().currentTime).toBe(0);
    });

    it('skips to the previous track when barely into the current one', async () => {
      await underTest.loadPlaylist(makePlaylist(3), 1);
      await underTest.seekTo(1);

      await underTest.previous();

      expect(underTest.getState().currentTrackIndex).toBe(0);
    });

    it('does nothing on next when there is no playlist', async () => {
      await underTest.loadTrack(makeTrack());

      await underTest.next();

      expect(underTest.getState().currentTrack?.id).toBe('track-1');
    });
  });

  describe('transport controls', () => {
    it('warns and does nothing when playing with no track', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await underTest.play();

      expect(player.play).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('pauses and publishes the paused state', async () => {
      await underTest.loadTrack(makeTrack());

      await underTest.pause();

      expect(player.pause).toHaveBeenCalled();
      expect(underTest.getState().playbackState).toBe('paused');
    });

    it('rewinds to the start when stopped', async () => {
      await underTest.loadTrack(makeTrack());

      await underTest.stop();

      expect(player.seekTo).toHaveBeenCalledWith(0);
      expect(underTest.getState()).toMatchObject({
        playbackState: 'stopped',
        currentTime: 0,
      });
    });

    it('takes exclusive audio from the background music while a track plays', async () => {
      (backgroundMusic.getIsPlaying as jest.Mock).mockReturnValue(true);
      await underTest.loadTrack(makeTrack());

      await underTest.play();

      expect(backgroundMusic.stop).toHaveBeenCalled();
      expect(player.play).toHaveBeenCalled();
    });

    it('leaves the background music alone when it is not playing', async () => {
      (backgroundMusic.getIsPlaying as jest.Mock).mockReturnValue(false);
      await underTest.loadTrack(makeTrack());

      await underTest.play();

      expect(backgroundMusic.stop).not.toHaveBeenCalled();
    });
  });

  describe('volume and modes', () => {
    it.each([
      [1.5, 1],
      [-0.5, 0],
      [0.4, 0.4],
    ])('clamps a volume of %s to %s', async (input, expected) => {
      await underTest.loadTrack(makeTrack());

      await underTest.setVolume(input);

      expect(underTest.getState().volume).toBe(expected);
      expect(player.volume).toBe(expected);
    });

    it('still records the volume when no track is loaded', async () => {
      await underTest.setVolume(0.3);

      expect(underTest.getState().volume).toBe(0.3);
    });

    it('drops the player volume to zero when muted, and back when unmuted', async () => {
      await underTest.loadTrack(makeTrack());
      await underTest.setVolume(0.6);

      await underTest.toggleMute();
      expect(underTest.getState().isMuted).toBe(true);
      expect(player.volume).toBe(0);

      await underTest.toggleMute();
      expect(underTest.getState().isMuted).toBe(false);
      expect(player.volume).toBe(0.6);
    });

    it('records the repeat mode', async () => {
      await underTest.setRepeatMode('one');

      expect(underTest.getState().repeatMode).toBe('one');
    });

    it('flips shuffle on and off', async () => {
      expect(underTest.getState().isShuffled).toBe(false);

      await underTest.toggleShuffle();
      expect(underTest.getState().isShuffled).toBe(true);

      await underTest.toggleShuffle();
      expect(underTest.getState().isShuffled).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('releases the player and forgets its subscribers', async () => {
      const listener = jest.fn();
      underTest.onStateChange(listener);
      await underTest.loadTrack(makeTrack());
      player.release.mockClear();
      listener.mockClear();

      await underTest.cleanup();

      expect(player.release).toHaveBeenCalled();

      await underTest.loadTrack(makeTrack());
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('playback status updates', () => {
    // the service subscribes to the player; grab the callback it registered
    const emitStatus = async (status: Record<string, unknown>) => {
      const entry = player.addListener.mock.calls.find(
        ([event]) => event === 'playbackStatusUpdate'
      );
      await (entry?.[1] as (s: unknown) => Promise<void> | void)?.(status);
      // completion work is kicked off without being awaited by the handler,
      // so let the microtask queue drain before asserting on it
      await new Promise(resolve => setTimeout(resolve, 20));
    };

    it('publishes position and duration from the player', async () => {
      await underTest.loadTrack(makeTrack());

      await emitStatus({ currentTime: 12, duration: 180, playing: true, isBuffering: false });

      expect(underTest.getState()).toMatchObject({
        currentTime: 12,
        duration: 180,
        playbackState: 'playing',
      });
    });

    it.each([
      [{ playing: true, isBuffering: false }, 'playing'],
      [{ playing: false, isBuffering: true }, 'loading'],
      [{ playing: false, isBuffering: false }, 'paused'],
    ])('maps %o to the %s state', async (flags, expected) => {
      await underTest.loadTrack(makeTrack());

      await emitStatus({ currentTime: 5, duration: 180, ...flags });

      expect(underTest.getState().playbackState).toBe(expected);
    });

    it('stops and hands audio back when the last track finishes', async () => {
      await underTest.loadTrack(makeTrack({ subcategory: 'lullaby' }));

      // reaching the end while not playing is how completion is signalled
      await emitStatus({ currentTime: 180, duration: 180, playing: false, isBuffering: false });

      expect(underTest.getState().playbackState).toBe('stopped');
    });

    it('advances to the next track when one is left in the playlist', async () => {
      await underTest.loadPlaylist(makePlaylist(3), 0);

      await emitStatus({ currentTime: 180, duration: 180, playing: false, isBuffering: false });

      expect(underTest.getState().currentTrackIndex).toBe(1);
    });

    it('does not treat a mid-track update as completion', async () => {
      await underTest.loadPlaylist(makePlaylist(3), 0);

      await emitStatus({ currentTime: 30, duration: 180, playing: true, isBuffering: false });

      expect(underTest.getState().currentTrackIndex).toBe(0);
    });
  });

  describe('clearing the track', () => {
    it('releases the player and empties the state', async () => {
      await underTest.loadTrack(makeTrack());
      player.release.mockClear();

      await underTest.clearTrack();

      expect(player.pause).toHaveBeenCalled();
      expect(player.release).toHaveBeenCalled();
      expect(underTest.getState()).toMatchObject({
        currentTrack: null,
        currentPlaylist: null,
        playbackState: 'stopped',
        currentTime: 0,
        error: null,
      });
    });

    it('is safe to call with nothing loaded', async () => {
      await expect(underTest.clearTrack()).resolves.toBeUndefined();
    });
  });

  describe('initialisation', () => {
    it('initialises once and stays initialised', async () => {
      await expect(underTest.initialize()).resolves.toBeUndefined();
      await expect(underTest.initialize()).resolves.toBeUndefined();
    });
  });
});
