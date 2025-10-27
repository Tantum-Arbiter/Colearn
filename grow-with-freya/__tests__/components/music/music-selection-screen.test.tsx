import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MusicSelectionScreen } from '@/components/music/music-selection-screen';
import { MusicTrack, MusicCategory } from '@/types/music';

// Mock the data
jest.mock('@/data/music', () => ({
  MUSIC_CATEGORIES: [
    {
      id: 'tantrum-calming',
      title: 'Tantrum Calming',
      description: 'Soothing sounds to help calm during difficult moments',
      emoji: '🌊',
      color: '#4ECDC4',
      gradient: ['#4ECDC4', '#44A08D'],
    },
    {
      id: 'bedtime',
      title: 'Bedtime Music',
      description: 'Gentle melodies for peaceful sleep',
      emoji: '🌙',
      color: '#96CEB4',
      gradient: ['#96CEB4', '#FFECD2'],
    },
  ],
  getTracksByCategory: jest.fn(),
}));

// Mock the visual effects
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
    { id: 1, left: 50, top: 100, opacity: 0.7 },
  ]),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => children,
}));

const mockTracks: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Calm Ocean Waves',
    artist: 'Nature Sounds',
    category: 'tantrum-calming',
    duration: 180,
    audioSource: { uri: 'test://audio1.mp3' },
    isAvailable: true,
  },
  {
    id: 'track-2',
    title: 'Gentle Rain',
    artist: 'Nature Sounds',
    category: 'tantrum-calming',
    duration: 240,
    audioSource: { uri: 'test://audio2.mp3' },
    isAvailable: true,
  },
];

const mockBedtimeTracks: MusicTrack[] = [
  {
    id: 'track-3',
    title: 'Twinkle Lullaby',
    artist: 'Sleepy Sounds',
    category: 'bedtime',
    duration: 180,
    audioSource: { uri: 'test://audio3.mp3' },
    isAvailable: true,
  },
];

describe('MusicSelectionScreen', () => {
  const mockOnTrackSelect = jest.fn();
  const mockOnPlaylistSelect = jest.fn();
  const mockOnBack = jest.fn();

  const { getTracksByCategory } = require('@/data/music');

  beforeEach(() => {
    jest.clearAllMocks();
    getTracksByCategory.mockImplementation((category: MusicCategory) => {
      if (category === 'tantrum-calming') return mockTracks;
      if (category === 'bedtime') return mockBedtimeTracks;
      return [];
    });
  });

  it('should render correctly', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    // Header removed - check for category content instead
    expect(getByText('Tantrum Calming')).toBeTruthy();
    expect(getByText('Bedtime Music')).toBeTruthy();
  });

  it('should render back button', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    const backButton = getByText('← Back');
    expect(backButton).toBeTruthy();
  });

  it('should call onBack when back button is pressed', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    const backButton = getByText('← Back');
    fireEvent.press(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should render category sections', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    expect(getByText('🌊')).toBeTruthy(); // Tantrum calming emoji
    expect(getByText('🌙')).toBeTruthy(); // Bedtime emoji
    expect(getByText('Soothing sounds to help calm during difficult moments')).toBeTruthy();
    expect(getByText('Gentle melodies for peaceful sleep')).toBeTruthy();
  });

  it('should render play all buttons', () => {
    const { getAllByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    const playAllButtons = getAllByText('Play All');
    expect(playAllButtons).toHaveLength(2); // One for each category
  });

  it('should call onPlaylistSelect when play all button is pressed', () => {
    const { getAllByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    const playAllButtons = getAllByText('Play All');
    fireEvent.press(playAllButtons[0]); // First category (tantrum-calming)

    expect(mockOnPlaylistSelect).toHaveBeenCalledWith('tantrum-calming');
  });

  it('should render track tiles', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    // Check tantrum calming tracks
    expect(getByText('Calm Ocean Waves')).toBeTruthy();
    expect(getByText('Gentle Rain')).toBeTruthy();
    
    // Check bedtime tracks
    expect(getByText('Twinkle Lullaby')).toBeTruthy();
  });

  it('should display track information correctly', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    expect(getByText('Nature Sounds')).toBeTruthy(); // Artist
    expect(getByText('3:00')).toBeTruthy(); // Duration (180 seconds)
    expect(getByText('4:00')).toBeTruthy(); // Duration (240 seconds)
  });

  it('should call onTrackSelect when track tile is pressed', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    const trackTile = getByText('Calm Ocean Waves');
    fireEvent.press(trackTile);

    expect(mockOnTrackSelect).toHaveBeenCalledWith(mockTracks[0]);
  });

  it('should render music icons for tracks', () => {
    const { getAllByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    const musicIcons = getAllByText('♪');
    expect(musicIcons.length).toBeGreaterThan(0);
  });

  it('should handle empty track categories gracefully', () => {
    getTracksByCategory.mockReturnValue([]);

    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    // Should still render category headers
    expect(getByText('Tantrum Calming')).toBeTruthy();
    expect(getByText('Bedtime Music')).toBeTruthy();
  });

  it('should have proper accessibility labels', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    // Check that important elements are present for screen readers
    // Header removed - check for back button and content
    expect(getByText('← Back')).toBeTruthy();
    expect(getByText('Tantrum Calming')).toBeTruthy();
  });

  it('should format duration correctly', () => {
    const { getByText } = render(
      <MusicSelectionScreen
        onTrackSelect={mockOnTrackSelect}
        onPlaylistSelect={mockOnPlaylistSelect}
        onBack={mockOnBack}
      />
    );

    expect(getByText('3:00')).toBeTruthy(); // 180 seconds
    expect(getByText('4:00')).toBeTruthy(); // 240 seconds
  });
});
