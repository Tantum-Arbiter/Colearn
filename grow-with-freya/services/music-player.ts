import { Platform } from 'react-native';
import type { AVPlaybackStatus } from 'expo-av';
import {
  MusicTrack,
  MusicPlaylist,
  MusicPlayerState,
  PlaybackState,
  RepeatMode,
  MusicService
} from '@/types/music';
import { backgroundMusic } from './background-music';

// Debug logging - set to false for production performance
const DEBUG_LOGS = false;

// Lazy-load expo-av to prevent native initialization during hot reload
// This is critical for Android where ExoPlayer has threading requirements
let Audio: typeof import('expo-av').Audio | null = null;
const getAudio = async () => {
  if (!Audio) {
    const expoAv = await import('expo-av');
    Audio = expoAv.Audio;
  }
  return Audio;
};

// Helper to run audio operations on main/UI thread (required for Android ExoPlayer)
// Uses setImmediate which schedules on the next tick of the JS event loop (main thread)
const runOnMainThread = <T>(fn: () => Promise<T>): Promise<T> => {
  if (Platform.OS === 'android') {
    return new Promise((resolve, reject) => {
      // setImmediate runs on the next tick of the JS event loop, which is on the main thread
      setImmediate(() => {
        fn().then(resolve).catch(reject);
      });
    });
  }
  return fn();
};

/**
 * Music Player Service
 * Handles playback of individual music tracks and playlists
 */
export class MusicPlayerService implements MusicService {
  private static instance: MusicPlayerService | null = null;
  private sound: import('expo-av').Audio.Sound | null = null;
  private state: MusicPlayerState;
  private stateChangeCallbacks: ((state: MusicPlayerState) => void)[] = [];
  private isInitialized = false;
  private positionUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  private seekTimeout: ReturnType<typeof setTimeout> | null = null;
  private hasBackgroundMusicFaded = false;
  private wasBackgroundMusicPlayingBeforeTrack = false;

  private constructor() {
    this.state = {
      currentTrack: null,
      currentPlaylist: null,
      playbackState: 'stopped',
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      isMuted: false,
      repeatMode: 'none',
      isShuffled: false,
      currentTrackIndex: 0,
      isLoading: false,
      error: null,
      repeatCount: 0,
    };
  }

