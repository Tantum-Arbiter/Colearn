/**
 * Unit tests for useReadingChallenge hook.
 *
 * Tests both fill_in_blank and spell_word modes including:
 * - State machine transitions (idle → playing → completed)
 * - Correct/incorrect selections
 * - Session restart on wrong selection
 * - Returning placed words/letters to the bank/pool
 * - Skip functionality
 * - Reset and cleanup
 */

jest.mock('@/utils/logger', () => ({
  Logger: { create: () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() }) },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useReadingChallenge } from '@/hooks/use-reading-challenge';
import type { ReadingChallenge } from '@/types/story';

const fillConfig = (overrides: Partial<ReadingChallenge> = {}): ReadingChallenge => ({
  enabled: true,
  mode: 'fill_in_blank',
  promptText: 'Fill in the blanks!',
  allowSkip: false,
  blankWordIndices: [2, 5],
  ...overrides,
});

const spellConfig = (overrides: Partial<ReadingChallenge> = {}): ReadingChallenge => ({
  enabled: true,
  mode: 'spell_word',
  promptText: 'Spell the word!',
  allowSkip: false,
  targetWord: 'CAT',
  distractorLetters: ['X'],
  ...overrides,
});

const PAGE_TEXT = 'The little squirrel loved to play in the garden';
// Words: [The, little, squirrel, loved, to, play, in, the, garden]
// blankWordIndices [2, 5] → blanks at "squirrel" and "play"

