/**
 * useSpellingGame — Visual-first spelling game hook
 *
 * Shows an image (emoji) prompt → child taps scrambled letter tiles to
 * spell the word. Manages game state, tile generation, word progression,
 * streak tracking, and difficulty scaling.
 *
 * State machine:
 *   idle → playing → word_complete → playing → ... → round_complete
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Logger } from '@/utils/logger';
import { getSpellingWordBank } from '@/data/spelling-words';
import { getSpellingStory, getStoryById } from '@/data/spelling-stories';
import {
  ACTIVITY_DIFFICULTY,
  SPELLING_DIFFICULTY_CONFIG,
  type SpellingWord,
  type SpellingGameConfig,
  type SpellingStory,
  type StoryPageMode,
} from '@/types/spelling-game';

const log = Logger.create('useSpellingGame');

// ── Types ─────────────────────────────────────────────────────────────

export type SpellingGameState = 'idle' | 'playing' | 'word_complete' | 'round_complete';

export interface LetterTile {
  id: string;
  letter: string;
  used: boolean;
}

/** A word in the word bank for fill-blank mode */
export interface WordBankItem {
  id: string;
  word: string;
  used: boolean;
}

/** State of a single blank slot in fill-blank mode */
export interface BlankSlotState {
  /** The correct word for this blank */
  correctWord: string;
  /** The word currently placed here (empty string = unfilled) */
  placedWord: string;
}

export interface SpellingGameHookResult {
  state: SpellingGameState;
  currentWord: SpellingWord | null;
  visualPrompt: string | null;
  tiles: LetterTile[];
  placedLetters: string[];
  wordsCompleted: number;
  wordsTotal: number;
  isRoundComplete: boolean;
  streak: number;
  showWordHint: boolean;
  lastAttemptWrong: boolean;
  /** Increments on every wrong attempt — lets the UI re-trigger animations */
  wrongAttemptCount: number;

  /** Story mode fields */
  story: SpellingStory | null;
  storyTitleKey: string | null;
  storyNarrativeKey: string | null;
  pageIndex: number;
  /** Current page interaction mode: 'spell' (default) or 'fill-blank' */
  pageMode: StoryPageMode;

  /** Fill-blank mode: word bank items (shuffled correct + distractor words) */
  wordBankItems: WordBankItem[];
  /** Fill-blank mode: state of each blank slot */
  blankSlots: BlankSlotState[];
  /** Fill-blank mode: which blank is currently selected (-1 = none) */
  selectedBlankIndex: number;

