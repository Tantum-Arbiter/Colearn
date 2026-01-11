import { ImageSourcePropType } from 'react-native';

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
  interactiveElements?: InteractiveElement[]; // Optional interactive props for this page
}

export interface Story {
  id: string;
  title: string;
  category: StoryCategory;
  tag: string;
  emoji: string;
  coverImage?: ImageSourcePropType | string; // Optional - will use placeholder if not provided
  isAvailable: boolean;
  ageRange?: string;
  duration?: number; // in minutes
  description?: string;
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

export type StoryCategory = 'bedtime' | 'adventure' | 'nature' | 'friendship' | 'learning' | 'fantasy' | 'music' | 'activities' | 'growing';

// Filter tags for story filtering (different from category)
// 15 total tags for children's content
export type StoryFilterTag =
  | 'calming' | 'bedtime' | 'adventure' | 'learning' | 'music'
  | 'family-exercises' | 'imagination-games' | 'animals' | 'friendship'
  | 'nature' | 'fantasy' | 'counting' | 'emotions' | 'silly' | 'rhymes';

export interface StoryFilterTagInfo {
  id: StoryFilterTag;
  emoji: string;
  label: string;
  color: string;
}

export const STORY_FILTER_TAGS: Record<StoryFilterTag, StoryFilterTagInfo> = {
  calming: { id: 'calming', emoji: '🧘', label: 'Calming', color: '#4ECDC4' },
  bedtime: { id: 'bedtime', emoji: '🌙', label: 'Bedtime', color: '#96CEB4' },
  adventure: { id: 'adventure', emoji: '🗺️', label: 'Adventure', color: '#FF6B6B' },
  learning: { id: 'learning', emoji: '📚', label: 'Learning', color: '#FFEAA7' },
  music: { id: 'music', emoji: '🎵', label: 'Music', color: '#FF9F43' },
  'family-exercises': { id: 'family-exercises', emoji: '👨‍👩‍👧', label: 'Family', color: '#45B7D1' },
  'imagination-games': { id: 'imagination-games', emoji: '🎭', label: 'Imagination', color: '#DDA0DD' },
  animals: { id: 'animals', emoji: '🐾', label: 'Animals', color: '#8B4513' },
  friendship: { id: 'friendship', emoji: '🤝', label: 'Friendship', color: '#FFB6C1' },
  nature: { id: 'nature', emoji: '🌳', label: 'Nature', color: '#228B22' },
  fantasy: { id: 'fantasy', emoji: '✨', label: 'Fantasy', color: '#9370DB' },
  counting: { id: 'counting', emoji: '🔢', label: 'Counting', color: '#20B2AA' },
  emotions: { id: 'emotions', emoji: '💖', label: 'Emotions', color: '#FF69B4' },
  silly: { id: 'silly', emoji: '🤪', label: 'Silly', color: '#FFD700' },
  rhymes: { id: 'rhymes', emoji: '📝', label: 'Rhymes', color: '#87CEEB' },
};

export interface StoryTag {
  category: StoryCategory;
  emoji: string;
  label: string;
  color: string;
}

export const STORY_TAGS: Record<StoryCategory, StoryTag> = {
  bedtime: {
    category: 'bedtime',
    emoji: '🌙',
    label: 'Bedtime',
    color: '#96CEB4'
  },
  adventure: {
    category: 'adventure',
    emoji: '🗺️',
    label: 'Adventure',
    color: '#FF6B6B'
  },
  nature: {
    category: 'nature',
    emoji: '🐢',
    label: 'Nature',
    color: '#4ECDC4'
  },
  friendship: {
    category: 'friendship',
    emoji: '🤝',
    label: 'Friendship',
    color: '#45B7D1'
  },
  learning: {
    category: 'learning',
    emoji: '📚',
    label: 'Learning',
    color: '#FFEAA7'
  },
  fantasy: {
    category: 'fantasy',
    emoji: '✨',
    label: 'Fantasy',
    color: '#DDA0DD'
  },
  music: {
    category: 'music',
    emoji: '🎵',
    label: 'Learn Music',
    color: '#FF9F43'
  },
  activities: {
    category: 'activities',
    emoji: '🎲',
    label: 'Spontaneous Activities',
    color: '#6C5CE7'
  },
  growing: {
    category: 'growing',
    emoji: '🌱',
    label: 'Growing Together',
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
