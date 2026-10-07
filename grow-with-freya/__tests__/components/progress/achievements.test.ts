/**
 * Badges are data. A definition can change, be re-scored or retired without an
 * app release; an earned badge never goes away; an older app ignores what it
 * does not understand.
 */

import {
  AchievementDefinition,
  AchievementFacts,
  BUNDLED_ACHIEVEMENTS,
  awardsFor,
  evaluateAchievements,
  mergeDefinitions,
} from '@/components/progress/achievements';
import { buildBadges, EMPTY_COUNTERS } from '@/components/progress/progress-model';
import { ART } from '@/components/progress/badge-art';
import type { Story } from '@/types/story';

function facts(overrides: Partial<AchievementFacts> = {}): AchievementFacts {
  return {
    counters: EMPTY_COUNTERS,
    finishedStoryIds: [],
    challengeCounts: {},
    earnedIds: [],
    ...overrides,
  };
}

function story(id: string, category: string, tags: string[] = [], extra: Partial<Story> = {}): Story {
  return { id, title: id, category, tags, isAvailable: true, isFree: true, isReferralReward: false, isPremium: false, ...extra } as Story;
}

const CATALOGUE = [
  story('a', 'bedtime', ['calming']),
  story('b', 'bedtime', ['animals']),
  story('c', 'adventure', ['calming']),
  story('d', 'nature', ['friendship']),
];

function cms(overrides: Partial<AchievementDefinition>): AchievementDefinition {
  return {
    id: 'theme-calming',
    version: 1,
    status: 'active',
    family: 'theme',
    category: 'calm',
    rule: { kind: 'finishedWithTag', tags: ['calming'], target: 2 },
    art: 'https://cdn.example/badges/calming.webp',
    copy: {
      title: { en: 'Calm Collector', pl: 'Spokojny zbieracz' },
      earned: { en: 'You finished two calming books', pl: 'Dwie spokojne książki' },
      next: { en: 'Finish two calming books', pl: 'Skończ dwie spokojne książki' },
    },
    ...overrides,
  } as AchievementDefinition;
}

const evaluate = (definitions: AchievementDefinition[], f: AchievementFacts, appVersion = '1.4.0', language = 'en') =>
  evaluateAchievements(definitions, f, CATALOGUE, { appVersion, language });

describe('the bundled badges', () => {
  it.each([
    ['first-story', 'storiesRead', 1],
    ['story-adventurer', 'storiesRead', 10],
    ['reading-together', 'storySessions', 3],
    ['new-worlds', 'categoriesExplored', 3],
    ['favourite-finder', 'favourites', 1],
    ['first-notes', 'musicSessions', 1],
    ['music-explorer', 'musicSessionsMonth', 5],
    ['calm-moment', 'calmMoments', 1],
    ['calm-champion', 'calmMomentsMonth', 5],
    ['bedtime-listener', 'bedtimeStoriesRead', 3],
    ['gentle-evening', 'eveningSessions', 3],
    ['kind-moments', 'kindStoriesRead', 1],
    ['kind-heart', 'kindStoriesRead', 5],
    ['morning-explorer', 'morningSessions', 1],
    ['curious-mind', 'categoriesExplored', 5],
    ['adventure-explorer', 'adventureStoriesRead', 3],
  ] as const)('keep %s at %s >= %i, as the app always has', (id, counter, target) => {
    const definition = BUNDLED_ACHIEVEMENTS.find(d => d.id === id);

    expect(definition?.rule).toEqual({ kind: 'counter', counter, target });
    expect(evaluate(BUNDLED_ACHIEVEMENTS, facts({ counters: { ...EMPTY_COUNTERS, [counter]: target } })).find(b => b.id === id)?.status).toBe('earned');
    expect(evaluate(BUNDLED_ACHIEVEMENTS, facts({ counters: { ...EMPTY_COUNTERS, [counter]: target - 1 } })).find(b => b.id === id)?.status).not.toBe('earned');
  });

  it('are exactly sixteen, in the order the badge library shows them', () => {
    expect(buildBadges(EMPTY_COUNTERS).map(b => b.id)).toEqual(BUNDLED_ACHIEVEMENTS.map(d => d.id));
    expect(BUNDLED_ACHIEVEMENTS).toHaveLength(16);
  });
});