  start: () => void;
  tapTile: (tileId: string) => void;
  undoLastLetter: () => void;
  nextWord: () => void;
  cleanup: () => void;
  /** Fill-blank mode: select a blank slot */
  tapBlank: (index: number) => void;
  /** Fill-blank mode: place a word from the bank into the selected blank */
  tapWordBankItem: (itemId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDistractors(word: string, count: number): string[] {
  const wordLetters = new Set(word.split(''));
  const candidates = ALPHABET.split('').filter(l => !wordLetters.has(l));
  return shuffle(candidates).slice(0, count);
}

function buildTiles(word: string, distractorCount: number): LetterTile[] {
  const wordLetters = word.split('');
  const distractors = generateDistractors(word, distractorCount);
  const allLetters = shuffle([...wordLetters, ...distractors]);
  return allLetters.map((letter, i) => ({
    id: `tile-${i}-${letter}-${Math.random().toString(36).slice(2, 6)}`,
    letter,
    used: false,
  }));
}

function pickWords(words: SpellingWord[], count: number): SpellingWord[] {
  return shuffle(words).slice(0, count);
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useSpellingGame(
  activityId: string | undefined,
  onRoundComplete?: () => void,
  /** Optional: play a specific story instead of a random one */
  storyId?: string,
): SpellingGameHookResult {
  const [state, setState] = useState<SpellingGameState>('idle');
  const [tiles, setTiles] = useState<LetterTile[]>([]);
  const [placedLetters, setPlacedLetters] = useState<string[]>([]);
  const [placedTileIds, setPlacedTileIds] = useState<string[]>([]);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastAttemptWrong, setLastAttemptWrong] = useState(false);
  const [wrongAttemptCount, setWrongAttemptCount] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [hadMistakeThisWord, setHadMistakeThisWord] = useState(false);

  // Fill-blank mode state
  const [wordBankItems, setWordBankItems] = useState<WordBankItem[]>([]);
  const [blankSlots, setBlankSlots] = useState<BlankSlotState[]>([]);
  const [selectedBlankIndex, setSelectedBlankIndex] = useState(-1);

  const roundWordsRef = useRef<SpellingWord[]>([]);
  const onCompleteRef = useRef(onRoundComplete);
  useEffect(() => { onCompleteRef.current = onRoundComplete; }, [onRoundComplete]);

  const difficulty = activityId ? ACTIVITY_DIFFICULTY[activityId] : undefined;
  const config: SpellingGameConfig | null = difficulty
    ? SPELLING_DIFFICULTY_CONFIG[difficulty]
    : null;

  // Story lookup — memoised so it stays stable across re-renders.
  // A new random story is only picked when activityId or storyId changes.
  const story = useMemo(() => {
    if (storyId) return getStoryById(storyId) ?? null;
    if (activityId) return getSpellingStory(activityId) ?? null;
    return null;
  }, [activityId, storyId]);

  const currentWord = state !== 'idle' && roundWordsRef.current.length > 0
    ? roundWordsRef.current[currentWordIndex] ?? null
    : null;

  const visualPrompt = currentWord?.emoji ?? null;
  const showWordHint = config?.showWordHint ?? false;
  const wordsTotal = story ? story.pages.length : (config?.wordsPerRound ?? 0);
  const isRoundComplete = state === 'round_complete';

  // Story narrative for the current page
  const storyTitleKey = story?.titleKey ?? null;
  const storyNarrativeKey = story && state !== 'idle'
    ? story.pages[currentWordIndex]?.narrativeKey ?? null
    : null;
  const pageMode: StoryPageMode = story?.pages[currentWordIndex]?.mode ?? 'spell';

  // ── Helpers for fill-blank mode ─────────────────────────────────────

  /** Initialise word bank and blank slots for a fill-blank page */
  const initFillBlank = useCallback((pageIdx: number) => {
    if (!story) return;
    const pg = story.pages[pageIdx];
    if (pg.mode !== 'fill-blank' || !pg.blankWords?.length) return;

    const slots: BlankSlotState[] = pg.blankWords.map(w => ({
      correctWord: w,
      placedWord: '',
    }));

    const correctItems: WordBankItem[] = pg.blankWords.map((w, i) => ({
      id: `wb-${i}-${w}-${Math.random().toString(36).slice(2, 6)}`,
      word: w,
      used: false,
    }));
    const distractorItems: WordBankItem[] = (pg.distractorWords ?? []).map((w, i) => ({
      id: `wd-${i}-${w}-${Math.random().toString(36).slice(2, 6)}`,
      word: w,
      used: false,
    }));

    setBlankSlots(slots);
    setWordBankItems(shuffle([...correctItems, ...distractorItems]));
    setSelectedBlankIndex(-1);
  }, [story]);

  // ── Actions ─────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (!activityId || !config) return;

    let words: SpellingWord[];

    if (story) {
      // Story mode — use pages in order
      words = story.pages.map(p => ({
        word: p.word,
        emoji: p.emoji,
        labelKey: `spelling.words.${activityId}.${p.word}`,
      }));
    } else {
      // Classic mode — random picks from word bank
      const bank = getSpellingWordBank(activityId);
      if (!bank) { log.warn(`No word bank for ${activityId}`); return; }
      words = pickWords(bank.words, config.wordsPerRound);
    }

    roundWordsRef.current = words;
    setCurrentWordIndex(0);
    setWordsCompleted(0);
    setStreak(0);
    setPlacedLetters([]);
    setPlacedTileIds([]);
    setLastAttemptWrong(false);
    setHadMistakeThisWord(false);

    // Set up for first page
    const firstPage = story?.pages[0];
    if (firstPage?.mode === 'fill-blank') {
      setTiles([]);
      initFillBlank(0);
    } else {
      setTiles(buildTiles(words[0].word, config.distractorCount));
      setWordBankItems([]);
      setBlankSlots([]);
      setSelectedBlankIndex(-1);
    }

    setState('playing');
    log.debug(`Started round: ${activityId}, ${words.length} words${story ? ' (story mode)' : ''}`);
  }, [activityId, config, story, initFillBlank]);

