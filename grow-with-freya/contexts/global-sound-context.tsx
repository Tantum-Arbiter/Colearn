import React, { createContext, useContext, ReactNode } from 'react';
import { useBackgroundMusic } from '@/hooks/use-background-music';

interface GlobalSoundState {
  isMuted: boolean;
  volume: number;
  isPlaying: boolean;
  isLoaded: boolean;
}

interface GlobalSoundControls {
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
}

type GlobalSoundContextType = GlobalSoundState & GlobalSoundControls;

const GlobalSoundContext = createContext<GlobalSoundContextType | undefined>(undefined);

interface GlobalSoundProviderProps {
  children: ReactNode;
}

export function GlobalSoundProvider({ children }: GlobalSoundProviderProps) {
  const backgroundMusic = useBackgroundMusic();

  // Use the mute/unmute methods from backgroundMusic hook
  // These properly persist muted state across track changes
  const toggleMute = async () => {
    if (backgroundMusic.isMuted) {
      // Unmute: resume playback
      await backgroundMusic.unmute();
    } else {
      // Mute: pause and prevent auto-advance to next track
      await backgroundMusic.mute();
    }
  };

  const contextValue: GlobalSoundContextType = {
    isMuted: backgroundMusic.isMuted,
    volume: backgroundMusic.volume,
    isPlaying: backgroundMusic.isPlaying,
    isLoaded: backgroundMusic.isLoaded,
    toggleMute,
    setVolume: backgroundMusic.setVolume,
    play: backgroundMusic.play,
    pause: backgroundMusic.pause,
    stop: backgroundMusic.stop,
  };

  return (
    <GlobalSoundContext.Provider value={contextValue}>
      {children}
    </GlobalSoundContext.Provider>
  );
}

export function useGlobalSound(): GlobalSoundContextType {
  const context = useContext(GlobalSoundContext);
  if (context === undefined) {
    throw new Error('useGlobalSound must be used within a GlobalSoundProvider');
  }
  return context;
}
