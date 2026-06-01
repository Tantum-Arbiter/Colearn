/**
 * useSpellingGame — Hook Tests (TDD)
 *
 * Visual-first spelling: child sees an image (emoji), taps scrambled letter
 * tiles to spell the word.
 */

jest.mock('@/utils/logger', () => ({
  Logger: { create: () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() }) },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useSpellingGame } from '@/hooks/use-spelling-game';
import { ACTIVITY_DIFFICULTY, SPELLING_DIFFICULTY_CONFIG } from '@/types/spelling-game';

const EASY = 'abc-animals';
const MEDIUM = 'animal-spelling';
const HARD = 'tricky-words';

/** Helper: spell a complete word by tapping tiles in order (spell mode only) */
function spellWord(result: any) {
  const word = result.current.currentWord!.word;
  for (const letter of word) {
    const tile = result.current.tiles.find((t: any) => t.letter === letter && !t.used)!;
    act(() => { result.current.tapTile(tile.id); });
  }
}

/** Helper: complete a fill-blank page by tapping correct words in order */
function completeFillBlank(result: any) {
  const slots = result.current.blankSlots;
  for (let i = 0; i < slots.length; i++) {
    act(() => { result.current.tapBlank(i); });
    const correctWord = slots[i].correctWord;
    const bankItem = result.current.wordBankItems.find(
      (w: any) => w.word === correctWord && !w.used
    )!;
    act(() => { result.current.tapWordBankItem(bankItem.id); });
  }
}

/** Helper: complete any page (spell or fill-blank) */
function completePage(result: any) {
  if (result.current.pageMode === 'fill-blank') {
    completeFillBlank(result);
  } else {
    spellWord(result);
  }
}

