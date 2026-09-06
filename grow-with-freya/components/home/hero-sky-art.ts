import type { HeroCloudKind, HeroStarKind } from '@/constants/home-sky';

export const HERO_STAR_ART = {
  'star-large': require('../../assets/images/home-sky/star-large.webp'),
  'star-medium': require('../../assets/images/home-sky/star-medium.webp'),
  'star-small': require('../../assets/images/home-sky/star-small.webp'),
  'sparkle-large': require('../../assets/images/home-sky/sparkle-large.webp'),
  'sparkle-small': require('../../assets/images/home-sky/sparkle-small.webp'),
  'sparkle-dots': require('../../assets/images/home-sky/sparkle-dots.webp'),
} as const satisfies Record<HeroStarKind, number>;

export const HERO_CLOUD_ART = {
  'cloud-large': require('../../assets/images/home-sky/cloud-large.webp'),
  'cloud-medium': require('../../assets/images/home-sky/cloud-medium.webp'),
  'cloud-small': require('../../assets/images/home-sky/cloud-small.webp'),
  'cloud-edge': require('../../assets/images/home-sky/cloud-edge.webp'),
  'cloud-bridge': require('../../assets/images/home-sky/cloud-bridge.webp'),
} as const satisfies Record<HeroCloudKind, number>;
