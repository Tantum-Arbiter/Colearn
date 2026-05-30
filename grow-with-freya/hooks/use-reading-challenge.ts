/**
 * useReadingChallenge - React hook for managing reading challenge state
 *
 * Two modes:
 *   fill_in_blank - Words are removed from the story text. The user taps words
 *                   from a shuffled word bank to fill blanks in order.
 *                   If the wrong word is tapped, the session restarts (all blanks reset).
 *                   Tapping a placed word returns it to the word bank.
 *
 *   spell_word    - The user selects letters from a shuffled pool to spell a target word.
 *                   Wrong letter resets all placed letters.
 *                   Tapping a placed letter returns it to the pool.
 *
 * State machine:
 *   idle → playing → completed
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Logger } from '@/utils/logger';
import type { ReadingChallenge } from '@/types/story';

const log = Logger.create('ReadingChallenge');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReadingChallengeState = 'idle' | 'playing' | 'completed';

/** A word slot in fill_in_blank mode */
export interface BlankSlot {
  /** The correct word for this slot */
  correctWord: string;
  /** Original index in the page text word array */
  wordIndex: number;
  /** Currently placed word (empty string = not yet filled) */
  placedWord: string;
}

/** A letter slot in spell_word mode */
export interface LetterSlot {
  /** The correct letter */
  correctLetter: string;
  /** Position index in the target word */
  position: number;
  /** Currently placed letter (empty string = not yet filled) */
  placedLetter: string;
}

/** A word available in the word bank */
export interface WordBankItem {
  id: string; // unique id for tracking
  word: string;
  used: boolean; // true when placed into a slot
}

/** A letter available in the letter pool */
export interface LetterPoolItem {
  id: string;
  letter: string;
  used: boolean;
}

export interface ReadingChallengeHookResult {
  state: ReadingChallengeState;
  mode: 'fill_in_blank' | 'spell_word' | null;
  isComplete: boolean;
  completedCleanly: boolean;
  /** Number of incorrect attempts that triggered a reset */
  mistakes: number;

  // fill_in_blank mode
  blankSlots: BlankSlot[];
  wordBank: WordBankItem[];
  /** The full text split into words, with blank indices marked */
  textWords: string[];
  /** Index of the next blank to fill */
  nextBlankIndex: number;

  // spell_word mode
  letterSlots: LetterSlot[];
  letterPool: LetterPoolItem[];
  targetWord: string;
  /** Index of the next letter position to fill */
  nextLetterIndex: number;

  // Actions
  start: () => void;
  /** Tap a word from the word bank (fill_in_blank) */
  tapWord: (wordBankId: string) => void;
  /** Tap a placed word to return it to the bank (fill_in_blank) */
  unplaceWord: (slotIndex: number) => void;
  /** Tap a letter from the pool (spell_word) */
  tapLetter: (letterPoolId: string) => void;
  /** Tap a placed letter to return it to the pool (spell_word) */
  unplaceLetter: (slotIndex: number) => void;
  skip: () => void;
  reset: () => void;
  cleanup: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple unique ID generator for word bank / letter pool items */
let _uidCounter = 0;
function uid(): string {
  _uidCounter += 1;
  return `rc-${Date.now()}-${_uidCounter}`;
}

/** Fisher-Yates shuffle (returns new array) */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Split text into words (preserving punctuation attached to words) */
export function splitTextIntoWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}


// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReadingChallenge(
  config: ReadingChallenge | undefined,
  pageText: string,
  onComplete?: () => void,
): ReadingChallengeHookResult {
  const [state, setState] = useState<ReadingChallengeState>('idle');
  const [blankSlots, setBlankSlots] = useState<BlankSlot[]>([]);
  const [wordBank, setWordBank] = useState<WordBankItem[]>([]);
  const [letterSlots, setLetterSlots] = useState<LetterSlot[]>([]);
  const [letterPool, setLetterPool] = useState<LetterPoolItem[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [wasReset, setWasReset] = useState(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const mode = config?.mode ?? null;
  const targetWord = config?.targetWord ?? '';
  const textWords = useMemo(() => splitTextIntoWords(pageText), [pageText]);

  const nextBlankIndex = useMemo(() => {
    const idx = blankSlots.findIndex(s => s.placedWord === '');
    return idx < 0 ? blankSlots.length : idx;
  }, [blankSlots]);

  const nextLetterIndex = useMemo(() => {
    const idx = letterSlots.findIndex(s => s.placedLetter === '');
    return idx < 0 ? letterSlots.length : idx;
  }, [letterSlots]);

  // Auto-cleanup when config becomes undefined
  useEffect(() => {
    if (!config) {
      setBlankSlots([]);
      setWordBank([]);
      setLetterSlots([]);
      setLetterPool([]);
      setMistakes(0);
      if (state !== 'idle') setState('idle');
    }
  }, [config]);

  const start = useCallback(() => {
    if (!config?.enabled) return;

    if (config.mode === 'fill_in_blank') {
      const indices = config.blankWordIndices ?? [];
      if (indices.length === 0) {
        log.warn('fill_in_blank mode but no blankWordIndices configured');
        return;
      }
      const words = splitTextIntoWords(pageText);
      const slots: BlankSlot[] = indices
        .filter(i => i >= 0 && i < words.length)
        .map(i => ({ correctWord: words[i], wordIndex: i, placedWord: '' }));

      const bank: WordBankItem[] = shuffle(
        slots.map(s => ({ id: uid(), word: s.correctWord, used: false }))
      );

      setBlankSlots(slots);
      setWordBank(bank);
      setLetterSlots([]);
      setLetterPool([]);
    } else if (config.mode === 'spell_word') {
      const word = config.targetWord ?? '';
      if (word.length === 0) {
        log.warn('spell_word mode but no targetWord configured');
        return;
      }
      const slots: LetterSlot[] = word.split('').map((ch, i) => ({
        correctLetter: ch.toUpperCase(),
        position: i,
        placedLetter: '',
      }));

      const letters = word.toUpperCase().split('');
      const distractors = (config.distractorLetters ?? []).map(l => l.toUpperCase());
      const allLetters = shuffle([...letters, ...distractors]);
      const pool: LetterPoolItem[] = allLetters.map(l => ({
        id: uid(),
        letter: l,
        used: false,
      }));

      setLetterSlots(slots);
      setLetterPool(pool);
      setBlankSlots([]);
      setWordBank([]);
    }

    setMistakes(0);
    setWasReset(false);
    setState('playing');
    log.debug(`Reading challenge started: ${config.mode}`);
  }, [config, pageText]);

  // --- fill_in_blank actions ---

  const tapWord = useCallback((wordBankId: string) => {
    if (state !== 'playing' || mode !== 'fill_in_blank') return;

    const bankItem = wordBank.find(w => w.id === wordBankId && !w.used);
    if (!bankItem) return;

    const slotIdx = blankSlots.findIndex(s => s.placedWord === '');
    if (slotIdx < 0) return;

    const slot = blankSlots[slotIdx];
    if (bankItem.word !== slot.correctWord) {
      // Wrong word → restart session
      setMistakes(prev => prev + 1);
      setBlankSlots(prev => prev.map(s => ({ ...s, placedWord: '' })));
      setWordBank(prev => prev.map(w => ({ ...w, used: false })));
      log.debug('fill_in_blank: wrong word, session reset');
      return;
    }

    // Correct word → place it
    setBlankSlots(prev => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], placedWord: bankItem.word };

      // Check completion
      if (next.every(s => s.placedWord !== '')) {
        setState('completed');
        log.debug('fill_in_blank: completed');
        setTimeout(() => onCompleteRef.current?.(), 0);
      }
      return next;
    });
    setWordBank(prev => prev.map(w => w.id === wordBankId ? { ...w, used: true } : w));
  }, [state, mode, wordBank, blankSlots]);

  const unplaceWord = useCallback((slotIndex: number) => {
    if (state !== 'playing' || mode !== 'fill_in_blank') return;
    if (slotIndex < 0 || slotIndex >= blankSlots.length) return;

    const slot = blankSlots[slotIndex];
    if (slot.placedWord === '') return;

    // Find the bank item that matches and mark it unused
    const bankIdx = wordBank.findIndex(w => w.used && w.word === slot.placedWord);
    if (bankIdx >= 0) {
      setWordBank(prev => {
        const next = [...prev];
        next[bankIdx] = { ...next[bankIdx], used: false };
        return next;
      });
    }
    setBlankSlots(prev => {
      const next = [...prev];
      next[slotIndex] = { ...next[slotIndex], placedWord: '' };
      return next;
    });
  }, [state, mode, blankSlots, wordBank]);

  // --- spell_word actions ---

  const tapLetter = useCallback((letterPoolId: string) => {
    if (state !== 'playing' || mode !== 'spell_word') return;

    const poolItem = letterPool.find(l => l.id === letterPoolId && !l.used);
    if (!poolItem) return;

    const slotIdx = letterSlots.findIndex(s => s.placedLetter === '');
    if (slotIdx < 0) return;

    const slot = letterSlots[slotIdx];
    if (poolItem.letter !== slot.correctLetter) {
      // Wrong letter → restart session
      setMistakes(prev => prev + 1);
      setLetterSlots(prev => prev.map(s => ({ ...s, placedLetter: '' })));
      setLetterPool(prev => prev.map(l => ({ ...l, used: false })));
      log.debug('spell_word: wrong letter, session reset');
      return;
    }

    // Correct letter → place it
    setLetterSlots(prev => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], placedLetter: poolItem.letter };

      if (next.every(s => s.placedLetter !== '')) {
        setState('completed');
        log.debug('spell_word: completed');
        setTimeout(() => onCompleteRef.current?.(), 0);
      }
      return next;
    });
    setLetterPool(prev => prev.map(l => l.id === letterPoolId ? { ...l, used: true } : l));
  }, [state, mode, letterPool, letterSlots]);

  const unplaceLetter = useCallback((slotIndex: number) => {
    if (state !== 'playing' || mode !== 'spell_word') return;
    if (slotIndex < 0 || slotIndex >= letterSlots.length) return;

    const slot = letterSlots[slotIndex];
    if (slot.placedLetter === '') return;

    const poolIdx = letterPool.findIndex(l => l.used && l.letter === slot.placedLetter);
    if (poolIdx >= 0) {
      setLetterPool(prev => {
        const next = [...prev];
        next[poolIdx] = { ...next[poolIdx], used: false };
        return next;
      });
    }
    setLetterSlots(prev => {
      const next = [...prev];
      next[slotIndex] = { ...next[slotIndex], placedLetter: '' };
      return next;
    });
  }, [state, mode, letterSlots, letterPool]);

  // --- Common actions ---

  const skip = useCallback(() => {
    if (config?.allowSkip) {
      setState('completed');
      onCompleteRef.current?.();
      log.debug('Reading challenge skipped');
    }
  }, [config]);

  const reset = useCallback(() => {
    setBlankSlots([]);
    setWordBank([]);
    setLetterSlots([]);
    setLetterPool([]);
    setMistakes(0);
    setWasReset(true);
    setState('idle');
    log.debug('Reading challenge reset (gave up)');
  }, []);

  const cleanup = useCallback(() => {
    setBlankSlots([]);
    setWordBank([]);
    setLetterSlots([]);
    setLetterPool([]);
    setMistakes(0);
    setState('idle');
    log.debug('Reading challenge cleanup');
  }, []);

  return {
    state,
    mode,
    isComplete: state === 'completed',
    completedCleanly: state === 'completed' && !wasReset,
    mistakes,

    blankSlots,
    wordBank,
    textWords,
    nextBlankIndex,

    letterSlots,
    letterPool,
    targetWord,
    nextLetterIndex,

    start,
    tapWord,
    unplaceWord,
    tapLetter,
    unplaceLetter,
    skip,
    reset,
    cleanup,
  };
}
