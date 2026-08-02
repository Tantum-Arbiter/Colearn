/**
 * Tests for the Story Garden place mapping.
 *
 * Key behaviors tested:
 * 1. Every StoryCategory maps to exactly one place (no story can appear twice)
 * 2. Unknown categories fall back to Cosy Corner and warn loudly
 * 3. Places are returned in a stable, curated order
 * 4. Grouping preserves incoming order and caps each shelf
 */

import {
  STORY_PLACES,
  FALLBACK_STORY_PLACE_ID,
  MAX_BOOKS_PER_SHELF,
  getPlaceIdForCategory,
  getStoryPlace,
  groupIntoPlaces,
} from '@/constants/story-places';
import type { StoryCategory } from '@/types/story';
import { Logger } from '@/utils/logger';

const ALL_CATEGORIES: StoryCategory[] = [
  'bedtime',
  'adventure',
  'nature',
  'friendship',
  'learning',
  'fantasy',
  'music',
  'activities',
  'growing',
];

describe('story places', () => {
  describe('place definitions', () => {
    it('should define exactly four story places', () => {
      const underTest = STORY_PLACES;

      expect(underTest).toHaveLength(4);
    });

    it('should order places from brightest to darkest so the shelf reads as a day', () => {
      const underTest = STORY_PLACES.map((place) => place.id);

      expect(underTest).toEqual([
        'sunny-meadow',
        'woodland-path',
        'cosy-corner',
        'moonlit-stories',
      ]);
    });

    it('should give every place a translation key rather than literal copy', () => {
      const underTest = STORY_PLACES;

      underTest.forEach((place) => {
        expect(place.titleKey).toMatch(/^storyGarden\.places\./);
      });
    });
  });

  describe('category coverage', () => {
    it.each(ALL_CATEGORIES)('should map category "%s" to a defined place', (category) => {
      const underTest = getPlaceIdForCategory(category);

      expect(STORY_PLACES.map((place) => place.id)).toContain(underTest);
    });

    it('should never map one category to two places', () => {
      const allMapped = STORY_PLACES.flatMap((place) => place.categories);

      const unique = new Set(allMapped);

      expect(unique.size).toBe(allMapped.length);
    });

    it('should cover every known category across the four places', () => {
      const allMapped = new Set(STORY_PLACES.flatMap((place) => place.categories));

      expect([...allMapped].sort()).toEqual([...ALL_CATEGORIES].sort());
    });
  });

  describe('unknown categories', () => {
    it('should fall back to Cosy Corner', () => {
      const underTest = getPlaceIdForCategory('unmapped-category' as StoryCategory);

      expect(underTest).toBe(FALLBACK_STORY_PLACE_ID);
    });

    it('should warn so a new category surfaces loudly instead of vanishing', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      Logger.enableInTests();

      getPlaceIdForCategory('unmapped-category' as StoryCategory);

      expect(warnSpy).toHaveBeenCalled();
      Logger.reset();
      warnSpy.mockRestore();
    });
  });

  describe('getStoryPlace', () => {
    it('should return the full definition for a known id', () => {
      const underTest = getStoryPlace('moonlit-stories');

      expect(underTest.categories).toContain('bedtime');
    });
  });

  describe('groupIntoPlaces', () => {
    it('should route each item to the place its category belongs to', () => {
      const items = [
        { id: 'a', category: 'bedtime' as StoryCategory },
        { id: 'b', category: 'adventure' as StoryCategory },
      ];

      const underTest = groupIntoPlaces(items);

      expect(underTest['moonlit-stories'].map((item) => item.id)).toEqual(['a']);
      expect(underTest['sunny-meadow'].map((item) => item.id)).toEqual(['b']);
    });

    it('should preserve incoming order within a shelf', () => {
      const items = [
        { id: 'first', category: 'bedtime' as StoryCategory },
        { id: 'second', category: 'fantasy' as StoryCategory },
        { id: 'third', category: 'bedtime' as StoryCategory },
      ];

      const underTest = groupIntoPlaces(items);

      expect(underTest['moonlit-stories'].map((item) => item.id)).toEqual([
        'first',
        'second',
        'third',
      ]);
    });

    it('should cap a shelf so it stays finite and curated', () => {
      const items = Array.from({ length: MAX_BOOKS_PER_SHELF + 4 }, (_, index) => ({
        id: `story-${index}`,
        category: 'bedtime' as StoryCategory,
      }));

      const underTest = groupIntoPlaces(items);

      expect(underTest['moonlit-stories']).toHaveLength(MAX_BOOKS_PER_SHELF);
    });

    it('should return an empty shelf rather than omitting a place', () => {
      const underTest = groupIntoPlaces([]);

      expect(Object.keys(underTest).sort()).toEqual(
        STORY_PLACES.map((place) => place.id).sort()
      );
      expect(underTest['sunny-meadow']).toEqual([]);
    });
  });
});
