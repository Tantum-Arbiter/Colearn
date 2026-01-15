import { useCallback, useRef, useState, useEffect } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  AudioModule,
} from 'expo-audio';

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
 * This replaces the recording functionality from voice-recording-service
 * since expo-audio requires hook-based recording.
 */
export function useVoiceRecording(): UseVoiceRecordingReturn {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTime = useRef<number>(0);
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      return granted;
    } catch (error) {
      console.error('Failed to request audio permissions:', error);
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.warn('Microphone permission not granted');
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
  }, [audioRecorder, requestPermissions]);

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
  }, [audioRecorder, isRecording]);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    requestPermissions,
  };
}

