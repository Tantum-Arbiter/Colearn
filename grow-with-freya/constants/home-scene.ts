import { NIGHT_BRIGHT, NIGHT_DEEP, NIGHT_PRIMARY, NIGHT_VOID } from '@/constants/night-palette';

export type HomeActivityId = 'interactive' | 'music' | 'jigsaw';


export interface HomeActivity {
  id: HomeActivityId;
  titleKey: string;
  descriptionKey: string;
  wash: Record<TimeOfDay, string>;
  destination: string;
}

export const HOME_ACTIVITIES = [
  {
    // "Read, listen and explore": every story, not one mode of them. Sending
    // this tile into a mode left the catalogue empty on a fresh launch until
    // the Home tab cleared the mode again.
    id: 'interactive',
    titleKey: 'home.storybooks',
    descriptionKey: 'home.storybooksDescription',
    wash: { night: 'rgba(58,47,122,0.86)', day: 'rgba(92,78,178,0.86)' },
    destination: 'stories',
  },
  {
    id: 'music',
    titleKey: 'home.music',
    descriptionKey: 'home.musicDescription',
    wash: { night: 'rgba(30,63,120,0.86)', day: 'rgba(54,102,176,0.86)' },
    destination: 'stories-music',
  },
  {
    id: 'jigsaw',
    titleKey: 'home.puzzles',
    descriptionKey: 'home.puzzlesDescription',
    wash: { night: 'rgba(39,80,47,0.86)', day: 'rgba(70,124,80,0.86)' },
    destination: 'stories-jigsaw',
  },
] as const satisfies readonly HomeActivity[];

export type TimeOfDay = 'day' | 'night';

export const NIGHT_STARTS_HOUR = 18;
export const DAY_STARTS_HOUR = 7;

export function resolveTimeOfDay(now: Date): TimeOfDay {
  const hour = now.getHours();

  return hour >= NIGHT_STARTS_HOUR || hour < DAY_STARTS_HOUR ? 'night' : 'day';
}

export interface HomeTheme {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  cardEdge: string;
  cardTitle: string;
  cardSubtitle: string;
  cardChevron: string;
  cardGloss: string;
  cardHairline: string;
  cardSheen: string;
  cardShadow: string;
  badgeHalo: string;
  cardFade: string;
  title: string;
  subtitle: string;
  meta: string;
  eyebrow: string;
  chevron: string;
  progressTrack: string;
  progressFrom: string;
  progressTo: string;
  star: string;
  starOpacity: string;
  chromeFill: string;
  chromeEdge: string;
  chromeInk: string;
  artScrim: string;
}

export const HOME_THEMES = {
  night: {
    skyTop: NIGHT_VOID,
    skyMid: NIGHT_DEEP,
    skyBottom: NIGHT_PRIMARY,
    cardEdge: 'rgba(255,255,255,0.16)',
    cardTitle: '#FFFFFF',
    cardSubtitle: '#C6D4EE',
    cardChevron: '#9DB2D2',
    cardGloss: 'rgba(255,255,255,0.13)',
    cardHairline: 'rgba(255,255,255,0.42)',
    cardSheen: 'rgba(255,255,255,0.10)',
    cardShadow: '#04091F',
    badgeHalo: 'rgba(255,255,255,0.11)',
    cardFade: '#141F4C',
    title: '#FFFFFF',
    subtitle: '#A9B9DA',
    meta: '#8FA3C6',
    eyebrow: '#A394FF',
    chevron: '#8FA6C9',
    progressTrack: 'rgba(255,255,255,0.13)',
    progressFrom: '#7C6BF0',
    progressTo: '#A493FF',
    star: '#FFFFFF',
    starOpacity: '1',
    chromeFill: 'rgba(255,255,255,0.10)',
    chromeEdge: 'rgba(255,255,255,0.30)',
    chromeInk: '#FFFFFF',
    artScrim: 'rgba(10,21,51,0.26)',
  },
  day: {
    skyTop: NIGHT_DEEP,
    skyMid: NIGHT_PRIMARY,
    skyBottom: NIGHT_BRIGHT,
    cardEdge: 'rgba(255,255,255,0.26)',
    cardTitle: '#1B3260',
    cardSubtitle: '#42598A',
    cardChevron: '#5C7297',
    cardGloss: 'rgba(255,255,255,0.10)',
    cardHairline: 'rgba(255,255,255,0.58)',
    cardSheen: 'rgba(255,255,255,0.09)',
    cardShadow: '#122A55',
    badgeHalo: 'rgba(255,255,255,0.17)',
    cardFade: '#2C518F',
    title: '#FFFFFF',
    subtitle: '#D2E0F5',
    meta: '#B7C9E6',
    eyebrow: '#C9BEFF',
    chevron: '#C2D2EC',
    progressTrack: 'rgba(255,255,255,0.22)',
    progressFrom: '#8B7BF6',
    progressTo: '#B4A6FF',
    star: '#FFFFFF',
    starOpacity: '0.5',
    chromeFill: 'rgba(255,255,255,0.16)',
    chromeEdge: 'rgba(255,255,255,0.36)',
    chromeInk: '#FFFFFF',
    artScrim: 'rgba(20,44,94,0.16)',
  },
} as const satisfies Record<TimeOfDay, HomeTheme>;

export const HOME_SCENE_PALETTE = HOME_THEMES.night;

export const HOME_SCENE_LAYOUT = {
  cardRadius: 26,
  cardGap: 14,
  cardHeightRatio: 0.29,
  cardHeightMax: 148,
  artWidthRatio: 1,
  artFadeStart: 0.90,
  artFadeMid: 1,
  artShiftRatio: 0,
  badgeSizeRatio: 0.145,
  badgeLeftRatio: 0.435,
  badgeHaloRatio: 1.14,
  starCount: 34,
} as const;

export const HOME_SCENE_TYPE = {
  greeting: 30,
  cardTitle: 20,
  cardDescription: 13,
} as const;

export function homeCardHeight(screenWidth: number): number {
  return Math.min(HOME_SCENE_LAYOUT.cardHeightMax, Math.round(screenWidth * HOME_SCENE_LAYOUT.cardHeightRatio));
}

export function progressFraction(pageIndex: number, totalPages: number): number {
  if (totalPages <= 0) {
    return 0;
  }

  const advanced = Math.min(Math.max(pageIndex + 1, 0), totalPages);

  return advanced / totalPages;
}
