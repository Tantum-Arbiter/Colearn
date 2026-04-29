import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MusicControl } from '@/components/ui/music-control';

// Mock the global sound context
const mockToggleMute = jest.fn();
const mockSetMasterVolume = jest.fn();
const mockSetMusicVolume = jest.fn();
const mockSetVoiceOverVolume = jest.fn();
const mockUseGlobalSound = {
  isMuted: false,
  volume: 0.18,
  isPlaying: false,
  isLoaded: true,
  toggleMute: mockToggleMute,
  setVolume: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  // New volume controls
  masterVolume: 1.0,
  musicVolume: 1.0,
  voiceOverVolume: 1.0,
  setMasterVolume: mockSetMasterVolume,
  setMusicVolume: mockSetMusicVolume,
  setVoiceOverVolume: mockSetVoiceOverVolume,
  getEffectiveVolume: jest.fn((type: string) => 1.0),
};

jest.mock('@/contexts/global-sound-context', () => ({
  useGlobalSound: () => mockUseGlobalSound,
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => {

    const { Text } = require('react-native');
    return <Text {...props}>{name}</Text>;
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Mock @react-native-community/slider
jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return (props: any) => <View testID="slider" {...props} />;
});

describe('MusicControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when music is loaded', () => {
    const { getByLabelText } = render(<MusicControl />);
    expect(getByLabelText(/Mute background music/i)).toBeTruthy();
  });

  it('should show mute icon when music is muted', () => {
    mockUseGlobalSound.isMuted = true;
    const { getByTestId, getByLabelText } = render(<MusicControl />);
    expect(getByTestId('music-icon-muted')).toBeTruthy();
    expect(getByLabelText(/Unmute background music/i)).toBeTruthy();
  });

  it('should show volume icon when music is not muted', () => {
    mockUseGlobalSound.isMuted = false;
    const { getByTestId, getByLabelText } = render(<MusicControl />);
    expect(getByTestId('music-icon-playing')).toBeTruthy();
    expect(getByLabelText(/Mute background music/i)).toBeTruthy();
  });

  it('should call toggleMute when pressed', () => {
    const { getByLabelText } = render(<MusicControl />);
    const button = getByLabelText(/background music/i);
    fireEvent.press(button);
    expect(mockToggleMute).toHaveBeenCalledTimes(1);
  });

  it('should have correct accessibility labels', () => {
    mockUseGlobalSound.isMuted = false;
    const { getByLabelText } = render(<MusicControl />);
    expect(getByLabelText(/Mute background music/i)).toBeTruthy();

    mockUseGlobalSound.isMuted = true;
    const { getByLabelText: getByLabelTextMuted } = render(<MusicControl />);
    expect(getByLabelTextMuted(/Unmute background music/i)).toBeTruthy();
  });

  it('should accept custom props', () => {
    mockUseGlobalSound.isPlaying = false;
    const { getByTestId } = render(
      <MusicControl size={48} color="#FF0000" />
    );
    expect(getByTestId('music-control-button')).toBeTruthy();
  });
});
