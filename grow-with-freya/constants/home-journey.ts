import type { PlanStepState } from '@/constants/learning-plan';
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
  /** A tablet has width to spare, and at the phone's cap the panels ran wide
   *  enough to read as a wall rather than a column of cards. This is the
   *  content column the rest of the app already keeps to on a tablet
   *  (`TABLET_CONTENT_MAX_WIDTH`), so the home scene now matches it. */
  tabletContentMaxWidth: 500,
  radius: 20,
  /** Between the home panels. Wide enough that each reads as its own thing
   *  to press rather than three bands of one block. */
  gap: 16,
  padding: 12,
  coverSize: 72,
  coverRadius: 12,
  arrowSize: 46,
  tileIcon: 34,
  /** The achievement and continue-learning cards on a tablet, side by side
   *  rather than stacked -- there is width to spare there that a phone does
   *  not have, and pairing them is what keeps the taller welcome block, the
   *  streak and the plan button all inside a short landscape screen. Sized
   *  down from the stacked cards' own icon/arrow so the pair reads as two
   *  compact tiles rather than two shrunken full-width panels. */
  pairedMedallion: 40,
  pairedIcon: 28,
  pairedArrow: 34,
  /** Same reserved height on both tiles regardless of which has more to say,
   *  so "the same size" is a fact of the layout rather than a coincidence of
   *  the two cards' word counts. */
  pairedHeight: 132,
} as const;

export const HOME_CARD_TYPE = {
  welcome: 34,
  welcomeSubtitle: 18,
  eyebrow: 11,
  title: 19,
  cardHeading: 16,
  body: 14,
  meta: 12,
  achievementTitle: 17,
  cta: 12,
  pairedEyebrow: 10,
  pairedTitle: 15,
  pairedBody: 12,
  pairedCta: 11,
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
  trophyRestMs: 4200,
  trophyGleamMs: 900,
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
} as const;

export const JOURNEY_STEPS_SHOWN = 5;

export function journeyStepsShown<Step extends { state: PlanStepState }>(
  steps: readonly Step[],
  shown: number = JOURNEY_STEPS_SHOWN
): readonly Step[] {
  if (!(shown > 0)) return [];
  if (steps.length <= shown) return steps;

  const inHand = steps.findIndex((step) => step.state === 'open' || step.state === 'tomorrow');
  const at = inHand < 0 ? steps.length - 1 : inHand;
  const first = Math.min(Math.max(at - 1, 0), steps.length - shown);

  return steps.slice(first, first + shown);
}

export const JOURNEY_CARD = {
  designWidth: 370,
  smallestScale: 0.8,
  height: 154,
  fill: ['#032C8A', '#052E8E'],
  artAspect: 746 / 472,
  inset: 22.5,
  top: 13.7,
  wordsReach: 25,
  eyebrowReach: 65,
  wordsNarrowest: 96,
  edgeGlow: [
    'rgba(48,104,238,0.95)',
    'rgba(48,104,238,0.8)',
    'rgba(48,104,238,0.4)',
    'rgba(48,104,238,0.14)',
    'rgba(48,104,238,0)',
  ],
  edgeGlowStops: [0, 0.15, 0.4, 0.65, 1],
  edgeGlowReach: 18,
  cornerGleam: ['rgba(150,200,255,0.6)', 'rgba(60,130,235,0.28)', 'rgba(60,130,235,0)'],
  cornerGleamStops: [0, 0.35, 1],
  cornerGleamSize: 64,
  step: {
    open: 25,
    rest: 18,
    gap: 8.3,
    link: [2.6, 1.4, 2.6],
    linkThick: 1.4,
    ring: 1,
    openIcon: 13,
    restIcon: 10,
    top: 2.3,
    glow: { opacity: 0.75, radius: 5 },
  },
  buttonFoot: 12.8,
  button: {
    height: 35.5,
    fontSize: 14.5,
    iconSize: 17,
    paddingHorizontal: 22.75,
    gap: 2.3,
    outdent: 2.5,
    glow: { opacity: 0.6, radius: 8 },
  },
  glint: { size: 18, across: 0.278, down: 0.252 },
} as const;

export const JOURNEY_CARD_TYPE = {
  eyebrow: 10,
  eyebrowTracking: 1.48,
  eyebrowIndent: 0.5,
  title: 21,
  titleTracking: -0.35,
  titleIndent: -0.7,
  titleTop: 1.55,
  body: 14.5,
  bodyTop: -0.3,
  bodyIndent: 0.75,
} as const;

export const JOURNEY_CARD_TINTS = {
  eyebrow: '#A8C6F5',
  title: '#FFFFFF',
  body: '#CFE4FF',
  stepOpen: ['#FFE98F', '#FFC533'],
  stepOpenRing: '#FFF3C4',
  stepOpenInk: '#3A2400',
  stepDone: ['#F2B04A', '#D7802C'],
  stepDoneRing: '#FFF3D2',
  stepDoneInk: '#FFFFFF',
  stepLocked: ['rgba(126,170,255,0.5)', 'rgba(74,120,226,0.42)'],
  stepLockedRing: 'rgba(176,206,255,0.8)',
  stepLockedInk: '#E3EEFF',
  stepGlow: '#FFC533',
  stepLinkWarm: 'rgba(255,229,150,0.95)',
  stepLinkCool: 'rgba(190,214,255,0.7)',
} as const;

const JOURNEY_CARD_EDGE = 3;

export function journeyArtWidth(innerHeight: number): number {
  return innerHeight * JOURNEY_CARD.artAspect;
}

export function journeyScale(cardWidth: number): number {
  const scale = cardWidth / JOURNEY_CARD.designWidth;
  if (!(scale > 0)) return 1;

  return Math.min(1, Math.max(JOURNEY_CARD.smallestScale, scale));
}

export function journeyWordsWidth(cardWidth: number, innerHeight: number, reach: number, scale: number = 1): number {
  const room = cardWidth - JOURNEY_CARD_EDGE - journeyArtWidth(innerHeight) + (reach - JOURNEY_CARD.inset) * scale;
  const narrowest = JOURNEY_CARD.wordsNarrowest * scale;

  return room > narrowest ? room : narrowest;
}

export const STAT_TEXT_SHADE = {
  textShadowColor: 'rgba(4,16,47,0.95)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 7,
} as const;

export type StatIconKind = 'book' | 'clock' | 'shield' | 'flame' | 'trophy';

export const STAT_ICON_TINTS = {
  book: { from: '#5FB0FF', to: '#2A74EA', light: '#E3F2FF', accent: '#A9D4FF' },
  clock: { from: '#D48CFF', to: '#8E44F0', light: '#F5EBFF', accent: '#7B3FE4' },
  shield: { from: '#7CF0C6', to: '#1FB48A', light: '#E6FFF6', accent: '#137A5E' },
  flame: { from: '#FFB347', to: '#FF6B1A', light: '#FFE58A', accent: '#FF4E1A' },
  trophy: { from: '#FFE27A', to: '#F2A91E', light: '#FFF6D2', accent: '#C9820C' },
} as const satisfies Record<StatIconKind, { from: string; to: string; light: string; accent: string }>;

export function homeContentWidth(
  screenWidth: number,
  maxWidth: number = HOME_CARDS.contentMaxWidth
): number {
  return Math.min(screenWidth - HOME_CARDS.screenMargin * 2, maxWidth);
}

/** Half the content column, less half a gap -- so two tiles plus the gap
 *  between them add back up to exactly `contentWidth`. */
export function pairedCardWidth(contentWidth: number): number {
  return (contentWidth - HOME_CARDS.gap) / 2;
}

