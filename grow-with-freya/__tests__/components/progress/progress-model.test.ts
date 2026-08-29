/**
 * Badges are data-driven (§25): status is calculated from progress, never
 * assigned by hand, and the badge/milestone sets are built from definitions.
 */

import {
  EMPTY_COUNTERS,
  RING_FULL_MINUTES,
  badgeStatus,
  buildBadges,
  buildMilestones,
  ringFraction,
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
      calmMoments: 2,
      kindStoriesRead: 0,
    });

    const byId = Object.fromEntries(underTest.map((badge) => [badge.id, badge]));
    expect(byId['morning-explorer'].status).toBe('earned');
    expect(byId['story-adventurer'].status).toBe('in_progress');
    expect(byId['calm-champion'].status).toBe('in_progress');
    expect(byId['kind-heart'].status).toBe('undiscovered');
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
