import type { HeroAnimal } from './login-hero';

export interface HeroAnimalFaces {
  resting: number;
  laughing?: number;
}

export const HERO_BACKDROP_ART = require('@/assets/images/login/hero-backdrop.webp');
export const HERO_FOREGROUND_ART = require('@/assets/images/login/hero-foreground.webp');

export const HERO_ANIMAL_ART: Record<HeroAnimal, HeroAnimalFaces> = {
  bear: {
    resting: require('@/assets/images/login/hero-bear.webp'),
  },
  bunny: {
    resting: require('@/assets/images/login/hero-bunny.webp'),
  },
  fox: {
    resting: require('@/assets/images/login/hero-fox.webp'),
  },
};
