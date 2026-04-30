jest.mock('@/utils/logger', () => ({
  Logger: { create: () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() }) },
}));

jest.mock('expo-audio', () => {
  const mockRecorder = { prepareToRecordAsync: jest.fn(() => Promise.resolve()), record: jest.fn(), stop: jest.fn() };
  const mockSetAudioModeAsync = jest.fn(() => Promise.resolve());

  return {
    setAudioModeAsync: mockSetAudioModeAsync,
    useAudioRecorder: jest.fn(() => mockRecorder),
    useAudioRecorderState: jest.fn(() => ({ isRecording: false, metering: -160 })),
    RecordingPresets: { HIGH_QUALITY: {} },
    __mockRecorder: mockRecorder,
    __mockSetAudioModeAsync: mockSetAudioModeAsync,
  };
});

jest.mock('@/hooks/use-mic-permission', () => ({
  useMicPermission: () => ({
    isUndetermined: false,
    isGranted: true,
    isDenied: false,
    requestPermission: jest.fn(() => Promise.resolve('granted')),
  }),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useBreathDetector } from '@/hooks/use-breath-detector';

const { __mockRecorder: mockRecorder, __mockSetAudioModeAsync: mockSetAudioModeAsync } = jest.requireMock('expo-audio');

describe('useBreathDetector audio mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps speaker routing when starting mic listening', async () => {
    const { result } = renderHook(() => useBreathDetector());

    await act(async () => {
      await result.current.startListening();
    });

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    }));
    expect(mockRecorder.record).toHaveBeenCalledTimes(1);
  });

  it('restores playback mode for speaker output on stop', async () => {
    const { result } = renderHook(() => useBreathDetector());

    await act(async () => {
      await result.current.stopListening();
    });

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({
      allowsRecording: false,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    }));
    expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
  });
});