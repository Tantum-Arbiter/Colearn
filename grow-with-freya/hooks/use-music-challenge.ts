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
  /** The resolved sequence from config (requiredSequence or songId lookup), available before start() */
  resolvedSequence: string[];
  /** Resolved BPM for playback timing (from song or default 120) */
  resolvedBpm: number;

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

/** Optional callbacks for switching the iOS audio session between
 *  playAndRecord (mic active, quiet speaker) and playback-only (full volume).
 *  When provided, the hook automatically pauses the recorder before playing
 *  notes in blow mode and resumes it when all notes are released. */
export interface AudioSessionControl {
  pauseForPlayback: () => Promise<void>;
  resumeRecording: () => void;
  /** Ensure the iOS audio session is in playback-only mode (no recording).
   *  Call before playing notes to avoid the first note being silenced
   *  by a stale playAndRecord session from useAudioRecorder. */
  ensurePlaybackMode: () => Promise<void>;
  /** Synchronous check — true when audio session is already in playback mode.
   *  Use to skip the async ensurePlaybackMode and fire sound instantly. */
  isInPlaybackMode: () => boolean;
  /** Whether the recorder is currently listening (mic active) */
  isListening: boolean;
}

export function useMusicChallenge(
  config: MusicChallenge | undefined,
  onComplete?: () => void,
  /** Volume for note playback (0–1). Defaults to 1.0. */
  noteVolume = 1.0,
  /** Audio session switching for blow mode full-volume playback */
  audioSessionControl?: AudioSessionControl,
): MusicChallengeHookResult {
  const [state, setState] = useState<MusicChallengeState>('idle');
  const [isBreathActive, setIsBreathActiveRaw] = useState(false);
  // Ref mirror so playNote always reads the latest value without stale closures.
  // Updated both via setBreathActive (immediate) and useEffect (sync from state)
  // to avoid a one-render-cycle delay when MusicChallengeUI sets breathActive(true)
  // on mount in press mode — without the immediate ref update, playNote would see
  // false for the first frame and silently queue notes instead of playing them.
  const isBreathActiveRef = useRef(false);
  const setIsBreathActive = useCallback((active: boolean) => {
    isBreathActiveRef.current = active;   // Immediate — no render-cycle lag
    setIsBreathActiveRaw(active);         // Also update state for re-renders
  }, []);
  useEffect(() => { isBreathActiveRef.current = isBreathActive; }, [isBreathActive]);
  const [lastInputCorrect, setLastInputCorrect] = useState<boolean | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [sequenceResult, setSequenceResult] = useState<SequenceMatchResult | null>(null);
  const [missingAssets, setMissingAssets] = useState<string[]>([]);
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [currentSequence, setCurrentSequence] = useState<string[]>([]);

  const matcherRef = useRef<SequenceMatcher | null>(null);
  // Map of note → AudioPlayer so multiple notes can play simultaneously
  const notePlayersRef = useRef<Map<string, AudioPlayer>>(new Map());
  // Track when each note started playing (for minimum tap duration)
  const noteStartTimeRef = useRef<Map<string, number>>(new Map());
  // Track active fade-out intervals so they can be cancelled during cleanup,
  // preventing native crashes from accessing deallocated AudioPlayer memory.
  const fadeIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  // Track delayed stopNote timers (MIN_TAP_DURATION_MS) so they can be cancelled.
  const delayedStopTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Keep a ref for noteVolume so playNoteAudio always reads the latest value
  // and update all currently-playing note players when volume changes.
  const noteVolumeRef = useRef(noteVolume);
  useEffect(() => {
    noteVolumeRef.current = noteVolume;
    // Update all currently-playing note players to reflect the new volume
    notePlayersRef.current.forEach((player) => {
      try { player.volume = noteVolume; } catch {}
    });
  }, [noteVolume]);

  // Track currently held notes for chord matching
  const activeNotesRef = useRef<Set<string>>(new Set());
  // Notes pressed while breath was not yet active — pending processing
  const pendingNotesRef = useRef<string[]>([]);
  // Ambient breath sound — plays the base note softly when blowing without pressing buttons
  const ambientPlayerRef = useRef<AudioPlayer | null>(null);
  const AMBIENT_VOLUME = 0.25;

  // Audio session switching state for blow mode full-volume playback
  const blowActiveCountRef = useRef(0);
  const isRecorderPausedRef = useRef(false);
  // Keep a ref to audioSessionControl so callbacks always read the latest value
  const audioSessionRef = useRef(audioSessionControl);
  useEffect(() => { audioSessionRef.current = audioSessionControl; }, [audioSessionControl]);

  // Resolve instrument assets
  const instrument = (config ? getInstrument(config.instrumentId) : null) ?? null;

  // Resolve the note sequence and BPM: explicit requiredSequence takes priority, then songId lookup
  const resolvedSong = config?.songId ? getPracticeSong(config.songId) : undefined;
  const resolvedSequence = (() => {
    if (config?.requiredSequence && config.requiredSequence.length > 0) {
      return config.requiredSequence;
    }
    return resolvedSong?.sequence ?? [];
  })();
  // BPM for playback timing — defaults to 120 when no song is referenced
  const resolvedBpm = resolvedSong?.bpm ?? 120;

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

  // Helper to release all active note players.
  // Removes loop subscriptions BEFORE releasing to prevent native crashes
  // from stale listeners accessing deallocated player memory.
  // Also cancels any in-flight fade-out intervals and delayed stop timers
  // so they don't access deallocated native AudioPlayer memory.
  const releaseAllNotePlayers = useCallback(() => {
    // Cancel all delayed stopNote timers first — they would try to fade-out
    // players that we are about to release immediately.
    for (const timer of delayedStopTimersRef.current) {
      clearTimeout(timer);
    }
    delayedStopTimersRef.current.clear();

    // Cancel all in-flight fade-out intervals — they access player.volume /
    // player.pause() / player.release() on players we are about to release.
    for (const interval of fadeIntervalsRef.current) {
      clearInterval(interval);
    }
    fadeIntervalsRef.current.clear();

    notePlayersRef.current.forEach(player => {
      try { (player as any).__loopSub?.remove(); } catch {}
    });
    // Clear the map BEFORE releasing so status-update listeners see
    // the player is gone and bail out of their restart logic.
    const players = [...notePlayersRef.current.values()];
    notePlayersRef.current.clear();
    for (const player of players) {
      try { player.release(); } catch {}
    }
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

    const finishStart = () => {
      const seq = resolvedSequence;
      // For freeplay mode (empty sequence), we still transition to awaiting_input
      // so playNote() works — there's just no sequence matcher to check against.
      setCurrentSequence(seq);
      setDifficultyLevel(1);
      matcherRef.current = seq.length > 0 ? new SequenceMatcher(seq) : null;
      activeNotesRef.current.clear();
      setState('awaiting_input');
      setLastInputCorrect(null);
      setSequenceResult(null);
      log.debug(`Music challenge started: ${config.instrumentId}, sequence: ${seq.length > 0 ? seq.join(' ') : '(freeplay)'}`);
    };

    // Ensure the iOS audio session is in playback mode before accepting input.
    // If already cached as playback, finishes synchronously — no native bridge delay.
    const ctrl = audioSessionRef.current;
    if (ctrl && !ctrl.isInPlaybackMode()) {
      void ctrl.ensurePlaybackMode().then(finishStart);
    } else {
      finishStart();
    }
  }, [config, missingAssets, state, resolvedSequence]);

  // Play a note sample. Creates a fresh AudioPlayer for each press (expo-audio
  // players have native state that makes reuse unreliable). The note sustains
  // indefinitely via a playbackStatusUpdate listener that restarts playback
  // when the sample ends. The note only stops when stopNote fades it out.
  const playNoteAudio = useCallback((note: string) => {
    if (!instrument) return;

    const noteAudio = instrument.notes[note];
    if (!noteAudio) return;

    try {
      const existing = notePlayersRef.current.get(note);
      if (existing) {
        // Remove loop subscription and map entry BEFORE releasing to prevent
        // the status listener from restarting playback on a released player.
        try { (existing as any).__loopSub?.remove(); } catch {}
        notePlayersRef.current.delete(note);
        try { existing.release(); } catch {}
      }

      const player = createAudioPlayer(noteAudio);
      player.volume = noteVolumeRef.current;
      notePlayersRef.current.set(note, player);

      // Restart when playback ends so the note sustains as long as the
      // button is held. If the player has already been removed from
      // notePlayersRef (stopNote was called), don't restart.
      const subscription = player.addListener('playbackStatusUpdate', (status: { playing: boolean }) => {
        if (!status.playing && notePlayersRef.current.get(note) === player) {
          try {
            player.seekTo(0);
            player.play();
          } catch {}
        }
      });
      // Store the subscription cleanup so stopNote can remove it
      (player as any).__loopSub = subscription;

      noteStartTimeRef.current.set(note, Date.now());
      player.play();
    } catch (err) {
      log.error('Failed to play note audio:', err);
    }
  }, [instrument]);

  // --- Ambient breath sound cleanup ---
  // Stop any ambient breath sound that may be playing.
  const stopAmbientSound = useCallback(() => {
    const player = ambientPlayerRef.current;
    if (!player) return;
    ambientPlayerRef.current = null;
    // Quick fade out (~150ms)
    const fadeSteps = 5;
    const fadeInterval = 30;
    let step = 0;
    const startVol = player.volume ?? AMBIENT_VOLUME;
    const fade = setInterval(() => {
      step++;
      try { player.volume = startVol * (1 - step / fadeSteps); } catch {}
      if (step >= fadeSteps) {
        clearInterval(fade);
        fadeIntervalsRef.current.delete(fade);
        try { player.pause(); } catch {}
        try { player.release(); } catch {}
      }
    }, fadeInterval);
    fadeIntervalsRef.current.add(fade);
    log.debug('Ambient breath sound stopped');
  }, [AMBIENT_VOLUME]);

  // Stop ambient sound when breath stops or state changes away from awaiting_input
  useEffect(() => {
    if (!isBreathActive || state !== 'awaiting_input') {
      stopAmbientSound();
    }
  }, [isBreathActive, state, stopAmbientSound]);

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
    const noteMs = Math.round(60000 / Math.max(resolvedBpm, 30));
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
            player.volume = noteVolumeRef.current;
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
  }, [instrument, resolvedBpm]);

  /** Handle sequence completion — plays the full song back note-by-note */
  const handleSequenceComplete = useCallback(() => {
    activeNotesRef.current.clear();
    setState('sequence_complete');
    log.debug(`Sequence completed! (difficulty ${difficultyLevel})`);

    // Always play the full original song on completion (resolvedSequence),
    // not just the current difficulty sequence. This gives the child the
    // full extended celebration melody while "Amazing!" is displayed.
    const successSequence = resolvedSequence.length > 0 ? resolvedSequence : currentSequence;

    if (instrument && successSequence.length > 0) {
      setState('playing_success_song');

      // If the recorder is active (blow mode), pause it first so the
      // success song plays at full speaker volume instead of the quieter
      // playAndRecord session.
      const startPlayback = () => {
        const cleanupPlayback = playSequenceAsAudio(successSequence);
        const noteMs = Math.round(60000 / Math.max(resolvedBpm, 30));
        const gapMs = 100;
        // Calculate total time including extra gaps for repeated consecutive notes
        let totalMs = noteMs; // buffer at end
        for (let i = 0; i < successSequence.length; i++) {
          totalMs += noteMs;
          if (i > 0 && successSequence[i] === successSequence[i - 1]) {
            totalMs += gapMs;
          }
        }
        setTimeout(() => {
          cleanupPlayback?.();
          // Resume recording if it was paused
          if (blowActiveCountRef.current <= 0 && isRecorderPausedRef.current) {
            isRecorderPausedRef.current = false;
            audioSessionRef.current?.resumeRecording();
          }
          setState('completed');
          onComplete?.();
        }, totalMs);
      };

      // Clear blow-mode state and pause recorder for full-volume playback
      blowActiveCountRef.current = 0;
      const ctrl = audioSessionRef.current;
      if (ctrl && ctrl.isListening && !isRecorderPausedRef.current) {
        isRecorderPausedRef.current = true;
        void ctrl.pauseForPlayback().then(startPlayback);
      } else {
        startPlayback();
      }
    } else {
      setState('completed');
      onComplete?.();
    }
  }, [onComplete, difficultyLevel, instrument, currentSequence, resolvedSequence, playSequenceAsAudio, resolvedBpm]);

  /**
   * Process a note (or chord) against the sequence matcher.
   * Separated from playNote so it can be called both on press (if breath active)
   * and when breath activates while notes are already held.
   */
  const processNoteForSequence = useCallback((note: string) => {
    if (!matcherRef.current || currentSequence.length === 0) return;

    if (hasChords) {
      const result = matcherRef.current.processChord(activeNotesRef.current);
      setSequenceResult(result);
      setLastInputCorrect(result.lastInputCorrect);
      if (result.isComplete) {
        handleSequenceComplete();
      }
    } else {
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
  }, [currentSequence, hasChords, handleSequenceComplete]);

  // Helper: ensure the iOS audio session is in playback-only mode (full volume)
  // before playing a note in blow mode. If already paused, resolves immediately.
  const ensurePlaybackSession = useCallback(async () => {
    const ctrl = audioSessionRef.current;
    if (!ctrl || !ctrl.isListening || isRecorderPausedRef.current) return;
    isRecorderPausedRef.current = true;
    await ctrl.pauseForPlayback();
  }, []);

  // Helper: resume recording when all blow-mode notes are released.
  const maybeResumeRecording = useCallback(() => {
    if (blowActiveCountRef.current <= 0 && isRecorderPausedRef.current) {
      isRecorderPausedRef.current = false;
      blowActiveCountRef.current = 0;
      audioSessionRef.current?.resumeRecording();
    }
  }, []);

  // Maximum sustain duration for blow-mode notes (ms). Since the iOS audio
  // session can't simultaneously record from the mic at full speaker volume,
  // we keep the session in playback mode while notes play and instead enforce
  // a max sustain: notes auto-fade after this duration even if the key is
  // still held, simulating the natural breath limit of a wind instrument.
  // Pressing the key again while still blowing re-triggers the note.
  const BLOW_MAX_SUSTAIN_MS = 3000;
  const blowSustainTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const playNote = useCallback((note: string) => {
    log.debug(`playNote called: note=${note}, state=${state}, instrument=${!!instrument}, config=${!!config}`);
    if (state !== 'awaiting_input' || !instrument || !config) {
      log.debug(`playNote bailed: state=${state}, instrument=${!!instrument}, config=${!!config}`);
      return;
    }

    // Always track the held note (regardless of breath)
    activeNotesRef.current.add(note);

    if (!config.micRequired || isBreathActiveRef.current) {
      // In blow mode with audioSessionControl → pause recorder for full volume first
      if (config.micRequired && audioSessionRef.current?.isListening) {
        blowActiveCountRef.current++;
        void ensurePlaybackSession().then(() => {
          playNoteAudio(note);
          processNoteForSequence(note);
          // Start a max-sustain timer: auto-fade after BLOW_MAX_SUSTAIN_MS
          // so the note doesn't ring forever while the session is paused.
          startBlowSustainTimer(note);
        });
        return;
      }
      // Press mode or no session control — fire sound immediately when the
      // audio session is already cached in playback mode (zero latency).
      // Only falls back to async on the very first note after mount.
      const ctrl = audioSessionRef.current;
      if (ctrl && !ctrl.isInPlaybackMode()) {
        void ctrl.ensurePlaybackMode().then(() => {
          playNoteAudio(note);
          processNoteForSequence(note);
        });
      } else {
        playNoteAudio(note);
        processNoteForSequence(note);
      }
    } else {
      // No breath yet — silently queue; will play + process when breath arrives
      pendingNotesRef.current.push(note);
      log.debug('Note pressed without breath — queued silently');
    }
  }, [state, instrument, config, playNoteAudio, processNoteForSequence, ensurePlaybackSession]);

  // When breath activates while notes are held down → play and process them.
  // Also handles session switching for blow mode full-volume playback.
  useEffect(() => {
    if (
      isBreathActive &&
      pendingNotesRef.current.length > 0 &&
      state === 'awaiting_input'
    ) {
      log.debug(`Breath detected with ${pendingNotesRef.current.length} pending note(s)`);
      const pending = [...pendingNotesRef.current];
      pendingNotesRef.current = [];
      const notesToPlay = pending.filter(n => activeNotesRef.current.has(n));
      if (notesToPlay.length === 0) return;

      if (config?.micRequired && audioSessionRef.current?.isListening) {
        // Blow mode: pause recorder for full volume, then play all pending notes
        blowActiveCountRef.current += notesToPlay.length;
        void ensurePlaybackSession().then(() => {
          for (const note of notesToPlay) {
            playNoteAudio(note);
            processNoteForSequence(note);
            startBlowSustainTimer(note);
          }
        });
      } else {
        for (const note of notesToPlay) {
          playNoteAudio(note);
          processNoteForSequence(note);
        }
      }
    }
  }, [isBreathActive, state, config, processNoteForSequence, playNoteAudio, ensurePlaybackSession]);

  const previewNote = useCallback((note: string) => {
    // If the audio session is already in playback mode (cached), fire immediately.
    // Otherwise do the async switch first — only happens on the very first note.
    const ctrl = audioSessionRef.current;
    if (ctrl && !ctrl.isInPlaybackMode()) {
      void ctrl.ensurePlaybackMode().then(() => playNoteAudio(note));
    } else {
      playNoteAudio(note);
    }
  }, [playNoteAudio]);

  // Fade out and release a single audio player over ~200ms.
  // Also removes the loop listener so the sample doesn't restart during fade.
  const fadeOutPlayer = useCallback((player: AudioPlayer) => {
    // Remove the loop-restart listener first
    try { (player as any).__loopSub?.remove(); } catch {}

    const fadeSteps = 5;
    const fadeInterval = 40; // ms per step → ~200ms total fade
    let step = 0;
    const startVolume = player.volume ?? 1;
    const fade = setInterval(() => {
      step++;
      try { player.volume = startVolume * (1 - step / fadeSteps); } catch {}
      if (step >= fadeSteps) {
        clearInterval(fade);
        fadeIntervalsRef.current.delete(fade);
        try { player.pause(); } catch {}
        try { player.release(); } catch {}
      }
    }, fadeInterval);
    fadeIntervalsRef.current.add(fade);
  }, []);

  // Start a sustain timer for a blow-mode note. When it expires, the note
  // fades out and the recorder resumes (same as if the key was released).
  const startBlowSustainTimer = useCallback((note: string) => {
    // Clear any existing timer for this note (e.g. re-triggered)
    const existing = blowSustainTimersRef.current.get(note);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      blowSustainTimersRef.current.delete(note);
      log.debug(`Blow sustain timeout for ${note} — auto-fading`);
      // Fade out the note player
      const player = notePlayersRef.current.get(note);
      if (player) {
        notePlayersRef.current.delete(note);
        fadeOutPlayer(player);
      }
      noteStartTimeRef.current.delete(note);
      activeNotesRef.current.delete(note);
      // Decrement blow count and resume recording if all notes done
      if (blowActiveCountRef.current > 0) {
        blowActiveCountRef.current = Math.max(0, blowActiveCountRef.current - 1);
        maybeResumeRecording();
      }
    }, BLOW_MAX_SUSTAIN_MS);
    blowSustainTimersRef.current.set(note, timer);
  }, [fadeOutPlayer, maybeResumeRecording]);

  // Clear all sustain timers (for cleanup / breath stop)
  const clearAllBlowSustainTimers = useCallback(() => {
    for (const timer of blowSustainTimersRef.current.values()) {
      clearTimeout(timer);
    }
    blowSustainTimersRef.current.clear();
  }, []);

  // Minimum audible duration for a note tap (ms). If the user releases
  // a note faster than this, we delay the fade-out so the tap is always heard.
  const MIN_TAP_DURATION_MS = 120;

  const stopNote = useCallback((note: string) => {
    // Remove from active and pending notes
    activeNotesRef.current.delete(note);
    pendingNotesRef.current = pendingNotesRef.current.filter(n => n !== note);
    // Cancel any blow-sustain timer for this note (key released before timeout)
    const sustainTimer = blowSustainTimersRef.current.get(note);
    if (sustainTimer) {
      clearTimeout(sustainTimer);
      blowSustainTimersRef.current.delete(note);
    }

    const doStop = () => {
      // Dampen the note on release — fade out over ~200ms then release.
      const player = notePlayersRef.current.get(note);
      if (player) {
        notePlayersRef.current.delete(note);
        fadeOutPlayer(player);
      }
      noteStartTimeRef.current.delete(note);

      // In blow mode, decrement active count and resume recording when all released
      if (config?.micRequired && blowActiveCountRef.current > 0) {
        blowActiveCountRef.current = Math.max(0, blowActiveCountRef.current - 1);
        maybeResumeRecording();
      }
    };

    // Ensure the note plays for at least MIN_TAP_DURATION_MS so quick taps
    // are always audible. If the note hasn't been held long enough, delay.
    const startTime = noteStartTimeRef.current.get(note);
    if (startTime) {
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_TAP_DURATION_MS) {
        const timer = setTimeout(() => {
          delayedStopTimersRef.current.delete(timer);
          doStop();
        }, MIN_TAP_DURATION_MS - elapsed);
        delayedStopTimersRef.current.add(timer);
        return;
      }
    }
    doStop();
  }, [fadeOutPlayer, config, maybeResumeRecording]);

  // In blow mode (micRequired), fade out ALL active notes when breath stops.
  // Notes should only sustain while the user is actively blowing + holding
  // the button. When blowing stops, notes fade out even if button is still held.
  // The breath detector already debounces deactivation (250ms), so this won't
  // fire on brief metering dips.
  useEffect(() => {
    if (!isBreathActive && config?.micRequired && notePlayersRef.current.size > 0) {
      log.debug('Breath stopped — fading out all active note players');
      for (const [note, player] of notePlayersRef.current) {
        notePlayersRef.current.delete(note);
        fadeOutPlayer(player);
      }
      // Clear all sustain timers — notes are being stopped by breath-off
      clearAllBlowSustainTimers();
      // Reset blow-mode session state and resume recording
      blowActiveCountRef.current = 0;
      maybeResumeRecording();
    }
  }, [isBreathActive, config, fadeOutPlayer, clearAllBlowSustainTimers, maybeResumeRecording]);

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
    log.debug('cleanup() called');
    try {
      releaseAllNotePlayers();
      stopAmbientSound();
      clearAllBlowSustainTimers();
      matcherRef.current = null;
      activeNotesRef.current.clear();
      setState('idle');
      setDifficultyLevel(1);
      setCurrentSequence([]);
      log.debug('cleanup() completed');
    } catch (err) {
      log.error('cleanup() error:', err);
    }
  }, [releaseAllNotePlayers, stopAmbientSound, clearAllBlowSustainTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      log.debug('useMusicChallenge unmounting — releasing resources');
      try {
        // Cancel delayed stopNote timers and fade-out intervals FIRST so they
        // don't fire after we release the native players below.
        for (const timer of delayedStopTimersRef.current) {
          clearTimeout(timer);
        }
        delayedStopTimersRef.current.clear();
        for (const interval of fadeIntervalsRef.current) {
          clearInterval(interval);
        }
        fadeIntervalsRef.current.clear();

        // Remove loop subscriptions before releasing to prevent native crashes
        notePlayersRef.current.forEach(player => {
          try { (player as any).__loopSub?.remove(); } catch {}
        });
        const players = [...notePlayersRef.current.values()];
        notePlayersRef.current.clear();
        for (const player of players) {
          try { player.release(); } catch {}
        }
        if (ambientPlayerRef.current) {
          try { ambientPlayerRef.current.release(); } catch {}
          ambientPlayerRef.current = null;
        }
        for (const timer of blowSustainTimersRef.current.values()) {
          clearTimeout(timer);
        }
        blowSustainTimersRef.current.clear();
        noteStartTimeRef.current.clear();
      } catch (err) {
        log.error('useMusicChallenge unmount cleanup error:', err);
      }
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
    resolvedSequence,
    resolvedBpm,

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
