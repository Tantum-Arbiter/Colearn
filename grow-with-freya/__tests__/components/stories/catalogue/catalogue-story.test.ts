/**
 * The CatalogueStory mapper is the only place that knows both the domain
 * types and the presentation model (§7). These pin the mapping rules, the
 * featured-story selection strategy (a book the child has installed, picked
 * afresh each time the app opens) and the page the featured panel shows to
 * give a glimpse inside.
 */

import {
  buildSavedRows,
  buildShelves,
  recommendationTarget,
  filterByTheme,
  storyTheme,
  bookTheme,
  entryMatchesMode,
  fromCatalogEntry,
  fromStory,
  featuredInsightImage,
  matchesGender,
  selectFeatured,
  continuingStoryId,
  selectContinuing,
  storyMatchesMode,
} from '@/components/stories/catalogue/catalogue-story';
import { CatalogEntry, Story } from '@/types/story';

const story = (overrides: Partial<Story> = {}): Story => ({
  id: 'story-1',
  title: 'A Brave Little Bear',
  category: 'adventure',
  isAvailable: true,
  ...overrides,
});

const entry = (overrides: Partial<CatalogEntry> = {}): CatalogEntry => ({
  storyId: 'entry-1',
  title: 'The Ocean Lullaby',
  category: 'bedtime',
  isFree: false,
  isReferralReward: false,
  isPremium: true,
  ...overrides,
});

describe('fromStory', () => {
  it('maps a downloaded story into the presentation model', () => {
    const underTest = fromStory(story({
      localizedTitle: { en: 'A Brave Little Bear', fr: 'Un petit ours courageux' },
      coverImage: 'file://cover.webp',
      tags: ['bedtime', 'not-a-filter-tag'],
    }));

    expect(underTest.id).toBe('story-1');
    expect(underTest.title.fr).toBe('Un petit ours courageux');
    expect(underTest.coverArtwork).toBe('file://cover.webp');
    expect(underTest.theme).toEqual(['bedtime']);
    expect(underTest.locked).toBe(false);
    expect(underTest.source.kind).toBe('downloaded');
  });

  it('falls back to the plain title when no localised title exists', () => {
    const underTest = fromStory(story());

    expect(underTest.title.en).toBe('A Brave Little Bear');
  });

  it('flags interactivity from page content', () => {
    const underTest = fromStory(story({
      pages: [{
        id: 'p1', pageNumber: 1, text: '',
        interactiveElements: [{ id: 'e', type: 'reveal', image: 'x', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } }],
      }],
    }));

    expect(underTest.interactive).toBe(true);
  });
});

describe('fromCatalogEntry', () => {
  it('maps a remote entry with the access flags the caller computed', () => {
    const underTest = fromCatalogEntry(entry({ thumbnailUrl: 'https://cdn/cover.jpg' }), {
      locked: true,
      shareToUnlock: false,
    });

    expect(underTest.id).toBe('entry-1');
    expect(underTest.coverArtwork).toBe('https://cdn/cover.jpg');
    expect(underTest.locked).toBe(true);
    expect(underTest.shareToUnlock).toBe(false);
    expect(underTest.source.kind).toBe('remote');
  });
});

describe('continuingStoryId', () => {
  const at = (updatedAt: string, pageIndex: number, totalPages = 8) => ({ pageIndex, totalPages, updatedAt, completedCount: 0 });

  it('should name the book most recently left part-way through', () => {
    const underTest = continuingStoryId({
      a: at('2026-09-10T09:00:00Z', 3),
      b: at('2026-09-12T09:00:00Z', 2),
      c: at('2026-09-11T09:00:00Z', 5),
    });

    expect(underTest).toBe('b');
  });

  it('should pass over books not yet begun and books read to the end', () => {
    const underTest = continuingStoryId({
      unstarted: at('2026-09-14T09:00:00Z', 0),
      finished: at('2026-09-13T09:00:00Z', 8),
      underway: at('2026-09-01T09:00:00Z', 4),
    });

    expect(underTest).toBe('underway');
  });

  it('should name nothing when no book is underway', () => {
    expect(continuingStoryId({})).toBeNull();
    expect(continuingStoryId({ done: at('2026-09-13T09:00:00Z', 8) })).toBeNull();
  });
});

