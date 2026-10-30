/**
 * The returning-user home is driven by a handful of pure decisions: which
 * welcome a family sees, whether a streak is still alive, how many stars a
 * milestone has lit, and how the cards share the screen. None of it may shame
 * a child for a quiet week.
 */

import {
  JOURNEY_CARD,
  JOURNEY_CARD_TINTS,
  journeyArtWidth,
  journeyWordsWidth,
  journeyScale,
  journeyStepsShown,
  JOURNEY_STEPS_SHOWN,
  HOME_CARDS,
  daysApart,
  effectiveStreak,
  homeContentWidth,
  litStars,
  localDateKey,
  remainingToNext,
  resolveReturnVisit,
  screenTimeSafetyPercent,
  welcomeCopy,
} from '@/constants/home-journey';
import type { ChildHomeData, ReturnVisitContext } from '@/types/child-home';

const NOW = new Date(2026, 8, 6, 9, 30);

const data = (overrides: Partial<ChildHomeData> = {}): ChildHomeData => ({
  firstName: 'Freya',
  storiesCompleted: 12,
  readingMinutes: 84,
  weeklyReadingMinutes: 22,
  readingStreakDays: 0,
  bestStreakDays: 0,
  ...overrides,
});

const context = (overrides: Partial<ReturnVisitContext> = {}): ReturnVisitContext => ({
  now: NOW,
  previousVisitAt: new Date(2026, 8, 6, 8, 0).toISOString(),
  hasNewAchievement: false,
  storyCompletedSinceLastVisit: false,
  ...overrides,
});

const achievement = { id: 'story-adventurer', title: 'Story Explorer', description: 'Read 10 stories', icon: 'book' };

describe('localDateKey', () => {
  it('should key a date by its local calendar day', () => {
    const underTest = localDateKey(new Date(2026, 0, 5, 23, 59));

    expect(underTest).toBe('2026-01-05');
  });
});

describe('daysApart', () => {
  it.each([
    [new Date(2026, 8, 6, 23, 0), new Date(2026, 8, 7, 1, 0), 1],
    [new Date(2026, 8, 6, 1, 0), new Date(2026, 8, 6, 23, 0), 0],
    [new Date(2026, 7, 30), new Date(2026, 8, 6), 7],
  ])('should count calendar days, not 24-hour spans', (from, to, expected) => {
    const underTest = daysApart(from, to);

    expect(underTest).toBe(expected);
  });
});

describe('effectiveStreak', () => {
  it.each([
    ['read today', '2026-09-06', 4, 4],
    ['read yesterday', '2026-09-05', 4, 4],
    ['read two days ago', '2026-09-04', 4, 0],
    ['never read', null, 4, 0],
    ['no streak', '2026-09-06', 0, 0],
  ])('should only count a streak that is still alive (%s)', (_label, lastReadDate, streak, expected) => {
    const underTest = effectiveStreak(streak, lastReadDate, NOW);

    expect(underTest).toBe(expected);
  });
});

describe('resolveReturnVisit', () => {
  it('should greet an ordinary return plainly', () => {
    const underTest = resolveReturnVisit(data(), context());

    expect(underTest).toBe('normal');
  });

  it('should notice the first visit of the day', () => {
    const underTest = resolveReturnVisit(
      data(),
      context({ previousVisitAt: new Date(2026, 8, 5, 20, 0).toISOString() })
    );

    expect(underTest).toBe('firstToday');
  });

  it('should treat a brand-new family as the first visit of the day', () => {
    const underTest = resolveReturnVisit(data(), context({ previousVisitAt: null }));

    expect(underTest).toBe('firstToday');
  });

  it('should celebrate a streak over a first visit of the day', () => {
    const underTest = resolveReturnVisit(
      data({ readingStreakDays: 2 }),
      context({ previousVisitAt: new Date(2026, 8, 5, 20, 0).toISOString() })
    );

    expect(underTest).toBe('streak');
  });

  it('should welcome a family back warmly after a long absence', () => {
    const underTest = resolveReturnVisit(
      data({ readingStreakDays: 0 }),
      context({ previousVisitAt: new Date(2026, 7, 28).toISOString() })
    );

    expect(underTest).toBe('longAbsence');
  });

  it('should put a finished story ahead of everything but a new badge', () => {
    const underTest = resolveReturnVisit(
      data({ readingStreakDays: 5 }),
      context({ storyCompletedSinceLastVisit: true, previousVisitAt: new Date(2026, 7, 1).toISOString() })
    );

    expect(underTest).toBe('storyCompleted');
  });

  it('should put a new badge first of all', () => {
    const underTest = resolveReturnVisit(
      data({ readingStreakDays: 5, newestAchievement: achievement }),
      context({ hasNewAchievement: true, storyCompletedSinceLastVisit: true })
    );

    expect(underTest).toBe('newAchievement');
  });

  it('should not announce a badge it cannot show', () => {
    const underTest = resolveReturnVisit(data(), context({ hasNewAchievement: true }));

    expect(underTest).toBe('normal');
  });
});

