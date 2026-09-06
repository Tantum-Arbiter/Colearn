import type { HeroStarKind } from '@/constants/home-sky';

export const HERO_STAR_ART = {
  'star-large': require('../../assets/images/home-sky/star-large.webp'),
  'star-medium': require('../../assets/images/home-sky/star-medium.webp'),
  'star-small': require('../../assets/images/home-sky/star-small.webp'),
  'sparkle-large': require('../../assets/images/home-sky/sparkle-large.webp'),
  'sparkle-small': require('../../assets/images/home-sky/sparkle-small.webp'),
  'sparkle-dots': require('../../assets/images/home-sky/sparkle-dots.webp'),
} as const satisfies Record<HeroStarKind, number>;
