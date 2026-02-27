/**
 * Mock for expo-audio
 * Provides mock audio player and recording functionality
 */

// Store listeners for testing
const listeners = new Map();

const createMockAudioPlayer = () => ({
  play: jest.fn(),
  pause: jest.fn(),
  release: jest.fn(),
  seekTo: jest.fn(),
  addListener: jest.fn((event, callback) => {
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }
    listeners.get(event).push(callback);
    return { remove: jest.fn() };
  }),
  volume: 1,
  playing: false,
  currentTime: 0,
  duration: 0,
  loop: false,
  muted: false,
  rate: 1,
});

const mockAudioPlayer = createMockAudioPlayer();

const mockRecording = {
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  record: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  uri: 'file://mock-recording.m4a',
  addListener: jest.fn((event, callback) => {
    return { remove: jest.fn() };
  }),
};

const useAudioPlayer = jest.fn((source, options) => {
  return {
    ...createMockAudioPlayer(),
    source,
    ...options,
  };
});

const useAudioRecorder = jest.fn((preset) => {
  return {
    ...mockRecording,
    preset,
  };
});

const createAudioPlayer = jest.fn((source, options) => {
  const player = createMockAudioPlayer();
  return player;
});

const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);

const AudioPlayer = jest.fn().mockImplementation((source, options) => ({
  ...createMockAudioPlayer(),
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

const AudioModule = {
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
};

module.exports = {
  useAudioPlayer,
  useAudioRecorder,
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  Recording,
  RecordingPresets,
  AudioModule,
  mockAudioPlayer,
  mockRecording,
  createMockAudioPlayer,
  listeners,
};

