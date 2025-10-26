import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { musicPlayer } from '@/services/music-player';
import { 
  MusicPlayerState, 
  MusicTrack, 
  MusicPlaylist, 
  RepeatMode 
} from '@/types/music';

interface MusicPlayerHook extends MusicPlayerState {
  // Playback controls
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  
  // Volume controls
  setVolume: (volume: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  
  // Playlist controls
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  
  // Track/playlist loading
  loadTrack: (track: MusicTrack) => Promise<void>;
  loadPlaylist: (playlist: MusicPlaylist, startIndex?: number) => Promise<void>;
  clearTrack: () => Promise<void>;

  // Utility functions
  togglePlayPause: () => Promise<void>;
  isInitialized: boolean;
}

/**
 * Hook for using the music player service
 * Provides reactive state and control functions
 */
export function useMusicPlayer(): MusicPlayerHook {
  const [state, setState] = useState<MusicPlayerState>(musicPlayer.getState());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize music player on mount
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        await musicPlayer.initialize();
        setIsInitialized(true);
        setState(musicPlayer.getState());
      } catch (error) {
        console.error('Failed to initialize music player:', error);
      }
    };

    initializePlayer();

    // Set up state change listener
    const handleStateChange = (newState: MusicPlayerState) => {
      setState(newState);
    };

    musicPlayer.onStateChange(handleStateChange);

    // Cleanup on unmount
    return () => {
      musicPlayer.removeStateChangeListener(handleStateChange);
    };
  }, []);

  // Handle app state changes (pause music when app goes to background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Pause music when app goes to background
        if (state.playbackState === 'playing') {
          await musicPlayer.pause();
        }
      } else if (nextAppState === 'active') {
        // Resume music when app becomes active (if it was playing before)
        // Note: We don't auto-resume to avoid unexpected playback
        console.log('App became active - music can be resumed manually');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [state.playbackState]);

  // Playback controls
  const play = useCallback(async () => {
    try {
      await musicPlayer.play();
    } catch (error) {
      console.error('Failed to play:', error);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await musicPlayer.pause();
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await musicPlayer.stop();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  }, []);

  const next = useCallback(async () => {
    try {
      await musicPlayer.next();
    } catch (error) {
      console.error('Failed to go to next track:', error);
    }
  }, []);

  const previous = useCallback(async () => {
    try {
      await musicPlayer.previous();
    } catch (error) {
      console.error('Failed to go to previous track:', error);
    }
  }, []);

  const seekTo = useCallback(async (position: number) => {
    try {
      await musicPlayer.seekTo(position);
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  }, []);

  // Volume controls
  const setVolume = useCallback(async (volume: number) => {
    try {
      await musicPlayer.setVolume(volume);
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    try {
      await musicPlayer.toggleMute();
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  }, []);

  // Playlist controls
  const setRepeatMode = useCallback(async (mode: RepeatMode) => {
    try {
      await musicPlayer.setRepeatMode(mode);
    } catch (error) {
      console.error('Failed to set repeat mode:', error);
    }
  }, []);

  const toggleShuffle = useCallback(async () => {
    try {
      await musicPlayer.toggleShuffle();
    } catch (error) {
      console.error('Failed to toggle shuffle:', error);
    }
  }, []);

  // Track/playlist loading
  const loadTrack = useCallback(async (track: MusicTrack) => {
    try {
      await musicPlayer.loadTrack(track);
    } catch (error) {
      console.error('Failed to load track:', error);
    }
  }, []);

  const loadPlaylist = useCallback(async (playlist: MusicPlaylist, startIndex?: number) => {
    try {
      await musicPlayer.loadPlaylist(playlist, startIndex);
    } catch (error) {
      console.error('Failed to load playlist:', error);
    }
  }, []);

  const clearTrack = useCallback(async () => {
    try {
      await musicPlayer.clearTrack();
    } catch (error) {
      console.error('Failed to clear track:', error);
    }
  }, []);

  // Utility functions
  const togglePlayPause = useCallback(async () => {
    if (state.playbackState === 'playing') {
      await pause();
    } else if (state.playbackState === 'paused' || state.playbackState === 'stopped') {
      await play();
    }
  }, [state.playbackState, play, pause]);

  return {
    // State
    ...state,
    isInitialized,
    
    // Controls
    play,
    pause,
    stop,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    setRepeatMode,
    toggleShuffle,
    loadTrack,
    loadPlaylist,
    clearTrack,
    togglePlayPause,
  };
}