  public static getInstance(): MusicPlayerService {
    if (!MusicPlayerService.instance) {
      MusicPlayerService.instance = new MusicPlayerService();
    }
    return MusicPlayerService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Don't set audio mode here - let background music service handle it
      // to prevent conflicts between multiple audio mode configurations
      DEBUG_LOGS && console.log('Music player service initialized (audio mode managed by background music service)');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize music player service:', error);
      this.updateState({ error: 'Failed to initialize music player' });
    }
  }

  getState(): MusicPlayerState {
    return { ...this.state };
  }

  onStateChange(callback: (state: MusicPlayerState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  removeStateChangeListener(callback: (state: MusicPlayerState) => void): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  private updateState(updates: Partial<MusicPlayerState>): void {
    this.state = { ...this.state, ...updates };
    this.stateChangeCallbacks.forEach(callback => callback(this.state));
  }

  private onPlaybackStatusUpdate = (status: AVPlaybackStatus): void => {
    if (!status.isLoaded) return;

    this.updateState({
      currentTime: status.positionMillis ? status.positionMillis / 1000 : 0,
      duration: status.durationMillis ? status.durationMillis / 1000 : 0,
      playbackState: status.isPlaying ? 'playing' : 
                    status.isBuffering ? 'loading' : 'paused',
    });

    // Handle track completion
    if (status.didJustFinish && !status.isLooping) {
      this.handleTrackCompletion();
    }
  };

  private async handleTrackCompletion(): Promise<void> {
    const { repeatMode, currentPlaylist, currentTrackIndex, currentTrack, repeatCount } = this.state;

    // For tantrum tracks, automatically repeat 3 times with smooth transitions
    if (currentTrack?.subcategory === 'tantrum' && repeatCount < 2) {
      console.log(`Tantrum track completed ${repeatCount + 1}/3 times, repeating...`);

      // Increment repeat counter
      this.updateState({ repeatCount: repeatCount + 1 });

      // Small pause for smooth transition (0.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Restart the track - don't call play() as it would fade background music again
      await this.seekTo(0);
      if (this.sound) {
        await this.sound.playAsync();
        this.updateState({ playbackState: 'playing', error: null });
        console.log(`Repeating tantrum track: ${currentTrack.title} (${repeatCount + 1}/3)`);
      }
      return;
    }

    // If tantrum track has completed 3 times, stop and restore background music
    if (currentTrack?.subcategory === 'tantrum' && repeatCount >= 2) {
      DEBUG_LOGS && console.log('Tantrum track completed 3 times, stopping and restoring background music');
      this.updateState({ playbackState: 'stopped', repeatCount: 0 });
      await this.restoreBackgroundMusic();
      return;
    }

    // Handle other repeat modes for non-tantrum tracks
    if (repeatMode === 'one') {
      // Repeat current track
      await this.seekTo(0);
      await this.play();
      return;
    }

    if (currentPlaylist && currentTrackIndex < currentPlaylist.tracks.length - 1) {
      // Play next track in playlist
      await this.next();
    } else if (repeatMode === 'all' && currentPlaylist) {
      // Restart playlist
      await this.loadPlaylist(currentPlaylist, 0);
      await this.play();
    } else {
      // Stop playback and restore background music
      this.updateState({ playbackState: 'stopped' });
      await this.restoreBackgroundMusic();
    }
  }

  async loadTrack(track: MusicTrack): Promise<void> {
    // Skip audio on Android in dev mode to prevent ExoPlayer threading errors
    if (__DEV__ && Platform.OS === 'android') {
      DEBUG_LOGS && console.log('Music player disabled on Android in dev mode');
      return;
    }

    try {
      this.updateState({ isLoading: true, error: null });

      // Check if audio source is available
      if (!track.audioSource) {
        throw new Error(`Audio file not found for track: ${track.title}`);
      }



      // Unload previous sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Load new track
      // Enable looping for sleep tracks to match intended duration
      const shouldLoop = track.subcategory === 'sleep' && !track.isSequence;

      const AudioModule = await getAudio();
      const { sound } = await AudioModule.Sound.createAsync(
        track.audioSource,
        {
          shouldPlay: false,
          isLooping: shouldLoop,
          volume: track.volume || this.state.volume,
        }
      );

      this.sound = sound;
      // Note: On Android, this callback runs on a native thread pool
      // Only set callback on iOS to avoid threading issues on Android
      if (Platform.OS !== 'android') {
        this.sound.setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate);
      }

      this.updateState({
        currentTrack: track,
        currentPlaylist: null,
        currentTrackIndex: 0,
        isLoading: false,
        playbackState: 'stopped',
        currentTime: 0,
        repeatCount: 0, // Reset repeat counter for new track
      });

      // Reset background music fade flag for new track
      // BUT: Don't reset if we're loading a sequence track and background music was already faded
      // This prevents audio overlap during sleep sequence phase transitions
      const wasBackgroundMusicFaded = this.hasBackgroundMusicFaded;
      const isSequenceTrack = track.isSequence || (this.state.currentTrack?.isSequence);

      if (isSequenceTrack && wasBackgroundMusicFaded) {
        DEBUG_LOGS && console.log('Preserving background music fade state for sequence phase transition');
        // Keep the existing fade state for sequence transitions
      } else {
        DEBUG_LOGS && console.log('Resetting background music fade flag for new track');
        this.hasBackgroundMusicFaded = false;
      }

      console.log(`Loaded track: ${track.title}`);
    } catch (error) {
      console.error('Failed to load track:', error);

      // Clean up any partially loaded sound
      if (this.sound) {
        try {
          await this.sound.unloadAsync();
        } catch (unloadError) {
          console.warn('Failed to unload sound after error:', unloadError);
        }
        this.sound = null;
      }

      // Reset state to clean state when track fails to load
      this.updateState({
        currentTrack: null,
        currentPlaylist: null,
        currentTrackIndex: 0,
        isLoading: false,
        playbackState: 'stopped',
        currentTime: 0,
        duration: 0,
        error: `Failed to load track: ${track.title}. Audio file may be missing.`,
        repeatCount: 0,
      });

      // Re-throw the error so the UI can handle it appropriately
      throw error;
    }
  }

  async loadPlaylist(playlist: MusicPlaylist, startIndex: number = 0): Promise<void> {
    if (playlist.tracks.length === 0) {
      this.updateState({ error: 'Playlist is empty' });
      return;
    }

    const trackIndex = Math.max(0, Math.min(startIndex, playlist.tracks.length - 1));
    const track = playlist.tracks[trackIndex];

    try {
      this.updateState({ isLoading: true, error: null });

      // Check if audio source is available
      if (!track.audioSource) {
        throw new Error(`Audio file not found for track: ${track.title}`);
      }

      // Unload previous sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Load first track
      const AudioModule = await getAudio();
      const { sound } = await AudioModule.Sound.createAsync(
        track.audioSource,
        {
          shouldPlay: false,
          isLooping: false,
          volume: track.volume || this.state.volume,
        }
      );

      this.sound = sound;
      // Note: On Android, this callback runs on a native thread pool
      // Only set callback on iOS to avoid threading issues on Android
      if (Platform.OS !== 'android') {
        this.sound.setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate);
      }

      this.updateState({
        currentTrack: track,
        currentPlaylist: playlist,
        currentTrackIndex: trackIndex,
        isLoading: false,
        playbackState: 'stopped',
        currentTime: 0,
      });

      console.log(`Loaded playlist: ${playlist.title}, track: ${track.title}`);
    } catch (error) {
      console.error('Failed to load playlist:', error);

      // Clean up any partially loaded sound
      if (this.sound) {
        try {
          await this.sound.unloadAsync();
        } catch (unloadError) {
          console.warn('Failed to unload sound after error:', unloadError);
        }
        this.sound = null;
      }

      // Reset state to clean state when playlist fails to load
      this.updateState({
        currentTrack: null,
        currentPlaylist: null,
        currentTrackIndex: 0,
        isLoading: false,
        playbackState: 'stopped',
        currentTime: 0,
        duration: 0,
        error: `Failed to load playlist: ${playlist.title}. Audio file may be missing.`,
        repeatCount: 0,
      });

      // Re-throw the error so the UI can handle it appropriately
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.sound || !this.state.currentTrack) {
      console.warn('No track loaded');
      return;
    }

    try {
      DEBUG_LOGS && console.log('=== MUSIC PLAYER PLAY START ===');
      DEBUG_LOGS && console.log('Track:', this.state.currentTrack.title);
      DEBUG_LOGS && console.log('Is sequence track:', this.state.currentTrack.isSequence);
      DEBUG_LOGS && console.log('Background music playing before:', backgroundMusic.getIsPlaying());
      DEBUG_LOGS && console.log('hasBackgroundMusicFaded flag:', this.hasBackgroundMusicFaded);

      // FORCE AUDIO SESSION OVERRIDE: Set exclusive audio mode when track plays
      if (backgroundMusic.getIsPlaying() && !this.hasBackgroundMusicFaded) {
        DEBUG_LOGS && console.log('FORCING exclusive audio session for track playback');

        // Remember that background music was playing so we can restore it later
        this.wasBackgroundMusicPlayingBeforeTrack = true;

        // First, stop background music
        await backgroundMusic.stop();
        await backgroundMusic.cleanup();

        // Force set audio mode to be even more restrictive for track playback
        const AudioModule = await getAudio();
        await AudioModule.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1, // DO_NOT_MIX
          interruptionModeAndroid: 2, // DUCK_OTHERS - more compatible on Android
        });

        // Wait for audio session to be fully configured
        await new Promise(resolve => setTimeout(resolve, 500));

        DEBUG_LOGS && console.log('Exclusive audio session configured for track');
        this.hasBackgroundMusicFaded = true;
      } else if (this.hasBackgroundMusicFaded) {
        DEBUG_LOGS && console.log('Background music already stopped for this track');
        // Ensure background music is still stopped when resuming
        if (backgroundMusic.getIsPlaying()) {
          DEBUG_LOGS && console.log('Background music was restarted, stopping it again');
          await backgroundMusic.stop();
        }
      } else {
        DEBUG_LOGS && console.log('Background music not playing, no need to stop');
      }

      DEBUG_LOGS && console.log('Starting track playback:', this.state.currentTrack.title);
      await this.sound.playAsync();
      this.updateState({ playbackState: 'playing', error: null });
      DEBUG_LOGS && console.log('Track playing successfully');
      DEBUG_LOGS && console.log('Background music final status:', backgroundMusic.getIsPlaying());
      DEBUG_LOGS && console.log('=== MUSIC PLAYER PLAY END ===');
    } catch (error) {
      console.error('Failed to play track:', error);
      this.updateState({ error: 'Failed to play track' });
    }
  }

  async pause(): Promise<void> {
    if (!this.sound) return;

    try {
      await this.sound.pauseAsync();
      this.updateState({ playbackState: 'paused' });
      DEBUG_LOGS && console.log('Playback paused');

      // When pausing, restore background music but keep the fade flag
      // This prevents audio overlap when resuming the same track
      await this.restoreBackgroundMusic();
    } catch (error) {
      console.error('Failed to pause track:', error);
      this.updateState({ error: 'Failed to pause track' });
    }
  }

  async stop(): Promise<void> {
    if (!this.sound) return;

    try {
      await this.sound.stopAsync();
      this.updateState({
        playbackState: 'stopped',
        currentTime: 0
      });
      DEBUG_LOGS && console.log('Playback stopped');

      // Restore background music when track stops
      await this.restoreBackgroundMusic();
    } catch (error) {
      console.error('Failed to stop track:', error);
      this.updateState({ error: 'Failed to stop track' });
    }
  }

  // Clear current track and reset player to clean state
  async clearTrack(): Promise<void> {
    try {
      // Stop any currently playing audio immediately
      if (this.sound) {
        try {
          // Stop playback first, then unload
          await this.sound.stopAsync();
        } catch (stopError) {
          console.warn('Failed to stop sound during clear:', stopError);
        }

        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.updateState({
        currentTrack: null,
        currentPlaylist: null,
        currentTrackIndex: 0,
        playbackState: 'stopped',
        currentTime: 0,
        duration: 0,
        error: null,
        isLoading: false,
        repeatCount: 0,
      });

      DEBUG_LOGS && console.log('Track cleared and player reset');

      // Reset background music fade flag
      this.hasBackgroundMusicFaded = false;

      // Restore background music when track is cleared
      await this.restoreBackgroundMusic();
    } catch (error) {
      console.error('Failed to clear track:', error);
      // Force reset state even if unload fails
      this.sound = null;
      this.updateState({
        currentTrack: null,
        currentPlaylist: null,
        currentTrackIndex: 0,
        playbackState: 'stopped',
        currentTime: 0,
        duration: 0,
        error: null,
        isLoading: false,
        repeatCount: 0,
      });

      // Still try to restore background music even if clear failed
      await this.restoreBackgroundMusic();
    }
  }

  // Helper method to restore background music
  private async restoreBackgroundMusic(): Promise<void> {
    try {
      if (!this.state.currentTrack || this.state.playbackState === 'paused') {
        DEBUG_LOGS && console.log('Restoring background music (reinitialize if needed)');
        DEBUG_LOGS && console.log('wasBackgroundMusicPlayingBeforeTrack:', this.wasBackgroundMusicPlayingBeforeTrack);

        if (!backgroundMusic.getIsLoaded()) {
          DEBUG_LOGS && console.log('Background music was unloaded, reinitializing...');
          await backgroundMusic.initialize();
        }

        // Start playing if background music was playing before a track was started
        // Use our saved flag since backgroundMusic.getIsPlaying() will be false after stop/cleanup
        if (this.wasBackgroundMusicPlayingBeforeTrack) {
          DEBUG_LOGS && console.log('Background music was playing before track, restoring it');
          await backgroundMusic.play();
        } else if (backgroundMusic.getIsPlaying()) {
          DEBUG_LOGS && console.log('Background music was already playing, ensuring it continues');
          await backgroundMusic.play();
        } else {
          DEBUG_LOGS && console.log('Background music was not playing, respecting user\'s pause/mute state');
        }

        if (!this.state.currentTrack) {
          DEBUG_LOGS && console.log('Resetting background music fade flag and restore flag (track cleared)');
          this.hasBackgroundMusicFaded = false;
          this.wasBackgroundMusicPlayingBeforeTrack = false;
        } else {
          DEBUG_LOGS && console.log('Keeping background music fade flag (track paused, may resume)');
        }
      }
    } catch (error) {
      console.warn('Failed to restore background music:', error);
    }
  }

  async next(): Promise<void> {
    const { currentPlaylist, currentTrackIndex, isShuffled } = this.state;
    
    if (!currentPlaylist || currentPlaylist.tracks.length <= 1) return;

    let nextIndex: number;
    
    if (isShuffled) {
      // Random next track (excluding current)
      do {
        nextIndex = Math.floor(Math.random() * currentPlaylist.tracks.length);
      } while (nextIndex === currentTrackIndex && currentPlaylist.tracks.length > 1);
    } else {
      // Sequential next track
      nextIndex = (currentTrackIndex + 1) % currentPlaylist.tracks.length;
    }

    await this.loadPlaylist(currentPlaylist, nextIndex);
  }

  async previous(): Promise<void> {
    const { currentPlaylist, currentTrackIndex, currentTime } = this.state;
    
    if (!currentPlaylist) return;

    // If more than 3 seconds into track, restart current track
    if (currentTime > 3) {
      await this.seekTo(0);
      return;
    }

    // Otherwise go to previous track
    if (currentPlaylist.tracks.length > 1) {
      const prevIndex = currentTrackIndex === 0 
        ? currentPlaylist.tracks.length - 1 
        : currentTrackIndex - 1;
      
      await this.loadPlaylist(currentPlaylist, prevIndex);
    }
  }

  async seekTo(position: number): Promise<void> {
    if (!this.sound) return;

    // Clear any pending seek operation
    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
    }

    // Update UI immediately for responsiveness
    this.updateState({ currentTime: position });

    // Debounce the actual seek operation to prevent "Seeking interrupted" errors
    this.seekTimeout = setTimeout(async () => {
      try {
        if (this.sound) {
          // Ensure audio operations run on main thread (required for Android)
          await runOnMainThread(() => this.sound!.setPositionAsync(position * 1000));
        }
      } catch (error) {
        console.warn('Seek operation failed:', error);
        // Don't show error to user for seek failures - they're usually harmless
      }
      this.seekTimeout = null;
    }, 150); // 150ms debounce
  }

  async setVolume(volume: number): Promise<void> {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (this.sound) {
      try {
        // Ensure audio operations run on main thread (required for Android)
        await runOnMainThread(() => this.sound!.setVolumeAsync(clampedVolume));
      } catch (error) {
        console.error('Failed to set volume:', error);
      }
    }

    this.updateState({ volume: clampedVolume });
  }

  async toggleMute(): Promise<void> {
    const { isMuted, volume } = this.state;

    if (this.sound) {
      try {
        // Ensure audio operations run on main thread (required for Android)
        await runOnMainThread(() => this.sound!.setVolumeAsync(isMuted ? volume : 0));
      } catch (error) {
        console.error('Failed to toggle mute:', error);
      }
    }

    this.updateState({ isMuted: !isMuted });
  }

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    this.updateState({ repeatMode: mode });
    console.log(`Repeat mode set to: ${mode}`);
  }

  async toggleShuffle(): Promise<void> {
    this.updateState({ isShuffled: !this.state.isShuffled });
    console.log(`Shuffle ${this.state.isShuffled ? 'enabled' : 'disabled'}`);
  }

  async cleanup(): Promise<void> {
    if (this.positionUpdateTimer) {
      clearInterval(this.positionUpdateTimer);
      this.positionUpdateTimer = null;
    }

    if (this.seekTimeout) {
      clearTimeout(this.seekTimeout);
      this.seekTimeout = null;
    }

    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
      this.sound = null;
    }

    this.stateChangeCallbacks = [];
    this.isInitialized = false;
    DEBUG_LOGS && console.log('Music player service cleaned up');
  }
}

// Export singleton instance
export const musicPlayer = MusicPlayerService.getInstance();