describe('welcomeCopy', () => {
  it('should address the child by name', () => {
    const underTest = welcomeCopy('normal', data());

    expect(underTest.titleKey).toBe('home.welcome.normal.title');
    expect(underTest.subtitleKey).toBe('home.welcome.normal.subtitle');
    expect(underTest.params.name).toBe('Freya');
  });

  it('should fall back to a nameless welcome when no name is known', () => {
    const underTest = welcomeCopy('longAbsence', data({ firstName: '  ' }));

    expect(underTest.titleKey).toBe('home.welcome.longAbsence.titleAnonymous');
  });

  it('should carry the streak length and badge name for the message', () => {
    const underTest = welcomeCopy('newAchievement', data({ readingStreakDays: 4, newestAchievement: achievement }));

    expect(underTest.params.count).toBe(4);
    expect(underTest.params.achievement).toBe('Story Explorer');
  });
});

describe('litStars', () => {
  it.each([
    [0, 10, 0],
    [1, 10, 1],
    [3, 10, 2],
    [8, 10, 4],
    [10, 10, 5],
    [12, 10, 5],
    [3, 0, 0],
  ])('should light %i of %i as stars', (current, required, expected) => {
    const underTest = litStars(current, required);

    expect(underTest).toBe(expected);
  });
});

describe('remainingToNext', () => {
  it('should count what is left, never below zero', () => {
    expect(remainingToNext(8, 10)).toBe(2);
    expect(remainingToNext(12, 10)).toBe(0);
  });
});

describe('screenTimeSafetyPercent', () => {
  const LIMIT = 3600;

  it('should be a full score when nothing has been used yet', () => {
    expect(screenTimeSafetyPercent([0, 0, 0], LIMIT)).toBe(100);
  });

  it('should count only the days that were actually used', () => {
    const underTest = screenTimeSafetyPercent([0, 1800, 4000, 0, 3600], LIMIT);

    expect(underTest).toBe(67);
  });

  it('should never blame a family without a limit to break', () => {
    expect(screenTimeSafetyPercent([9000], 0)).toBe(100);
  });
});

describe('the card layout', () => {
  it('should keep cards to a readable width on a tablet', () => {
    expect(homeContentWidth(390)).toBe(390 - HOME_CARDS.screenMargin * 2);
    expect(homeContentWidth(1024)).toBe(HOME_CARDS.contentMaxWidth);
  });

  it('keeps the panels to a narrower column on a tablet', () => {
    expect(HOME_CARDS.tabletContentMaxWidth).toBeLessThan(HOME_CARDS.contentMaxWidth);
    expect(homeContentWidth(1024, HOME_CARDS.tabletContentMaxWidth)).toBe(HOME_CARDS.tabletContentMaxWidth);
    // a phone is narrower than either cap, so the margins still decide there
    expect(homeContentWidth(390, HOME_CARDS.tabletContentMaxWidth)).toBe(390 - HOME_CARDS.screenMargin * 2);
  });

});