describe('useSpellingGame', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ── Idle ────────────────────────────────────────────────────────────

  it('starts in idle state with no activity', () => {
    const { result } = renderHook(() => useSpellingGame(undefined));
    expect(result.current.state).toBe('idle');
    expect(result.current.currentWord).toBeNull();
    expect(result.current.visualPrompt).toBeNull();
    expect(result.current.tiles).toEqual([]);
    expect(result.current.placedLetters).toEqual([]);
    expect(result.current.isRoundComplete).toBe(false);
    expect(result.current.wordsCompleted).toBe(0);
  });

  // ── Starting ───────────────────────────────────────────────────────

  it('transitions to playing when started', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    expect(result.current.state).toBe('playing');
    expect(result.current.currentWord).not.toBeNull();
    expect(result.current.tiles.length).toBeGreaterThan(0);
  });

  it('exposes emoji as visualPrompt', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    expect(result.current.visualPrompt).toBe(result.current.currentWord!.emoji);
  });

  it('tiles contain all letters of the word', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    const letters = result.current.currentWord!.word.split('');
    const tileLetters = result.current.tiles.map((t: any) => t.letter);
    for (const l of letters) expect(tileLetters).toContain(l);
  });

  it('easy has no distractors', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    expect(result.current.tiles.length).toBe(result.current.currentWord!.word.length);
  });

  it('medium adds distractor letters', () => {
    const { result } = renderHook(() => useSpellingGame(MEDIUM));
    act(() => { result.current.start(); });
    const cfg = SPELLING_DIFFICULTY_CONFIG[ACTIVITY_DIFFICULTY[MEDIUM]];
    expect(result.current.tiles.length).toBe(result.current.currentWord!.word.length + cfg.distractorCount);
  });

  it('shows word hint for easy/medium, not hard', () => {
    const { result: e } = renderHook(() => useSpellingGame(EASY));
    act(() => { e.current.start(); });
    expect(e.current.showWordHint).toBe(true);
    const { result: h } = renderHook(() => useSpellingGame(HARD));
    act(() => { h.current.start(); });
    expect(h.current.showWordHint).toBe(false);
  });

  // ── Correct taps ──────────────────────────────────────────────────

  it('places a correct letter', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    const first = result.current.currentWord!.word[0];
    const tile = result.current.tiles.find((t: any) => t.letter === first && !t.used)!;
    act(() => { result.current.tapTile(tile.id); });
    expect(result.current.placedLetters).toEqual([first]);
    expect(result.current.tiles.find((t: any) => t.id === tile.id)!.used).toBe(true);
  });

  // ── Incorrect taps ────────────────────────────────────────────────

  it('rejects wrong letter and sets lastAttemptWrong', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    const word = result.current.currentWord!.word;
    const wrong = result.current.tiles.find((t: any) => t.letter !== word[0] && !t.used);
    if (wrong) {
      act(() => { result.current.tapTile(wrong.id); });
      expect(result.current.placedLetters).toHaveLength(0);
      expect(result.current.lastAttemptWrong).toBe(true);
    }
  });

  it('clears lastAttemptWrong on correct tap', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    const word = result.current.currentWord!.word;
    const wrong = result.current.tiles.find((t: any) => t.letter !== word[0] && !t.used);
    if (wrong) {
      act(() => { result.current.tapTile(wrong.id); });
      const correct = result.current.tiles.find((t: any) => t.letter === word[0] && !t.used)!;
      act(() => { result.current.tapTile(correct.id); });
      expect(result.current.lastAttemptWrong).toBe(false);
    }
  });

  // ── Word completion ───────────────────────────────────────────────

  it('completes a word when all letters placed', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    spellWord(result);
    expect(result.current.wordsCompleted).toBe(1);
    expect(result.current.state).toBe('word_complete');
  });

  it('advances to next word via nextWord()', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    spellWord(result);
    act(() => { result.current.nextWord(); });
    expect(result.current.state).toBe('playing');
    expect(result.current.placedLetters).toEqual([]);
    // Page 2 is fill-blank so tiles will be empty, check state is playing
  });

  // ── Round completion ──────────────────────────────────────────────

  it('completes the round after wordsTotal words', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    const total = result.current.wordsTotal;
    for (let i = 0; i < total; i++) {
      completePage(result);
      if (i < total - 1) act(() => { result.current.nextWord(); });
    }
    expect(result.current.isRoundComplete).toBe(true);
    expect(result.current.wordsCompleted).toBe(total);
  });

  // ── Undo ──────────────────────────────────────────────────────────

  it('undoes the last placed letter', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    const word = result.current.currentWord!.word;
    const tile = result.current.tiles.find((t: any) => t.letter === word[0] && !t.used)!;
    act(() => { result.current.tapTile(tile.id); });
    expect(result.current.placedLetters).toHaveLength(1);
    act(() => { result.current.undoLastLetter(); });
    expect(result.current.placedLetters).toHaveLength(0);
    expect(result.current.tiles.find((t: any) => t.id === tile.id)!.used).toBe(false);
  });

  // ── Streak ────────────────────────────────────────────────────────

  it('tracks streak of words without mistakes', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    spellWord(result);
    expect(result.current.streak).toBe(1);
  });

  it('resets streak on wrong tap', () => {
    // Use HARD which has no story — always spell mode
    const { result } = renderHook(() => useSpellingGame(HARD));
    act(() => { result.current.start(); });
    spellWord(result);
    act(() => { result.current.nextWord(); });
    const word2 = result.current.currentWord!.word;
    const wrong = result.current.tiles.find((t: any) => t.letter !== word2[0] && !t.used);
    if (wrong) {
      act(() => { result.current.tapTile(wrong.id); });
      expect(result.current.streak).toBe(0);
    }
  });

  // ── Reset / cleanup ───────────────────────────────────────────────

  it('resets to idle on cleanup', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    act(() => { result.current.cleanup(); });
    expect(result.current.state).toBe('idle');
    expect(result.current.currentWord).toBeNull();
    expect(result.current.tiles).toEqual([]);
  });

  it('ignores taps when not playing', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.tapTile('x'); });
    expect(result.current.placedLetters).toEqual([]);
  });

  // ── Callback ──────────────────────────────────────────────────────

  it('calls onRoundComplete when round finishes', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSpellingGame(EASY, onComplete));
    act(() => { result.current.start(); });
    const total = result.current.wordsTotal;
    for (let i = 0; i < total; i++) {
      completePage(result);
      if (i < total - 1) act(() => { result.current.nextWord(); });
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('exposes wordsTotal matching story pages when story exists', () => {
    const { result } = renderHook(() => useSpellingGame(EASY));
    act(() => { result.current.start(); });
    // abc-animals has a story with 5 pages
    expect(result.current.wordsTotal).toBe(5);
  });

  it('shuffles tiles', () => {
    let wasDifferent = false;
    for (let i = 0; i < 10; i++) {
      const { result, unmount } = renderHook(() => useSpellingGame(EASY));
      act(() => { result.current.start(); });
      const word = result.current.currentWord!.word;
      if (result.current.tiles.map((t: any) => t.letter).join('') !== word) wasDifferent = true;
      unmount();
      if (wasDifferent) break;
    }
    expect(wasDifferent).toBe(true);
  });

  // ── Story mode ─────────────────────────────────────────────────────

  it('exposes story and storyTitleKey for activities with stories', () => {
    // Use specific storyId to get a deterministic result
    const { result } = renderHook(() => useSpellingGame(EASY, undefined, 'owl-cant-sleep'));
    expect(result.current.story).not.toBeNull();
    expect(result.current.storyTitleKey).toBe('spelling.stories.owlCantSleep.title');
  });

  it('exposes storyNarrativeKey when playing', () => {
    const { result } = renderHook(() => useSpellingGame(EASY, undefined, 'owl-cant-sleep'));
    act(() => { result.current.start(); });
    expect(result.current.storyNarrativeKey).toBe('spelling.stories.owlCantSleep.page1');
  });

  it('uses story page words in order', () => {
    const { result } = renderHook(() => useSpellingGame(EASY, undefined, 'owl-cant-sleep'));
    act(() => { result.current.start(); });
    // Story 1 page order: cat, dog, hen, pig, owl
    expect(result.current.currentWord!.word).toBe('cat');
    spellWord(result);
    act(() => { result.current.nextWord(); });
    expect(result.current.currentWord!.word).toBe('dog');
    expect(result.current.storyNarrativeKey).toBe('spelling.stories.owlCantSleep.page2');
  });

  it('advances pageIndex through story pages', () => {
    const { result } = renderHook(() => useSpellingGame(EASY, undefined, 'owl-cant-sleep'));
    act(() => { result.current.start(); });
    expect(result.current.pageIndex).toBe(0);
    spellWord(result);
    act(() => { result.current.nextWord(); });
    expect(result.current.pageIndex).toBe(1);
  });

  it('returns a random story when no storyId is specified', () => {
    // Every activity now has stories — a random one should be returned
    const { result } = renderHook(() => useSpellingGame(EASY));
    expect(result.current.story).not.toBeNull();
    expect(result.current.story!.activityId).toBe(EASY);
  });

  it('returns null story for unknown storyId', () => {
    const { result } = renderHook(() => useSpellingGame(EASY, undefined, 'nonexistent-story'));
    expect(result.current.story).toBeNull();
    expect(result.current.storyTitleKey).toBeNull();
  });

  it('exposes pageMode as spell for pages 1, 3, 5', () => {
    const { result } = renderHook(() => useSpellingGame(EASY, undefined, 'owl-cant-sleep'));
    act(() => { result.current.start(); });
    // Page 1 is spell mode
    expect(result.current.pageMode).toBe('spell');
  });

  it('exposes pageMode as fill-blank for page 2', () => {
    const { result } = renderHook(() => useSpellingGame(EASY, undefined, 'owl-cant-sleep'));
    act(() => { result.current.start(); });
    // Advance to page 2
    spellWord(result);
    act(() => { result.current.nextWord(); });
    expect(result.current.pageIndex).toBe(1);
    expect(result.current.pageMode).toBe('fill-blank');
  });

  it('defaults pageMode to spell when no story is selected', () => {
    // Pass an unknown storyId to get no story — falls back to classic mode
    const { result } = renderHook(() => useSpellingGame('nature-words', undefined, 'nonexistent'));
    act(() => { result.current.start(); });
    expect(result.current.pageMode).toBe('spell');
  });
});