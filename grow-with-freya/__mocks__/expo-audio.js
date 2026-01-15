/**
 * Mock for expo-audio
 * Provides mock audio player and recording functionality
 */

const mockAudioPlayer = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  seekTo: jest.fn().mockResolvedValue(undefined),
  setPlaybackRate: jest.fn().mockResolvedValue(undefined),
  volume: 1,
  isPlaying: false,
  currentStatus: 'idle',
  duration: 0,
  currentTime: 0,
  isLoaded: true,
  isMuted: false,
  loop: false,
  playbackRate: 1,
  shouldCorrectPitch: true,
};

const mockRecording = {
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  startAsync: jest.fn().mockResolvedValue(undefined),
  stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
  pauseAsync: jest.fn().mockResolvedValue(undefined),
  getStatusAsync: jest.fn().mockResolvedValue({
    isRecording: false,
    durationMillis: 0,
    canRecord: true,
    isDoneRecording: false,
  }),
  getURI: jest.fn().mockReturnValue('file://mock-recording.m4a'),
};

const useAudioPlayer = jest.fn((source, options) => {
  return {
    ...mockAudioPlayer,
    source,
    ...options,
  };
});

const useAudioRecorder = jest.fn((options) => {
  return {
    ...mockRecording,
    ...options,
  };
});

const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);

const AudioPlayer = jest.fn().mockImplementation((source, options) => ({
  ...mockAudioPlayer,
  source,
  ...options,
}));

const Recording = jest.fn().mockImplementation(() => ({
  ...mockRecording,
}));

const RecordingPresets = {
  HIGH_QUALITY: {
    isMeteringEnabled: true,
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: 'mpeg4aac',
      audioQuality: 'max',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
  },
};

module.exports = {
  useAudioPlayer,
  useAudioRecorder,
  setAudioModeAsync,
  AudioPlayer,
  Recording,
  RecordingPresets,
  mockAudioPlayer,
  mockRecording,
};

