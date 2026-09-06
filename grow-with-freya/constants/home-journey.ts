import type {
  ChildHomeData,
  ReturnVisitContext,
  ReturnVisitState,
  WelcomeCopy,
} from '@/types/child-home';

export const RETURN_VISIT = {
  longAbsenceDays: 7,
  streakCelebrationMinDays: 2,
} as const;

export const MILESTONE_STARS = 5;

export const READING_HISTORY_DAYS = 3650;

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysApart(from: Date, to: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.round((startOfDay(to) - startOfDay(from)) / dayMs);
}

export function effectiveStreak(readingStreak: number, lastReadDate: string | null, now: Date): number {
  if (!lastReadDate || readingStreak <= 0) {
    return 0;
  }

  const lastRead = new Date(`${lastReadDate}T12:00:00`);
  const gap = daysApart(lastRead, now);

  return gap >= 0 && gap <= 1 ? readingStreak : 0;
}

export function resolveReturnVisit(data: ChildHomeData, context: ReturnVisitContext): ReturnVisitState {
  const previous = context.previousVisitAt ? new Date(context.previousVisitAt) : null;

  if (context.hasNewAchievement && data.newestAchievement) {
    return 'newAchievement';
  }

  if (context.storyCompletedSinceLastVisit) {
    return 'storyCompleted';
  }

  if (previous && daysApart(previous, context.now) >= RETURN_VISIT.longAbsenceDays) {
    return 'longAbsence';
  }

  if (data.readingStreakDays >= RETURN_VISIT.streakCelebrationMinDays) {
    return 'streak';
  }

  if (!previous || localDateKey(previous) !== localDateKey(context.now)) {
    return 'firstToday';
  }

  return 'normal';
}

export function welcomeCopy(state: ReturnVisitState, data: ChildHomeData): WelcomeCopy {
  const name = data.firstName.trim();
  const base = `home.welcome.${state}`;

  return {
    state,
    titleKey: name ? `${base}.title` : `${base}.titleAnonymous`,
    subtitleKey: `${base}.subtitle`,
    params: {
      name,
      count: data.readingStreakDays,
      achievement: data.newestAchievement?.title ?? '',
    },
  };
}

export function litStars(current: number, required: number, total: number = MILESTONE_STARS): number {
  if (required <= 0 || current <= 0) {
    return 0;
  }

  return Math.min(total, Math.round((current / required) * total));
}

export function remainingToNext(current: number, required: number): number {
  return Math.max(0, required - current);
}

export function formatReadingTime(minutes: number): { hours: number; minutes: number } {
  const whole = Math.max(0, Math.round(minutes));

  return { hours: Math.floor(whole / 60), minutes: whole % 60 };
}

export function screenTimeSafetyPercent(dailySeconds: number[], limitSeconds: number): number {
  const activeDays = dailySeconds.filter((seconds) => seconds > 0);

  if (activeDays.length === 0 || limitSeconds <= 0) {
    return 100;
  }

  const safeDays = activeDays.filter((seconds) => seconds <= limitSeconds).length;

  return Math.round((safeDays / activeDays.length) * 100);
}

export const SAFETY_HISTORY_DAYS = 7;

export const HOME_CARDS = {
  screenMargin: 16,
  contentMaxWidth: 560,
  radius: 20,
  gap: 8,
  padding: 12,
  coverSize: 72,
  coverRadius: 12,
  arrowSize: 46,
  tileRadius: 16,
  tileGap: 8,
  tileIcon: 34,
  medallion: 72,
  decorStarCount: 4,
} as const;

export const HOME_CARD_TYPE = {
  welcome: 28,
  welcomeSubtitle: 15,
  eyebrow: 11,
  title: 19,
  cardHeading: 16,
  body: 14,
  meta: 12,
  tileValue: 16,
  tileLabel: 11,
  achievementTitle: 19,
  cta: 12,
} as const;

export const HOME_JOURNEY_MOTION = {
  pressScale: 0.975,
  pressInMs: 110,
  pressOutMs: 220,
  arrowNudge: 5,
  arrowNudgeMs: 130,
  iconStaggerMs: 900,
  bookRestMs: 5200,
  clockTurnMs: 24000,
  leafSwayMs: 1900,
  breatheMs: 3400,
  breatheLift: 3,
  breatheScale: 1.014,
  sparkleEveryMs: 5200,
  sparkleMs: 420,
  shineDelayMs: 700,
  shineMs: 900,
  shineScale: 1.05,
  starStaggerMs: 160,
  starRiseMs: 380,
  starDelayMs: 500,
} as const;

export const HOME_CARD_TINTS = {
  tileFill: 'rgba(255,255,255,0.08)',
  tileEdge: 'rgba(255,255,255,0.12)',
  eyebrow: '#C9C2FF',
  title: '#FFFFFF',
  body: '#DCE3FF',
  muted: '#AEB9E6',
  gold: '#FFD76B',
  progressTrack: 'rgba(255,255,255,0.16)',
  progressFrom: '#7FE3C4',
  progressTo: '#7CB4FF',
  coverEdge: 'rgba(255,255,255,0.30)',
  medallionRing: '#FFD76B',
  medallionFill: 'rgba(255,255,255,0.10)',
  divider: 'rgba(255,255,255,0.12)',
  starLit: '#FFD76B',
  starUnlit: 'rgba(255,255,255,0.30)',
  findFill: 'rgba(255,255,255,0.10)',
  findEdge: 'rgba(255,255,255,0.26)',
} as const;

export type StatIconKind = 'book' | 'clock' | 'shield' | 'flame';

export const STAT_ICON_TINTS = {
  book: { from: '#5FB0FF', to: '#2A74EA', light: '#E3F2FF', accent: '#A9D4FF' },
  clock: { from: '#D48CFF', to: '#8E44F0', light: '#F5EBFF', accent: '#7B3FE4' },
  shield: { from: '#7CF0C6', to: '#1FB48A', light: '#E6FFF6', accent: '#137A5E' },
  flame: { from: '#FFB347', to: '#FF6B1A', light: '#FFE58A', accent: '#FF4E1A' },
} as const satisfies Record<StatIconKind, { from: string; to: string; light: string; accent: string }>;

export function homeContentWidth(screenWidth: number): number {
  return Math.min(screenWidth - HOME_CARDS.screenMargin * 2, HOME_CARDS.contentMaxWidth);
}

export function homeTileWidth(contentWidth: number, tiles: number = 4): number {
  const inner = contentWidth - HOME_CARDS.padding * 2 - HOME_CARDS.tileGap * (tiles - 1);

  return Math.floor(inner / tiles);
}

export function decorStars(cardWidth: number): { x: number; y: number; size: number }[] {
  return [
    { x: cardWidth * 0.90, y: 14, size: 14 },
    { x: cardWidth * 0.80, y: 34, size: 9 },
    { x: cardWidth * 0.96, y: 48, size: 10 },
    { x: cardWidth * 0.86, y: 72, size: 7 },
  ].slice(0, HOME_CARDS.decorStarCount);
}
