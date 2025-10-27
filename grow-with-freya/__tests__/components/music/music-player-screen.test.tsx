import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MusicPlayerScreen } from '@/components/music/music-player-screen';
import { MusicTrack, MusicPlaylist } from '@/types/music';

// Mock the music player hook
const mockUseMusicPlayer = {
  currentTrack: null as MusicTrack | null,
  currentPlaylist: null as MusicPlaylist | null,
  playbackState: 'stopped' as 'playing' | 'paused' | 'stopped' | 'loading' | 'error',
  currentTime: 0,
  duration: 180,
  volume: 0.7,
  isMuted: false,
  repeatMode: 'none' as 'none' | 'one' | 'all',
  isShuffled: false,
  error: null as string | null,
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  seekTo: jest.fn(),
  setVolume: jest.fn(),
  toggleMute: jest.fn(),
  setRepeatMode: jest.fn(),
  toggleShuffle: jest.fn(),
  togglePlayPause: jest.fn(),
  clearTrack: jest.fn(),
};

jest.mock('@/hooks/use-music-player', () => ({
  useMusicPlayer: () => mockUseMusicPlayer,
}));

// Mock the data
jest.mock('@/data/music', () => ({
  getCategoryInfo: jest.fn(() => ({
    id: 'bedtime',
    title: 'Bedtime Music',
    emoji: '🌙',
    color: '#96CEB4',
    gradient: ['#96CEB4', '#FFECD2'],
  })),
}));

// Mock visual effects
jest.mock('@/components/main-menu/constants', () => ({
  VISUAL_EFFECTS: {
    STAR_COUNT: 15,
    STAR_SIZE: 3,
    STAR_BORDER_RADIUS: 1.5,
    GRADIENT_COLORS: ['#1E3A8A', '#3B82F6', '#4ECDC4'],
  },
}));

jest.mock('@/components/main-menu/utils', () => ({
  generateStarPositions: jest.fn(() => [
    { id: 0, left: 10, top: 20, opacity: 0.5 },
  ]),
}));

// react-native-reanimated is mocked in jest.setup.js

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => children,
}));

// Mock slider
jest.mock('@react-native-community/slider', () => 'Slider');

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

const mockTrack: MusicTrack = {
  id: 'test-track',
  title: 'Test Track',
  artist: 'Test Artist',
  category: 'bedtime',
  duration: 180,
  audioSource: { uri: 'test://audio.mp3' },
  isAvailable: true,
};

const mockPlaylist: MusicPlaylist = {
  id: 'test-playlist',
  title: 'Test Playlist',
  category: 'bedtime',
  tracks: [mockTrack],
  isAvailable: true,
};