describe('selectContinuing', () => {
  const installed = (id: string) => fromStory(story({ id }));
  const remote = () => fromCatalogEntry(entry({ storyId: 'shop' }), { locked: false, shareToUnlock: false });

  it('should hand back the installed book the child is part-way through', () => {
    const underTest = selectContinuing([remote(), installed('a'), installed('b')], 'b');

    expect(underTest?.id).toBe('b');
  });

  it('should hand back nothing when the book is not on this shelf, still in the shop, or there is none', () => {
    expect(selectContinuing([installed('a')], 'zzz')).toBeNull();
    expect(selectContinuing([remote()], 'shop')).toBeNull();
    expect(selectContinuing([installed('a')], null)).toBeNull();
  });
});

describe('selectFeatured', () => {
  const installed = (id: string) => fromStory(story({ id }));
  const remote = () => fromCatalogEntry(entry(), { locked: false, shareToUnlock: false });
  /** Nothing is pre-installed unless the test says so. */
  const nonePreInstalled = () => false;

  it('should pick a book the child has installed, never one still in the shop', () => {
    const shelf = [remote(), installed('a'), installed('b')];

    const underTest = selectFeatured(shelf, { seed: 0.9, isPreInstalled: nonePreInstalled });

    expect(['a', 'b']).toContain(underTest?.id);
  });

  it('should offer a different book as the seed moves across the shelf', () => {
    const shelf = [installed('a'), installed('b'), installed('c'), installed('d')];

    const underTest = new Set(
      [0, 0.3, 0.6, 0.9].map((seed) => selectFeatured(shelf, { seed, isPreInstalled: nonePreInstalled })?.id)
    );

    expect(underTest.size).toBe(4);
  });

  it('should hold the same book for one run of the app, so it does not change underfoot', () => {
    const shelf = [installed('a'), installed('b'), installed('c')];

    const underTest = selectFeatured(shelf, { seed: 0.42, isPreInstalled: nonePreInstalled });

    expect(underTest?.id).toBe(selectFeatured(shelf, { seed: 0.42, isPreInstalled: nonePreInstalled })?.id);
  });

  it('should fall back to the books that came with the app when the child has installed none', () => {
    // First run, or every downloaded book deleted: the shelf is the bundled
    // stories and the shop, and the panel still has something to show.
    const bundled = installed('bundled-1');
    const shelf = [remote(), bundled];

    const underTest = selectFeatured(shelf, { seed: 0.5, isPreInstalled: (id) => id === 'bundled-1' });

    expect(underTest?.id).toBe('bundled-1');
  });

  it('should prefer an installed book over the ones that came with the app', () => {
    const shelf = [installed('bundled-1'), installed('downloaded-1')];

    const underTest = selectFeatured(shelf, { seed: 0.5, isPreInstalled: (id) => id === 'bundled-1' });

    expect(underTest?.id).toBe('downloaded-1');
  });

  it('should never run off the end of the shelf on the highest seed', () => {
    const shelf = [installed('a'), installed('b')];

    const underTest = selectFeatured(shelf, { seed: 0.999999, isPreInstalled: nonePreInstalled });

    expect(underTest).not.toBeNull();
  });

  it('returns null for an empty catalogue', () => {
    expect(selectFeatured([], { seed: 0.5, isPreInstalled: nonePreInstalled })).toBeNull();
  });

  it('should show nothing rather than a book the child cannot open', () => {
    const underTest = selectFeatured([remote()], { seed: 0.5, isPreInstalled: nonePreInstalled });

    expect(underTest).toBeNull();
  });
});