describe('evaluateAchievements', () => {
  it.each([
    ['finished books', { kind: 'finishedCount', target: 3 }, ['a', 'b', 'c'], 'earned'],
    ['finished books, one short', { kind: 'finishedCount', target: 3 }, ['a', 'b'], 'in_progress'],
    ['books in a category', { kind: 'finishedInCategory', category: 'bedtime', target: 2 }, ['a', 'b', 'c'], 'earned'],
    ['books in a category, others do not count', { kind: 'finishedInCategory', category: 'bedtime', target: 2 }, ['a', 'c', 'd'], 'in_progress'],
    ['books with a tag', { kind: 'finishedWithTag', tags: ['calming'], target: 2 }, ['a', 'c'], 'earned'],
    ['books with a tag, others do not count', { kind: 'finishedWithTag', tags: ['calming'], target: 2 }, ['a', 'b', 'd'], 'in_progress'],
    ['distinct categories', { kind: 'finishedDistinct', by: 'category', target: 3 }, ['a', 'c', 'd'], 'earned'],
    ['distinct tags', { kind: 'finishedDistinct', by: 'tag', target: 3 }, ['a', 'b', 'd'], 'earned'],
  ] as const)('judges %s', (_label, rule, finished, status) => {
    const [badge] = evaluate([cms({ rule } as never)], facts({ finishedStoryIds: [...finished] }));

    expect(badge.status).toBe(status);
  });

  it('still counts a finished book the catalogue has since withdrawn', () => {
    const [badge] = evaluate([cms({ rule: { kind: 'finishedCount', target: 2 } })], facts({ finishedStoryIds: ['a', 'gone'] }));

    expect(badge.currentProgress).toBe(2);
  });

  it('cannot judge a withdrawn book\'s tags, so leaves it out of tag badges', () => {
    const [badge] = evaluate([cms({ rule: { kind: 'finishedWithTag', tags: ['calming'], target: 2 } })], facts({ finishedStoryIds: ['a', 'gone'] }));

    expect(badge.currentProgress).toBe(1);
  });

  it.each([
    [{ music: 5 }, 'earned'],
    [{ music: 4 }, 'in_progress'],
    [{ jigsaw: 9 }, 'undiscovered'],
  ])('judges page challenges of one kind: %j', (counts, status) => {
    const [badge] = evaluate([cms({ rule: { kind: 'challenges', interaction: 'music', target: 5 } })], facts({ challengeCounts: counts }));

    expect(badge.status).toBe(status);
  });

  it('does not count challenges of another kind', () => {
    const [badge] = evaluate([cms({ rule: { kind: 'challenges', interaction: 'jigsaw', target: 5 } })], facts({ challengeCounts: { music: 5 } }));

    expect(badge.status).toBe('undiscovered');
  });

  it('shows a story award only as earned once granted', () => {
    const definition = cms({ id: 'snowman-friend', rule: { kind: 'storyAward' } });

    expect(evaluate([definition], facts())[0].status).toBe('undiscovered');
    expect(evaluate([definition], facts({ earnedIds: ['snowman-friend'] }))[0].status).toBe('earned');
  });

  it('never takes away a badge already earned, even when the rule is no longer met', () => {
    const [badge] = evaluate([cms({ rule: { kind: 'finishedCount', target: 50 } })], facts({ earnedIds: ['theme-calming'] }));

    expect(badge.status).toBe('earned');
    expect(badge.currentProgress).toBe(badge.targetProgress);
  });

  it('keeps a retired badge that was earned, and hides one that was not', () => {
    const retired = cms({ status: 'retired' });

    expect(evaluate([retired], facts({ earnedIds: ['theme-calming'] }))).toHaveLength(1);
    expect(evaluate([retired], facts({ finishedStoryIds: ['a', 'c'] }))).toHaveLength(0);
  });

  it('skips a rule this app does not understand rather than crash', () => {
    const future = cms({ rule: { kind: 'moonPhase', target: 1 } as never });

    expect(evaluate([future], facts())).toHaveLength(0);
  });

  it.each([
    ['1.5.0', 0],
    ['1.4.1', 0],
    ['1.4.0', 1],
    ['1.3.9', 1],
  ])('skips a badge that needs app %s or later, on app 1.4.0', (minAppVersion, shown) => {
    expect(evaluate([cms({ minAppVersion })], facts())).toHaveLength(shown);
  });

  it('uses the badge\'s own copy in the reading language, and what to do next until it is earned', () => {
    const [unearned] = evaluate([cms({})], facts(), '1.4.0', 'pl');
    const [earned] = evaluate([cms({})], facts({ finishedStoryIds: ['a', 'c'] }), '1.4.0', 'pl');

    expect(unearned.title).toBe('Spokojny zbieracz');
    expect(unearned.description).toBe('Skończ dwie spokojne książki');
    expect(earned.description).toBe('Dwie spokojne książki');
  });

  it('falls back to English copy', () => {
    const [badge] = evaluate([cms({})], facts(), '1.4.0', 'ja');

    expect(badge.title).toBe('Calm Collector');
  });

  it('shows remote art by its address and a bundled badge by its own art', () => {
    const [remote] = evaluate([cms({})], facts());
    const bundled = evaluate(BUNDLED_ACHIEVEMENTS, facts())[0];

    expect(remote.artwork).toEqual({ uri: 'https://cdn.example/badges/calming.webp' });
    expect(bundled.artwork).toBe(ART.bearHappy);
  });

  it('shows art fetched to the device from disk, and unknown art as the default', () => {
    const [local] = evaluate([cms({ art: 'file:///cache/badges/calm.webp' })], facts());
    const [unknown] = evaluate([cms({ art: 'assets/badges/not-yet.webp' })], facts());

    expect(local.artwork).toEqual({ uri: 'file:///cache/badges/calm.webp' });
    expect(unknown.artwork).toBe(ART.bearHappy);
  });

  it('carries its points, so a total can be worked out and never stored', () => {
    const [badge] = evaluate([cms({ points: 5 })], facts());

    expect(badge.points).toBe(5);
  });
});

