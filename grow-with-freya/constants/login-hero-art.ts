import type { HeroAnimal } from './login-hero';

export const HERO_BACKDROP_ART = require('@/assets/images/login/hero-backdrop.webp');
export const HERO_FOREGROUND_ART = require('@/assets/images/login/hero-foreground.webp');

export const HERO_ANIMAL_ART: Record<HeroAnimal, number> = {
  bear: require('@/assets/images/login/hero-bear.webp'),
  bunny: require('@/assets/images/login/hero-bunny.webp'),
  fox: require('@/assets/images/login/hero-fox.webp'),
};