describe('MusicPlayerScreen', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no track is selected', () => {
    const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

    expect(getByText('No track selected')).toBeTruthy();
    expect(getByText('Choose a song to start playing')).toBeTruthy();
  });

  it('should render back button in empty state', () => {
    const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

    const backButton = getByText('← Back');
    expect(backButton).toBeTruthy();
  });

  it('should call onBack when back button is pressed in empty state', () => {
    const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

    const backButton = getByText('← Back');
    fireEvent.press(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  describe('With Track Loaded', () => {
    beforeEach(() => {
      mockUseMusicPlayer.currentTrack = mockTrack;
      mockUseMusicPlayer.currentPlaylist = mockPlaylist;
    });

    afterEach(() => {
      mockUseMusicPlayer.currentTrack = null;
      mockUseMusicPlayer.currentPlaylist = null;
    });

    it('should render player interface when track is loaded', () => {
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      // Header removed - check for track info instead
      expect(getByText('Test Track')).toBeTruthy();
      expect(getByText('Test Artist')).toBeTruthy();
      expect(getByText('from Test Playlist')).toBeTruthy();
    });

    it('should render control buttons', () => {
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(getByText('⏮️')).toBeTruthy(); // Previous
      expect(getByText('▶️')).toBeTruthy(); // Play (when stopped)
      expect(getByText('⏭️')).toBeTruthy(); // Next
      expect(getByText('⏹️')).toBeTruthy(); // Stop
    });

    it('should show pause button when playing', () => {
      mockUseMusicPlayer.playbackState = 'playing';
      
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(getByText('⏸️')).toBeTruthy(); // Pause
    });

    it('should render secondary controls', () => {
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(getByText('🔀')).toBeTruthy(); // Shuffle
      expect(getByText('↩️')).toBeTruthy(); // Repeat (none mode)
    });

    it('should show active shuffle state', () => {
      mockUseMusicPlayer.isShuffled = true;
      
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      const shuffleButton = getByText('🔀');
      expect(shuffleButton).toBeTruthy();
    });

    it('should show different repeat mode icons', () => {
      // Test repeat one
      mockUseMusicPlayer.repeatMode = 'one';
      const { getByText, rerender } = render(<MusicPlayerScreen onBack={mockOnBack} />);
      expect(getByText('🔂')).toBeTruthy();

      // Test repeat all
      mockUseMusicPlayer.repeatMode = 'all';
      rerender(<MusicPlayerScreen onBack={mockOnBack} />);
      expect(getByText('🔁')).toBeTruthy();
    });

    it('should call control functions when buttons are pressed', () => {
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      fireEvent.press(getByText('▶️'));
      expect(mockUseMusicPlayer.togglePlayPause).toHaveBeenCalled();

      fireEvent.press(getByText('⏮️'));
      expect(mockUseMusicPlayer.previous).toHaveBeenCalled();

      fireEvent.press(getByText('⏭️'));
      expect(mockUseMusicPlayer.next).toHaveBeenCalled();

      fireEvent.press(getByText('⏹️'));
      expect(mockUseMusicPlayer.stop).toHaveBeenCalled();
    });

    it('should call secondary control functions', () => {
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      fireEvent.press(getByText('🔀'));
      expect(mockUseMusicPlayer.toggleShuffle).toHaveBeenCalled();

      fireEvent.press(getByText('↩️'));
      expect(mockUseMusicPlayer.setRepeatMode).toHaveBeenCalledWith('one');
    });

    it('should cycle through repeat modes', () => {
      const { getByText, rerender } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      // Start with none, should go to one
      fireEvent.press(getByText('↩️'));
      expect(mockUseMusicPlayer.setRepeatMode).toHaveBeenCalledWith('one');

      // Simulate repeat mode change to one
      mockUseMusicPlayer.repeatMode = 'one';
      rerender(<MusicPlayerScreen onBack={mockOnBack} />);
      
      fireEvent.press(getByText('🔂'));
      expect(mockUseMusicPlayer.setRepeatMode).toHaveBeenCalledWith('all');
    });

    it('should render volume control button', () => {
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(getByText('🔊')).toBeTruthy(); // Volume button
    });

    it('should show muted volume icon when muted', () => {
      mockUseMusicPlayer.isMuted = true;
      
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(getByText('🔇')).toBeTruthy(); // Muted icon
    });

    it('should toggle volume control visibility', () => {
      const { getByText, queryByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      // Volume control should not be visible initially
      expect(queryByText('Volume')).toBeNull();

      // Press volume button to show controls
      fireEvent.press(getByText('🔊'));
      expect(getByText('Volume')).toBeTruthy();
    });

    it('should format time correctly', () => {
      mockUseMusicPlayer.currentTime = 90; // 1:30
      mockUseMusicPlayer.duration = 180; // 3:00
      
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(getByText('1:30')).toBeTruthy();
      expect(getByText('3:00')).toBeTruthy();
    });

    it('should display playback state', () => {
      mockUseMusicPlayer.playbackState = 'loading';
      
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(getByText('Loading...')).toBeTruthy();
    });

    it('should render album art with category emoji', () => {
      const { getByText } = render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(getByText('🌙')).toBeTruthy(); // Bedtime category emoji
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseMusicPlayer.currentTrack = mockTrack;
    });

    afterEach(() => {
      mockUseMusicPlayer.currentTrack = null;
      mockUseMusicPlayer.error = null;
    });

    it('should show error alert when error occurs', () => {
      const { Alert } = require('react-native');
      mockUseMusicPlayer.error = 'Test error message';
      
      render(<MusicPlayerScreen onBack={mockOnBack} />);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Music Player Error',
        'Test error message',
        [{ text: 'OK' }]
      );
    });
  });
});
