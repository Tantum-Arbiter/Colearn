import { Audio } from 'expo-av';

interface CharacterAudioState {
  sound: Audio.Sound | null;
  isLoading: boolean;
  isPlaying: boolean;
  volume: number;
}

interface CharacterAudioOptions {
  volume?: number;
  shouldLoop?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

/**
 * Character Audio Manager
 * Handles audio playback for character interactions
 */
export class CharacterAudioManager {
  private audioStates: Map<string, CharacterAudioState> = new Map();
  private globalVolume: number = 0.8;

  constructor() {
    this.initializeAudioMode();
  }

  private async initializeAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
      });
    } catch (error) {
      console.warn('Failed to set audio mode for character audio:', error);
    }
  }

  /**
   * Load audio for a character
   */
  async loadCharacterAudio(
    characterId: string,
    audioSource: string,
    options: CharacterAudioOptions = {}
  ): Promise<boolean> {
    try {
      // Clean up existing audio for this character
      await this.unloadCharacterAudio(characterId);

      const audioState: CharacterAudioState = {
        sound: null,
        isLoading: true,
        isPlaying: false,
        volume: options.volume || this.globalVolume,
      };

      this.audioStates.set(characterId, audioState);

      // Load the audio file
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        {
          shouldPlay: false,
          isLooping: options.shouldLoop || false,
          volume: audioState.volume,
        }
      );

      // Update state
      audioState.sound = sound;
      audioState.isLoading = false;

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          audioState.isPlaying = status.isPlaying || false;
        }
      });

      return true;
    } catch (error) {
      console.warn(`Failed to load audio for character ${characterId}:`, error);
      
      // Clean up failed state
      const audioState = this.audioStates.get(characterId);
      if (audioState) {
        audioState.isLoading = false;
      }
      
      return false;
    }
  }

  /**
   * Play character audio
   */
  async playCharacterAudio(
    characterId: string,
    options: CharacterAudioOptions = {}
  ): Promise<boolean> {
    const audioState = this.audioStates.get(characterId);
    
    if (!audioState || !audioState.sound || audioState.isLoading) {
      console.warn(`Audio not ready for character ${characterId}`);
      return false;
    }

    try {
      // Stop if already playing
      if (audioState.isPlaying) {
        await audioState.sound.stopAsync();
      }

      // Set volume if specified
      if (options.volume !== undefined) {
        await audioState.sound.setVolumeAsync(options.volume);
        audioState.volume = options.volume;
      }

      // Play the sound
      await audioState.sound.playAsync();
      
      // Handle fade in if specified
      if (options.fadeInDuration && options.fadeInDuration > 0) {
        await this.fadeIn(characterId, options.fadeInDuration);
      }

      return true;
    } catch (error) {
      console.warn(`Failed to play audio for character ${characterId}:`, error);
      return false;
    }
  }

  /**
   * Stop character audio
   */
  async stopCharacterAudio(
    characterId: string,
    options: CharacterAudioOptions = {}
  ): Promise<boolean> {
    const audioState = this.audioStates.get(characterId);
    
    if (!audioState || !audioState.sound) {
      return false;
    }

    try {
      // Handle fade out if specified
      if (options.fadeOutDuration && options.fadeOutDuration > 0) {
        await this.fadeOut(characterId, options.fadeOutDuration);
      }

      await audioState.sound.stopAsync();
      return true;
    } catch (error) {
      console.warn(`Failed to stop audio for character ${characterId}:`, error);
      return false;
    }
  }

  /**
   * Pause character audio
   */
  async pauseCharacterAudio(characterId: string): Promise<boolean> {
    const audioState = this.audioStates.get(characterId);
    
    if (!audioState || !audioState.sound) {
      return false;
    }

    try {
      await audioState.sound.pauseAsync();
      return true;
    } catch (error) {
      console.warn(`Failed to pause audio for character ${characterId}:`, error);
      return false;
    }
  }

  /**
   * Set volume for character audio
   */
  async setCharacterVolume(characterId: string, volume: number): Promise<boolean> {
    const audioState = this.audioStates.get(characterId);
    
    if (!audioState || !audioState.sound) {
      return false;
    }

    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      await audioState.sound.setVolumeAsync(clampedVolume);
      audioState.volume = clampedVolume;
      return true;
    } catch (error) {
      console.warn(`Failed to set volume for character ${characterId}:`, error);
      return false;
    }
  }

  /**
   * Fade in character audio
   */
  private async fadeIn(characterId: string, duration: number): Promise<void> {
    const audioState = this.audioStates.get(characterId);
    if (!audioState || !audioState.sound) return;

    const targetVolume = audioState.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;

    for (let i = 0; i <= steps; i++) {
      const currentVolume = volumeStep * i;
      await audioState.sound.setVolumeAsync(currentVolume);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
  }

  /**
   * Fade out character audio
   */
  private async fadeOut(characterId: string, duration: number): Promise<void> {
    const audioState = this.audioStates.get(characterId);
    if (!audioState || !audioState.sound) return;

    const startVolume = audioState.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;

    for (let i = steps; i >= 0; i--) {
      const currentVolume = volumeStep * i;
      await audioState.sound.setVolumeAsync(currentVolume);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
  }

  /**
   * Unload character audio
   */
  async unloadCharacterAudio(characterId: string): Promise<void> {
    const audioState = this.audioStates.get(characterId);
    
    if (audioState && audioState.sound) {
      try {
        await audioState.sound.unloadAsync();
      } catch (error) {
        console.warn(`Failed to unload audio for character ${characterId}:`, error);
      }
    }

    this.audioStates.delete(characterId);
  }

  /**
   * Stop all character audio
   */
  async stopAllCharacterAudio(): Promise<void> {
    const promises = Array.from(this.audioStates.keys()).map(characterId =>
      this.stopCharacterAudio(characterId)
    );
    
    await Promise.all(promises);
  }

  /**
   * Unload all character audio
   */
  async unloadAllCharacterAudio(): Promise<void> {
    const promises = Array.from(this.audioStates.keys()).map(characterId =>
      this.unloadCharacterAudio(characterId)
    );
    
    await Promise.all(promises);
  }

  /**
   * Set global volume for all characters
   */
  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get character audio state
   */
  getCharacterAudioState(characterId: string): CharacterAudioState | null {
    return this.audioStates.get(characterId) || null;
  }

  /**
   * Check if character audio is playing
   */
  isCharacterAudioPlaying(characterId: string): boolean {
    const audioState = this.audioStates.get(characterId);
    return audioState ? audioState.isPlaying : false;
  }

  /**
   * Check if character audio is loaded
   */
  isCharacterAudioLoaded(characterId: string): boolean {
    const audioState = this.audioStates.get(characterId);
    return audioState ? (audioState.sound !== null && !audioState.isLoading) : false;
  }
}

// Global instance
export const characterAudioManager = new CharacterAudioManager();