describe('mergeDefinitions', () => {
  const bundled = cms({ id: 'first-story', version: 1, art: 'bearHappy', rule: { kind: 'finishedCount', target: 1 } });

  it('lets a newer CMS definition replace the bundled one of the same id', () => {
    const newer = { ...bundled, version: 2, rule: { kind: 'finishedCount', target: 2 } } as AchievementDefinition;

    expect(mergeDefinitions([bundled], [newer])[0].rule).toEqual({ kind: 'finishedCount', target: 2 });
  });

  it('lets a CMS definition at the same version replace the bundled one', () => {
    const same = { ...bundled, rule: { kind: 'finishedCount', target: 4 } } as AchievementDefinition;

    expect(mergeDefinitions([bundled], [same])[0].rule).toEqual({ kind: 'finishedCount', target: 4 });
  });

  it('never shows a badge twice when the CMS overrides a bundled one', () => {
    expect(mergeDefinitions([bundled], [{ ...bundled, version: 2 }])).toHaveLength(1);
  });

  it('keeps the bundled definition over an older CMS one', () => {
    const older = { ...bundled, version: 0, rule: { kind: 'finishedCount', target: 9 } } as AchievementDefinition;

    expect(mergeDefinitions([bundled], [older])[0].rule).toEqual({ kind: 'finishedCount', target: 1 });
  });

  it('adds CMS-only badges after the bundled ones', () => {
    expect(mergeDefinitions([bundled], [cms({ id: 'new-one' })]).map(d => d.id)).toEqual(['first-story', 'new-one']);
  });
});

describe('awardsFor', () => {
  const book = story('snowy', 'bedtime', [], {
    awards: [
      { achievementId: 'snowman-friend', trigger: 'finish' },
      { achievementId: 'snow-song', trigger: { challengePageId: 'snowy-4' } },
    ],
  });

  it('grants the finish awards when the book is finished', () => {
    expect(awardsFor(book, { finished: true })).toEqual(['snowman-friend']);
  });

  it('grants a page award when that page\'s challenge is done', () => {
    expect(awardsFor(book, { challengePageId: 'snowy-4' })).toEqual(['snow-song']);
  });

  it('grants nothing for another page', () => {
    expect(awardsFor(book, { challengePageId: 'snowy-2' })).toEqual([]);
  });

  it('grants nothing for a book with no awards', () => {
    expect(awardsFor(story('plain', 'bedtime'), { finished: true })).toEqual([]);
  });
});
