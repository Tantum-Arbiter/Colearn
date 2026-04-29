import { useCallback, useRef, useState, useEffect } from 'react';
import {
  useAudioRecorder,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { useMicPermission } from './use-mic-permission';

export interface RecordingResult {
  uri: string;
  duration: number;
}

export interface UseVoiceRecordingReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<RecordingResult | null>;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for voice recording using expo-audio.
 * Uses the useAudioRecorder hook which handles lifecycle management.
 *
 * Mic permission is managed via the shared useMicPermission hook,
 * so permission is only requested ONCE across the entire app session
 * (shared with useBreathDetector in music challenge mode).
 */
export function useVoiceRecording(): UseVoiceRecordingReturn {
  // Shared mic permission — same singleton as useBreathDetector
  const micPermission = useMicPermission();

  // Use the standard useAudioRecorder hook for proper lifecycle management
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTime = useRef<number>(0);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const result = await micPermission.requestPermission();
    return result === 'granted';
  }, [micPermission]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Use shared permission — only prompts if not yet resolved
      if (micPermission.isUndetermined) {
        const result = await micPermission.requestPermission();
        if (result !== 'granted') {
          console.warn('Microphone permission not granted');
          return false;
        }
      } else if (micPermission.isDenied) {
        console.warn('Microphone permission denied');
        return false;
      }

      // Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });

      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      recordingStartTime.current = Date.now();
      setRecordingDuration(0);

      // Update duration every second
      durationInterval.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime.current) / 1000));
      }, 1000);

      console.log('Recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }, [micPermission, audioRecorder]);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    if (!isRecording) {
      return null;
    }

    // Clear duration interval
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    const duration = Date.now() - recordingStartTime.current;
    setIsRecording(false);
    setRecordingDuration(0);

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      // Reset audio mode for playback
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });

      console.log('Recording stopped:', uri);
      return uri ? { uri, duration } : null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return null;
    }
  }, [isRecording, audioRecorder]);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    requestPermissions,
  };
}

