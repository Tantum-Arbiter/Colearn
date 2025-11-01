import { Audio } from 'expo-av';
import { AVPlaybackStatus } from 'expo-av';

class BackgroundMusicService {
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isLoaded: boolean = false;
  private volume: number = 0.18; // Default volume (18% - 60% of previous 30%)
  private isInitializing: boolean = false; // Prevent multiple initializations
  private fadeTimer: ReturnType<typeof setTimeout> | null = null; // Track fade operations
  private stateChangeCallbacks: (() => void)[] = []; // Callbacks for state changes
  private hasVolumeBeenSetByUser: boolean = false; // Track if user has explicitly set volume
  private volumeChangeCallbacks: ((volume: number) => void)[] = []; // Callbacks for volume changes

  /**
   * Initialize and load the background music
   */
  async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.isLoaded || this.isInitializing) {
      console.log('Background music already initialized or initializing');
      return;
    }

    this.isInitializing = true;

    try {
      // Set audio mode for iOS/iPad compatibility - FORCE exclusive audio control
      // This is the single source of audio mode configuration for the entire app
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false, // Don't duck - we want exclusive control
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1, // DO_NOT_MIX - prevents multiple audio sources
        interruptionModeAndroid: 2, // DUCK_OTHERS - more compatible on Android
      });
      console.log('Audio mode configured: DO_NOT_MIX (iOS) / DUCK_OTHERS (Android) for audio control');

      // Load the background soundtrack with simple looping
      const audioSource = require('../assets/audio/background-soundtrack.wav');

      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        {
          shouldPlay: false,
          isLooping: true, // Simple native looping
          volume: this.volume,
          rate: 1.0,
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 10000, // Reduce update frequency to prevent memory leaks
        }
      );

      this.sound = sound;
      this.isLoaded = true;
      this.isInitializing = false;

      // Set up playback status update listener
      this.sound.setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdate);

      console.log('Background music initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background music:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.warn('To fix this: Add a valid audio file to assets/audio/background-soundtrack.wav');
      console.warn('On Android: Check that MODIFY_AUDIO_SETTINGS permission is granted');
      this.isInitializing = false;
      // Don't throw - allow app to continue without music
    }
  }

  /**
   * Start playing background music
   */
  async play(): Promise<void> {
    if (!this.isLoaded || !this.sound) {
      console.warn('Background music not loaded - please add a valid audio file to assets/audio/background-soundtrack.wav');
      return;
    }

    try {
      // Double-check the actual playback status to prevent overlaps
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        console.log('Background music already playing (verified by status)');
        this.isPlaying = true;
        return;
      }

      if (!this.isPlaying) {
        // Only set volume if user hasn't explicitly set it (e.g., during initial app startup)
        if (!this.hasVolumeBeenSetByUser) {
          await this.sound.setVolumeAsync(this.volume);
          console.log(`Background music started with default volume: ${this.volume}`);
        } else {
          console.log('Background music started (preserving user-set volume)');
        }
        await this.sound.playAsync();
        this.isPlaying = true;
        this.notifyStateChange(); // Notify state change
      } else {
        console.log('Background music already playing (by flag)');
      }
    } catch (error) {
      console.error('Failed to play background music:', error);
      console.error('Play error details:', JSON.stringify(error, null, 2));
      console.warn('This might be due to:');
      console.warn('1. Invalid or corrupted audio file');
      console.warn('2. Android audio permissions not granted');
      console.warn('3. Device audio system issues');
      console.warn('4. Audio format not supported on this device');
    }
  }

  /**
   * Pause background music
   */
  async pause(): Promise<void> {
    if (!this.isLoaded || !this.sound) {
      console.log('Background music not loaded, cannot pause');
      return;
    }

    try {
      console.log('Attempting to pause background music, current state:', this.isPlaying);

      // Always try to pause, regardless of isPlaying state (in case of state sync issues)
      await this.sound.pauseAsync();
      this.isPlaying = false;

      // Verify the pause worked by checking the actual status
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        console.log('Background music pause result - isPlaying:', status.isPlaying);
        this.isPlaying = status.isPlaying; // Sync with actual state

        if (status.isPlaying) {
          console.warn('Background music still playing after pause attempt, trying stop instead');
          await this.sound.stopAsync();
          this.isPlaying = false;
          console.log('Background music stopped forcefully');
          this.notifyStateChange(); // Notify state change
        } else {
          console.log('Background music successfully paused');
          this.notifyStateChange(); // Notify state change
        }
      }
    } catch (error) {
      console.warn('Failed to pause background music:', error);
      // Force the state to false even if pause failed
      this.isPlaying = false;
    }
  }

  /**
   * Stop background music
   */
  async stop(): Promise<void> {
    if (!this.isLoaded || !this.sound) {
      return;
    }

    try {
      await this.sound.stopAsync();
      this.isPlaying = false;
      console.log('Background music stopped');
      this.notifyStateChange(); // Notify state change
    } catch (error) {
      console.warn('Failed to stop background music:', error);
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  async setVolume(volume: number): Promise<void> {
    const newVolume = Math.max(0, Math.min(1, volume));
    this.volume = newVolume;
    this.hasVolumeBeenSetByUser = true; // Mark that user has explicitly set volume

    if (this.isLoaded && this.sound) {
      try {
        await this.sound.setVolumeAsync(newVolume);
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
    if (!this.isLoaded || !this.sound) {
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
        await this.sound.setVolumeAsync(0);
        await this.play();
        startVolume = 0;
      } else {
        // If already playing, get current volume and fade from there
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          startVolume = status.volume || 0;
        }
      }

      // Use a single timeout instead of loop to prevent memory leaks
      const targetVolume = this.volume;
      const steps = 10; // Reduced steps to prevent memory issues
      const stepDuration = duration / steps;
      const volumeDifference = targetVolume - startVolume;
      const volumeStep = volumeDifference / steps;

      let currentStep = 0;
      const fadeStep = async () => {
        if (currentStep >= steps || !this.sound || !this.isLoaded) {
          return;
        }

        currentStep++;
        const newVolume = startVolume + (volumeStep * currentStep);
        await this.sound.setVolumeAsync(Math.min(targetVolume, Math.max(0, newVolume)));

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
    if (!this.isLoaded || !this.sound || !this.isPlaying) {
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
          if (this.sound && this.isLoaded) {
            this.pause().then(() => {
              this.sound?.setVolumeAsync(currentVolume);
            });
          }
          resolve();
        }, duration + 1000); // Give extra time beyond expected duration

        const fadeStep = async () => {
          try {
            if (currentStep <= 0 || !this.sound || !this.isLoaded) {
              clearTimeout(timeoutId);
              if (this.sound && this.isLoaded) {
                await this.pause();
                await this.sound.setVolumeAsync(currentVolume); // Restore original volume
              }
              resolve(); // Resolve the promise when fade is complete
              return;
            }

            currentStep--;
            await this.sound.setVolumeAsync(volumeStep * currentStep);

            if (currentStep > 0) {
              this.fadeTimer = setTimeout(fadeStep, stepDuration);
            } else {
              // Final step - pause and restore volume
              clearTimeout(timeoutId);
              await this.pause();
              await this.sound.setVolumeAsync(currentVolume);
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

    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        this.isLoaded = false;
        this.isPlaying = false;
        this.isInitializing = false;
        console.log('Background music cleaned up');
      } catch (error) {
        console.warn('Failed to cleanup background music:', error);
      }
    }
  }

  /**
   * Handle playback status updates
   */
  private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    try {
      if (status.isLoaded) {
        // Only update isPlaying if it's different from current state
        // This prevents race conditions where manual pause/play calls get overridden
        if (this.isPlaying !== status.isPlaying) {
          console.log(`Background music status update: ${this.isPlaying} -> ${status.isPlaying}`);
          this.isPlaying = status.isPlaying;
        }

        // Simple looping - let native looping handle it
        if (status.didJustFinish) {
          console.log('Background music looped');
        }
      } else if (status.error) {
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

// Export singleton instance
export const backgroundMusic = new BackgroundMusicService();
