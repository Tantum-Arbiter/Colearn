/**
 * Real World Bridge — Data Layer Tests (TDD)
 *
 * Tests written BEFORE implementation to define the contract:
 * - Every activity ID in learning-screen.tsx has bridge data
 * - Every bridge entry has valid structure
 * - getBridgeData() lookup works correctly
 * - No duplicate activity IDs
 * - All skill references are valid DevelopmentalSkill values
 * - All adventure categories are valid
 */

import {
  getBridgeData,
  getAllBridgeData,
  SPELLING_BRIDGES,
  NUMBERS_BRIDGES,
  FEELINGS_BRIDGES,
} from '@/data/bridge';

import type {
  RealWorldBridgeData,
  RealWorldAdventure,
  DevelopmentalSkill,
  AdventureCategory,
  GameSection,
} from '@/types/real-world-bridge';

import { SKILL_LABELS } from '@/types/real-world-bridge';

// ── Activity IDs from learning-screen.tsx (source of truth) ──────────────

const SPELLING_IDS = [
  'abc-animals', 'first-words', 'colour-spelling', 'shape-names', 'my-name',
  'wombat-spelling', 'animal-spelling', 'food-spelling', 'nature-words', 'garden-words',
  'word-builder', 'sentence-speller', 'tricky-words', 'rhyme-time', 'story-spelling',
];

const NUMBERS_IDS = [
  'counting-fun', 'number-friends', 'colour-counting', 'shape-counting', 'one-two-three',
  'wombat-word-placing', 'animal-counting', 'fruit-counting', 'toy-counting', 'garden-counting',
  'number-puzzles', 'adding-fun', 'number-stories', 'number-patterns', 'subtraction-fun',
];

const FEELINGS_IDS = [
  'happy-faces', 'feeling-colours', 'mood-music', 'animal-feelings', 'my-feelings',
  'emotion-faces', 'calm-breathing', 'kindness-quest', 'friendship-stories', 'worry-monster',
  'empathy-explorer', 'feeling-journal', 'conflict-solver', 'gratitude-garden', 'self-esteem-stars',
];

const ALL_ACTIVITY_IDS = [...SPELLING_IDS, ...NUMBERS_IDS, ...FEELINGS_IDS];

const VALID_CATEGORIES: AdventureCategory[] = ['at-home', 'outdoors', 'creative'];
const VALID_SECTIONS: GameSection[] = ['spelling', 'numbers', 'feelings'];
const VALID_SKILLS = Object.keys(SKILL_LABELS) as DevelopmentalSkill[];

// ── Helper to validate a single bridge entry ────────────────────────────

function validateBridgeEntry(entry: RealWorldBridgeData) {
  expect(entry.activityId).toBeTruthy();
  expect(VALID_SECTIONS).toContain(entry.section);
  expect(entry.narrationKey).toBeTruthy();
  expect(typeof entry.narrationKey).toBe('string');
  expect(entry.closingKey).toBeTruthy();
  expect(typeof entry.closingKey).toBe('string');

  // Must have exactly 3 adventures
  expect(entry.adventures).toHaveLength(3);

  entry.adventures.forEach((adv: RealWorldAdventure, i: number) => {
    expect(VALID_CATEGORIES).toContain(adv.category);
    expect(adv.descriptionKey).toBeTruthy();
    expect(typeof adv.descriptionKey).toBe('string');
    expect(adv.skills.length).toBeGreaterThan(0);
    adv.skills.forEach((skill: DevelopmentalSkill) => {
      expect(VALID_SKILLS).toContain(skill);
    });
  });

  // All 3 adventures should have different categories
  const categories = entry.adventures.map((a: RealWorldAdventure) => a.category);
  expect(new Set(categories).size).toBe(3);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Real World Bridge Data', () => {
  describe('coverage — every activity has bridge data', () => {
    it('should have bridge data for all 15 spelling activities', () => {
      expect(SPELLING_BRIDGES).toHaveLength(15);
      const ids = SPELLING_BRIDGES.map(b => b.activityId);
      SPELLING_IDS.forEach(id => expect(ids).toContain(id));
    });

    it('should have bridge data for all 15 numbers activities', () => {
      expect(NUMBERS_BRIDGES).toHaveLength(15);
      const ids = NUMBERS_BRIDGES.map(b => b.activityId);
      NUMBERS_IDS.forEach(id => expect(ids).toContain(id));
    });

    it('should have bridge data for all 15 feelings activities', () => {
      expect(FEELINGS_BRIDGES).toHaveLength(15);
      const ids = FEELINGS_BRIDGES.map(b => b.activityId);
      FEELINGS_IDS.forEach(id => expect(ids).toContain(id));
    });

    it('should have exactly 45 bridge entries total', () => {
      expect(getAllBridgeData()).toHaveLength(45);
    });
  });

  describe('no duplicates', () => {
    it('should have no duplicate activity IDs across all bridges', () => {
      const all = getAllBridgeData();
      const ids = all.map(b => b.activityId);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('structure validation', () => {
    it.each(ALL_ACTIVITY_IDS)('bridge for "%s" has valid structure', (activityId) => {
      const entry = getBridgeData(activityId);
      expect(entry).toBeDefined();
      validateBridgeEntry(entry!);
    });
  });

  describe('section assignment', () => {
    it('all spelling bridges have section "spelling"', () => {
      SPELLING_BRIDGES.forEach(b => expect(b.section).toBe('spelling'));
    });

    it('all numbers bridges have section "numbers"', () => {
      NUMBERS_BRIDGES.forEach(b => expect(b.section).toBe('numbers'));
    });

    it('all feelings bridges have section "feelings"', () => {
      FEELINGS_BRIDGES.forEach(b => expect(b.section).toBe('feelings'));
    });
  });

  describe('getBridgeData() lookup', () => {
    it('returns data for a valid activity ID', () => {
      const result = getBridgeData('abc-animals');
      expect(result).toBeDefined();
      expect(result!.activityId).toBe('abc-animals');
    });

    it('returns undefined for an unknown activity ID', () => {
      const result = getBridgeData('nonexistent-activity');
      expect(result).toBeUndefined();
    });
  });
});
