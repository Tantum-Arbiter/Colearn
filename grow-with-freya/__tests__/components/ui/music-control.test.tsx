import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MusicControl } from '@/components/ui/music-control';

// Mock the global sound context
const mockToggleMute = jest.fn();
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

describe('MusicControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when music is loaded', () => {
    const { getByLabelText } = render(<MusicControl />);
    expect(getByLabelText('Mute background music')).toBeTruthy();
  });

  it('should show mute icon when music is muted', () => {
    mockUseGlobalSound.isMuted = true;
    const rendered = render(<MusicControl />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('should show volume icon when music is not muted', () => {
    mockUseGlobalSound.isMuted = false;
    const rendered = render(<MusicControl />);
    expect(rendered.toJSON()).toMatchSnapshot();
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
    expect(getByLabelText('Mute background music')).toBeTruthy();

    mockUseGlobalSound.isMuted = true;
    const { rerender, getByLabelText: getByLabelTextAfterRerender } = render(<MusicControl />);
    rerender(<MusicControl />);
    expect(getByLabelTextAfterRerender('Unmute background music')).toBeTruthy();
  });

  it('should accept custom props', () => {
    mockUseGlobalSound.isPlaying = false;
    const rendered = render(
      <MusicControl size={48} color="#FF0000" />
    );
    expect(rendered.toJSON()).toMatchSnapshot();
    // Note: Testing custom props is limited with current mock setup
    // The size and color props are passed to the mock but not easily testable
  });
});
