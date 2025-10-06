import { Audio } from 'expo-av';
import { AVPlaybackStatus } from 'expo-av';

class BackgroundMusicService {
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isLoaded: boolean = false;
  private volume: number = 0.3; // Default volume (30%)
  private isInitializing: boolean = false; // Prevent multiple initializations

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
      // Set audio mode for background playback with seamless looping
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        // Optimize for continuous playback
        interruptionModeIOS: 1, // MixWithOthers - allows seamless background play
        interruptionModeAndroid: 1, // DuckOthers - reduces other audio but continues playing
      });

      // Load the background soundtrack
      // Note: React Native requires static imports, so we can't dynamically try different files
      const audioSource = require('../assets/audio/background-soundtrack.wav');

      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        {
          shouldPlay: false,
          isLooping: true,
          volume: this.volume,
          rate: 1.0,
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 1000,
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

    try {
      // Start with volume 0
      await this.sound.setVolumeAsync(0);
      await this.play();

      // Gradually increase volume
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = this.volume / steps;

      for (let i = 1; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
        await this.sound.setVolumeAsync(volumeStep * i);
      }
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

    try {
      const currentVolume = this.volume;
      const steps = 20;
      const stepDuration = duration / steps;
      const volumeStep = currentVolume / steps;

      for (let i = steps - 1; i >= 0; i--) {
        await this.sound.setVolumeAsync(volumeStep * i);
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }

      await this.pause();
      await this.sound.setVolumeAsync(currentVolume); // Restore original volume
    } catch (error) {
      console.warn('Failed to fade out background music:', error);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
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
    if (status.isLoaded) {
      this.isPlaying = status.isPlaying;

      // Ensure seamless looping - if track finishes, immediately restart
      if (status.didJustFinish) {
        if (status.isLooping) {
          // Looping is enabled, should restart automatically
          console.log('Background music looped seamlessly');
        } else {
          // Fallback: manually restart if looping failed
          console.log('Manually restarting background music for seamless loop');
          this.play().catch(error =>
            console.warn('Failed to restart background music:', error)
          );
        }
      }
    } else if (status.error) {
      console.warn('Background music playback error:', status.error);
      this.isPlaying = false;
    }
  };
}

// Export singleton instance
export const backgroundMusic = new BackgroundMusicService();
