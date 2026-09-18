/**
 * Tests for the search over the catalogue.
 *
 * What can be searched is everything the child could reach: the books
 * installed on the device and the ones the CMS has sent thumbnails for. The
 * ordering matters as much as the matching -- a child who types three letters
 * wants the book whose title starts that way first, not whichever book happens
 * to mention it half way down a description.
 */

import type { CatalogueStory } from '@/components/stories/catalogue/catalogue-story';
import type { LocalizedText } from '@/types/story';
import {
  MIN_SEARCH_LENGTH,
  RECENT_SEARCH_LIMIT,
  isSearching,
  normaliseSearch,
  rememberSearch,
  searchStories,
} from '@/components/stories/catalogue/story-search';

function story(id: string, title: LocalizedText, description?: LocalizedText): CatalogueStory {
  return {
    id,
    title,
    description,
    coverArtwork: undefined,
    category: 'bedtime',
    theme: [],
    progress: null,
    locked: false,
    audioAvailable: false,
    interactive: false,
    learningGame: false,
    music: false,
    free: true,
    shareToUnlock: false,
    source: { kind: 'remote', entry: { storyId: id } as never },
  } as CatalogueStory;
}

const WOMBAT = story('wombat', { en: 'Snuggle Little Wombat' }, { en: 'A sleepy burrow at bedtime.' });
const MOON = story('moon', { en: 'The Moon Is Sleepy' }, { en: 'A wombat waves goodnight.' });
const CAFE = story('cafe', { en: 'Café on the Hill' });
const SPANISH = story('luna', { en: 'Moonlight', es: 'Luz de Luna' });

describe('normaliseSearch', () => {
  it('ignores case, edge whitespace and repeated spaces', () => {
    expect(normaliseSearch('  Little   WOMBAT ')).toBe('little wombat');
  });

  it('strips accents, so the bare letters a child types still match', () => {
    expect(normaliseSearch('Café')).toBe('cafe');
  });

  it('still works on an engine that ships without normalize', () => {
    const original = String.prototype.normalize;
    // @ts-expect-error -- standing in for an engine that does not have it
    delete String.prototype.normalize;

    try {
      expect(normaliseSearch('  Little   WOMBAT ')).toBe('little wombat');
    } finally {
      String.prototype.normalize = original;
    }
  });
});

describe('searchStories', () => {
  const shelf = [WOMBAT, MOON, CAFE, SPANISH];

  it('finds nothing until enough has been typed to mean something', () => {
    expect(searchStories(shelf, 'w', 'en')).toEqual([]);
    expect(MIN_SEARCH_LENGTH).toBe(2);
  });

  it('matches part of a title', () => {
    expect(searchStories(shelf, 'wombat', 'en').map((s) => s.id)).toContain('wombat');
  });

  it('matches a description when no title does', () => {
    expect(searchStories(shelf, 'burrow', 'en').map((s) => s.id)).toEqual(['wombat']);
  });

  it('puts a title that starts with the term first, then titles that contain it, then descriptions', () => {
    // "Moonlight" begins with it; "The Moon Is Sleepy" only carries it
    expect(searchStories(shelf, 'moon', 'en').map((s) => s.id)).toEqual(['luna', 'moon']);
    // and "Snuggle Little Wombat" carries it where "The Moon Is Sleepy" only
    // mentions a wombat in its description
    expect(searchStories(shelf, 'wombat', 'en').map((s) => s.id)).toEqual(['wombat', 'moon']);
  });

  it('keeps the order it was given inside a band, so installed books stay ahead', () => {
    const reversed = [MOON, WOMBAT];

    expect(searchStories(reversed, 'wombat', 'en').map((s) => s.id)).toEqual(['wombat', 'moon']);
  });

  it('reads the title in the child\'s language as well as English', () => {
    expect(searchStories(shelf, 'luz', 'es').map((s) => s.id)).toEqual(['luna']);
    expect(searchStories(shelf, 'luz', 'en')).toEqual([]);
  });

  it('matches an accented title from the bare letters', () => {
    expect(searchStories(shelf, 'cafe', 'en').map((s) => s.id)).toEqual(['cafe']);
  });

  it('comes back empty when nothing on the device or in the catalogue matches', () => {
    expect(searchStories(shelf, 'dinosaur', 'en')).toEqual([]);
  });

  it('never lists a book twice, however many of its fields match', () => {
    const both = story('both', { en: 'Wombat' }, { en: 'A wombat.' });

    expect(searchStories([both], 'wombat', 'en')).toHaveLength(1);
  });
});

describe('isSearching', () => {
  it('is false while the box is empty or barely started', () => {
    expect(isSearching('')).toBe(false);
    expect(isSearching('  ')).toBe(false);
    expect(isSearching('a')).toBe(false);
  });

  it('is true once there is something worth answering', () => {
    expect(isSearching('wo')).toBe(true);
  });
});

describe('rememberSearch', () => {
  it('puts the newest search at the front', () => {
    expect(rememberSearch(['moon'], 'wombat')).toEqual(['wombat', 'moon']);
  });

  it('moves a repeated search up rather than listing it twice', () => {
    expect(rememberSearch(['moon', 'wombat', 'star'], 'wombat')).toEqual(['wombat', 'moon', 'star']);
  });

  it('treats a repeat as the same search however it was capitalised or spaced', () => {
    expect(rememberSearch(['wombat'], '  WOMBAT ')).toEqual(['WOMBAT']);
  });

  it('keeps the term as it was typed, since it is offered back to be read', () => {
    expect(rememberSearch([], 'Little Wombat')).toEqual(['Little Wombat']);
  });

  it('remembers nothing from a query too short to have run', () => {
    expect(rememberSearch(['moon'], 'a')).toEqual(['moon']);
  });

  it('forgets the oldest once the list is full', () => {
    const full = Array.from({ length: RECENT_SEARCH_LIMIT }, (_, i) => `search ${i}`);

    const next = rememberSearch(full, 'newest');

    expect(next).toHaveLength(RECENT_SEARCH_LIMIT);
    expect(next[0]).toBe('newest');
    expect(next).not.toContain(`search ${RECENT_SEARCH_LIMIT - 1}`);
  });

  it('does not change the list it was given', () => {
    const recent = ['moon'];

    rememberSearch(recent, 'wombat');

    expect(recent).toEqual(['moon']);
  });
});
