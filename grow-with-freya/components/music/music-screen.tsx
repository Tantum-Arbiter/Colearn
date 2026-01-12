import React, { useEffect, useRef } from 'react';
import { PlaylistScreen } from './playlist-screen';
import { useMusicPlayer } from '@/hooks/use-music-player';

interface MusicScreenProps {
  onBack: () => void;
  isActive?: boolean;
}

export function MusicScreen({ onBack, isActive = true }: MusicScreenProps) {
  const { clearTrack, pause, playbackState } = useMusicPlayer();

  // Refs to hold stable function references for cleanup
  const pauseRef = useRef(pause);
  const clearTrackRef = useRef(clearTrack);
  pauseRef.current = pause;
  clearTrackRef.current = clearTrack;

  // Track previous active state to detect when leaving the screen
  const wasActiveRef = useRef(isActive);

  // Pause and clear music when screen becomes inactive (navigating away)
  useEffect(() => {
    if (wasActiveRef.current && !isActive) {
      // Screen just became inactive - pause and clear the track
      console.log('Music screen becoming inactive - stopping and clearing music');
      pauseRef.current();
      clearTrackRef.current();
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  // Also cleanup on unmount (for safety)
  useEffect(() => {
    return () => {
      console.log('Music screen unmounting - stopping and clearing music');
      pauseRef.current();
      clearTrackRef.current();
    };
  }, []);

  return <PlaylistScreen onBack={onBack} isActive={isActive} />;
}