describe('useReadingChallenge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---- Idle / no config ----

  it('should start in idle state with no config', () => {
    const { result } = renderHook(() => useReadingChallenge(undefined, ''));
    expect(result.current.state).toBe('idle');
    expect(result.current.mode).toBeNull();
    expect(result.current.isComplete).toBe(false);
  });

  // ---- fill_in_blank mode ----

  describe('fill_in_blank mode', () => {
    it('should transition to playing when started', () => {
      const { result } = renderHook(() => useReadingChallenge(fillConfig(), PAGE_TEXT));
      act(() => { result.current.start(); });
      expect(result.current.state).toBe('playing');
      expect(result.current.mode).toBe('fill_in_blank');
      expect(result.current.blankSlots.length).toBe(2);
      expect(result.current.wordBank.length).toBe(2);
    });

    it('should place correct word and advance', () => {
      const { result } = renderHook(() => useReadingChallenge(fillConfig(), PAGE_TEXT));
      act(() => { result.current.start(); });

      // First blank is "squirrel" (index 2)
      const correctId = result.current.wordBank.find(w => w.word === 'squirrel')?.id;
      expect(correctId).toBeDefined();
      act(() => { result.current.tapWord(correctId!); });

      expect(result.current.blankSlots[0].placedWord).toBe('squirrel');
      expect(result.current.nextBlankIndex).toBe(1);
    });

    it('should reset all blanks on wrong word', () => {
      const { result } = renderHook(() => useReadingChallenge(fillConfig(), PAGE_TEXT));
      act(() => { result.current.start(); });

      // Tap wrong word for first blank
      const wrongId = result.current.wordBank.find(w => w.word === 'play')?.id;
      act(() => { result.current.tapWord(wrongId!); });

      expect(result.current.mistakes).toBe(1);
      expect(result.current.blankSlots.every(s => s.placedWord === '')).toBe(true);
      expect(result.current.wordBank.every(w => !w.used)).toBe(true);
    });

    it('should complete when all blanks are filled', () => {
      jest.useFakeTimers();
      const onComplete = jest.fn();
      const { result } = renderHook(() => useReadingChallenge(fillConfig(), PAGE_TEXT, onComplete));
      act(() => { result.current.start(); });

      const squirrelId = result.current.wordBank.find(w => w.word === 'squirrel')!.id;
      act(() => { result.current.tapWord(squirrelId); });

      const playId = result.current.wordBank.find(w => w.word === 'play')!.id;
      act(() => { result.current.tapWord(playId); });

      act(() => { jest.runAllTimers(); });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.state).toBe('completed');
      expect(result.current.completedCleanly).toBe(true);
      expect(onComplete).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('should return placed word to bank when unplaced', () => {
      const { result } = renderHook(() => useReadingChallenge(fillConfig(), PAGE_TEXT));
      act(() => { result.current.start(); });

      const squirrelId = result.current.wordBank.find(w => w.word === 'squirrel')!.id;
      act(() => { result.current.tapWord(squirrelId); });
      expect(result.current.blankSlots[0].placedWord).toBe('squirrel');

      // Unplace it
      act(() => { result.current.unplaceWord(0); });
      expect(result.current.blankSlots[0].placedWord).toBe('');
      expect(result.current.wordBank.find(w => w.id === squirrelId)!.used).toBe(false);
    });
  });

  // ---- spell_word mode ----

  describe('spell_word mode', () => {
    it('should transition to playing when started', () => {
      const { result } = renderHook(() => useReadingChallenge(spellConfig(), PAGE_TEXT));
      act(() => { result.current.start(); });
      expect(result.current.state).toBe('playing');
      expect(result.current.mode).toBe('spell_word');
      expect(result.current.letterSlots.length).toBe(3); // C, A, T
      expect(result.current.letterPool.length).toBe(4); // C, A, T, X
    });

    it('should place correct letter and advance', () => {
      const { result } = renderHook(() => useReadingChallenge(spellConfig(), PAGE_TEXT));
      act(() => { result.current.start(); });

      // First letter is C
      const cId = result.current.letterPool.find(l => l.letter === 'C')?.id;
      expect(cId).toBeDefined();
      act(() => { result.current.tapLetter(cId!); });

      expect(result.current.letterSlots[0].placedLetter).toBe('C');
      expect(result.current.nextLetterIndex).toBe(1);
    });

    it('should reset all letters on wrong letter', () => {
      const { result } = renderHook(() => useReadingChallenge(spellConfig(), PAGE_TEXT));
      act(() => { result.current.start(); });

      // Place correct first letter
      const cId = result.current.letterPool.find(l => l.letter === 'C')!.id;
      act(() => { result.current.tapLetter(cId); });

      // Now tap wrong letter X instead of A
      const xId = result.current.letterPool.find(l => l.letter === 'X')!.id;
      act(() => { result.current.tapLetter(xId); });

      expect(result.current.mistakes).toBe(1);
      expect(result.current.letterSlots.every(s => s.placedLetter === '')).toBe(true);
      expect(result.current.letterPool.every(l => !l.used)).toBe(true);
    });

    it('should complete when all letters are placed correctly', () => {
      jest.useFakeTimers();
      const onComplete = jest.fn();
      const { result } = renderHook(() => useReadingChallenge(spellConfig(), PAGE_TEXT, onComplete));
      act(() => { result.current.start(); });

      const getPoolId = (letter: string) => result.current.letterPool.find(l => l.letter === letter && !l.used)!.id;
      act(() => { result.current.tapLetter(getPoolId('C')); });
      act(() => { result.current.tapLetter(getPoolId('A')); });
      act(() => { result.current.tapLetter(getPoolId('T')); });
      act(() => { jest.runAllTimers(); });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.state).toBe('completed');
      expect(onComplete).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('should return placed letter to pool when unplaced', () => {
      const { result } = renderHook(() => useReadingChallenge(spellConfig(), PAGE_TEXT));
      act(() => { result.current.start(); });

      const cId = result.current.letterPool.find(l => l.letter === 'C')!.id;
      act(() => { result.current.tapLetter(cId); });
      expect(result.current.letterSlots[0].placedLetter).toBe('C');

      act(() => { result.current.unplaceLetter(0); });
      expect(result.current.letterSlots[0].placedLetter).toBe('');
      expect(result.current.letterPool.find(l => l.id === cId)!.used).toBe(false);
    });
  });

  // ---- Skip ----

  it('should skip when allowSkip is true', () => {
    const { result } = renderHook(() => useReadingChallenge(fillConfig({ allowSkip: true }), PAGE_TEXT));
    act(() => { result.current.start(); });
    act(() => { result.current.skip(); });
    expect(result.current.isComplete).toBe(true);
  });

  it('should not skip when allowSkip is false', () => {
    const { result } = renderHook(() => useReadingChallenge(fillConfig({ allowSkip: false }), PAGE_TEXT));
    act(() => { result.current.start(); });
    act(() => { result.current.skip(); });
    expect(result.current.state).toBe('playing');
  });

  // ---- Reset / cleanup ----

  it('should reset to idle on cleanup', () => {
    const { result } = renderHook(() => useReadingChallenge(fillConfig(), PAGE_TEXT));
    act(() => { result.current.start(); });
    expect(result.current.state).toBe('playing');
    act(() => { result.current.cleanup(); });
    expect(result.current.state).toBe('idle');
  });

  it('should ignore actions when not in playing state', () => {
    const { result } = renderHook(() => useReadingChallenge(fillConfig(), PAGE_TEXT));
    // Still idle - not started
    act(() => { result.current.tapWord('nonexistent'); });
    expect(result.current.nextBlankIndex).toBe(0);
  });
});
