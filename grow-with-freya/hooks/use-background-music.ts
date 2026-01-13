import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { backgroundMusic } from '@/services/background-music';

interface BackgroundMusicState {
  isPlaying: boolean;
  isLoaded: boolean;
  volume: number;
  isMuted: boolean; // Persists across track changes
}

interface BackgroundMusicControls {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  fadeIn: (duration?: number) => Promise<void>;
  fadeOut: (duration?: number) => Promise<void>;
  toggle: () => Promise<void>;
  mute: () => Promise<void>;
  unmute: () => Promise<void>;
}

export function useBackgroundMusic(): BackgroundMusicState & BackgroundMusicControls {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [volume, setVolumeState] = useState(0.18); // Match service default
  const [isMuted, setIsMuted] = useState(false);

  // Track if we've already initialized to prevent re-init on hot reload
  const hasInitialized = useRef(false);

  // Initialize background music on mount (only once globally)
  useEffect(() => {
    // Skip if already initialized (prevents issues during hot reload)
    if (hasInitialized.current) {
      // Just sync state from existing service
      setIsLoaded(backgroundMusic.getIsLoaded());
      setVolumeState(backgroundMusic.getVolume());
      setIsMuted(backgroundMusic.getIsMuted());
      setIsPlaying(backgroundMusic.getIsPlaying());
      return;
    }

    const initializeMusic = async () => {
      try {
        // On Android in dev mode, delay initialization to avoid hot reload threading issues
        if (Platform.OS === 'android' && __DEV__) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await backgroundMusic.initialize();
        hasInitialized.current = true;
        setIsLoaded(backgroundMusic.getIsLoaded());
        setVolumeState(backgroundMusic.getVolume());
        setIsMuted(backgroundMusic.getIsMuted());
        // Sync initial playing state after initialization
        setIsPlaying(backgroundMusic.getIsPlaying());
        console.log(`Background music hook initialized - playing: ${backgroundMusic.getIsPlaying()}`);
      } catch (error) {
        console.warn('Failed to initialize background music:', error);
      }
    };

    initializeMusic();

    // Note: Don't cleanup on unmount since this is a singleton service
    // Only cleanup when the entire app is closing
  }, []);

  // Register for state change notifications
  useEffect(() => {
    const unsubscribeState = backgroundMusic.onStateChange(() => {
      const currentlyPlaying = backgroundMusic.getIsPlaying();
      const currentlyMuted = backgroundMusic.getIsMuted();
      if (currentlyPlaying !== isPlaying) {
        console.log(`Background music state change notification: ${isPlaying} -> ${currentlyPlaying}`);
        setIsPlaying(currentlyPlaying);
      }
      if (currentlyMuted !== isMuted) {
        console.log(`Background music muted state change: ${isMuted} -> ${currentlyMuted}`);
        setIsMuted(currentlyMuted);
      }
    });

    const unsubscribeVolume = backgroundMusic.onVolumeChange((newVolume) => {
      console.log(`Background music volume change notification: ${volume} -> ${newVolume}`);
      setVolumeState(newVolume);
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeState();
      unsubscribeVolume();
    };
  }, [isPlaying, volume, isMuted]);

  // Handle app state changes (pause music when app goes to background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Let music continue in background with staysActiveInBackground: true
        console.log('App backgrounded - music continues');
      } else if (nextAppState === 'active') {
        // Resume music when app becomes active (if it was playing before)
        // But only if it's not intentionally paused by the music player
        if (isPlaying && !backgroundMusic.getIsPlaying()) {
          console.log('App became active - checking if background music should resume');
          // Don't auto-resume if music player has intentionally paused it
          // This prevents conflicts with foreground music playback
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isPlaying]);

  // Force sync state with background music service
  const syncState = useCallback(() => {
    const currentlyPlaying = backgroundMusic.getIsPlaying();
    if (currentlyPlaying !== isPlaying) {
      console.log(`Background music state sync: ${isPlaying} -> ${currentlyPlaying}`);
      setIsPlaying(currentlyPlaying);
    }
  }, [isPlaying]);

  // Update playing state periodically - reduced frequency to prevent memory issues
  useEffect(() => {
    const interval = setInterval(() => {
      syncState();
    }, 3000); // Reduced from 1 second to 3 seconds

    return () => clearInterval(interval);
  }, [syncState]);

  const play = useCallback(async () => {
    try {
      await backgroundMusic.play();
      // Force immediate state sync after play
      syncState();
    } catch (error) {
      console.warn('Failed to play background music:', error);
    }
  }, [syncState]);

  const pause = useCallback(async () => {
    try {
      await backgroundMusic.pause();
      // Force immediate state sync after pause
      syncState();
    } catch (error) {
      console.warn('Failed to pause background music:', error);
    }
  }, [syncState]);

  const stop = useCallback(async () => {
    try {
      await backgroundMusic.stop();
      // Force immediate state sync after stop
      syncState();
    } catch (error) {
      console.warn('Failed to stop background music:', error);
    }
  }, [syncState]);

  const setVolume = useCallback(async (newVolume: number) => {
    try {
      await backgroundMusic.setVolume(newVolume);
      // Volume state will be updated via the volume change callback
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
    // Force immediate state sync after toggle
    syncState();
  }, [isPlaying, play, pause, syncState]);

  const mute = useCallback(async () => {
    try {
      await backgroundMusic.mute();
      setIsMuted(true);
      setIsPlaying(false);
    } catch (error) {
      console.warn('Failed to mute background music:', error);
    }
  }, []);

  const unmute = useCallback(async () => {
    try {
      await backgroundMusic.unmute();
      setIsMuted(false);
      // Force immediate state sync after unmute
      syncState();
    } catch (error) {
      console.warn('Failed to unmute background music:', error);
    }
  }, [syncState]);

  return {
    isPlaying,
    isLoaded,
    volume,
    isMuted,
    play,
    pause,
    stop,
    setVolume,
    fadeIn,
    fadeOut,
    toggle,
    mute,
    unmute,
  };
}
