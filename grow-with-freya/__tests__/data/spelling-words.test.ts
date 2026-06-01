/**
 * Spelling Words — Data Layer Tests (TDD)
 *
 * Validates:
 * - Every spelling activity has a word bank
 * - Every word bank has enough words for its difficulty's wordsPerRound
 * - All words are lowercase, non-empty, no spaces
 * - All words have emoji hints and i18n label keys
 * - Word banks are retrievable by activity ID
 * - No duplicate words within a single activity
 * - Difficulty configs are valid
 */

import { getSpellingWordBank, ALL_SPELLING_WORD_BANKS, ALL_WORD_BANKS } from '@/data/spelling-words';
import { ALL_NUMBERS_WORD_BANKS } from '@/data/numbers-words';
import { ALL_SPELLING_STORIES, ALL_STORIES, getSpellingStory, getSpellingStories } from '@/data/spelling-stories';
import { ALL_NUMBERS_STORIES } from '@/data/numbers-stories';
import {
  ACTIVITY_DIFFICULTY,
  SPELLING_DIFFICULTY_CONFIG,
  type SpellingWord,
  type SpellingWordBank,
} from '@/types/spelling-game';

// All 14 spelling activity IDs (rhyme-time removed)
const SPELLING_ACTIVITY_IDS = [
  'abc-animals', 'first-words', 'colour-spelling', 'shape-names', 'my-name',
  'wombat-spelling', 'animal-spelling', 'food-spelling', 'nature-words', 'garden-words',
  'word-builder', 'sentence-speller', 'tricky-words', 'story-spelling',
];

// All 15 numbers activity IDs
const NUMBERS_ACTIVITY_IDS = [
  'counting-fun', 'number-friends', 'colour-counting', 'shape-counting', 'one-two-three',
  'wombat-word-placing', 'animal-counting', 'fruit-counting', 'toy-counting', 'garden-counting',
  'number-puzzles', 'adding-fun', 'number-stories', 'number-patterns', 'subtraction-fun',
];

const ALL_ACTIVITY_IDS = [...SPELLING_ACTIVITY_IDS, ...NUMBERS_ACTIVITY_IDS];

describe('Spelling Word Banks', () => {
  describe('coverage', () => {
    it('should have a word bank for every spelling activity', () => {
      for (const id of SPELLING_ACTIVITY_IDS) {
        const bank = getSpellingWordBank(id);
        expect(bank).toBeDefined();
        expect(bank!.activityId).toBe(id);
      }
    });

    it('should export exactly 14 spelling word banks', () => {
      expect(ALL_SPELLING_WORD_BANKS).toHaveLength(14);
    });

    it('should return undefined for unknown activity IDs', () => {
      expect(getSpellingWordBank('nonexistent')).toBeUndefined();
    });
  });

  describe('word validity', () => {
    for (const id of SPELLING_ACTIVITY_IDS) {
      describe(`activity "${id}"`, () => {
        let bank: SpellingWordBank;

        beforeAll(() => {
          bank = getSpellingWordBank(id)!;
        });

        it('should have enough words for its difficulty', () => {
          const difficulty = ACTIVITY_DIFFICULTY[id];
          const config = SPELLING_DIFFICULTY_CONFIG[difficulty];
          expect(bank.words.length).toBeGreaterThanOrEqual(config.wordsPerRound);
        });

        it('should have at least 6 words for variety', () => {
          expect(bank.words.length).toBeGreaterThanOrEqual(6);
        });

        it('should have no duplicate words', () => {
          const wordTexts = bank.words.map(w => w.word);
          expect(new Set(wordTexts).size).toBe(wordTexts.length);
        });

        it('should have valid word format (lowercase, no spaces, non-empty)', () => {
          for (const w of bank.words) {
            expect(w.word).toMatch(/^[a-z]+$/);
            expect(w.word.length).toBeGreaterThan(0);
          }
        });

        it('should have emoji hints for every word', () => {
          for (const w of bank.words) {
            expect(w.emoji).toBeTruthy();
            expect(w.emoji.length).toBeGreaterThan(0);
          }
        });

        it('should have i18n label keys for every word', () => {
          for (const w of bank.words) {
            expect(w.labelKey).toMatch(/^spelling\.words\./);
          }
        });
      });
    }
  });

  describe('difficulty configuration', () => {
    it('easy should have no distractors and show word hint', () => {
      const easy = SPELLING_DIFFICULTY_CONFIG.easy;
      expect(easy.distractorCount).toBe(0);
      expect(easy.showWordHint).toBe(true);
      expect(easy.timeLimitSeconds).toBe(0);
    });

    it('medium should have some distractors', () => {
      const medium = SPELLING_DIFFICULTY_CONFIG.medium;
      expect(medium.distractorCount).toBeGreaterThan(0);
      expect(medium.showWordHint).toBe(true);
    });

    it('hard should have more distractors and a timer', () => {
      const hard = SPELLING_DIFFICULTY_CONFIG.hard;
      expect(hard.distractorCount).toBeGreaterThan(SPELLING_DIFFICULTY_CONFIG.medium.distractorCount);
      expect(hard.timeLimitSeconds).toBeGreaterThan(0);
      expect(hard.showWordHint).toBe(false);
    });

    it('every spelling + numbers activity should have a mapped difficulty', () => {
      for (const id of ALL_ACTIVITY_IDS) {
        expect(ACTIVITY_DIFFICULTY[id]).toBeDefined();
        expect(['easy', 'medium', 'hard']).toContain(ACTIVITY_DIFFICULTY[id]);
      }
    });
  });

  describe('age-appropriate word length', () => {
    it('easy (ages 1-2) words should be 2-5 letters', () => {
      const easyIds = ALL_ACTIVITY_IDS.filter(id => ACTIVITY_DIFFICULTY[id] === 'easy');
      for (const id of easyIds) {
        const bank = getSpellingWordBank(id)!;
        for (const w of bank.words) {
          expect(w.word.length).toBeGreaterThanOrEqual(2);
          expect(w.word.length).toBeLessThanOrEqual(5);
        }
      }
    });

    it('medium (ages 2-4) words should be 3-7 letters', () => {
      const medIds = ALL_ACTIVITY_IDS.filter(id => ACTIVITY_DIFFICULTY[id] === 'medium');
      for (const id of medIds) {
        const bank = getSpellingWordBank(id)!;
        for (const w of bank.words) {
          expect(w.word.length).toBeGreaterThanOrEqual(3);
          expect(w.word.length).toBeLessThanOrEqual(7);
        }
      }
    });

    it('hard (ages 4+) words should be 4-9 letters', () => {
      const hardIds = ALL_ACTIVITY_IDS.filter(id => ACTIVITY_DIFFICULTY[id] === 'hard');
      for (const id of hardIds) {
        const bank = getSpellingWordBank(id)!;
        for (const w of bank.words) {
          expect(w.word.length).toBeGreaterThanOrEqual(4);
          expect(w.word.length).toBeLessThanOrEqual(9);
        }
      }
    });
  });
});

