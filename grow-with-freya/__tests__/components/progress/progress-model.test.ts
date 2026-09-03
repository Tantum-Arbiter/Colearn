/**
 * Badges are data-driven (§25): status is calculated from progress, never
 * assigned by hand, and the badge/milestone sets are built from definitions.
 */

import {
  BADGE_CATEGORIES,
  EMPTY_COUNTERS,
  RING_FULL_MINUTES,
  badgeStatus,
  buildBadges,
  buildChallenges,
  buildMilestones,
  filterBadges,
  ringFraction,
  sortBadgesForDiscovery,
  summariseBadges,
} from '@/components/progress/progress-model';

describe('badgeStatus', () => {
  it.each([
    [0, 5, 'undiscovered'],
    [1, 5, 'started'],
    [2, 5, 'in_progress'],
    [4, 5, 'in_progress'],
    [5, 5, 'earned'],
    [7, 5, 'earned'],
    [1, 1, 'earned'],
  ] as const)('%s of %s is %s', (current, target, expected) => {
    expect(badgeStatus(current, target)).toBe(expected);
  });
});

describe('buildBadges', () => {
  it('derives each badge status from the counters', () => {
    const underTest = buildBadges({
      ...EMPTY_COUNTERS,
      morningSessions: 1,
      storiesRead: 6,
      calmMomentsMonth: 2,
      kindStoriesRead: 0,
    });

    const byId = Object.fromEntries(underTest.map((badge) => [badge.id, badge]));
    expect(byId['morning-explorer'].status).toBe('earned');
    expect(byId['story-adventurer'].status).toBe('in_progress');
    expect(byId['calm-champion'].status).toBe('in_progress');
    expect(byId['kind-heart'].status).toBe('undiscovered');
  });

  it('covers every badge category so the filter never shows an empty group', () => {
    const badges = buildBadges(EMPTY_COUNTERS);

    BADGE_CATEGORIES.filter((category) => category.id !== 'all').forEach((category) => {
      expect(filterBadges(badges, category.id).length).toBeGreaterThan(0);
    });
    expect(filterBadges(badges, 'all')).toHaveLength(badges.length);
  });

  it('offers a broad library so there is always something left to discover', () => {
    expect(buildBadges(EMPTY_COUNTERS).length).toBeGreaterThanOrEqual(12);
  });

  it('clamps progress at the target', () => {
    const underTest = buildBadges({ ...EMPTY_COUNTERS, storiesRead: 25 });

    const adventurer = underTest.find((badge) => badge.id === 'story-adventurer');
    expect(adventurer?.currentProgress).toBe(adventurer?.targetProgress);
  });

  it('references titles and descriptions through translation keys', () => {
    buildBadges(EMPTY_COUNTERS).forEach((badge) => {
      expect(badge.titleKey).toMatch(/^progress\.badges\./);
      expect(badge.descriptionKey).toMatch(/^progress\.badges\./);
    });
  });
});

describe('sortBadgesForDiscovery', () => {
  it('surfaces what is coming alive first and settles earned badges at the end', () => {
    const badges = buildBadges({ ...EMPTY_COUNTERS, storiesRead: 6, morningSessions: 1 });

    const statuses = sortBadgesForDiscovery(badges).map((badge) => badge.status);
    const firstEarned = statuses.indexOf('earned');
    const lastUnfinished = statuses.map((s) => s !== 'earned').lastIndexOf(true);

    expect(statuses[0]).toBe('in_progress');
    expect(firstEarned).toBeGreaterThan(lastUnfinished);
  });
});

describe('summariseBadges', () => {
  it('counts discovered badges against the whole library', () => {
    const badges = buildBadges({ ...EMPTY_COUNTERS, storiesRead: 1, favourites: 1 });

    const underTest = summariseBadges(badges);

    expect(underTest.total).toBe(badges.length);
    expect(underTest.earned).toBe(2);
  });
});

describe('buildChallenges', () => {
  it('always offers one weekly and one monthly adventure', () => {
    const underTest = buildChallenges(EMPTY_COUNTERS, new Date(2026, 7, 26));

    expect(underTest.map((challenge) => challenge.period)).toEqual(['weekly', 'monthly']);
    underTest.forEach((challenge) => {
      expect(challenge.titleKey).toMatch(/^progress\.challenges\./);
      expect(challenge.status).toBe('undiscovered');
    });
  });

  it('keeps the same pick for every day of the same week and month', () => {
    const monday = buildChallenges(EMPTY_COUNTERS, new Date(2026, 7, 24));
    const thursday = buildChallenges(EMPTY_COUNTERS, new Date(2026, 7, 27));

    expect(thursday[0].id).toBe(monday[0].id);
    expect(thursday[1].id).toBe(monday[1].id);
  });

  it('rotates the weekly pick across weeks', () => {
    const weeks = [0, 1, 2, 3, 4, 5].map((offset) =>
      buildChallenges(EMPTY_COUNTERS, new Date(2026, 7, 3 + offset * 7))[0].id
    );

    expect(new Set(weeks).size).toBeGreaterThan(1);
  });

  it('derives challenge progress from the counters', () => {
    const now = new Date(2026, 7, 26);
    const before = buildChallenges(EMPTY_COUNTERS, now);
    const after = buildChallenges({
      ...EMPTY_COUNTERS,
      storySessions: 3, calmMoments: 1, musicSessions: 2, morningSessions: 1, eveningSessions: 2,
      storySessionsMonth: 10, musicSessionsMonth: 5, calmMomentsMonth: 4, morningSessionsMonth: 3,
    }, now);

    before.forEach((challenge) => expect(challenge.currentProgress).toBe(0));
    after.forEach((challenge) => expect(challenge.status).toBe('earned'));
  });
});

describe('buildMilestones', () => {
  it('marks milestones achieved from the counters', () => {
    const underTest = buildMilestones({
      ...EMPTY_COUNTERS,
      storiesRead: 5,
      bedtimeStoriesRead: 1,
      kindStoriesRead: 1,
    });

    const byId = Object.fromEntries(underTest.map((milestone) => [milestone.id, milestone.achieved]));
    expect(byId['first-five-stories']).toBe(true);
    expect(byId['bedtime-listener']).toBe(false);
    expect(byId['kind-moments']).toBe(true);
  });
});

describe('ringFraction', () => {
  it('scales participation up to the full-ring minutes and never beyond', () => {
    expect(ringFraction(0)).toBe(0);
    expect(ringFraction(RING_FULL_MINUTES / 2)).toBeCloseTo(0.5);
    expect(ringFraction(RING_FULL_MINUTES * 3)).toBe(1);
  });
});
