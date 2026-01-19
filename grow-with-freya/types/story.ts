import { ImageSourcePropType } from 'react-native';
import type { SupportedLanguage } from '@/services/i18n';

// Localized text for story content
export interface LocalizedText {
  en: string; // Required - English is the fallback
  pl?: string;
  es?: string;
  de?: string;
  fr?: string;
  it?: string;
  pt?: string;
  ja?: string;
  ar?: string;
  tr?: string;
  nl?: string;
  da?: string;
  la?: string;
  zh?: string;
}

// Interactive element types for story pages
export type InteractiveElementType = 'reveal' | 'toggle' | 'drag';

export interface InteractiveElementPosition {
  x: number; // Normalized 0-1 (percentage of background width)
  y: number; // Normalized 0-1 (percentage of background height)
}

export interface InteractiveElementSize {
  width: number;  // Normalized 0-1 (percentage of background width)
  height: number; // Normalized 0-1 (percentage of background height)
}

export interface InteractiveElement {
  id: string;
  type: InteractiveElementType;
  image: string | number; // Asset path (string for CMS) or require() result (number for local)
  position: InteractiveElementPosition;
  size: InteractiveElementSize;
  hitArea?: InteractiveElementPosition & InteractiveElementSize; // Optional custom hit area
}

export interface StoryPage {
  id: string;
  pageNumber: number;
  type?: string; // Page type (e.g., 'cover', 'story')
  backgroundImage?: string; // Background image for the page
  characterImage?: string; // Character/foreground image
  text: string; // Story text for this page
  localizedText?: LocalizedText; // Translated page text
  interactiveElements?: InteractiveElement[]; // Optional interactive props for this page
}

export interface Story {
  id: string;
  title: string;
  localizedTitle?: LocalizedText; // Translated titles
  category: StoryCategory;
  tag: string;
  emoji: string;
  coverImage?: ImageSourcePropType | string; // Optional - will use placeholder if not provided
  isAvailable: boolean;
  ageRange?: string;
  duration?: number; // in minutes
  description?: string;
  localizedDescription?: LocalizedText; // Translated descriptions
  pages?: StoryPage[]; // 8 pages for the story book

  // Metadata for CMS and delta-sync
  isPremium?: boolean;
  author?: string;
  tags?: string[];
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  version?: number; // For delta-sync
  checksum?: string; // SHA-256 checksum for delta-sync
}

/**
 * Get localized text with fallback to English
 */
export function getLocalizedText(
  localized: LocalizedText | undefined,
  fallback: string,
  language?: SupportedLanguage
): string {
  if (!localized) return fallback;
  if (!language) return localized.en || fallback;

  const result = localized[language] || localized.en || fallback;

  // Debug: Log if we're falling back to English when a different language was requested
  if (language && language !== 'en' && localized[language] === undefined && localized.en) {
    // Silently fall back to English - this is expected behavior
  }

  return result;
}

export type StoryCategory = 'personalized' | 'bedtime' | 'adventure' | 'nature' | 'friendship' | 'learning' | 'fantasy' | 'music' | 'activities' | 'growing';

// Filter tags for story filtering (different from category)
// 16 total tags for children's content (including personalized)
export type StoryFilterTag =
  | 'personalized' | 'calming' | 'bedtime' | 'adventure' | 'learning' | 'music'
  | 'family-exercises' | 'imagination-games' | 'animals' | 'friendship'
  | 'nature' | 'fantasy' | 'counting' | 'emotions' | 'silly' | 'rhymes';

export interface StoryFilterTagInfo {
  id: StoryFilterTag;
  emoji: string;
  labelKey: string;
  color: string;
}