describe('Numbers Word Banks', () => {
  it('should export exactly 15 numbers word banks', () => {
    expect(ALL_NUMBERS_WORD_BANKS).toHaveLength(15);
  });

  it('should have a word bank for every numbers activity', () => {
    for (const id of NUMBERS_ACTIVITY_IDS) {
      const bank = getSpellingWordBank(id);
      expect(bank).toBeDefined();
      expect(bank!.activityId).toBe(id);
    }
  });

  it('combined word banks should cover all 29 activities', () => {
    expect(ALL_WORD_BANKS).toHaveLength(29);
  });

  it('numbers words should have valid format', () => {
    for (const bank of ALL_NUMBERS_WORD_BANKS) {
      for (const w of bank.words) {
        expect(w.word).toMatch(/^[a-z]+$/);
        expect(w.emoji).toBeTruthy();
        expect(w.labelKey).toMatch(/^numbers\.words\./);
      }
    }
  });
});

describe('Spelling Stories', () => {
  it('should have 5 stories for every reading activity', () => {
    for (const id of SPELLING_ACTIVITY_IDS) {
      const stories = getSpellingStories(id);
      expect(stories).toHaveLength(5);
    }
  });

  it('should have 5 stories for every numbers activity', () => {
    for (const id of NUMBERS_ACTIVITY_IDS) {
      const stories = getSpellingStories(id);
      expect(stories).toHaveLength(5);
    }
  });

  it('should have 70 reading stories total', () => {
    expect(ALL_SPELLING_STORIES).toHaveLength(70);
  });

  it('should have 75 numbers stories total', () => {
    expect(ALL_NUMBERS_STORIES).toHaveLength(75);
  });

  it('combined stories should total 145', () => {
    expect(ALL_STORIES).toHaveLength(145);
  });

  it('every story should have exactly 5 pages', () => {
    for (const story of ALL_STORIES) {
      expect(story.pages).toHaveLength(5);
    }
  });

  it('every story should have a unique ID', () => {
    const ids = ALL_STORIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getSpellingStory should return a story from the pool', () => {
    const story = getSpellingStory('abc-animals');
    expect(story).toBeDefined();
    expect(story!.activityId).toBe('abc-animals');
  });

  it('every page should have a narrativeKey and a word', () => {
    for (const story of ALL_STORIES) {
      for (const page of story.pages) {
        expect(page.narrativeKey).toBeTruthy();
        expect(page.word).toBeTruthy();
      }
    }
  });
});
