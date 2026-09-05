/**
 * The CatalogueStory mapper is the only place that knows both the domain
 * types and the presentation model (§7). These pin the mapping rules, the
 * featured-story selection strategy (a book the child has installed, picked
 * afresh each time the app opens) and the page the featured panel shows to
 * give a glimpse inside.
 */

import {
  buildShelves,
  recommendationTarget,
  filterByTheme,
  storyTheme,
  entryMatchesMode,
  fromCatalogEntry,
  fromStory,
  featuredInsightImage,
  matchesGender,
  selectFeatured,
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
  const withPages = (count: number) => fromStory(story({
    coverImage: 'file://cover.webp',
    pages: Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      pageNumber: i + 1,
      text: '',
      backgroundImage: `file://page-${i + 1}.webp`,
    })),
  }));

  it('should count from the story, not the array: page one of a book is the one after the cover', () => {
    // The real data leads with the cover as pageNumber 0, so the third page of
    // the book is the fourth entry. Indexing blind lands on page two.
    const withCover = fromStory(story({
      coverImage: 'file://cover.webp',
      pages: [0, 1, 2, 3, 4].map((n) => ({
        id: `p${n}`,
        pageNumber: n,
        text: '',
        backgroundImage: n === 0 ? 'file://cover-large.webp' : `file://page-${n}.webp`,
      })),
    }));

    const underTest = featuredInsightImage(withCover);

    expect(underTest).toBe('file://page-3.webp');
  });

  it('should show the third page, for a glimpse inside rather than the cover again', () => {
    const underTest = featuredInsightImage(withPages(8));

    expect(underTest).toBe('file://page-3.webp');
  });

  it('should fall back to the cover when the book is shorter than three pages', () => {
    const underTest = featuredInsightImage(withPages(2));

    expect(underTest).toBe('file://cover.webp');
  });

  it('should fall back to the cover when the third page carries no picture', () => {
    const short = fromStory(story({
      coverImage: 'file://cover.webp',
      pages: [1, 2, 3].map((n) => ({ id: `p${n}`, pageNumber: n, text: '' })),
    }));

    const underTest = featuredInsightImage(short);

    expect(underTest).toBe('file://cover.webp');
  });

  it('should have nothing to show for a book that is not installed', () => {
    const underTest = featuredInsightImage(fromCatalogEntry(entry({ thumbnailUrl: undefined }), { locked: true, shareToUnlock: false }));

    expect(underTest).toBeUndefined();
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

  it('never matches remote entries for the jigsaw mode', () => {
    expect(entryMatchesMode(entry({ tags: ['interactive'] }), 'jigsaw')).toBe(false);
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
  it('gives every book exactly one home: Music, else Learning, else Stories', () => {
    const plain = fromStory(story({ tags: ['bedtime', 'adventure'] }));
    const tagged = fromStory(story({ tags: ['learning', 'bedtime'] }));
    const jigsaw = fromStory(story({ pages: [{ id: 'p', pageNumber: 1, text: '', interactionType: 'jigsaw_puzzle' } as any] }));
    const musical = fromStory(story({ tags: ['music', 'learning'] }));
    const remoteGame = fromCatalogEntry(entry({ tags: ['jigsaw'] }), { locked: false, shareToUnlock: false });
    // The bundled bedtime book carries two music pages and is still a story
    const storyWithASong = fromStory(story({ tags: ['bedtime'], pages: [{ id: 'p', pageNumber: 1, text: '', interactionType: 'music_challenge' } as any] }));

    expect(storyTheme(plain)).toBe('stories');
    expect(storyTheme(tagged)).toBe('learning');
    expect(storyTheme(jigsaw)).toBe('learning');
    expect(storyTheme(musical)).toBe('music');
    expect(storyTheme(remoteGame)).toBe('learning');
    expect(storyTheme(storyWithASong)).toBe('stories');
  });

  it('filterByTheme keeps only the books that live under a tile', () => {
    const shelf = [
      fromStory(story({ id: 'a', tags: ['bedtime'] })),
      fromStory(story({ id: 'b', tags: ['learning'] })),
      fromStory(story({ id: 'c', tags: ['music'] })),
    ];

    expect(filterByTheme(shelf, 'stories').map((s) => s.id)).toEqual(['a']);
    expect(filterByTheme(shelf, 'learning').map((s) => s.id)).toEqual(['b']);
    expect(filterByTheme(shelf, 'music').map((s) => s.id)).toEqual(['c']);
  });
});

describe('buildShelves', () => {
  const shelf = [
    fromStory(story({ id: 'wombat', tags: ['bedtime', 'calming'] })),
    fromStory(story({ id: 'bear', tags: ['adventure'] })),
    fromStory(story({ id: 'whale', tags: ['bedtime'] })),
  ];

  function rows(shelves: ReturnType<typeof buildShelves>) {
    return shelves.filter((s): s is Extract<typeof s, { kind: 'row' }> => s.kind === 'row');
  }

  it('gives a row to every theme with a book to its name, and none to the rest', () => {
    const underTest = rows(buildShelves(shelf, { seed: 0.3, featuredId: null }));

    expect(underTest.map((r) => r.tag).sort()).toEqual(['adventure', 'bedtime', 'calming']);
    expect(underTest.find((r) => r.tag === 'bedtime')?.stories.map((s) => s.id).sort()).toEqual(['whale', 'wombat']);
  });

  it("stands the day's pick among the rows, never the featured book, after the second row", () => {
    const underTest = buildShelves(shelf, { seed: 0.99, featuredId: 'whale' });

    const pickAt = underTest.findIndex((s) => s.kind === 'pick');
    const pick = underTest[pickAt];
    expect(pickAt).toBe(2);
    expect(pick.kind === 'pick' && pick.story.id).not.toBe('whale');
  });

  it('lays the rows out the same way for the same seed, so the shelf holds still within a run', () => {
    const once = rows(buildShelves(shelf, { seed: 0.42, featuredId: null })).map((r) => r.tag);
    const again = rows(buildShelves(shelf, { seed: 0.42, featuredId: null })).map((r) => r.tag);

    expect(again).toEqual(once);
  });

  it('leaves out a row that would repeat exactly the books of one above it', () => {
    const one = [fromStory(story({ id: 'wombat', tags: ['bedtime', 'calming', 'animals'] }))];

    const underTest = rows(buildShelves(one, { seed: 0.3, featuredId: null }));

    expect(underTest).toHaveLength(1);
  });

  it('closes the shelf with More Stories for any book no theme row claims', () => {
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
  });
});

describe('recommendationTarget', () => {
  it.each([
    ['learning'],
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