describe('featuredInsightImage', () => {
  const page = (n: number, image?: string, type?: 'cover' | 'story') => ({
    id: `p${n}`,
    pageNumber: n,
    text: '',
    ...(type ? { type } : {}),
    ...(image ? { backgroundImage: image } : {}),
  });

  it('shows the book\'s cover, drawn around its hero, never a page that may cut them off', () => {
    const book = fromStory(story({
      coverImage: 'file://thumbnail.webp',
      pages: [page(0, 'file://cover.webp', 'cover'), page(1, 'file://page-1.webp'), page(2, 'file://page-2.webp'), page(3, 'file://page-3.webp')],
    }));

    expect(featuredInsightImage(book)).toBe('file://cover.webp');
  });

  it('finds the cover page by its type as well as by being page nought', () => {
    const typed = fromStory(story({ coverImage: 'file://thumbnail.webp', pages: [page(1, 'file://page-1.webp'), page(9, 'file://cover.webp', 'cover')] }));
    const numbered = fromStory(story({ coverImage: 'file://thumbnail.webp', pages: [page(1, 'file://page-1.webp'), page(0, 'file://cover.webp')] }));

    expect(featuredInsightImage(typed)).toBe('file://cover.webp');
    expect(featuredInsightImage(numbered)).toBe('file://cover.webp');
  });

  it.each([
    ['has no cover page', [page(1, 'file://page-1.webp'), page(2, 'file://page-2.webp'), page(3, 'file://page-3.webp')]],
    ['has a cover page with no picture', [page(0, undefined, 'cover'), page(3, 'file://page-3.webp')]],
    ['has no pages', undefined],
  ])('falls back to the shelf cover when the book %s', (_, pages) => {
    const book = fromStory(story({ coverImage: 'file://thumbnail.webp', pages }));

    expect(featuredInsightImage(book)).toBe('file://thumbnail.webp');
  });

  it.each([
    [3, 'file://page-3.webp'],
    [1, 'file://page-1.webp'],
  ])('shows the page a child is part-way through: page %s', (pageIndex, image) => {
    const book = fromStory(story({
      coverImage: 'file://thumbnail.webp',
      pages: [page(0, 'file://cover.webp', 'cover'), page(1, 'file://page-1.webp'), page(2, 'file://page-2.webp'), page(3, 'file://page-3.webp')],
    }));

    expect(featuredInsightImage(book, pageIndex)).toBe(image);
  });

  it.each([
    ['carries no picture', 2],
    ['is past the end of the book', 9],
  ])('falls back to the cover when the page they are on %s', (_, pageIndex) => {
    const book = fromStory(story({
      coverImage: 'file://thumbnail.webp',
      pages: [page(0, 'file://cover.webp', 'cover'), page(1, 'file://page-1.webp'), page(2), page(3, 'file://page-3.webp')],
    }));

    expect(featuredInsightImage(book, pageIndex)).toBe('file://cover.webp');
  });

  it('shows a remote book\'s cover, and nothing when it has none', () => {
    expect(featuredInsightImage(fromCatalogEntry(entry({ thumbnailUrl: 'https://cdn/c.webp' }), { locked: true, shareToUnlock: false }))).toBe('https://cdn/c.webp');
    expect(featuredInsightImage(fromCatalogEntry(entry({ thumbnailUrl: undefined }), { locked: true, shareToUnlock: false }))).toBeUndefined();
  });
});

describe('mode and gender matching', () => {
  const musicStory = story({
    pages: [{ id: 'p1', pageNumber: 1, text: '', interactionType: 'music_challenge' }],
  });

  it.each([
    ['music', musicStory, true],
    ['interactive', musicStory, false],
    [null, musicStory, true],
  ] as const)('storyMatchesMode(%s)', (mode, subject, expected) => {
    expect(storyMatchesMode(subject, mode)).toBe(expected);
  });

  it('matches remote entries by their tags', () => {
    expect(entryMatchesMode(entry({ tags: ['interactive'] }), 'music')).toBe(false);
    expect(entryMatchesMode(entry({ tags: ['interactive'] }), 'interactive')).toBe(true);
  });

  it.each([
    [null, { gender: 'boy' as const }, true],
    ['boy', { gender: 'boy' as const }, true],
    ['girl', { gender: 'boy' as const }, false],
    ['girl', {}, true],
    ['girl', { gender: 'unisex' as const }, true],
  ])('matchesGender(avatar=%s)', (avatar, subject, expected) => {
    expect(matchesGender(subject, avatar)).toBe(expected);
  });
});

