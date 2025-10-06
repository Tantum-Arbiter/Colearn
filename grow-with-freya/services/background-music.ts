import { Audio } from 'expo-av';
import { AVPlaybackStatus } from 'expo-av';

class BackgroundMusicService {
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isLoaded: boolean = false;
  private volume: number = 0.3; // Default volume (30%)
  private isInitializing: boolean = false; // Prevent multiple initializations
  private fadeTimer: ReturnType<typeof setTimeout> | null = null; // Track fade operations

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
      // Set audio mode for iOS/iPad compatibility - prevent conflicts
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false, // Don't duck other audio to prevent conflicts
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 2, // DoNotMix - prevent audio session conflicts
        interruptionModeAndroid: 2, // DoNotMix
      });

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
      console.warn('Failed to initialize background music:', error);
      console.warn('To fix this: Add a valid audio file to assets/audio/background-soundtrack.wav');
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
      if (!this.isPlaying) {
        await this.sound.playAsync();
        this.isPlaying = true;
        console.log('Background music started');
      }
    } catch (error) {
      console.warn('Failed to play background music:', error);
      console.warn('This might be due to an invalid or corrupted audio file');
    }
  }

  /**
   * Pause background music
   */
  async pause(): Promise<void> {
    if (!this.isLoaded || !this.sound) {
      return;
    }

    try {
      if (this.isPlaying) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
        console.log('Background music paused');
      }
    } catch (error) {
      console.warn('Failed to pause background music:', error);
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
    } catch (error) {
      console.warn('Failed to stop background music:', error);
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, volume));
    
    if (this.isLoaded && this.sound) {
      try {
        await this.sound.setVolumeAsync(this.volume);
        console.log(`Background music volume set to ${this.volume}`);
      } catch (error) {
        console.warn('Failed to set background music volume:', error);
      }
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
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
      // Start with volume 0
      await this.sound.setVolumeAsync(0);
      await this.play();

      // Use a single timeout instead of loop to prevent memory leaks
      const targetVolume = this.volume;
      const steps = 10; // Reduced steps to prevent memory issues
      const stepDuration = duration / steps;
      const volumeStep = targetVolume / steps;

      let currentStep = 0;
      const fadeStep = async () => {
        if (currentStep >= steps || !this.sound || !this.isLoaded) {
          return;
        }

        currentStep++;
        await this.sound.setVolumeAsync(volumeStep * currentStep);

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

    try {
      const currentVolume = this.volume;
      const steps = 10; // Reduced steps to prevent memory issues
      const stepDuration = duration / steps;
      const volumeStep = currentVolume / steps;

      let currentStep = steps;
      const fadeStep = async () => {
        if (currentStep <= 0 || !this.sound || !this.isLoaded) {
          if (this.sound && this.isLoaded) {
            await this.pause();
            await this.sound.setVolumeAsync(currentVolume); // Restore original volume
          }
          return;
        }

        currentStep--;
        await this.sound.setVolumeAsync(volumeStep * currentStep);

        if (currentStep > 0) {
          this.fadeTimer = setTimeout(fadeStep, stepDuration);
        } else {
          // Final step - pause and restore volume
          await this.pause();
          await this.sound.setVolumeAsync(currentVolume);
        }
      };

      fadeStep();
    } catch (error) {
      console.warn('Failed to fade out background music:', error);
    }
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
        this.isPlaying = status.isPlaying;

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