describe('the Your Learning Journey card', () => {
  const columnLeft = (scale: number) => (JOURNEY_CARD.inset + JOURNEY_CARD.compass.size + JOURNEY_CARD.compass.gap) * scale;

  /**
   * The operator's third mock (2026-10-04) is 267 pixels tall on a card 666
   * wide: 148 points on a card 370 wide, the shape the card had before.
   */
  it('stands as tall as the card in the operator`s third mock', () => {
    expect(JOURNEY_CARD.height).toBe(148);
    expect(JOURNEY_CARD.height / 370).toBeCloseTo(267 / 666, 2);
  });

  /**
   * The mock is drawn for a card 370 points wide, and every part of it keeps
   * its proportion on any card: smaller on a narrow phone, larger on a tablet,
   * where the card used to leave too much room (operator, 2026-10-04).
   */
  it.each([
    [370, 1],
    [358, 358 / 370],
    [328, 328 / 370],
    [408, 408 / 370],
    [500, 500 / 370],
  ])('draws a card %p wide at %p of the mock`s size', (cardWidth, expected) => {
    expect(journeyScale(cardWidth)).toBeCloseTo(expected, 6);
  });

  it('never draws the card smaller than its words can be read at, nor larger than a tablet needs', () => {
    expect(journeyScale(JOURNEY_CARD.designWidth * JOURNEY_CARD.smallestScale - 40)).toBe(JOURNEY_CARD.smallestScale);
    expect(journeyScale(2000)).toBe(JOURNEY_CARD.largestScale);
    expect(JOURNEY_CARD.smallestScale).toBeLessThan(328 / 370);
    expect(JOURNEY_CARD.largestScale).toBeGreaterThanOrEqual(500 / 370);
    expect(JOURNEY_CARD.largestScale).toBeLessThan(1.5);
  });

  it.each([0, -20, Number.NaN, Number.POSITIVE_INFINITY])('draws the card at the mock`s size when its width is %p', (cardWidth) => {
    expect(journeyScale(cardWidth)).toBe(1);
  });

  it('shows its island as tall as the card inside its edge, as wide as the narrower cut is', () => {
    expect(journeyArtWidth(145)).toBeCloseTo(145 * (622 / 472), 6);
    expect(JOURNEY_CARD.artAspect).toBeCloseTo(622 / 472, 6);
    expect(JOURNEY_CARD.artFade).toBeCloseTo(58 / 311, 6);
  });

  /**
   * The step tokens run along under the words and may reach the island's
   * soft left edge, as in the mock, but never past it onto the island itself.
   */
  it.each([328, 343, 358, 370, 408, 500])('keeps its row of step tokens off the island on a card %p wide', (cardWidth) => {
    const scale = journeyScale(cardWidth);
    const { open, rest, gap } = JOURNEY_CARD.step;
    const rowEnd = (JOURNEY_CARD.inset + open + (JOURNEY_STEPS_SHOWN - 1) * (rest + gap)) * scale;
    const innerHeight = JOURNEY_CARD.height * scale - 3;
    const artLeft = cardWidth - 3 - journeyArtWidth(innerHeight);

    expect(rowEnd).toBeLessThanOrEqual(artLeft + JOURNEY_CARD.artFade * journeyArtWidth(innerHeight));
    expect(open).toBeGreaterThan(rest);
  });

  it.each([
    [370, 1],
    [500, 500 / 370],
    [333, 333 / 370],
  ])('gives the words beside the compass the room up to the island`s trees on a card %p wide', (cardWidth, scale) => {
    const innerHeight = JOURNEY_CARD.height * scale - 3;
    const expected = cardWidth - 3 - innerHeight * (622 / 472) + JOURNEY_CARD.wordsReach * scale - columnLeft(scale);

    expect(journeyWordsWidth(cardWidth, innerHeight, JOURNEY_CARD.wordsReach, scale)).toBeCloseTo(expected, 6);
  });

  it('lets the eyebrow run further, over the island`s open sky', () => {
    expect(JOURNEY_CARD.eyebrowReach).toBeGreaterThan(JOURNEY_CARD.wordsReach);
    expect(journeyWordsWidth(370, 145, JOURNEY_CARD.eyebrowReach) - journeyWordsWidth(370, 145, JOURNEY_CARD.wordsReach)).toBeCloseTo(
      JOURNEY_CARD.eyebrowReach - JOURNEY_CARD.wordsReach,
      6
    );
  });

  it('never squeezes the words to nothing on a card too narrow for the island beside them', () => {
    expect(journeyWordsWidth(200, 145, JOURNEY_CARD.wordsReach)).toBe(JOURNEY_CARD.wordsNarrowest);
    expect(journeyWordsWidth(Number.NaN, 145, JOURNEY_CARD.wordsReach)).toBe(JOURNEY_CARD.wordsNarrowest);
    expect(journeyWordsWidth(120, 145, JOURNEY_CARD.wordsReach, 0.9)).toBeCloseTo(JOURNEY_CARD.wordsNarrowest * 0.9, 6);
  });

  it('joins its step tokens with a dash, a dot and a dash that fit between them', () => {
    const { link, gap } = JOURNEY_CARD.step;

    expect(link).toHaveLength(3);
    expect(link[1]).toBeLessThan(link[0]);
    expect(link[2]).toBe(link[0]);
    expect(link[0] + link[1] + link[2]).toBeLessThan(gap);
  });

  it('sets its compass by the card`s edge and its words beside it, as the mock does', () => {
    const { size, top, gap } = JOURNEY_CARD.compass;

    expect(size).toBeGreaterThanOrEqual(22);
    expect(size).toBeLessThanOrEqual(27);
    expect(top).toBeGreaterThanOrEqual(8);
    expect(gap).toBeGreaterThanOrEqual(6);
    expect(JOURNEY_CARD.inset).toBeLessThan(16);
  });

  it('is the mock`s deep blue, with a gold eyebrow and ink that reads on it', () => {
    expect(JOURNEY_CARD.fill).toEqual(['#032C8A', '#052E8E']);
    expect(JOURNEY_CARD_TINTS.title).toBe('#FFFFFF');
    expect(JOURNEY_CARD_TINTS.eyebrow).toBe('#F3E4A0');
  });

  it('wears a blue glass button, lighter at its top, at the card`s foot on the right', () => {
    const { right, bottom, height } = JOURNEY_CARD.button;

    expect(JOURNEY_CARD_TINTS.button[0]).toBe('#5C89F4');
    expect(JOURNEY_CARD_TINTS.button[1]).toBe('#3F5EF1');
    expect(right).toBeLessThan(10);
    expect(bottom).toBeLessThan(10);
    expect(height).toBeGreaterThan(28);
  });

  it('glows brightest at its edge and is gone well short of the words', () => {
    const strengths = JOURNEY_CARD.edgeGlow.map((colour) => Number(colour.slice(colour.lastIndexOf(',') + 1, -1)));

    expect(JOURNEY_CARD.edgeGlow).toHaveLength(JOURNEY_CARD.edgeGlowStops.length);
    expect([...strengths].sort((a, b) => b - a)).toEqual(strengths);
    expect(strengths[strengths.length - 1]).toBe(0);
    expect([...JOURNEY_CARD.edgeGlowStops].sort((a, b) => a - b)).toEqual([...JOURNEY_CARD.edgeGlowStops]);
    expect(JOURNEY_CARD.edgeGlowReach).toBeLessThan(columnLeft(1));
  });
});

