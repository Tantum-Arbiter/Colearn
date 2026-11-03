import type { GamePack } from '@/types/game-pack';
import manifest from './pack.json';

export const WOMBAT_PICNIC = {
  manifest: manifest as unknown as GamePack,
  files: {
    'art/phone/berry.webp': require('./art/phone/berry.webp'),
    'art/phone/leaf-glow.webp': require('./art/phone/leaf-glow.webp'),
    'art/phone/leaf.webp': require('./art/phone/leaf.webp'),
    'art/phone/nut.webp': require('./art/phone/nut.webp'),
    'art/phone/petal.webp': require('./art/phone/petal.webp'),
    'art/phone/sky.webp': require('./art/phone/sky.webp'),
    'art/phone/stars-1.webp': require('./art/phone/stars-1.webp'),
    'art/phone/stars-2.webp': require('./art/phone/stars-2.webp'),
    'art/phone/wombat.webp': require('./art/phone/wombat.webp'),
    'art/tablet/berry.webp': require('./art/tablet/berry.webp'),
    'art/tablet/leaf-glow.webp': require('./art/tablet/leaf-glow.webp'),
    'art/tablet/leaf.webp': require('./art/tablet/leaf.webp'),
    'art/tablet/nut.webp': require('./art/tablet/nut.webp'),
    'art/tablet/petal.webp': require('./art/tablet/petal.webp'),
    'art/tablet/sky.webp': require('./art/tablet/sky.webp'),
    'art/tablet/stars-1.webp': require('./art/tablet/stars-1.webp'),
    'art/tablet/stars-2.webp': require('./art/tablet/stars-2.webp'),
    'art/tablet/wombat.webp': require('./art/tablet/wombat.webp'),
    'cover.webp': require('./cover.webp'),
    'sounds/bloop.m4a': require('./sounds/bloop.m4a'),
    'sounds/chime.m4a': require('./sounds/chime.m4a'),
    'sounds/hum.m4a': require('./sounds/hum.m4a'),
    'sounds/pop.m4a': require('./sounds/pop.m4a'),
    'sounds/tada.m4a': require('./sounds/tada.m4a'),
  } as Record<string, unknown>,
};
