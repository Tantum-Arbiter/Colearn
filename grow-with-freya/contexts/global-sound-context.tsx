import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/utils/logger';

const log = Logger.create('Sound');

// Storage keys for persisting volume settings
const STORAGE_KEYS = {
  MASTER_VOLUME: '@audio_master_volume',
  MUSIC_VOLUME: '@audio_music_volume',
  VOICE_OVER_VOLUME: '@audio_voice_over_volume',
};

interface GlobalSoundState {
  isMuted: boolean;
  volume: number;
  isPlaying: boolean;
  isLoaded: boolean;
  // Separate volume controls
  masterVolume: number;
  musicVolume: number;
  voiceOverVolume: number;
}

interface GlobalSoundControls {
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  // Separate volume setters
  setMasterVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setVoiceOverVolume: (volume: number) => void;
  // Get effective volume for a specific audio type
  getEffectiveVolume: (type: 'music' | 'voiceOver') => number;
}

type GlobalSoundContextType = GlobalSoundState & GlobalSoundControls;

const GlobalSoundContext = createContext<GlobalSoundContextType | undefined>(undefined);

interface GlobalSoundProviderProps {
  children: ReactNode;
}

export function GlobalSoundProvider({ children }: GlobalSoundProviderProps) {
  const backgroundMusic = useBackgroundMusic();

  // Separate volume states (0-1 range)
  const [masterVolume, setMasterVolumeState] = useState(1.0);
  const [musicVolume, setMusicVolumeState] = useState(1.0);
  const [voiceOverVolume, setVoiceOverVolumeState] = useState(1.0);
  // Track whether saved volume settings have been loaded from storage.
  // Until this is true, we must NOT push the default 1.0×1.0 effective volume
  // to the background music service -that would briefly play at full volume
  // before the real (lower) saved values arrive from AsyncStorage.
  const [volumeSettingsLoaded, setVolumeSettingsLoaded] = useState(false);

  // Load saved volume settings on mount
  useEffect(() => {
    const loadVolumeSettings = async () => {
      try {
        const [master, music, voiceOver] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.MASTER_VOLUME),
          AsyncStorage.getItem(STORAGE_KEYS.MUSIC_VOLUME),
          AsyncStorage.getItem(STORAGE_KEYS.VOICE_OVER_VOLUME),
        ]);

        if (master !== null) setMasterVolumeState(parseFloat(master));
        if (music !== null) setMusicVolumeState(parseFloat(music));
        if (voiceOver !== null) setVoiceOverVolumeState(parseFloat(voiceOver));
      } catch (error) {
        log.warn('Failed to load volume settings:', error);
      }
      setVolumeSettingsLoaded(true);
    };

    loadVolumeSettings();
  }, []);

  // Use the mute/unmute methods from backgroundMusic hook
  // These properly persist muted state across track changes
  const toggleMute = useCallback(async () => {
    try {
      if (backgroundMusic.isMuted) {
        // Unmute: resume playback
        await backgroundMusic.unmute();
      } else {
        // Mute: pause and prevent auto-advance to next track
        await backgroundMusic.mute();
      }
    } catch (error) {
      log.warn('Failed to toggle mute:', error);
    }
  }, [backgroundMusic.isMuted, backgroundMusic.mute, backgroundMusic.unmute]);

  // Calculate effective volume for music (master * music)
  const getEffectiveMusicVolume = useCallback(() => {
    return masterVolume * musicVolume;
  }, [masterVolume, musicVolume]);

  // Update background music volume when master or music volume changes.
  // Skip until saved settings are loaded to avoid a loud spike on startup
  // (defaults are 1.0×1.0 = full volume until AsyncStorage values arrive).
  useEffect(() => {
    if (!volumeSettingsLoaded) return;
    const effectiveVolume = getEffectiveMusicVolume();
    backgroundMusic.setVolume(effectiveVolume);
  }, [volumeSettingsLoaded, masterVolume, musicVolume, backgroundMusic.setVolume, getEffectiveMusicVolume]);

  // Volume setters with persistence
  const setMasterVolume = useCallback(async (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setMasterVolumeState(clampedVolume);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MASTER_VOLUME, clampedVolume.toString());
    } catch (error) {
      log.warn('Failed to save master volume:', error);
    }
  }, []);

  const setMusicVolume = useCallback(async (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setMusicVolumeState(clampedVolume);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, clampedVolume.toString());
    } catch (error) {
      log.warn('Failed to save music volume:', error);
    }
  }, []);

  const setVoiceOverVolume = useCallback(async (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setVoiceOverVolumeState(clampedVolume);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE_OVER_VOLUME, clampedVolume.toString());
    } catch (error) {
      log.warn('Failed to save voice over volume:', error);
    }
  }, []);

  // Get effective volume for a specific audio type
  const getEffectiveVolume = useCallback((type: 'music' | 'voiceOver') => {
    const typeVolume = type === 'music' ? musicVolume : voiceOverVolume;
    return masterVolume * typeVolume;
  }, [masterVolume, musicVolume, voiceOverVolume]);

  const contextValue: GlobalSoundContextType = {
    isMuted: backgroundMusic.isMuted,
    volume: backgroundMusic.volume,
    isPlaying: backgroundMusic.isPlaying,
    isLoaded: backgroundMusic.isLoaded,
    masterVolume,
    musicVolume,
    voiceOverVolume,
    toggleMute,
    setVolume: backgroundMusic.setVolume,
    play: backgroundMusic.play,
    pause: backgroundMusic.pause,
    stop: backgroundMusic.stop,
    setMasterVolume,
    setMusicVolume,
    setVoiceOverVolume,
    getEffectiveVolume,
  };

  return (
    <GlobalSoundContext.Provider value={contextValue}>
      {children}
    </GlobalSoundContext.Provider>
  );
}

// Safe fallback so components never crash if context is temporarily undefined
// (e.g., during hot-reload or rapid re-mount cycles).
const NOOP_ASYNC = async () => {};
const NOOP = () => {};
const SAFE_FALLBACK: GlobalSoundContextType = {
  isMuted: false,
  volume: 0.18,
  isPlaying: false,
  isLoaded: false,
  masterVolume: 1,
  musicVolume: 1,
  voiceOverVolume: 1,
  toggleMute: NOOP,
  setVolume: NOOP_ASYNC as any,
  play: NOOP_ASYNC,
  pause: NOOP_ASYNC,
  stop: NOOP_ASYNC,
  setMasterVolume: NOOP,
  setMusicVolume: NOOP,
  setVoiceOverVolume: NOOP,
  getEffectiveVolume: () => 1,
};

export function useGlobalSound(): GlobalSoundContextType {
  const context = useContext(GlobalSoundContext);
  if (context === undefined) {
    log.warn('useGlobalSound called outside GlobalSoundProvider -using safe fallback');
    return SAFE_FALLBACK;
  }
  return context;
}
