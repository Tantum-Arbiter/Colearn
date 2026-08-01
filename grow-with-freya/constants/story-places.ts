import type { StoryCategory } from '@/types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryPlaces');

export type StoryPlaceId = 'sunny-meadow' | 'woodland-path' | 'cosy-corner' | 'moonlit-stories';

export interface StoryPlacePalette {
  readonly sky: readonly [string, string];
  readonly shelf: string;
  readonly heading: string;
}

export interface StoryPlace {
  readonly id: StoryPlaceId;
  readonly titleKey: string;
  readonly categories: readonly StoryCategory[];
  readonly palette: StoryPlacePalette;
}

export const MIN_BOOKS_PER_SHELF = 3;
export const MAX_BOOKS_PER_SHELF = 5;

export const FALLBACK_STORY_PLACE_ID: StoryPlaceId = 'cosy-corner';

export const STORY_PLACES: readonly StoryPlace[] = [
  {
    id: 'sunny-meadow',
    titleKey: 'storyGarden.places.sunnyMeadow',
    categories: ['adventure', 'activities'],
    palette: {
      sky: ['#8FD9C9', '#5BB8DE'],
      shelf: '#C9A45B',
      heading: '#FFFFFF',
    },
  },
  {
    id: 'woodland-path',
    titleKey: 'storyGarden.places.woodlandPath',
    categories: ['nature', 'friendship'],
    palette: {
      sky: ['#6FBF9B', '#3E8F86'],
      shelf: '#A8763E',
      heading: '#FFFFFF',
    },
  },
  {
    id: 'cosy-corner',
    titleKey: 'storyGarden.places.cosyCorner',
    categories: ['learning', 'growing', 'music'],
    palette: {
      sky: ['#E8B98A', '#C97F5A'],
      shelf: '#8A5A3C',
      heading: '#FFFFFF',
    },
  },
  {
    id: 'moonlit-stories',
    titleKey: 'storyGarden.places.moonlitStories',
    categories: ['bedtime', 'fantasy'],
    palette: {
      sky: ['#3B5FA8', '#1E2A5E'],
      shelf: '#4A3F6B',
      heading: '#FFFFFF',
    },
  },
] as const;

const CATEGORY_TO_PLACE_ID: ReadonlyMap<StoryCategory, StoryPlaceId> = new Map(
  STORY_PLACES.flatMap((place) =>
    place.categories.map((category) => [category, place.id] as const)
  )
);

const PLACE_BY_ID: ReadonlyMap<StoryPlaceId, StoryPlace> = new Map(
  STORY_PLACES.map((place) => [place.id, place] as const)
);

export function getPlaceIdForCategory(category: StoryCategory): StoryPlaceId {
  const placeId = CATEGORY_TO_PLACE_ID.get(category);

  if (!placeId) {
    log.warn(
      `No story place mapped for category "${category}" — falling back to ${FALLBACK_STORY_PLACE_ID}. Add it to STORY_PLACES.`
    );
    return FALLBACK_STORY_PLACE_ID;
  }

  return placeId;
}

export function getStoryPlace(id: StoryPlaceId): StoryPlace {
  const place = PLACE_BY_ID.get(id);

  if (!place) {
    throw new Error(`Unknown story place id: ${id}`);
  }

  return place;
}

export type PlacedItems<T> = Record<StoryPlaceId, T[]>;

export function groupIntoPlaces<T extends { category: StoryCategory }>(
  items: readonly T[]
): PlacedItems<T> {
  const grouped = STORY_PLACES.reduce<PlacedItems<T>>((accumulator, place) => {
    accumulator[place.id] = [];
    return accumulator;
  }, {} as PlacedItems<T>);

  items.forEach((item) => {
    const placeId = getPlaceIdForCategory(item.category);
    const shelf = grouped[placeId];

    if (shelf.length < MAX_BOOKS_PER_SHELF) {
      shelf.push(item);
    }
  });

  return grouped;
}
