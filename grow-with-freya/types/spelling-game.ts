/**
 * Spelling Game — Types
 *
 * Defines the data model for the interactive spelling game where children
 * tap letter tiles to spell words. Each spelling activity has a themed word
 * list, and difficulty scales with age group.
 */

/** A single word in the spelling game word bank */
export interface SpellingWord {
  /** The word to spell (lowercase, no spaces) */
  word: string;
  /** Emoji hint shown alongside the word prompt */
  emoji: string;
  /** i18n key for the word's display label (for non-English locales) */
  labelKey: string;
}

/** Difficulty tier — maps to age ranges in learning-screen.tsx */
export type SpellingDifficulty = 'easy' | 'medium' | 'hard';

/** Configuration for how a spelling game plays at a given difficulty */
export interface SpellingGameConfig {
  /** How many words the child must spell to complete a round */
  wordsPerRound: number;
  /** Number of extra distractor letters mixed in with the real letters */
  distractorCount: number;
  /** Time limit per word in seconds (0 = no timer) */
  timeLimitSeconds: number;
  /** Whether to show the word as a hint above the tiles */
  showWordHint: boolean;
}

/** Difficulty configs per age group */
export const SPELLING_DIFFICULTY_CONFIG: Record<SpellingDifficulty, SpellingGameConfig> = {
  easy: {
    wordsPerRound: 4,
    distractorCount: 0,
    timeLimitSeconds: 0,
    showWordHint: true,
  },
  medium: {
    wordsPerRound: 5,
    distractorCount: 2,
    timeLimitSeconds: 0,
    showWordHint: true,
  },
  hard: {
    wordsPerRound: 5,
    distractorCount: 3,
    timeLimitSeconds: 60,
    showWordHint: false,
  },
};

/** Maps activity ID → difficulty tier */
export const ACTIVITY_DIFFICULTY: Record<string, SpellingDifficulty> = {
  // Ages 1-2 → easy
  'abc-animals': 'easy',
  'first-words': 'easy',
  'colour-spelling': 'easy',
  'shape-names': 'easy',
  'my-name': 'easy',
  // Ages 2-4 → medium
  'wombat-spelling': 'medium',
  'animal-spelling': 'medium',
  'food-spelling': 'medium',
  'nature-words': 'medium',
  'garden-words': 'medium',
  // Ages 4+ → hard
  'word-builder': 'hard',
  'sentence-speller': 'hard',
  'tricky-words': 'hard',

  'story-spelling': 'hard',
  // Numbers — Ages 1-2 → easy
  'counting-fun': 'easy',
  'number-friends': 'easy',
  'colour-counting': 'easy',
  'shape-counting': 'easy',
  'one-two-three': 'easy',
  // Numbers — Ages 2-4 → medium
  'wombat-word-placing': 'medium',
  'animal-counting': 'medium',
  'fruit-counting': 'medium',
  'toy-counting': 'medium',
  'garden-counting': 'medium',
  // Numbers — Ages 4+ → hard
  'number-puzzles': 'hard',
  'adding-fun': 'hard',
  'number-stories': 'hard',
  'number-patterns': 'hard',
  'subtraction-fun': 'hard',
};

/** Runtime game state */
export interface SpellingGameState {
  /** The current word being spelled */
  currentWord: SpellingWord | null;
  /** Letters the child has selected so far (in order) */
  selectedLetters: string[];
  /** The shuffled tile letters (word letters + distractors) */
  availableTiles: string[];
  /** Index of which tile positions have been used */
  usedTileIndices: number[];
  /** Words completed so far this round */
  wordsCompleted: number;
  /** Total words needed to complete the round */
  wordsTotal: number;
  /** Whether the game is actively accepting input */
  isActive: boolean;
  /** Consecutive correct words without mistakes */
  streak: number;
  /** Time remaining for current word (0 if no timer) */
  timeRemaining: number;
}

/** Word bank for a single spelling activity */
export interface SpellingWordBank {
  /** Activity ID (must match learning-screen.tsx) */
  activityId: string;
  /** All words available for this activity */
  words: SpellingWord[];
}

// ── Spelling Stories ─────────────────────────────────────────────────

/** Page interaction mode */
export type StoryPageMode = 'spell' | 'fill-blank';

/** A single page in a spelling story */
export interface SpellingStoryPage {
  /** i18n key for the narrative text shown above the spelling challenge */
  narrativeKey: string;
  /** The word to spell on this page (used in 'spell' mode) */
  word: string;
  /** Emoji hint for this word (used in 'spell' mode) */
  emoji: string;
  /**
   * Interaction mode for this page:
   * - 'spell' (default): standard spelling challenge with emoji prompt + tiles
   * - 'fill-blank': sentence with multiple ___ gaps; child selects whole words
   *   from a word bank to fill blanks
   */
  mode?: StoryPageMode;
  /**
   * Words that fill the blanks in order (fill-blank mode only).
   * Each entry corresponds to a `___` placeholder in the narrative text.
   * Typically 2–3 words per page.
   */
  blankWords?: string[];
  /**
   * Extra wrong words added to the word bank as distractors (fill-blank mode only).
   * Used for harder difficulty levels to increase challenge.
   */
  distractorWords?: string[];
}

/** A complete spelling story — 5 pages, each with narrative + spelling challenge */
export interface SpellingStory {
  /** Unique story ID */
  id: string;
  /** Activity ID this story belongs to (links to word bank & difficulty) */
  activityId: string;
  /** i18n key for the story title */
  titleKey: string;
  /** The 5 story pages */
  pages: [SpellingStoryPage, SpellingStoryPage, SpellingStoryPage, SpellingStoryPage, SpellingStoryPage];
}