describe('the steps of the journey the card shows', () => {
  type State = 'done' | 'open' | 'tomorrow' | 'locked';
  const week = (...states: State[]) => states.map((state, index) => ({ day: index + 1, state }));
  const days = (steps: readonly { day: number }[]) => steps.map((step) => step.day);

  it('shows five at a time', () => {
    expect(JOURNEY_STEPS_SHOWN).toBe(5);
  });

  it.each<[string, State[], number[]]>([
    ['nothing done yet', ['open', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked'], [1, 2, 3, 4, 5]],
    ['the first done today', ['done', 'tomorrow', 'locked', 'locked', 'locked', 'locked', 'locked'], [1, 2, 3, 4, 5]],
    ['the second open', ['done', 'open', 'locked', 'locked', 'locked', 'locked', 'locked'], [1, 2, 3, 4, 5]],
    ['the third open', ['done', 'done', 'open', 'locked', 'locked', 'locked', 'locked'], [2, 3, 4, 5, 6]],
    ['the fourth open', ['done', 'done', 'done', 'open', 'locked', 'locked', 'locked'], [3, 4, 5, 6, 7]],
    ['the fifth waiting for tomorrow', ['done', 'done', 'done', 'done', 'tomorrow', 'locked', 'locked'], [3, 4, 5, 6, 7]],
    ['the last open', ['done', 'done', 'done', 'done', 'done', 'done', 'open'], [3, 4, 5, 6, 7]],
    ['the whole week done', ['done', 'done', 'done', 'done', 'done', 'done', 'done'], [3, 4, 5, 6, 7]],
  ])('keeps the step in hand in view with the one before it, with %s', (_, states, expected) => {
    expect(days(journeyStepsShown(week(...states)))).toEqual(expected);
  });

  it('shows a short journey whole, and an empty one as nothing', () => {
    expect(days(journeyStepsShown(week('done', 'open', 'locked')))).toEqual([1, 2, 3]);
    expect(journeyStepsShown([])).toEqual([]);
  });

  it.each([0, -2, Number.NaN])('shows nothing when asked for %p steps', (shown) => {
    expect(journeyStepsShown(week('open', 'locked', 'locked'), shown)).toEqual([]);
  });

  it('shows as many as it is asked', () => {
    expect(days(journeyStepsShown(week('done', 'done', 'open', 'locked', 'locked', 'locked', 'locked'), 3))).toEqual([2, 3, 4]);
  });
});
