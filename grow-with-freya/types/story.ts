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

// Age groups for age-appropriate text variations
export type AgeGroup = '0-2' | '2-4' | '4-6';

// Age-group-specific localized text (maps age group → localized text)
export type AgeGroupText = Partial<Record<AgeGroup, LocalizedText>>;

/**
 * Resolve the age group for a child based on age in months.
 * Returns the matching age group key for ageGroupText lookup.
 */
export function resolveAgeGroup(ageInMonths: number): AgeGroup {
  if (ageInMonths < 24) return '0-2';
  if (ageInMonths < 48) return '2-4';
  return '4-6';
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

// Music challenge interaction types
export type MusicChallengeMode = 'guided' | 'free_play_optional';
export type MusicHintLevel = 'none' | 'minimal' | 'standard' | 'verbose';

// Music challenge configuration for a story page
export interface MusicChallenge {
  enabled: boolean;
  instrumentId: string; // References local instrument asset, e.g., "flute_basic"
  promptText: string; // Narrative prompt, e.g., "Play the flute to help Gary!"
  mode: MusicChallengeMode;
  /** Optional song ID referencing a practice song in the registry (e.g., "hot_cross_buns") */
  songId?: string;
  /** Explicit note sequence. If omitted, resolved from songId at runtime. */
  requiredSequence?: string[]; // Note sequence, e.g., ["C", "D", "E", "C"]
  successSongId?: string; // Legacy -kept for backward compat, no longer used
  successStateId?: string; // Optional page state change on success, e.g., "rock_moved"
  autoPlaySuccessSong: boolean;
  allowSkip: boolean;
  micRequired: boolean;
  fallbackAllowed: boolean; // Allow on-screen blow button if mic unavailable
  hintLevel: MusicHintLevel;
}

// Jigsaw puzzle grid sizes
export type JigsawGridSize = '2x2' | '4x4';

// Jigsaw puzzle configuration for a story page
export interface JigsawPuzzle {
  enabled: boolean;
  gridSize: JigsawGridSize; // Grid dimensions: 2x2 (easy), 4x4 (medium/hard)
  promptText: string; // Narrative prompt, e.g., "Put the picture back together!"
  allowSkip: boolean;
}

// Reading challenge modes
export type ReadingChallengeMode = 'fill_in_blank' | 'spell_word';

// Reading challenge configuration for a story page
export interface ReadingChallenge {
  enabled: boolean;
  mode: ReadingChallengeMode;
  promptText: string; // Narrative prompt, e.g., "Can you fill in the missing words?"
  allowSkip: boolean;
  /** For fill_in_blank: zero-based indices of words in page text to blank out (user taps words in order) */
  blankWordIndices?: number[];
  /** For spell_word: the target word the user must spell by selecting letters */
  targetWord?: string;
  /** Optional distractor letters added to the letter pool (spell_word mode only) */
  distractorLetters?: string[];
}

// Page interaction types (extends beyond simple interactive elements)
export type PageInteractionType = 'none' | 'interactive_state_change' | 'music_challenge' | 'jigsaw_puzzle' | 'reading_challenge';

export interface StoryPage {
  id: string;
  pageNumber: number;
  type?: string; // Page type (e.g., 'cover', 'story')
  backgroundImage?: string; // Background image for the page
  characterImage?: string; // Character/foreground image
  text: string; // Story text for this page
  localizedText?: AgeGroupText; // Age-grouped localized text: {"4-6": {"en": "...", ...}, "0-2": {"en": "...", ...}}
  interactiveElements?: InteractiveElement[]; // Optional interactive props for this page

  // Music challenge support
  interactionType?: PageInteractionType; // Defaults to 'none' if not set
  musicChallenge?: MusicChallenge; // Present when interactionType === 'music_challenge'

  // Jigsaw puzzle support
  jigsawPuzzle?: JigsawPuzzle; // Present when interactionType === 'jigsaw_puzzle'

  // Reading challenge support
  readingChallenge?: ReadingChallenge; // Present when interactionType === 'reading_challenge'
}

export interface StoryAward {
  achievementId: string;
  trigger: 'finish' | { challengePageId: string };
}

export interface Story {
  id: string;
  title: string;
  localizedTitle?: LocalizedText; // Translated titles
  category: StoryCategory;
  coverImage?: ImageSourcePropType | string; // Optional - will use placeholder if not provided
  isAvailable: boolean;
  ageRange?: string;
  pageCount?: number;
  awards?: StoryAward[];
  duration?: number; // legacy page count written by older story-factory exports; read storyPageCount()
  description?: string;
  localizedDescription?: LocalizedText; // Translated descriptions
  pages?: StoryPage[]; // 8 pages for the story book

  // Gender-based filtering (not shown in UI)
  gender?: 'boy' | 'girl' | 'unisex'; // Defaults to 'unisex' if not set

  // Metadata for CMS and delta-sync
  isPremium?: boolean;
  isFree?: boolean; // Whether the story is free to download
  isReferralReward?: boolean; // Whether the story is unlocked via referral
  author?: string;
  tags?: string[];
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  version?: number; // For delta-sync
  checksum?: string; // SHA-256 checksum for delta-sync
}

/**
 * Lightweight catalog entry for stories the client hasn't downloaded.
 * Returned as part of the delta sync response for browse/discovery UI.
 */
export interface CatalogEntry {
  storyId: string;
  title: string;
  localizedTitle?: LocalizedText;
  description?: string;
  localizedDescription?: LocalizedText;
  category: StoryCategory;
  tags?: string[];
  thumbnailUrl?: string; // Signed URL for cover thumbnail
  isFree: boolean;
  isReferralReward: boolean;
  isPremium: boolean;
  /** When true, this story can be unlocked by sharing the app (one-time). */
  isShareToUnlock?: boolean;
  ageRange?: string;
  pageCount?: number;
  gender?: 'boy' | 'girl' | 'unisex';
}

export function storyPageCount(story: Pick<Story, 'pages' | 'pageCount' | 'duration'>): number | undefined {
  if (story.pages && story.pages.length > 0) return story.pages.length;
  return story.pageCount ?? story.duration;
}

const AGE_GROUP_FALLBACK: Record<AgeGroup, readonly AgeGroup[]> = {
  '0-2': ['0-2', '2-4', '4-6'],
  '2-4': ['2-4', '0-2', '4-6'],
  '4-6': ['4-6', '2-4', '0-2'],
};

export function ageGroupFallbackChain(ageGroup?: AgeGroup): readonly AgeGroup[] {
  return (ageGroup && AGE_GROUP_FALLBACK[ageGroup]) || AGE_GROUP_FALLBACK['4-6'];
}

/**
 * Get localized text with fallback to English.
 *
 * Resolution order when ageGroupText is given:
 *  1. the requested language, in the child's age group and then the nearest ones
 *  2. English, in the same order
 *  3. localized[language], localized.en
 *  4. fallback
 * The gateway resolves in the same order (StoryPage.getTextForLanguageAndAgeGroup).
 */
export function getLocalizedText(
  localized: LocalizedText | undefined,
  fallback: string,
  language?: SupportedLanguage,
  ageGroupText?: AgeGroupText,
  ageGroup?: AgeGroup,
): string {
  if (ageGroupText) {
    const chain = ageGroupFallbackChain(ageGroup);
    const languages = language && language !== 'en' ? [language, 'en' as const] : ['en' as const];
    for (const lang of languages) {
      for (const group of chain) {
        const text = ageGroupText[group]?.[lang];
        if (text) return text;
      }
    }

    // If ageGroupText is actually a flat LocalizedText (keys are language codes, not age groups),
    // treat it as a localized text object directly.
    const flatText = ageGroupText as unknown as LocalizedText;
    if (flatText.en || flatText.fr || flatText.es || flatText.de) {
      const flatResult = language ? (flatText[language] || flatText.en) : flatText.en;
      if (flatResult) return flatResult;
    }
  }

  // Fall back to standard localized text
  if (!localized) return fallback;
  if (!language) return localized.en || fallback;

  const result = localized[language] || localized.en || fallback;
  return result;
}

export type StoryCategory = 'bedtime' | 'adventure' | 'nature' | 'friendship' | 'learning' | 'fantasy' | 'personalized' | 'music' | 'activities' | 'growing';

// Filter tags for story filtering (different from category)
// Standard children's storybook themes
export type StoryFilterTag =
  | 'calming' | 'bedtime' | 'adventure' | 'learning' | 'music'
  | 'family-exercises' | 'imagination-games' | 'animals' | 'friendship'
  | 'nature' | 'fantasy' | 'counting' | 'emotions' | 'silly' | 'rhymes' | 'interactive';

export interface StoryFilterTagInfo {
  id: StoryFilterTag;
  emoji: string;
  labelKey: string;
  color: string;
}

export const STORY_FILTER_TAGS: Record<StoryFilterTag, StoryFilterTagInfo> = {
  calming: { id: 'calming', emoji: '🧘', labelKey: 'stories.filterTags.calming', color: '#4ECDC4' },
  bedtime: { id: 'bedtime', emoji: '🌙', labelKey: 'stories.filterTags.bedtime', color: '#96CEB4' },
  adventure: { id: 'adventure', emoji: '🗺️', labelKey: 'stories.filterTags.adventure', color: '#FF6B6B' },
  learning: { id: 'learning', emoji: '📚', labelKey: 'stories.filterTags.learning', color: '#FFEAA7' },
  music: { id: 'music', emoji: '🎵', labelKey: 'stories.filterTags.music', color: '#FF9F43' },
  'family-exercises': { id: 'family-exercises', emoji: '👨‍👩‍👧', labelKey: 'stories.filterTags.family', color: '#45B7D1' },
  'imagination-games': { id: 'imagination-games', emoji: '🎨', labelKey: 'stories.filterTags.creativity', color: '#DDA0DD' },
  animals: { id: 'animals', emoji: '🐾', labelKey: 'stories.filterTags.animals', color: '#8B4513' },
  friendship: { id: 'friendship', emoji: '🤝', labelKey: 'stories.filterTags.friendship', color: '#FFB6C1' },
  nature: { id: 'nature', emoji: '🌳', labelKey: 'stories.filterTags.nature', color: '#228B22' },
  fantasy: { id: 'fantasy', emoji: '✨', labelKey: 'stories.filterTags.fantasy', color: '#9370DB' },
  counting: { id: 'counting', emoji: '🔢', labelKey: 'stories.filterTags.counting', color: '#20B2AA' },
  emotions: { id: 'emotions', emoji: '💖', labelKey: 'stories.filterTags.emotions', color: '#FF69B4' },
  silly: { id: 'silly', emoji: '🤪', labelKey: 'stories.filterTags.silly', color: '#FFD700' },
  rhymes: { id: 'rhymes', emoji: '📝', labelKey: 'stories.filterTags.rhymes', color: '#87CEEB' },
  interactive: { id: 'interactive', emoji: '👆', labelKey: 'storyDetail.interactive', color: '#F4A261' },
};

export interface StoryTag {
  category: StoryCategory;
  emoji: string;
  labelKey: string;
  color: string;
}

export const STORY_TAGS: Record<StoryCategory, StoryTag> = {
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
  personalized: {
    category: 'personalized',
    emoji: '🧒',
    labelKey: 'stories.genres.personalized',
    color: '#E9A6C9'
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

