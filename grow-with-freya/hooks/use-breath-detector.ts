/**
 * useBreathDetector - Microphone-based breath/blow detection hook
 *
 * Uses the microphone to detect when the child is blowing into the device.
 * Monitors audio level (metering) against a configurable threshold.
 *
 * Uses the shared useMicPermission hook so mic permission is only requested
 * ONCE across the entire app — shared with useVoiceRecording (narration mode).
 *
 * Provides fallback mode when mic permission is denied or unavailable:
 * - useFallback = true → caller should show on-screen blow button instead
 *
 * Does NOT do pitch detection — only noise/breath level detection.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { Logger } from '@/utils/logger';
import { useMicPermission } from './use-mic-permission';

const log = Logger.create('BreathDetector');

// Threshold in dB — values above this indicate "blowing"
// Typical quiet room: -40 to -30 dB, breath/blow: -20 to -5 dB
const DEFAULT_BREATH_THRESHOLD_DB = -25;
const METERING_POLL_INTERVAL_MS = 100;

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

  // Update breath detection from metering values
  useEffect(() => {
    if (isListening && recorderState.isRecording && recorderState.metering !== undefined) {
      setCurrentLevel(recorderState.metering);
      setIsBreathActive(recorderState.metering > thresholdDb);
    }
  }, [isListening, recorderState.isRecording, recorderState.metering, thresholdDb]);

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
        log.warn('Microphone permission denied — using fallback blow button');
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
      // prepareToRecordAsync() is required on Android — MediaRecorder must be
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
    try {
      await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
    } catch {
      // best-effort
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      recorder.stop();
    } catch {
      // Ignore stop errors
    }
    await restorePlaybackAudioMode();
    setIsListening(false);
    setIsBreathActive(false);
    log.debug('Breath detector stopped');
  }, [recorder, restorePlaybackAudioMode]);

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
  };
}
