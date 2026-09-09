/**
 * The returning-user home is driven by a handful of pure decisions: which
 * welcome a family sees, whether a streak is still alive, how many stars a
 * milestone has lit, and how the cards share the screen. None of it may shame
 * a child for a quiet week.
 */

import {
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

});