describe('storyTheme', () => {
  it('gives every book exactly one home: Music, else Stories', () => {
    const plain = fromStory(story({ tags: ['bedtime', 'adventure'] }));
    const tagged = fromStory(story({ tags: ['learning', 'bedtime'] }));
    const musical = fromStory(story({ tags: ['music', 'learning'] }));
    const remoteTagged = fromCatalogEntry(entry({ tags: ['learning'] }), { locked: false, shareToUnlock: false });
    // The bundled bedtime book carries two music pages and is still a story
    const storyWithASong = fromStory(story({ tags: ['bedtime'], pages: [{ id: 'p', pageNumber: 1, text: '', interactionType: 'music_challenge' } as any] }));

    expect(storyTheme(plain)).toBe('stories');
    expect(storyTheme(tagged)).toBe('stories');
    expect(storyTheme(musical)).toBe('music');
    expect(storyTheme(remoteTagged)).toBe('stories');
    expect(storyTheme(storyWithASong)).toBe('stories');
  });

  it('filterByTheme keeps only the books that live under a tile', () => {
    const shelf = [
      fromStory(story({ id: 'a', tags: ['bedtime'] })),
      fromStory(story({ id: 'b', tags: ['learning'] })),
      fromStory(story({ id: 'c', tags: ['music'] })),
    ];

    expect(filterByTheme(shelf, 'stories').map((s) => s.id)).toEqual(['a', 'b']);
    expect(filterByTheme(shelf, 'music').map((s) => s.id)).toEqual(['c']);
  });
});

