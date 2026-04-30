/**
 * useMusicChallenge - React hook for managing music challenge state
 *
 * State machine:
 *   idle → awaiting_input → playing_note → (awaiting_input | sequence_complete)
 *   sequence_complete → playing_success_song → completed
 *
 * Reusable for both story challenge pages and Music Mode free play.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { Logger } from '@/utils/logger';
import { SequenceMatcher, SequenceMatchResult, isChordEntry, parseChordEntry } from '@/services/sequence-matcher';
import {
  getInstrument,
  getPracticeSong,
  validateMusicChallengeAssets,
  InstrumentDefinition,
} from '@/services/music-asset-registry';
import type { MusicChallenge } from '@/types/story';

const log = Logger.create('MusicChallenge');

// Music challenge states
export type MusicChallengeState =
  | 'idle'
  | 'awaiting_input'
  | 'playing_note'
  | 'sequence_complete'
  | 'playing_success_song'
  | 'completed'
  | 'error';

export interface MusicChallengeHookResult {
  // State
  state: MusicChallengeState;
  instrument: InstrumentDefinition | null;
  sequenceProgress: number; // 0-1
  currentNoteIndex: number;
  totalNotes: number;
  nextExpectedNote: string | null;
  isBreathActive: boolean;
  lastInputCorrect: boolean | null;
  failedAttempts: number;
  isComplete: boolean;
  hasError: boolean;
  missingAssets: string[];
  /** Current difficulty level (1 = original story sequence, 2–5 = harder) */
  difficultyLevel: number;
  /** Whether the maximum difficulty (level 5) has been reached */
  isMaxDifficulty: boolean;
  /** The currently active required sequence (may differ from config when difficulty > 1) */
  currentSequence: string[];

  // Actions
  start: () => void;
  playNote: (note: string) => void;
  previewNote: (note: string) => void;
  stopNote: (note: string) => void;
  setBreathActive: (active: boolean) => void;
  retry: () => void;
  skip: () => void;
  cleanup: () => void;
  /** Increase difficulty: generates a harder chord-based sequence and restarts */
  goHarder: () => void;
}

/**
 * Generate a harder sequence mixing single notes and chords.
 * Builds musical phrases: single-note runs leading into chord resolutions.
 * Uses thirds and triads so chords sound natural.
 *
 * Level 2: 4 entries — two singles ascending, then a 2-note chord, resolve single
 *          e.g. C → D → C+E → C
 * Level 3: 5 entries — single, single, 2-chord, single, 3-chord resolve
 *          e.g. C → E → C+E → D → D+F+A
 * Level 4: 6 entries — single, 2-chord, single, 2-chord, single, 3-chord
 * Level 5: 7 entries — ascending singles + chords interwoven, triad finale
 */
function generateHarderSequence(
  availableNotes: string[],
  level: number,
): string[] {
  const n = availableNotes.length;
  if (n < 2) return availableNotes;

  // Build a chord from a root index using musical intervals (thirds)
  const buildChord = (rootIdx: number, size: number): string => {
    const notes = [availableNotes[rootIdx % n]];
    if (size >= 2) notes.push(availableNotes[(rootIdx + 2) % n]);
    if (size >= 3) notes.push(availableNotes[(rootIdx + 4) % n]);
    const unique = [...new Set(notes)];
    return unique.length > 1 ? unique.join('+') : unique[0];
  };

  // S = single note, C2 = 2-note chord, C3 = 3-note chord
  // Each level defines a phrase pattern and which root index to use
  type Entry = { type: 'S' | 'C2' | 'C3'; root: number };

  const patterns: Record<number, Entry[]> = {
    2: [
      { type: 'S',  root: 0 }, // C
      { type: 'S',  root: 1 }, // D
      { type: 'C2', root: 0 }, // C+E (resolve chord)
      { type: 'S',  root: 0 }, // C (resolve back)
    ],
    3: [
      { type: 'S',  root: 0 }, // C
      { type: 'S',  root: 2 }, // E
      { type: 'C2', root: 0 }, // C+E
      { type: 'S',  root: 1 }, // D
      { type: 'C3', root: 1 }, // D+F+A (triad resolve)
    ],
    4: [
      { type: 'S',  root: 0 }, // C
      { type: 'C2', root: 0 }, // C+E
      { type: 'S',  root: 1 }, // D
      { type: 'C2', root: 1 }, // D+F
      { type: 'S',  root: 2 }, // E
      { type: 'C3', root: 0 }, // C+E+G (triad finale)
    ],
    5: [
      { type: 'S',  root: 0 }, // C
      { type: 'S',  root: 1 }, // D
      { type: 'C2', root: 0 }, // C+E
      { type: 'S',  root: 2 }, // E
      { type: 'C2', root: 1 }, // D+F
      { type: 'C3', root: 0 }, // C+E+G
      { type: 'C3', root: 1 }, // D+F+A (grand finale)
    ],
  };

  const pattern = patterns[Math.min(level, 5)] ?? patterns[5];

  return pattern.map(entry => {
    if (entry.type === 'S') return availableNotes[entry.root % n];
    const size = entry.type === 'C2' ? 2 : Math.min(3, n);
    return buildChord(entry.root, size);
  });
}

