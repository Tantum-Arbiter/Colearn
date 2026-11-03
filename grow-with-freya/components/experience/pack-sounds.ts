import { useEffect, useMemo, useRef } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { LoadedPack } from '@/services/pack-service';

export interface PackSounds {
  play: (id: string) => void;
}

export const SILENT_SOUNDS: PackSounds = { play: () => undefined };

export function usePackSounds(pack: LoadedPack | null, muted: boolean): PackSounds {
  const players = useRef<Record<string, AudioPlayer>>({});

  useEffect(() => {
    if (!pack) return undefined;
    const made: Record<string, AudioPlayer> = {};
    Object.entries(pack.manifest.sounds).forEach(([id, sound]) => {
      made[id] = createAudioPlayer(pack.sound(sound.file));
    });
    players.current = made;

    return () => {
      Object.values(made).forEach((player) => player.release());
      players.current = {};
    };
  }, [pack]);

  return useMemo(
    () => ({
      play: (id: string) => {
        const player = players.current[id];
        if (!player || muted) return;
        void player.seekTo(0);
        player.play();
      },
    }),
    [muted]
  );
}
