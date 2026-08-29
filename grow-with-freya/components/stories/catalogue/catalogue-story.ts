import { ImageSourcePropType } from 'react-native';
import {
  CatalogEntry,
  LocalizedText,
  STORY_FILTER_TAGS,
  Story,
  StoryCategory,
  StoryFilterTag,
} from '@/types/story';

export type CatalogueStorySource =
  | { kind: 'downloaded'; story: Story }
  | { kind: 'remote'; entry: CatalogEntry };

export interface CatalogueStory {
  id: string;
  title: LocalizedText;
  coverArtwork: ImageSourcePropType | string | undefined;
  category: StoryCategory;
  theme: StoryFilterTag[];
  progress: number | null;
  locked: boolean;
  audioAvailable: boolean;
  interactive: boolean;
  free: boolean;
  shareToUnlock: boolean;
  source: CatalogueStorySource;
}

function toFilterTags(tags: string[] | undefined): StoryFilterTag[] {
  if (!tags) return [];
  return tags.filter((tag): tag is StoryFilterTag => tag in STORY_FILTER_TAGS);
}

function toLocalizedTitle(localized: LocalizedText | undefined, fallback: string): LocalizedText {
  return localized ?? { en: fallback };
}

export function fromStory(story: Story): CatalogueStory {
  return {
    id: story.id,
    title: toLocalizedTitle(story.localizedTitle, story.title),
    coverArtwork: story.coverImage,
    category: story.category,
    theme: toFilterTags(story.tags),
    progress: null,
    locked: false,
    audioAvailable: Boolean(story.pages?.length),
    interactive: Boolean(story.pages?.some((page) => page.interactiveElements?.length)),
    free: story.isFree ?? false,
    shareToUnlock: false,
    source: { kind: 'downloaded', story },
  };
}

export interface RemoteAccess {
  locked: boolean;
  shareToUnlock: boolean;
}

export function fromCatalogEntry(entry: CatalogEntry, access: RemoteAccess): CatalogueStory {
  return {
    id: entry.storyId,
    title: toLocalizedTitle(entry.localizedTitle, entry.title),
    coverArtwork: entry.thumbnailUrl,
    category: entry.category,
    theme: toFilterTags(entry.tags),
    progress: null,
    locked: access.locked,
    audioAvailable: false,
    interactive: Boolean(entry.tags?.includes('interactive')),
    free: entry.isFree,
    shareToUnlock: access.shareToUnlock,
    source: { kind: 'remote', entry },
  };
}

export type CatalogueMode = 'interactive' | 'music' | 'jigsaw';

export function storyHasMusic(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactionType === 'music_challenge');
}

export function storyHasInteractive(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactiveElements && page.interactiveElements.length > 0);
}

export function storyHasJigsaw(story: Story): boolean {
  return !!story.pages?.some((page) => page.interactionType === 'jigsaw_puzzle');
}

export function storyMatchesMode(story: Story, mode: CatalogueMode | null): boolean {
  if (mode === 'interactive') return storyHasInteractive(story);
  if (mode === 'music') return storyHasMusic(story);
  if (mode === 'jigsaw') return storyHasJigsaw(story);
  return true;
}

export function entryMatchesMode(entry: CatalogEntry, mode: CatalogueMode | null): boolean {
  if (mode === 'interactive') return !!entry.tags?.includes('interactive');
  if (mode === 'music') return !!entry.tags?.includes('music');
  if (mode === 'jigsaw') return false;
  return true;
}

type Gendered = { gender?: 'boy' | 'girl' | 'unisex' };

export function matchesGender(item: Gendered, avatarType: string | null | undefined): boolean {
  if (!avatarType) return true;
  return !item.gender || item.gender === 'unisex' || item.gender === avatarType;
}

export const FEATURED_CATEGORY: StoryCategory = 'bedtime';

export function selectFeatured(stories: CatalogueStory[]): CatalogueStory | null {
  if (stories.length === 0) return null;
  const downloaded = stories.filter((story) => story.source.kind === 'downloaded');
  const bedtime = downloaded.find((story) => story.category === FEATURED_CATEGORY);
  return bedtime ?? downloaded[0] ?? stories[0];
}
