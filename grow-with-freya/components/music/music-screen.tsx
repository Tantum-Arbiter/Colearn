import React, { useEffect, useRef } from 'react';
import { PlaylistScreen } from './playlist-screen';
import { useMusicPlayer } from '@/hooks/use-music-player';

interface MusicScreenProps {
  onBack: () => void;
}

export function MusicScreen({ onBack }: MusicScreenProps) {
  const { clearTrack, pause } = useMusicPlayer();

  // Refs to hold stable function references for cleanup
  const pauseRef = useRef(pause);
  const clearTrackRef = useRef(clearTrack);
  pauseRef.current = pause;
  clearTrackRef.current = clearTrack;

  // Cleanup function: clear music when leaving music section
  useEffect(() => {
    return () => {
      console.log('Music screen unmounting - stopping and clearing music');
      pauseRef.current();
      clearTrackRef.current();
    };
  }, []);

  return <PlaylistScreen onBack={onBack} />;
}
