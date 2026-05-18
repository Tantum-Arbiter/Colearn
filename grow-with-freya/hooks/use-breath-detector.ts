/**
 * useBreathDetector - Microphone-based breath/blow detection hook
 *
 * Uses the microphone to detect when the child is blowing into the device.
 * Monitors audio level (metering) against a configurable threshold.
 *
 * Uses the shared useMicPermission hook so mic permission is only requested
 * ONCE across the entire app -shared with useVoiceRecording (narration mode).
 *
 * Provides fallback mode when mic permission is denied or unavailable:
 * - useFallback = true → caller should show on-screen blow button instead
 *
 * Does NOT do pitch detection -only noise/breath level detection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { Logger } from '@/utils/logger';
import { useMicPermission } from './use-mic-permission';

const log = Logger.create('BreathDetector');

// Threshold in dB -values above this indicate "blowing"
// Typical quiet room: -40 to -30 dB, breath/blow: -20 to -5 dB
const DEFAULT_BREATH_THRESHOLD_DB = -25;
const METERING_POLL_INTERVAL_MS = 100;
// Delay before deactivating breath when metering drops below threshold.
// Prevents flickering -brief dips between breaths won't kill active notes.
const BREATH_DEACTIVATE_DELAY_MS = 250;

export interface BreathDetectorOptions {
  thresholdDb?: number;
  enabled?: boolean;
}

export interface BreathDetectorResult {
  isBreathActive: boolean;
  isListening: boolean;
  hasPermission: boolean | null;
  useFallback: boolean;
  currentLevel: number;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  ensurePlaybackMode: () => Promise<void>;
  /** Synchronous check -returns true when the audio session is already in
   *  playback-only mode (cached). Use this to skip the async ensurePlaybackMode
   *  call and fire sound immediately with zero latency. */
  isInPlaybackMode: () => boolean;
  /** Temporarily stop the recorder and switch to playback-only audio session
   *  for full speaker volume. isBreathActive keeps its last value (debounced).
   *  Returns a promise that resolves once the audio session has switched. */
  pauseForPlayback: () => Promise<void>;
  /** Restart recording after a pauseForPlayback() call. */
  resumeRecording: () => void;
}

const PLAYBACK_AUDIO_MODE = {
  allowsRecording: false,
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix' as const,
  shouldRouteThroughEarpiece: false,
};

const RECORDING_AUDIO_MODE = {
  allowsRecording: true,
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  interruptionMode: 'doNotMix' as const,
  shouldRouteThroughEarpiece: false,
};