export function useMusicChallenge(
  config: MusicChallenge | undefined,
  onComplete?: () => void,
  /** Volume for note playback (0–1). Defaults to 1.0. */
  noteVolume = 1.0,
): MusicChallengeHookResult {
  const [state, setState] = useState<MusicChallengeState>('idle');
  const [isBreathActive, setIsBreathActive] = useState(false);
  const [lastInputCorrect, setLastInputCorrect] = useState<boolean | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [sequenceResult, setSequenceResult] = useState<SequenceMatchResult | null>(null);
  const [missingAssets, setMissingAssets] = useState<string[]>([]);
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [currentSequence, setCurrentSequence] = useState<string[]>([]);

  const matcherRef = useRef<SequenceMatcher | null>(null);
  // Map of note → AudioPlayer so multiple notes can play simultaneously
  const notePlayersRef = useRef<Map<string, AudioPlayer>>(new Map());

  // Track currently held notes for chord matching
  const activeNotesRef = useRef<Set<string>>(new Set());

  // Resolve instrument assets
  const instrument = (config ? getInstrument(config.instrumentId) : null) ?? null;

  // Resolve the note sequence: explicit requiredSequence takes priority, then songId lookup
  const resolvedSequence = (() => {
    if (config?.requiredSequence && config.requiredSequence.length > 0) {
      return config.requiredSequence;
    }
    if (config?.songId) {
      const song = getPracticeSong(config.songId);
      return song?.sequence ?? [];
    }
    return [];
  })();

  // Validate assets on mount
  useEffect(() => {
    if (config?.enabled) {
      const missing = validateMusicChallengeAssets(
        config.instrumentId,
        resolvedSequence,
      );
      if (config.songId && !getPracticeSong(config.songId)) {
        missing.push(`song:${config.songId}`);
      }
      setMissingAssets(missing);
      if (missing.length > 0) {
        setState('error');
      }
    }
  }, [config?.instrumentId, config?.enabled, config?.songId]);

  // Helper to release all active note players
  const releaseAllNotePlayers = useCallback(() => {
    notePlayersRef.current.forEach(player => {
      try { player.release(); } catch {}
    });
    notePlayersRef.current.clear();
  }, []);

  // Auto-cleanup when config becomes undefined (navigated away from music page)
  useEffect(() => {
    if (!config) {
      releaseAllNotePlayers();
      matcherRef.current = null;
      if (state !== 'idle') {
        setState('idle');
      }
      setDifficultyLevel(1);
      setCurrentSequence([]);
    }
  }, [config]);

  const start = useCallback(() => {
    log.debug(`Music challenge start() called: config=${!!config}, missingAssets=${missingAssets.length}, currentState=${state}`);
    if (!config || missingAssets.length > 0) {
      log.debug(`Music challenge start() bailed: config=${!!config}, missingAssets=[${missingAssets.join(',')}]`);
      return;
    }
    const seq = resolvedSequence;
    if (seq.length === 0) {
      log.warn('Music challenge start() bailed: no sequence (neither requiredSequence nor songId resolved)');
      return;
    }
    setCurrentSequence(seq);
    setDifficultyLevel(1);
    matcherRef.current = new SequenceMatcher(seq);
    activeNotesRef.current.clear();
    setState('awaiting_input');
    setLastInputCorrect(null);
    setSequenceResult(null);
    log.debug(`Music challenge started: ${config.instrumentId}, sequence: ${seq.join(' ')}`);
  }, [config, missingAssets, state, resolvedSequence]);

  // Note samples are ~5 seconds long — no looping or crossfade needed.
  // The note plays naturally for its full duration; on release we fade out.
  const playNoteAudio = useCallback((note: string) => {
    if (!instrument) return;

    const noteAudio = instrument.notes[note];
    if (!noteAudio) return;

    try {
      const existing = notePlayersRef.current.get(note);
      if (existing) {
        try { existing.release(); } catch {}
      }

      const player = createAudioPlayer(noteAudio);
      player.volume = noteVolume;
      notePlayersRef.current.set(note, player);
      player.play();
    } catch (err) {
      log.error('Failed to play note audio:', err);
    }
  }, [instrument, noteVolume]);

  // Check if the current sequence has any chord entries
  const hasChords = currentSequence.some(e => isChordEntry(e));

  /**
   * Play back the current sequence using the instrument's note samples.
   * For chord entries, all notes play simultaneously. Each entry is spaced
   * at 500ms — matching the UI playback visualization timing.
   * Only adds a brief gap when consecutive entries are identical (so the
   * repeated note is audibly distinct).
   */
  const playSequenceAsAudio = useCallback((sequence: string[]) => {
    if (!instrument) return;
    const noteMs = 500;
    const gapMs = 100;
    let cancelled = false;
    const playbackPlayers: AudioPlayer[] = [];

    const playEntry = (idx: number) => {
      if (cancelled || idx >= sequence.length) return;
      const entry = sequence[idx];
      const prevEntry = idx > 0 ? sequence[idx - 1] : null;
      const needsGap = prevEntry != null && entry === prevEntry;
      const notes = isChordEntry(entry) ? parseChordEntry(entry) : [entry];

      const doPlay = () => {
        if (cancelled) return;
        // Play all notes in this entry simultaneously
        for (const note of notes) {
          const noteAudio = instrument.notes[note];
          if (!noteAudio) continue;
          try {
            const player = createAudioPlayer(noteAudio);
            player.volume = noteVolume;
            playbackPlayers.push(player);
            player.play();
          } catch {}
        }
        // Hold for note duration, then next
        setTimeout(() => {
          if (!cancelled) playEntry(idx + 1);
        }, noteMs);
      };

      if (needsGap) {
        setTimeout(doPlay, gapMs);
      } else {
        doPlay();
      }
    };

    playEntry(0);

    // Return cleanup function
    return () => {
      cancelled = true;
      for (const p of playbackPlayers) {
        try { p.release(); } catch {}
      }
    };
  }, [instrument]);

  /** Handle sequence completion — plays the completed sequence back note-by-note */
  const handleSequenceComplete = useCallback(() => {
    activeNotesRef.current.clear();
    setState('sequence_complete');
    log.debug(`Sequence completed! (difficulty ${difficultyLevel})`);

    if (instrument && currentSequence.length > 0) {
      // Play back the sequence note-by-note using the instrument's own samples.
      // This ensures the celebration melody always matches what the user just played,
      // regardless of difficulty level. The UI highlights each note in sync.
      setState('playing_success_song');
      const cleanupPlayback = playSequenceAsAudio(currentSequence);
      const noteMs = 500;
      const totalMs = currentSequence.length * noteMs + 500; // extra 500ms buffer
      setTimeout(() => {
        cleanupPlayback?.();
        setState('completed');
        onComplete?.();
      }, totalMs);
    } else {
      setState('completed');
      onComplete?.();
    }
  }, [onComplete, difficultyLevel, instrument, currentSequence, playSequenceAsAudio]);

  const playNote = useCallback((note: string) => {
    log.debug(`playNote called: note=${note}, state=${state}, instrument=${!!instrument}, config=${!!config}`);
    if (state !== 'awaiting_input' || !instrument || !config) {
      log.debug(`playNote bailed: state=${state}, instrument=${!!instrument}, config=${!!config}`);
      return;
    }

    // Always play the note sound so the child gets audio feedback on press
    playNoteAudio(note);

    // Only count the note toward the sequence if breath is detected (or mic not required)
    if (config.micRequired && !isBreathActive) {
      log.debug('Note pressed without breath — sound played but not counted');
      return;
    }

    // Track the held note
    activeNotesRef.current.add(note);

    // Skip sequence matching for free-play modes (empty sequence)
    if (!matcherRef.current || currentSequence.length === 0) return;

    if (hasChords) {
      // Chord mode: check if the current held notes satisfy the expected chord
      const result = matcherRef.current.processChord(activeNotesRef.current);
      setSequenceResult(result);
      setLastInputCorrect(result.lastInputCorrect);
      if (result.isComplete) {
        handleSequenceComplete();
      }
    } else {
      // Single-note mode: exact ordered match (original behavior)
      const result = matcherRef.current.processNote(note);
      setSequenceResult(result);
      setLastInputCorrect(result.lastInputCorrect);
      if (!result.lastInputCorrect) {
        setFailedAttempts(prev => prev + 1);
      }
      if (result.isComplete) {
        handleSequenceComplete();
      }
    }
  }, [state, instrument, config, isBreathActive, hasChords, handleSequenceComplete, playNoteAudio]);

  const previewNote = useCallback((note: string) => {
    playNoteAudio(note);
  }, [playNoteAudio]);

  const stopNote = useCallback((note: string) => {
    // Remove from active notes (for chord tracking)
    activeNotesRef.current.delete(note);

    // Dampen the note on release — fade out over ~200ms then release.
    const player = notePlayersRef.current.get(note);
    if (player) {
      const fadeSteps = 5;
      const fadeInterval = 40; // ms per step → ~200ms total fade
      let step = 0;
      const startVolume = player.volume ?? 1;
      const fade = setInterval(() => {
        step++;
        try { player.volume = startVolume * (1 - step / fadeSteps); } catch {}
        if (step >= fadeSteps) {
          clearInterval(fade);
          try { player.pause(); } catch {}
          try { player.release(); } catch {}
          notePlayersRef.current.delete(note);
        }
      }, fadeInterval);
    }
  }, []);

  const retry = useCallback(() => {
    matcherRef.current?.reset();
    activeNotesRef.current.clear();
    setSequenceResult(null);
    setLastInputCorrect(null);
    setState('awaiting_input');
    log.debug('Music challenge retry');
  }, []);

  const skip = useCallback(() => {
    if (config?.allowSkip) {
      setState('completed');
      onComplete?.();
      log.debug('Music challenge skipped');
    }
  }, [config, onComplete]);

  const MAX_DIFFICULTY = 5;

  /** Go Harder: generate a more difficult chord sequence and restart */
  const goHarder = useCallback(() => {
    if (!instrument || !config) return;
    if (difficultyLevel >= MAX_DIFFICULTY) return;
    const nextLevel = difficultyLevel + 1;
    const availableNotes = Object.keys(instrument.notes);
    const harderSeq = generateHarderSequence(availableNotes, nextLevel);
    setDifficultyLevel(nextLevel);
    setCurrentSequence(harderSeq);
    matcherRef.current = new SequenceMatcher(harderSeq);
    activeNotesRef.current.clear();
    setState('awaiting_input');
    setLastInputCorrect(null);
    setSequenceResult(null);
    setFailedAttempts(0);
    log.debug(`Go harder! Level ${nextLevel}, sequence: ${harderSeq.join(' ')}`);
  }, [instrument, config, difficultyLevel]);

  const cleanup = useCallback(() => {
    releaseAllNotePlayers();
    matcherRef.current = null;
    activeNotesRef.current.clear();
    setState('idle');
    setDifficultyLevel(1);
    setCurrentSequence([]);
  }, [releaseAllNotePlayers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      notePlayersRef.current.forEach(player => {
        try { player.release(); } catch {}
      });
      notePlayersRef.current.clear();
    };
  }, []);

  return {
    state,
    instrument,
    sequenceProgress: sequenceResult?.progress ?? 0,
    currentNoteIndex: sequenceResult?.currentIndex ?? 0,
    totalNotes: currentSequence.length || resolvedSequence.length,
    nextExpectedNote: matcherRef.current?.getNextExpectedNote() ?? null,
    isBreathActive,
    lastInputCorrect,
    failedAttempts,
    isComplete: state === 'completed',
    hasError: state === 'error',
    missingAssets,
    difficultyLevel,
    isMaxDifficulty: difficultyLevel >= MAX_DIFFICULTY,
    currentSequence,

    start,
    playNote,
    previewNote,
    stopNote,
    setBreathActive: setIsBreathActive,
    retry,
    skip,
    cleanup,
    goHarder,
  };
}