export const STORY_FILTER_TAGS: Record<StoryFilterTag, StoryFilterTagInfo> = {
  personalized: { id: 'personalized', emoji: '🎭', labelKey: 'stories.filterTags.personalized', color: '#FF69B4' },
  calming: { id: 'calming', emoji: '🧘', labelKey: 'stories.filterTags.calming', color: '#4ECDC4' },
  bedtime: { id: 'bedtime', emoji: '🌙', labelKey: 'stories.filterTags.bedtime', color: '#96CEB4' },
  adventure: { id: 'adventure', emoji: '🗺️', labelKey: 'stories.filterTags.adventure', color: '#FF6B6B' },
  learning: { id: 'learning', emoji: '📚', labelKey: 'stories.filterTags.learning', color: '#FFEAA7' },
  music: { id: 'music', emoji: '🎵', labelKey: 'stories.filterTags.music', color: '#FF9F43' },
  'family-exercises': { id: 'family-exercises', emoji: '👨‍👩‍👧', labelKey: 'stories.filterTags.family', color: '#45B7D1' },
  'imagination-games': { id: 'imagination-games', emoji: '🎭', labelKey: 'stories.filterTags.imagination', color: '#DDA0DD' },
  animals: { id: 'animals', emoji: '🐾', labelKey: 'stories.filterTags.animals', color: '#8B4513' },
  friendship: { id: 'friendship', emoji: '🤝', labelKey: 'stories.filterTags.friendship', color: '#FFB6C1' },
  nature: { id: 'nature', emoji: '🌳', labelKey: 'stories.filterTags.nature', color: '#228B22' },
  fantasy: { id: 'fantasy', emoji: '✨', labelKey: 'stories.filterTags.fantasy', color: '#9370DB' },
  counting: { id: 'counting', emoji: '🔢', labelKey: 'stories.filterTags.counting', color: '#20B2AA' },
  emotions: { id: 'emotions', emoji: '💖', labelKey: 'stories.filterTags.emotions', color: '#FF69B4' },
  silly: { id: 'silly', emoji: '🤪', labelKey: 'stories.filterTags.silly', color: '#FFD700' },
  rhymes: { id: 'rhymes', emoji: '📝', labelKey: 'stories.filterTags.rhymes', color: '#87CEEB' },
};

export interface StoryTag {
  category: StoryCategory;
  emoji: string;
  labelKey: string;
  color: string;
}

export const STORY_TAGS: Record<StoryCategory, StoryTag> = {
  personalized: {
    category: 'personalized',
    emoji: '🎭',
    labelKey: 'stories.genres.personalized',
    color: '#FF69B4'
  },
  bedtime: {
    category: 'bedtime',
    emoji: '🌙',
    labelKey: 'stories.genres.bedtime',
    color: '#96CEB4'
  },
  adventure: {
    category: 'adventure',
    emoji: '🗺️',
    labelKey: 'stories.genres.adventure',
    color: '#FF6B6B'
  },
  nature: {
    category: 'nature',
    emoji: '🐢',
    labelKey: 'stories.genres.nature',
    color: '#4ECDC4'
  },
  friendship: {
    category: 'friendship',
    emoji: '🤝',
    labelKey: 'stories.genres.friendship',
    color: '#45B7D1'
  },
  learning: {
    category: 'learning',
    emoji: '📚',
    labelKey: 'stories.genres.learning',
    color: '#FFEAA7'
  },
  fantasy: {
    category: 'fantasy',
    emoji: '✨',
    labelKey: 'stories.genres.fantasy',
    color: '#DDA0DD'
  },
  music: {
    category: 'music',
    emoji: '🎵',
    labelKey: 'stories.genres.music',
    color: '#FF9F43'
  },
  activities: {
    category: 'activities',
    emoji: '🎲',
    labelKey: 'stories.genres.activities',
    color: '#6C5CE7'
  },
  growing: {
    category: 'growing',
    emoji: '🌱',
    labelKey: 'stories.genres.growing',
    color: '#00B894'
  }
};

// Content version tracking for delta-sync
export interface ContentVersion {
  version: number;
  lastUpdated: number; // Timestamp in milliseconds
  storyChecksums: Record<string, string>; // storyId -> checksum
  totalStories: number;
}

// Story sync request (sent to backend)
export interface StorySyncRequest {
  clientVersion: number;
  storyChecksums: Record<string, string>; // storyId -> checksum
  lastSyncTimestamp: number; // Timestamp in milliseconds
}

// Story sync response (received from backend)
export interface StorySyncResponse {
  serverVersion: number;
  stories: Story[]; // Only changed/new stories
  storyChecksums: Record<string, string>; // All current checksums
  totalStories: number;
  updatedStories: number;
  lastUpdated: number; // Timestamp in milliseconds
}

// Local storage structure for synced stories
export interface StorySyncMetadata {
  version: number;
  lastSyncTimestamp: number;
  storyChecksums: Record<string, string>;
  stories: Story[];
}
