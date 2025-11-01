import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  const [isMuted, setIsMuted] = useState(false);

  // Sync muted state with volume
  useEffect(() => {
    setIsMuted(backgroundMusic.volume === 0);
  }, [backgroundMusic.volume]);

  const toggleMute = () => {
    if (backgroundMusic.volume === 0) {
      // Unmute: restore to default volume (18%)
      backgroundMusic.setVolume(0.18);
    } else {
      // Mute: set volume to 0
      backgroundMusic.setVolume(0);
    }
  };

  const contextValue: GlobalSoundContextType = {
    isMuted,
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
