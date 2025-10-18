import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MusicControl } from '@/components/ui/music-control';

// Mock the background music hook
const mockToggle = jest.fn();
const mockUseBackgroundMusic = {
  isPlaying: false,
  isLoaded: true,
  volume: 0.3,
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  setVolume: jest.fn(),
  fadeIn: jest.fn(),
  fadeOut: jest.fn(),
  toggle: mockToggle,
};

jest.mock('@/hooks/use-background-music', () => ({
  useBackgroundMusic: () => mockUseBackgroundMusic,
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
    expect(getByLabelText('Play background music')).toBeTruthy();
  });

  it('should not render when music is not loaded', () => {
    mockUseBackgroundMusic.isLoaded = false;
    const { queryByLabelText } = render(<MusicControl />);
    expect(queryByLabelText('Play background music')).toBeNull();

    // Reset for other tests
    mockUseBackgroundMusic.isLoaded = true;
  });

  it('should show mute icon when music is not playing', () => {
    mockUseBackgroundMusic.isPlaying = false;
    const rendered = render(<MusicControl />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('should show volume icon when music is playing', () => {
    mockUseBackgroundMusic.isPlaying = true;
    const rendered = render(<MusicControl />);
    expect(rendered.toJSON()).toMatchSnapshot();

    // Reset for other tests
    mockUseBackgroundMusic.isPlaying = false;
  });

  it('should call toggle when pressed', () => {
    const { getByLabelText } = render(<MusicControl />);
    const button = getByLabelText(/background music/i);
    fireEvent.press(button);
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should have correct accessibility labels', () => {
    mockUseBackgroundMusic.isPlaying = false;
    const { getByLabelText } = render(<MusicControl />);
    expect(getByLabelText('Play background music')).toBeTruthy();

    mockUseBackgroundMusic.isPlaying = true;
    const { rerender, getByLabelText: getByLabelTextAfterRerender } = render(<MusicControl />);
    rerender(<MusicControl />);
    expect(getByLabelTextAfterRerender('Pause background music')).toBeTruthy();
  });

  it('should accept custom props', () => {
    mockUseBackgroundMusic.isPlaying = false;
    const rendered = render(
      <MusicControl size={48} color="#FF0000" />
    );
    expect(rendered.toJSON()).toMatchSnapshot();
    // Note: Testing custom props is limited with current mock setup
    // The size and color props are passed to the mock but not easily testable
  });
});
