/**
 * The CatalogueStory mapper is the only place that knows both the domain
 * types and the presentation model (§7). These pin the mapping rules and
 * the featured-story selection strategy (open decision 4: first downloaded
 * bedtime story, falling back to any downloaded story).
 */

import {
  entryMatchesMode,
  fromCatalogEntry,
  fromStory,
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
  it('prefers a downloaded bedtime story', () => {
    const adventure = fromStory(story({ id: 'a' }));
    const bedtime = fromStory(story({ id: 'b', category: 'bedtime' }));
    const remote = fromCatalogEntry(entry(), { locked: false, shareToUnlock: false });

    expect(selectFeatured([remote, adventure, bedtime])?.id).toBe('b');
  });

  it('falls back to the first downloaded story when no bedtime story exists', () => {
    const adventure = fromStory(story({ id: 'a' }));
    const remote = fromCatalogEntry(entry(), { locked: false, shareToUnlock: false });

    expect(selectFeatured([remote, adventure])?.id).toBe('a');
  });

  it('returns null for an empty catalogue', () => {
    expect(selectFeatured([])).toBeNull();
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
