import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { backgroundMusic } from '@/services/background-music';

interface BackgroundMusicState {
  isPlaying: boolean;
  isLoaded: boolean;
  volume: number;
}

interface BackgroundMusicControls {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  fadeIn: (duration?: number) => Promise<void>;
  fadeOut: (duration?: number) => Promise<void>;
  toggle: () => Promise<void>;
}

export function useBackgroundMusic(): BackgroundMusicState & BackgroundMusicControls {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [volume, setVolumeState] = useState(0.3);

  // Initialize background music on mount (only once globally)
  useEffect(() => {
    const initializeMusic = async () => {
      try {
        await backgroundMusic.initialize();
        setIsLoaded(backgroundMusic.getIsLoaded());
        setVolumeState(backgroundMusic.getVolume());
      } catch (error) {
        console.warn('Failed to initialize background music:', error);
      }
    };

    initializeMusic();

    // Note: Don't cleanup on unmount since this is a singleton service
    // Only cleanup when the entire app is closing
  }, []);

  // Handle app state changes (pause music when app goes to background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Let music continue in background with staysActiveInBackground: true
        console.log('App backgrounded - music continues');
      } else if (nextAppState === 'active') {
        // Resume music when app becomes active (if it was playing before)
        if (isPlaying && !backgroundMusic.getIsPlaying()) {
          await backgroundMusic.play();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isPlaying]);

  // Update playing state periodically - reduced frequency to prevent memory issues
  useEffect(() => {
    const interval = setInterval(() => {
      const currentlyPlaying = backgroundMusic.getIsPlaying();
      if (currentlyPlaying !== isPlaying) {
        setIsPlaying(currentlyPlaying);
      }
    }, 3000); // Reduced from 1 second to 3 seconds

    return () => clearInterval(interval);
  }, [isPlaying]);

  const play = useCallback(async () => {
    try {
      await backgroundMusic.play();
      setIsPlaying(true);
    } catch (error) {
      console.warn('Failed to play background music:', error);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await backgroundMusic.pause();
      setIsPlaying(false);
    } catch (error) {
      console.warn('Failed to pause background music:', error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await backgroundMusic.stop();
      setIsPlaying(false);
    } catch (error) {
      console.warn('Failed to stop background music:', error);
    }
  }, []);

  const setVolume = useCallback(async (newVolume: number) => {
    try {
      await backgroundMusic.setVolume(newVolume);
      setVolumeState(newVolume);
    } catch (error) {
      console.warn('Failed to set background music volume:', error);
    }
  }, []);

  const fadeIn = useCallback(async (duration?: number) => {
    try {
      await backgroundMusic.fadeIn(duration);
      setIsPlaying(true);
    } catch (error) {
      console.warn('Failed to fade in background music:', error);
    }
  }, []);

  const fadeOut = useCallback(async (duration?: number) => {
    try {
      await backgroundMusic.fadeOut(duration);
      setIsPlaying(false);
    } catch (error) {
      console.warn('Failed to fade out background music:', error);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  return {
    isPlaying,
    isLoaded,
    volume,
    play,
    pause,
    stop,
    setVolume,
    fadeIn,
    fadeOut,
    toggle,
  };
}