describe('buildShelves', () => {
  const shelf = [
    fromStory(story({ id: 'wombat', tags: ['bedtime', 'calming'] })),
    fromStory(story({ id: 'bear', tags: ['adventure'] })),
    fromStory(story({ id: 'whale', tags: ['bedtime'] })),
  ];
  const library = [
    fromStory(story({ id: 'ding', tags: ['emotions', 'learning', 'interactive'] })),
    fromStory(story({ id: 'fox', tags: ['emotions', 'interactive'] })),
    fromStory(story({ id: 'juni', tags: ['emotions', 'interactive', 'animals'] })),
    fromStory(story({ id: 'lantern', tags: ['friendship', 'interactive'] })),
    fromStory(story({ id: 'wombat', tags: ['calming', 'bedtime', 'animals'] })),
    fromStory(story({ id: 'otter', tags: ['animals'] })),
  ];
  const remoteBook = (id: string, tags: string[]) =>
    fromCatalogEntry(entry({ storyId: id, tags }), { locked: false, shareToUnlock: false });

  function rows(shelves: ReturnType<typeof buildShelves>) {
    return shelves.filter((s): s is Extract<typeof s, { kind: 'row' }> => s.kind === 'row');
  }
  function onBigCards(shelves: ReturnType<typeof buildShelves>, featuredId: string | null) {
    const pick = shelves.find((s) => s.kind === 'pick');
    return [featuredId, pick?.kind === 'pick' ? pick.story.id : null].filter((id): id is string => id !== null);
  }
  function inRows(shelves: ReturnType<typeof buildShelves>) {
    return shelves.flatMap((s) => (s.kind === 'row' || s.kind === 'more' ? s.stories.map((story) => story.id) : []));
  }

  it.each([0.01, 0.3, 0.5, 0.77, 0.99])('puts each book on one shelf only, however many themes it has (seed %s)', (seed) => {
    const underTest = inRows(buildShelves(library, { seed, featuredId: 'fox' }));

    expect(new Set(underTest).size).toBe(underTest.length);
  });

  it.each([0.01, 0.3, 0.5, 0.77, 0.99])('still finds a place for every book: on a shelf or on a big card (seed %s)', (seed) => {
    const shelves = buildShelves(library, { seed, featuredId: 'fox' });

    expect([...inRows(shelves), ...onBigCards(shelves, 'fox')].sort()).toEqual(library.map((s) => s.id).sort());
  });

  it('fills the fullest shelf first: the theme that gathers the most books not yet shelved', () => {
    const many = [
      remoteBook('a', ['interactive', 'animals']),
      remoteBook('b', ['interactive']),
      remoteBook('c', ['interactive']),
      remoteBook('d', ['emotions']),
      remoteBook('e', ['animals', 'emotions']),
    ];

    const underTest = rows(buildShelves(many, { seed: 0.3, featuredId: null }));

    expect(underTest.map((r) => [r.tag, r.stories.map((s) => s.id)])).toEqual([
      ['interactive', ['a', 'b', 'c']],
      ['emotions', ['d', 'e']],
    ]);
  });

  it('draws the order of equally full shelves from the seed, so the shelf changes between runs', () => {
    const even = [remoteBook('a', ['bedtime']), remoteBook('b', ['adventure']), remoteBook('c', ['calming'])];

    const leaders = new Set([0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map((seed) => rows(buildShelves(even, { seed, featuredId: null }))[0].tag));

    expect(leaders.size).toBeGreaterThan(1);
  });

  it('lays the rows out the same way for the same seed, so the shelf holds still within a run', () => {
    const once = rows(buildShelves(library, { seed: 0.42, featuredId: null })).map((r) => [r.tag, r.stories.map((s) => s.id)]);
    const again = rows(buildShelves(library, { seed: 0.42, featuredId: null })).map((r) => [r.tag, r.stories.map((s) => s.id)]);

    expect(again).toEqual(once);
  });

  it('keeps the featured book and the day\'s pick out of the rows below them', () => {
    const shelves = buildShelves(library, { seed: 0.6, featuredId: 'fox' });
    const big = onBigCards(shelves, 'fox');

    expect(big).toHaveLength(2);
    big.forEach((id) => expect(inRows(shelves)).not.toContain(id));
  });

  it('shows the big-card books in the rows after all when nothing else would be left to show', () => {
    const two = [shelf[0], shelf[2]];

    const underTest = buildShelves(two, { seed: 0.5, featuredId: 'wombat' });

    expect(underTest.some((s) => s.kind === 'pick')).toBe(true);
    expect(inRows(underTest).sort()).toEqual(['whale', 'wombat']);
  });

  it("stands the day's pick among the rows, never the featured book, after the second row", () => {
    const apart = ['bedtime', 'adventure', 'calming', 'animals', 'emotions'].map((tag) => fromStory(story({ id: tag, tags: [tag] })));

    const underTest = buildShelves(apart, { seed: 0.99, featuredId: 'bedtime' });

    const pickAt = underTest.findIndex((s) => s.kind === 'pick');
    const pick = underTest[pickAt];
    expect(pickAt).toBe(2);
    expect(pick.kind === 'pick' && pick.story.id).not.toBe('bedtime');
  });

  it('closes the shelf with More Stories for any book no theme claims', () => {
    const untagged = fromCatalogEntry(entry({ storyId: 'stray' }), { locked: false, shareToUnlock: false });

    const underTest = buildShelves([...shelf, untagged], { seed: 0.3, featuredId: null });
    const more = underTest[underTest.length - 1];

    expect(more.kind).toBe('more');
    expect(more.kind === 'more' && more.stories.map((s) => s.id)).toEqual(['stray']);
    expect(buildShelves(shelf, { seed: 0.3, featuredId: null }).some((s) => s.kind === 'more')).toBe(false);
  });

  it("offers no pick when the featured book is the only one on the device", () => {
    const underTest = buildShelves([shelf[0]], { seed: 0.5, featuredId: 'wombat' });

    expect(underTest.some((s) => s.kind === 'pick')).toBe(false);
    expect(inRows(underTest)).toEqual(['wombat']);
  });
});

describe('recommendationTarget', () => {
  it.each([
    ['music'],
  ])('should send a %s recommendation to that tile, since it is no longer a pill', (tag) => {
    const underTest = recommendationTarget(tag as any);

    expect(underTest).toEqual({ theme: tag, tags: [] });
  });

  it('should narrow the shelf by a finer theme, leaving the tile as it is', () => {
    const underTest = recommendationTarget('bedtime');

    expect(underTest).toEqual({ tags: ['bedtime'] });
  });

  it('should clear the filters when nothing in particular is recommended', () => {
    const underTest = recommendationTarget(null);

    expect(underTest).toEqual({ tags: [] });
  });
});

/**
 * The saved shelf is the child's own, so it behaves unlike the catalogue's:
 * it stays where they left it, and it does not repeat a handful of books under
 * every theme they happen to match.
 */
describe('buildSavedRows', () => {
  const saved = [
    fromStory(story({ id: 'wombat', tags: ['bedtime', 'calming'] })),
    fromStory(story({ id: 'bear', tags: ['adventure'] })),
    fromStory(story({ id: 'whale', tags: ['bedtime'] })),
  ];

  function rows(shelves: ReturnType<typeof buildSavedRows>) {
    return shelves.filter((s): s is Extract<typeof s, { kind: 'row' }> => s.kind === 'row');
  }

  /**
   * Which theme claims a book with several is the tag order's business, not
   * this shelf's -- what it owes is that every row holds books of its own
   * theme, and that the whole shelf is on it somewhere.
   */
  it('groups the saved books under themes they belong to', () => {
    const underTest = rows(buildSavedRows(saved));

    for (const row of underTest) {
      for (const entry of row.stories) {
        expect(entry.theme).toContain(row.tag);
      }
    }
    expect(underTest.flatMap((row) => row.stories.map((entry) => entry.id)).sort())
      .toEqual(['bear', 'whale', 'wombat']);
  });

  /** The load-bearing difference: 'wombat' is calming too, and appears once. */
  it('lets each book be claimed by one theme only', () => {
    const appearances = buildSavedRows(saved)
      .flatMap((shelf) => (shelf.kind === 'row' || shelf.kind === 'more' ? shelf.stories : []))
      .filter((entry) => entry.id === 'wombat');

    expect(appearances).toHaveLength(1);
  });

  it('lays the shelf out the same way every time', () => {
    const once = buildSavedRows(saved).map((s) => (s.kind === 'row' ? s.tag : s.kind));
    const again = buildSavedRows(saved).map((s) => (s.kind === 'row' ? s.tag : s.kind));

    expect(once).toEqual(again);
  });

  it('gathers anything with no theme of its own at the end', () => {
    const untagged = fromStory(story({ id: 'odd', tags: [] }));

    const underTest = buildSavedRows([...saved, untagged]);
    const more = underTest.find((s) => s.kind === 'more');

    expect(underTest[underTest.length - 1].kind).toBe('more');
    expect(more && more.kind === 'more' && more.stories.map((s) => s.id)).toEqual(['odd']);
  });

  it('adds no catch-all row when every book has a theme', () => {
    expect(buildSavedRows(saved).some((s) => s.kind === 'more')).toBe(false);
  });

  it('has nothing to show for an empty shelf', () => {
    expect(buildSavedRows([])).toEqual([]);
  });

  /** No day's pick: the saved shelf sells nothing, it just holds what is kept. */
  it('stands no featured pick among the rows', () => {
    expect(buildSavedRows(saved).some((s) => s.kind === 'pick')).toBe(false);
  });
});

describe('bookTheme', () => {
  it.each([
    [['music'], 'music'],
    [['bedtime', 'music'], 'music'],
    [['bedtime', 'animals'], 'stories'],
    [[], 'stories'],
    [undefined, 'stories'],
  ])('a book tagged %p is under %p', (tags, theme) => {
    expect(bookTheme(tags)).toBe(theme);
  });

  it('agrees with the shelf: a book tagged music sits under the Music tile', () => {
    const tagged = fromStory(story({ tags: ['music'] }));

    expect(storyTheme(tagged)).toBe(bookTheme(['music']));
    expect(storyTheme(fromStory(story({ tags: ['bedtime'] })))).toBe(bookTheme(['bedtime']));
  });
});