  const tapTile = useCallback((tileId: string) => {
    if (state !== 'playing') return;
    const word = roundWordsRef.current[currentWordIndex];
    if (!word) return;

    const tile = tiles.find(t => t.id === tileId);
    if (!tile || tile.used) return;

    const nextIndex = placedLetters.length;
    const expectedLetter = word.word[nextIndex];

    if (tile.letter === expectedLetter) {
      // Correct
      const newPlaced = [...placedLetters, tile.letter];
      const newPlacedIds = [...placedTileIds, tile.id];
      setPlacedLetters(newPlaced);
      setPlacedTileIds(newPlacedIds);
      setTiles(prev => prev.map(t => t.id === tileId ? { ...t, used: true } : t));
      setLastAttemptWrong(false);

      // Check word completion
      if (newPlaced.length === word.word.length) {
        const newCompleted = wordsCompleted + 1;
        setWordsCompleted(newCompleted);
        if (!hadMistakeThisWord) {
          setStreak(prev => prev + 1);
        }

        if (newCompleted >= wordsTotal) {
          setState('round_complete');
          log.debug('Round complete');
          onCompleteRef.current?.();
        } else {
          setState('word_complete');
        }
      }
    } else {
      // Wrong letter
      setLastAttemptWrong(true);
      setWrongAttemptCount(prev => prev + 1);
      setHadMistakeThisWord(true);
      setStreak(0);
      log.debug(`Wrong letter: expected "${expectedLetter}", got "${tile.letter}"`);
    }
  }, [state, currentWordIndex, tiles, placedLetters, placedTileIds, wordsCompleted, config, hadMistakeThisWord]);

  const undoLastLetter = useCallback(() => {
    if (state !== 'playing' || placedLetters.length === 0) return;

    const lastTileId = placedTileIds[placedTileIds.length - 1];
    setPlacedLetters(prev => prev.slice(0, -1));
    setPlacedTileIds(prev => prev.slice(0, -1));
    setTiles(prev => prev.map(t => t.id === lastTileId ? { ...t, used: false } : t));
  }, [state, placedLetters, placedTileIds]);

  const nextWord = useCallback(() => {
    if (state !== 'word_complete' || !config) return;

    const nextIdx = currentWordIndex + 1;
    const nextW = roundWordsRef.current[nextIdx];
    if (!nextW) return;

    setCurrentWordIndex(nextIdx);
    setPlacedLetters([]);
    setPlacedTileIds([]);
    setLastAttemptWrong(false);
    setHadMistakeThisWord(false);

    // Set up for next page
    const nextPage = story?.pages[nextIdx];
    if (nextPage?.mode === 'fill-blank') {
      setTiles([]);
      initFillBlank(nextIdx);
    } else {
      setTiles(buildTiles(nextW.word, config.distractorCount));
      setWordBankItems([]);
      setBlankSlots([]);
      setSelectedBlankIndex(-1);
    }

    setState('playing');
  }, [state, currentWordIndex, config, story, initFillBlank]);

  // ── Fill-blank mode actions ───────────────────────────────────────

