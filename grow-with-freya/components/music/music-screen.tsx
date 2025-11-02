import React, { useState, useEffect } from 'react';
import { MusicMainMenu } from './music-main-menu';
import { TantrumInfoScreen } from './tantrum-info-screen';
import { TantrumSelectionScreen } from './tantrum-selection-screen';
import { SleepSelectionScreen } from './sleep-selection-screen';
import { MusicPlayerScreen } from './music-player-screen';
import { useMusicPlayer } from '@/hooks/use-music-player';
import { MusicTrack, MusicCategory } from '@/types/music';
import { getPlaylistByCategory } from '@/data/music';
import { useScreenTimeTracking } from '@/hooks/use-screen-time-tracking';

interface MusicScreenProps {
  onBack: () => void;
}

type MusicView = 'main-menu' | 'tantrum-info' | 'tantrum-selection' | 'sleep-selection' | 'player';

export function MusicScreen({ onBack }: MusicScreenProps) {
  const [currentView, setCurrentView] = useState<MusicView>('main-menu');
  const [previousView, setPreviousView] = useState<MusicView>('main-menu');
  const { loadTrack, loadPlaylist, clearTrack, currentTrack, pause } = useMusicPlayer();

  // Track screen time for music activities
  useScreenTimeTracking({
    activity: 'music',
    autoStart: true,
    autoEnd: true,
  });

  // Reset to main menu when component mounts
  useEffect(() => {
    setCurrentView('main-menu');
    // Don't clear tracks on mount - let user resume if they want

    // Cleanup function: clear music and restore background when leaving music section
    return () => {
      console.log('Music screen unmounting - clearing music and restoring background');
      clearTrack(); // Only clear when actually leaving the music section
    };
  }, []);

  const handleTrackSelect = async (track: MusicTrack) => {
    try {
      await loadTrack(track);
      setPreviousView(currentView); // Remember where we came from
      setCurrentView('player');
    } catch (error) {
      console.error('Failed to load track:', error);
      // Don't navigate to player if track failed to load
      // Stay on current screen and let user try again or go back
    }
  };

  const handlePlaylistSelect = async (category: MusicCategory) => {
    try {
      const playlist = getPlaylistByCategory(category);
      if (playlist) {
        await loadPlaylist(playlist, 0);
        setCurrentView('player');
      }
    } catch (error) {
      console.error('Failed to load playlist:', error);
      // Don't navigate to player if playlist failed to load
      // Stay on current screen and let user try again or go back
    }
  };

  const handleTantrumsSelect = () => {
    setCurrentView('tantrum-info');
  };

  const handleSleepSelect = () => {
    setCurrentView('sleep-selection');
  };

  const handleTantrumInfoContinue = () => {
    setCurrentView('tantrum-selection');
  };

  const handleBackFromPlayer = async () => {
    // Pause the current track (don't clear - user might want to resume)
    await pause();

    // Go back to the previous view (where we came from)
    setCurrentView(previousView);
  };

  const handleBackToMainMenu = async () => {
    // Don't clear tracks when navigating within music section
    // Only pause if currently playing to preserve user's place
    if (currentTrack) {
      await pause();
    }
    setCurrentView('main-menu');
  };

  // Render the appropriate screen based on current view
  switch (currentView) {
    case 'main-menu':
      return (
        <MusicMainMenu
          onTantrumsSelect={handleTantrumsSelect}
          onSleepSelect={handleSleepSelect}
          onBack={onBack}
        />
      );

    case 'tantrum-info':
      return (
        <TantrumInfoScreen
          onContinue={handleTantrumInfoContinue}
          onBack={handleBackToMainMenu}
        />
      );

    case 'tantrum-selection':
      return (
        <TantrumSelectionScreen
          onTrackSelect={handleTrackSelect}
          onBack={handleBackToMainMenu}
        />
      );

    case 'sleep-selection':
      return (
        <SleepSelectionScreen
          onTrackSelect={handleTrackSelect}
          onBack={handleBackToMainMenu}
        />
      );

    case 'player':
      return (
        <MusicPlayerScreen onBack={handleBackFromPlayer} />
      );

    default:
      return (
        <MusicMainMenu
          onTantrumsSelect={handleTantrumsSelect}
          onSleepSelect={handleSleepSelect}
          onBack={onBack}
        />
      );
  }
}
