import type { ImageSourcePropType } from 'react-native';
import type { AudioSource } from 'expo-audio';
import { BUNDLED_PACKS } from '@/data/bundled-packs';
import type { ArtCrop, GamePack, Mission, PackArt } from '@/types/game-pack';

export interface LoadedPack {
  manifest: GamePack;
  art: (crop: ArtCrop) => PackArt;
  image: (file: string) => ImageSourcePropType;
  sound: (file: string) => AudioSource;
  mission: (missionId: string | null) => Mission | null;
}

export class PackNotFound extends Error {
  constructor(packId: string) {
    super(`No pack is bundled or cached as ${packId}`);
    this.name = 'PackNotFound';
  }
}

export class PackFileMissing extends Error {
  constructor(packId: string, file: string) {
    super(`Pack ${packId} has no file ${file}`);
    this.name = 'PackFileMissing';
  }
}

function loaded(manifest: GamePack, files: Record<string, unknown>): LoadedPack {
  const file = (path: string): unknown => {
    if (!(path in files)) throw new PackFileMissing(manifest.id, path);
    return files[path];
  };

  return {
    manifest,
    art: (crop) => manifest.art[crop],
    image: (path) => file(path) as ImageSourcePropType,
    sound: (path) => file(path) as AudioSource,
    mission: (missionId) => (missionId === null ? null : manifest.missions.find((mission) => mission.id === missionId) ?? null),
  };
}

export function bundledPackIds(): string[] {
  return Object.keys(BUNDLED_PACKS);
}

export async function loadPack(packId: string): Promise<LoadedPack> {
  const bundled = BUNDLED_PACKS[packId];
  if (!bundled) throw new PackNotFound(packId);

  return loaded(bundled.manifest, bundled.files);
}