  const tapBlank = useCallback((index: number) => {
    if (state !== 'playing' || pageMode !== 'fill-blank') return;
    if (index < 0 || index >= blankSlots.length) return;

    const slot = blankSlots[index];
    if (slot.placedWord !== '') {
      // Tapping a filled blank → remove the word back to the bank
      const removedWord = slot.placedWord;
      setBlankSlots(prev => {
        const next = [...prev];
        next[index] = { ...next[index], placedWord: '' };
        return next;
      });
      setWordBankItems(prev =>
        prev.map(w => w.used && w.word === removedWord
          ? { ...w, used: false }
          : w
        )
      );
      setSelectedBlankIndex(index);
    } else {
      // Select this blank for the next word bank tap
      setSelectedBlankIndex(index);
    }
  }, [state, pageMode, blankSlots]);

  const tapWordBankItem = useCallback((itemId: string) => {
    if (state !== 'playing' || pageMode !== 'fill-blank') return;

    const bankItem = wordBankItems.find(w => w.id === itemId && !w.used);
    if (!bankItem) return;

    // Auto-select first empty blank if none selected
    let targetIdx = selectedBlankIndex;
    if (targetIdx < 0 || blankSlots[targetIdx]?.placedWord !== '') {
      targetIdx = blankSlots.findIndex(s => s.placedWord === '');
      if (targetIdx < 0) return; // all blanks filled
    }

    const slot = blankSlots[targetIdx];

    // Check if this is the correct word for this blank
    if (bankItem.word !== slot.correctWord) {
      setLastAttemptWrong(true);
      setWrongAttemptCount(prev => prev + 1);
      setHadMistakeThisWord(true);
      setStreak(0);
      log.debug(`fill-blank: wrong word "${bankItem.word}" for blank ${targetIdx}`);
      return;
    }

    // Place the word
    setBlankSlots(prev => {
      const next = [...prev];
      next[targetIdx] = { ...next[targetIdx], placedWord: bankItem.word };
      return next;
    });
    setWordBankItems(prev =>
      prev.map(w => w.id === itemId ? { ...w, used: true } : w)
    );
    setLastAttemptWrong(false);

    // Check if all blanks are filled
    const allFilled = blankSlots.every((s, i) =>
      i === targetIdx ? true : s.placedWord !== ''
    );
    if (allFilled) {
      const newCompleted = wordsCompleted + 1;
      setWordsCompleted(newCompleted);
      if (!hadMistakeThisWord) {
        setStreak(prev => prev + 1);
      }
      if (newCompleted >= wordsTotal) {
        setState('round_complete');
        log.debug('Round complete (fill-blank)');
        onCompleteRef.current?.();
      } else {
        setState('word_complete');
      }
    } else {
      // Auto-advance to next empty blank
      const nextEmpty = blankSlots.findIndex((s, i) =>
        i !== targetIdx && s.placedWord === ''
      );
      setSelectedBlankIndex(nextEmpty >= 0 ? nextEmpty : -1);
    }
  }, [state, pageMode, wordBankItems, blankSlots, selectedBlankIndex, wordsCompleted, wordsTotal, hadMistakeThisWord]);

  const cleanup = useCallback(() => {
    setState('idle');
    setTiles([]);
    setPlacedLetters([]);
    setPlacedTileIds([]);
    setWordsCompleted(0);
    setStreak(0);
    setLastAttemptWrong(false);
    setHadMistakeThisWord(false);
    setCurrentWordIndex(0);
    setWordBankItems([]);
    setBlankSlots([]);
    setSelectedBlankIndex(-1);
    roundWordsRef.current = [];
  }, []);

  return {
    state,
    currentWord,
    visualPrompt,
    tiles,
    placedLetters,
    wordsCompleted,
    wordsTotal,
    isRoundComplete,
    streak,
    showWordHint,
    lastAttemptWrong,
    wrongAttemptCount,

    // Story mode
    story,
    storyTitleKey,
    storyNarrativeKey,
    pageIndex: currentWordIndex,
    pageMode,

    // Fill-blank mode
    wordBankItems,
    blankSlots,
    selectedBlankIndex,

    start,
    tapTile,
    undoLastLetter,
    nextWord,
    cleanup,
    tapBlank,
    tapWordBankItem,
  };
}