export function useBreathDetector(
  options: BreathDetectorOptions = {}
): BreathDetectorResult {
  const {
    thresholdDb = DEFAULT_BREATH_THRESHOLD_DB,
    enabled = true,
  } = options;

  const micPermission = useMicPermission();

  const [isBreathActive, setIsBreathActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(-160);

  // Create recorder with metering enabled
  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true }
  );

  // Poll recorder state for metering data
  const recorderState = useAudioRecorderState(recorder, METERING_POLL_INTERVAL_MS);

  // Debounce timer for deactivating breath -prevents flickering when
  // metering briefly dips below threshold between breaths.
  const breathOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // When true, breath state is frozen (pauseForPlayback active).
  // Prevents deactivation timer from firing while recorder is paused.
  const isPausedForPlaybackRef = useRef(false);
  // Monotonically increasing counter used to cancel stale resumeRecording
  // async work. Each pauseForPlayback bumps this; resumeRecording captures
  // the current value and bails if it has changed (meaning a new pause arrived).
  const pauseGenerationRef = useRef(0);
  // Cached audio session mode -avoids redundant native bridge calls.
  // Set to 'playback' or 'recording' after each successful setAudioModeAsync.
  const audioModeRef = useRef<'playback' | 'recording' | null>(null);

  // Update breath detection from metering values.
  // Activation is immediate; deactivation is debounced so brief dips in
  // metering don't kill active notes.
  // Skipped entirely while paused for playback (breath state is frozen).
  useEffect(() => {
    if (isPausedForPlaybackRef.current) return;
    if (isListening && recorderState.isRecording && recorderState.metering !== undefined) {
      setCurrentLevel(recorderState.metering);
      const isAboveThreshold = recorderState.metering > thresholdDb;

      if (isAboveThreshold) {
        // Breath detected -activate immediately, cancel any pending deactivation
        if (breathOffTimerRef.current) {
          clearTimeout(breathOffTimerRef.current);
          breathOffTimerRef.current = null;
        }
        setIsBreathActive(true);
      } else if (isBreathActive && !breathOffTimerRef.current) {
        // Below threshold while active -start deactivation timer
        breathOffTimerRef.current = setTimeout(() => {
          breathOffTimerRef.current = null;
          setIsBreathActive(false);
        }, BREATH_DEACTIVATE_DELAY_MS);
      }
    }
  }, [isListening, recorderState.isRecording, recorderState.metering, thresholdDb, isBreathActive]);

  // Clean up debounce timer when listening stops
  useEffect(() => {
    if (!isListening && breathOffTimerRef.current) {
      clearTimeout(breathOffTimerRef.current);
      breathOffTimerRef.current = null;
    }
  }, [isListening]);

  const hasPermission = micPermission.isUndetermined ? null : micPermission.isGranted;

  useEffect(() => {
    if (micPermission.isDenied) {
      setUseFallback(true);
    }
  }, [micPermission.isDenied]);

  const startListening = useCallback(async () => {
    if (!enabled) return;

    if (micPermission.isUndetermined) {
      const result = await micPermission.requestPermission();
      if (result !== 'granted') {
        log.warn('Microphone permission denied -using fallback blow button');
        setUseFallback(true);
        return;
      }
    } else if (micPermission.isDenied) {
      setUseFallback(true);
      return;
    }

    try {
      // Enable recording mode, but explicitly keep playback routed to speaker.
      // On iOS, play-and-record sessions can otherwise get sent to the receiver/earpiece.
      await setAudioModeAsync(RECORDING_AUDIO_MODE);
      audioModeRef.current = 'recording';
      // prepareToRecordAsync() is required on Android -MediaRecorder must be
      // prepared before start(). Without this, record() silently fails and
      // metering stays at -160 (silence). iOS is more forgiving but we call
      // it on both platforms for consistency.
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
      log.debug('Breath detector started listening');
    } catch (err) {
      log.error('Failed to start breath detection:', err);
      setUseFallback(true);
    }
  }, [enabled, micPermission, recorder]);

  // Restore the audio session to playback-only mode.
  // This undoes the `allowsRecording: true` set by startListening AND
  // counteracts any session changes caused by useAudioRecorder's creation.
  const restorePlaybackAudioMode = useCallback(async () => {
    if (audioModeRef.current === 'playback') return; // Already in playback -skip native call
    try {
      await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      audioModeRef.current = 'playback';
    } catch {
      // best-effort
    }
  }, []);

  /** Synchronous check: is the audio session already in playback mode?
   *  Reads the cached ref -no native bridge call. */
  const isInPlaybackMode = useCallback(() => audioModeRef.current === 'playback', []);

  const stopListening = useCallback(async () => {
    // Bump generation to cancel any in-flight resumeRecording async work
    // so it doesn't call recorder.record() after we call recorder.stop().
    pauseGenerationRef.current++;
    isPausedForPlaybackRef.current = false;
    // Guard: if already not listening, skip to avoid double-stop crashes
    if (!isListening) {
      log.debug('stopListening called but already not listening -skipping');
      return;
    }
    setIsListening(false);
    setIsBreathActive(false);
    try {
      recorder.stop();
    } catch {
      // Ignore stop errors (recorder may already be stopped)
    }
    try {
      await restorePlaybackAudioMode();
    } catch {
      // best-effort
    }
    log.debug('Breath detector stopped');
  }, [recorder, isListening, restorePlaybackAudioMode]);

  // Pause recording and switch to playback-only mode for full speaker volume.
  // Freezes isBreathActive at its current value so notes aren't killed by the
  // breath-stop fade-out while the recorder is paused.
  const pauseForPlayback = useCallback(async () => {
    // Bump generation to cancel any in-flight resumeRecording async work
    pauseGenerationRef.current++;
    // Freeze breath state -prevent metering effect from changing isBreathActive
    isPausedForPlaybackRef.current = true;
    // Cancel any pending deactivation timer so it doesn't fire during the pause
    if (breathOffTimerRef.current) {
      clearTimeout(breathOffTimerRef.current);
      breathOffTimerRef.current = null;
    }
    try { recorder.stop(); } catch {}
    try {
      await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      audioModeRef.current = 'playback';
    } catch {}
    log.debug('Recorder paused -switched to playback mode (breath state frozen)');
  }, [recorder]);

  // Restart recording after a pauseForPlayback() call.
  // Unfreezes breath state so metering resumes controlling isBreathActive.
  // Uses pauseGenerationRef to bail if a new pauseForPlayback arrives mid-resume,
  // preventing the async work from racing with the newer pause and accidentally
  // switching the audio session back to recording mode.
  const resumeRecording = useCallback(() => {
    isPausedForPlaybackRef.current = false;
    // Reset breath state so the user must blow again for the next note.
    // Without this, isBreathActive stays frozen at true from the pause,
    // allowing notes to play without blowing until new metering arrives.
    setIsBreathActive(false);
    if (!isListening) return;
    const gen = pauseGenerationRef.current;
    const doResume = async () => {
      try {
        // Wait for any in-progress note fade-out (~200ms) to complete before
        // switching the audio session. Changing to RECORDING_AUDIO_MODE on iOS
        // can interrupt active audio playback, cutting notes off abruptly
        // instead of letting them fade out smoothly.
        await new Promise(resolve => setTimeout(resolve, 250));
        // Bail if a new pause arrived while we were waiting
        if (pauseGenerationRef.current !== gen) return;
        await setAudioModeAsync(RECORDING_AUDIO_MODE);
        audioModeRef.current = 'recording';
        if (pauseGenerationRef.current !== gen) return;
        await recorder.prepareToRecordAsync();
        if (pauseGenerationRef.current !== gen) return;
        recorder.record();
        log.debug('Recorder resumed -breath detection active');
      } catch (err) {
        log.warn('Failed to resume recording:', err);
      }
    };
    void doResume();
  }, [recorder, isListening]);

  // When the recorder hook is first created it can change the iOS audio session.
  // Immediately restore playback mode so background music isn't killed.
  useEffect(() => {
    if (!isListening) {
      void restorePlaybackAudioMode();
    }
  }, [enabled, isListening, restorePlaybackAudioMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      log.debug('useBreathDetector unmounting -stopping recorder');
      try { recorder.stop(); } catch {}
      // Fire-and-forget restore so subsequent audio isn't broken
      setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => {});
    };
  }, [recorder]);

  return {
    isBreathActive,
    isListening,
    hasPermission,
    useFallback,
    currentLevel,
    startListening,
    stopListening,
    ensurePlaybackMode: restorePlaybackAudioMode,
    isInPlaybackMode,
    pauseForPlayback,
    resumeRecording,
  };
}
