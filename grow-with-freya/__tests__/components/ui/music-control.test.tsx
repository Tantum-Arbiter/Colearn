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
const mockSettings: { visible: boolean; onClose: () => void }[] = [];
jest.mock('@/components/ui/audio-settings-panel', () => ({
  AudioSettings: (props: { visible: boolean; onClose: () => void }) => {
    mockSettings.push(props);
    return null;
  },
}));

describe('MusicControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the painted audio settings on a long press', () => {
    const { getByLabelText } = render(<MusicControl />);

    fireEvent(getByLabelText(/Mute background music/i), 'longPress');

    expect(mockSettings[mockSettings.length - 1].visible).toBe(true);
  });

  it('puts the audio settings away when they close', () => {
    const { getByLabelText } = render(<MusicControl />);
    fireEvent(getByLabelText(/Mute background music/i), 'longPress');

    const { act } = require('@testing-library/react-native');
    act(() => { mockSettings[mockSettings.length - 1].onClose(); });

    expect(mockSettings[mockSettings.length - 1].visible).toBe(false);
  });

  it('leaves the audio settings to a page that draws its own', () => {
    mockSettings.length = 0;
    const onAudioModalChange = jest.fn();
    const { getByLabelText } = render(<MusicControl onAudioModalChange={onAudioModalChange} />);

    fireEvent(getByLabelText(/Mute background music/i), 'longPress');

    expect(onAudioModalChange).toHaveBeenCalledWith(true);
    expect(mockSettings).toHaveLength(0);
  });

  it('should render when music is loaded', () => {
    const { getByLabelText } = render(<MusicControl />);
    expect(getByLabelText(/Mute background music/i)).toBeTruthy();
  });

  it('should show mute icon when music is muted', () => {
    mockUseGlobalSound.isMuted = true;
    const { getByLabelText } = render(<MusicControl />);
    expect(getByLabelText(/Unmute background music/i)).toBeTruthy();
  });

  it('should show volume icon when music is not muted', () => {
    mockUseGlobalSound.isMuted = false;
    const { getByLabelText } = render(<MusicControl />);
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
    const { toJSON } = render(
      <MusicControl size={48} color="#FF0000" />
    );
    expect(toJSON()).toBeTruthy();
  });
  describe('the story reader`s coin', () => {
    const find = (root: any, testID: string) => root.findAll((node: any) => node.props.testID === testID);

    it.each([
      [false, 'music-icon-playing', 0],
      [true, 'music-icon-muted', 1],
    ])('muted %p shows the sound coin as %p, with %p slash', (muted, icon, slashes) => {
      mockUseGlobalSound.isMuted = muted;
      const { UNSAFE_root } = render(<MusicControl size={50} variant="coin" />);
      const holder = find(UNSAFE_root, icon)[0];

      expect(holder.findAll((node: any) => node.props.testID === 'reader-coin-sound')).toHaveLength(1);
      expect(find(UNSAFE_root, 'reader-coin-slash')).toHaveLength(slashes);
      const picture = holder.findAll((node: any) => node.props.source !== undefined && typeof node.type !== 'string')[0];
      const { StyleSheet } = require('react-native');
      const { COIN_DIM_OPACITY } = require('@/components/child-ui/reader-coin');
      expect(StyleSheet.flatten(picture.props.style).opacity ?? 1).toBe(muted ? COIN_DIM_OPACITY : 1);
      expect(UNSAFE_root.findAll((node: any) => node.props.name === 'volume-high' || node.props.name === 'volume-mute')).toHaveLength(0);
      mockUseGlobalSound.isMuted = false;
    });

    it('is the size of the reader`s other coins, with no disc behind it', () => {
      const { UNSAFE_root } = render(<MusicControl size={50} variant="coin" />);
      const { StyleSheet } = require('react-native');

      expect(StyleSheet.flatten(find(UNSAFE_root, 'reader-coin-sound')[0].props.style)).toEqual(expect.objectContaining({ width: 50, height: 50 }));
      expect(UNSAFE_root.findAll((node: any) => StyleSheet.flatten(node.props.style)?.borderWidth === 1)).toHaveLength(0);
    });

    it('still mutes on a press and keeps its spoken label', () => {
      const { getByLabelText } = render(<MusicControl size={50} variant="coin" />);

      fireEvent.press(getByLabelText(/Mute background music/i));

      expect(mockToggleMute).toHaveBeenCalledTimes(1);
    });
  });
});
