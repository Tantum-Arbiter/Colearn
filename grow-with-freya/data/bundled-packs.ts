import { WOMBAT_PICNIC } from '@/assets/packs/wombat-picnic';
import type { GamePack } from '@/types/game-pack';

export interface BundledPack {
  manifest: GamePack;
  files: Record<string, unknown>;
}

export const BUNDLED_PACKS: Readonly<Record<string, BundledPack>> = {
  [WOMBAT_PICNIC.manifest.id]: WOMBAT_PICNIC,
};
