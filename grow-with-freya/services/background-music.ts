import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

// Debug logging - set to false for production performance
const DEBUG_LOGS = false;

// Single background music track
const BACKGROUND_TRACK = require('../assets/audio/background/classic-epic.mp3');

class BackgroundMusicService {
  private player: AudioPlayer | null = null;
  private isPlaying: boolean = false;
  private isLoaded: boolean = false;
  private volume: number = 0.18; // Default volume (18% - 60% of previous 30%)
  private isInitializing: boolean = false; // Prevent multiple initializations
  private fadeTimer: ReturnType<typeof setTimeout> | null = null; // Track fade operations
  private stateChangeCallbacks: (() => void)[] = []; // Callbacks for state changes
  private hasVolumeBeenSetByUser: boolean = false; // Track if user has explicitly set volume
  private volumeChangeCallbacks: ((volume: number) => void)[] = []; // Callbacks for volume changes
  private isMuted: boolean = false; // Track if user has muted the music
  private statusListener: { remove: () => void } | null = null;

  /**
   * Initialize and load the background music
   */
  async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.isLoaded || this.isInitializing) {
      DEBUG_LOGS && console.log('Background music already initialized or initializing');
      return;
    }

    this.isInitializing = true;

    try {
      // Set audio mode for iOS/iPad compatibility - FORCE exclusive audio control
      // This is the single source of audio mode configuration for the entire app
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix', // Exclusive audio - prevents multiple audio sources
      });
      DEBUG_LOGS && console.log('Audio mode configured: doNotMix for exclusive audio control');

      // Create the audio player with expo-audio
      this.player = createAudioPlayer(BACKGROUND_TRACK, {
        updateInterval: 500,
      });

      // Configure player settings
      this.player.loop = true;
      this.player.volume = this.volume;

      // Set up playback status update listener
      this.statusListener = this.player.addListener('playbackStatusUpdate', this.onPlaybackStatusUpdate);

      this.isLoaded = true;
      this.isInitializing = false;

      DEBUG_LOGS && console.log('Background music initialized with expo-audio');
    } catch (error) {
      console.error('Failed to initialize background music:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.warn('To fix this: Check that audio files exist in assets/audio/background/');
      this.isInitializing = false;
      // Don't throw - allow app to continue without music
    }
  }

  /**
   * Start playing background music
   * This also clears the muted flag since user is explicitly requesting playback
   */
  async play(): Promise<void> {
    // Clear muted flag when explicitly playing
    this.isMuted = false;

    // Auto-reinitialize if the music was cleaned up
    if (!this.isLoaded || !this.player) {
      DEBUG_LOGS && console.log('Background music not loaded - reinitializing...');
      await this.initialize();
      if (!this.isLoaded || !this.player) {
        console.warn('Failed to reinitialize background music');
        return;
      }
    }

    try {
      // Check if already playing
      if (this.player.playing) {
        DEBUG_LOGS && console.log('Background music already playing (verified by status)');
        this.isPlaying = true;
        return;
      }

      if (!this.isPlaying) {
        // Only set volume if user hasn't explicitly set it (e.g., during initial app startup)
        if (!this.hasVolumeBeenSetByUser) {
          this.player.volume = this.volume;
          console.log(`Background music started with default volume: ${this.volume}`);
        } else {
          DEBUG_LOGS && console.log('Background music started (preserving user-set volume)');
        }
        this.player.play();
        this.isPlaying = true;
        this.notifyStateChange(); // Notify state change
      } else {
        DEBUG_LOGS && console.log('Background music already playing (by flag)');
      }
    } catch (error) {
      console.error('Failed to play background music:', error);
      console.error('Play error details:', JSON.stringify(error, null, 2));
      console.warn('This might be due to:');
      console.warn('1. Invalid or corrupted audio file');
      console.warn('2. Device audio system issues');
      console.warn('3. Audio format not supported on this device');
    }
  }

  /**
   * Pause background music (does NOT set muted flag - use mute() to persist across tracks)
   */
  async pause(): Promise<void> {
    if (!this.isLoaded || !this.player) {
      DEBUG_LOGS && console.log('Background music not loaded, cannot pause');
      return;
    }

    try {
      DEBUG_LOGS && console.log('Attempting to pause background music, current state:', this.isPlaying);

      // Pause the player
      this.player.pause();
      this.isPlaying = false;

      // Verify the pause worked by checking the actual status
      if (this.player.playing) {
        console.warn('Background music still playing after pause attempt');
        // expo-audio doesn't have a separate stop method, pause is the way to stop
        this.player.pause();
        this.isPlaying = false;
        DEBUG_LOGS && console.log('Background music paused forcefully');
      } else {
        DEBUG_LOGS && console.log('Background music successfully paused');
      }
      this.notifyStateChange(); // Notify state change
    } catch (error) {
      console.warn('Failed to pause background music:', error);
      // Force the state to false even if pause failed
      this.isPlaying = false;
    }
  }

  /**
   * Stop background music (resets to beginning)
   */
  async stop(): Promise<void> {
    if (!this.isLoaded || !this.player) {
      return;
    }

    try {
      this.player.pause();
      this.player.seekTo(0); // Reset to beginning
      this.isPlaying = false;
      DEBUG_LOGS && console.log('Background music stopped');
      this.notifyStateChange(); // Notify state change
    } catch (error) {
      console.warn('Failed to stop background music:', error);
    }
  }

  /**
   * Mute background music - this persists across track changes
   * When muted, new tracks won't auto-play when the current track finishes
   */
  async mute(): Promise<void> {
    DEBUG_LOGS && console.log('Muting background music (persists across tracks)');
    this.isMuted = true;
    await this.pause();
    this.notifyStateChange();
  }

  /**
   * Unmute background music and optionally resume playing
   */
  async unmute(resumePlayback: boolean = true): Promise<void> {
    console.log(`Unmuting background music (resumePlayback: ${resumePlayback})`);
    this.isMuted = false;
    if (resumePlayback) {
      await this.play();
    }
    this.notifyStateChange();
  }

  /**
   * Check if music is muted (persists across tracks)
   */
  getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  async setVolume(volume: number): Promise<void> {
    const newVolume = Math.max(0, Math.min(1, volume));
    this.volume = newVolume;
    this.hasVolumeBeenSetByUser = true; // Mark that user has explicitly set volume

    if (this.isLoaded && this.player) {
      try {
        this.player.volume = newVolume;
        console.log(`Background music volume set to ${newVolume} (user-controlled)`);
      } catch (error) {
        console.warn('Failed to set background music volume:', error);
      }
    }

    // Notify all volume change callbacks
    this.notifyVolumeChange(newVolume);
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Register a callback for state changes
   */
  onStateChange(callback: () => void): () => void {
    this.stateChangeCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register a callback for volume changes
   */
  onVolumeChange(callback: (volume: number) => void): () => void {
    this.volumeChangeCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.volumeChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.volumeChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all registered callbacks of state changes
   */
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Error in background music state change callback:', error);
      }
    });
  }

  /**
   * Notify all registered callbacks of volume changes
   */
  private notifyVolumeChange(volume: number): void {
    this.volumeChangeCallbacks.forEach(callback => {
      try {
        callback(volume);
      } catch (error) {
        console.warn('Error in background music volume change callback:', error);
      }
    });
  }

  /**
   * Check if music is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if music is loaded and ready
   */
  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Fade in the music gradually
   */
  async fadeIn(duration: number = 2000): Promise<void> {
    if (!this.isLoaded || !this.player) {
      return;
    }

    // Clear any existing fade operation
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    try {
      // Get current volume to start fade from there
      let startVolume = 0;

      // If not playing, start playing first
      if (!this.isPlaying) {
        this.player.volume = 0;
        await this.play();
        startVolume = 0;
      } else {
        // If already playing, get current volume and fade from there
        startVolume = this.player.volume;
      }

      // Use a single timeout instead of loop to prevent memory leaks
      const targetVolume = this.volume;
      const steps = 10; // Reduced steps to prevent memory issues
      const stepDuration = duration / steps;
      const volumeDifference = targetVolume - startVolume;
      const volumeStep = volumeDifference / steps;

      let currentStep = 0;
      const fadeStep = () => {
        if (currentStep >= steps || !this.player || !this.isLoaded) {
          return;
        }

        currentStep++;
        const newVolume = startVolume + (volumeStep * currentStep);
        this.player.volume = Math.min(targetVolume, Math.max(0, newVolume));

        if (currentStep < steps) {
          this.fadeTimer = setTimeout(fadeStep, stepDuration);
        }
      };

      fadeStep();
    } catch (error) {
      console.warn('Failed to fade in background music:', error);
    }
  }

  /**
   * Fade out the music gradually
   */
  async fadeOut(duration: number = 2000): Promise<void> {
    if (!this.isLoaded || !this.player || !this.isPlaying) {
      return;
    }

    // Clear any existing fade operation
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    return new Promise<void>((resolve) => {
      try {
        const currentVolume = this.volume;
        const steps = 5; // Reduced steps for faster fade
        const stepDuration = duration / steps;
        const volumeStep = currentVolume / steps;

        let currentStep = steps;

        // Add a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.warn('Fade out timeout - forcing completion');
          if (this.player && this.isLoaded) {
            this.pause().then(() => {
              if (this.player) this.player.volume = currentVolume;
            });
          }
          resolve();
        }, duration + 1000); // Give extra time beyond expected duration

        const fadeStep = async () => {
          try {
            if (currentStep <= 0 || !this.player || !this.isLoaded) {
              clearTimeout(timeoutId);
              if (this.player && this.isLoaded) {
                await this.pause();
                this.player.volume = currentVolume; // Restore original volume
              }
              resolve(); // Resolve the promise when fade is complete
              return;
            }

            currentStep--;
            this.player.volume = volumeStep * currentStep;

            if (currentStep > 0) {
              this.fadeTimer = setTimeout(fadeStep, stepDuration);
            } else {
              // Final step - pause and restore volume
              clearTimeout(timeoutId);
              await this.pause();
              if (this.player) this.player.volume = currentVolume;
              resolve(); // Resolve the promise when fade is complete
            }
          } catch (stepError) {
            clearTimeout(timeoutId);
            console.warn('Error in fade step:', stepError);
            resolve();
          }
        };

        fadeStep();
      } catch (error) {
        console.warn('Failed to fade out background music:', error);
        resolve(); // Resolve even on error to prevent hanging
      }
    });
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Clear any fade operations
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    // Remove status listener
    if (this.statusListener) {
      this.statusListener.remove();
      this.statusListener = null;
    }

    if (this.player) {
      try {
        this.player.pause();
        this.player.release();
        this.player = null;
        this.isLoaded = false;
        this.isPlaying = false;
        this.isInitializing = false;
        DEBUG_LOGS && console.log('Background music cleaned up');
      } catch (error) {
        console.warn('Failed to cleanup background music:', error);
      }
    }
  }

  /**
   * Handle playback status updates
   */
  private onPlaybackStatusUpdate = (status: { playing: boolean; error?: string }) => {
    try {
      // Only update isPlaying if it's different from current state
      // This prevents race conditions where manual pause/play calls get overridden
      if (this.isPlaying !== status.playing) {
        console.log(`Background music status update: ${this.isPlaying} -> ${status.playing}`);
        this.isPlaying = status.playing;
      }

      if (status.error) {
        console.warn('Background music playback error:', status.error);
        this.isPlaying = false;

        // Clear any fade operations on error
        if (this.fadeTimer) {
          clearTimeout(this.fadeTimer);
          this.fadeTimer = null;
        }
      }
    } catch (error) {
      console.warn('Error in playback status update:', error);
      this.isPlaying = false;
    }
  };
}

// Use global variable to persist singleton across hot reloads
// This prevents multiple instances from being created during development
declare global {
  // eslint-disable-next-line no-var
  var __backgroundMusicInstance: BackgroundMusicService | undefined;
}

// Export singleton instance - reuse existing instance if available (survives hot reloads)
// On Android, don't try to cleanup or touch the old instance at all - any access causes threading errors
export const backgroundMusic = global.__backgroundMusicInstance ?? new BackgroundMusicService();
global.__backgroundMusicInstance = backgroundMusic;
