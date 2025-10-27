import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MusicScreen } from '@/components/music/music-screen';
import { MusicTrack, MusicPlaylist } from '@/types/music';

// Mock the music player hook
const mockUseMusicPlayer = {
  currentTrack: null as any, // Allow both null and MusicTrack
  loadTrack: jest.fn(),
  loadPlaylist: jest.fn(),
  clearTrack: jest.fn(),
};

jest.mock('@/hooks/use-music-player', () => ({
  useMusicPlayer: () => mockUseMusicPlayer,
}));

// Mock the data
const mockPlaylist: MusicPlaylist = {
  id: 'test-playlist',
  title: 'Test Playlist',
  category: 'bedtime',
  tracks: [],
  isAvailable: true,
};

jest.mock('@/data/music', () => ({
  getPlaylistByCategory: jest.fn(() => mockPlaylist),
}));

// Mock the child components
jest.mock('@/components/music/music-selection-screen', () => ({
  MusicSelectionScreen: ({ onTrackSelect, onPlaylistSelect, onBack }: any) => {
    const mockTrack: MusicTrack = {
      id: 'test-track',
      title: 'Test Track',
      artist: 'Test Artist',
      category: 'bedtime',
      duration: 180,
      audioSource: { uri: 'test://audio.mp3' },
      isAvailable: true,
    };

    return (
      <>
        <button data-testid="back-button" onClick={onBack}>Back</button>
        <button data-testid="track-button" onClick={() => onTrackSelect(mockTrack)}>
          Select Track
        </button>
        <button data-testid="playlist-button" onClick={() => onPlaylistSelect('bedtime')}>
          Select Playlist
        </button>
      </>
    );
  },
}));

jest.mock('@/components/music/music-player-screen', () => ({
  MusicPlayerScreen: ({ onBack }: any) => (
    <>
      <div>Music Player Screen</div>
      <button data-testid="player-back-button" onClick={onBack}>Back from Player</button>
    </>
  ),
}));

describe('MusicScreen', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusicPlayer.currentTrack = null;
  });

  it('should render music selection screen by default', () => {
    const { getByTestId } = render(<MusicScreen onBack={mockOnBack} />);

    expect(getByTestId('track-button')).toBeTruthy();
    expect(getByTestId('playlist-button')).toBeTruthy();
  });

  it('should call onBack when back button is pressed in selection screen', () => {
    const { getByTestId } = render(<MusicScreen onBack={mockOnBack} />);

    fireEvent.press(getByTestId('back-button'));

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should load track and navigate to player when track is selected', async () => {
    const { getByTestId, getByText } = render(<MusicScreen onBack={mockOnBack} />);

    fireEvent.press(getByTestId('track-button'));

    await waitFor(() => {
      expect(mockUseMusicPlayer.loadTrack).toHaveBeenCalledWith({
        id: 'test-track',
        title: 'Test Track',
        artist: 'Test Artist',
        category: 'bedtime',
        duration: 180,
        audioSource: { uri: 'test://audio.mp3' },
        isAvailable: true,
      });
    });

    expect(getByText('Music Player Screen')).toBeTruthy();
  });

  it('should load playlist and navigate to player when playlist is selected', async () => {
    const { getByTestId, getByText } = render(<MusicScreen onBack={mockOnBack} />);

    fireEvent.press(getByTestId('playlist-button'));

    await waitFor(() => {
      expect(mockUseMusicPlayer.loadPlaylist).toHaveBeenCalledWith(mockPlaylist, 0);
    });

    expect(getByText('Music Player Screen')).toBeTruthy();
  });

  it('should navigate back to selection screen from player when track is loaded', () => {
    mockUseMusicPlayer.currentTrack = {
      id: 'test-track',
      title: 'Test Track',
      artist: 'Test Artist',
      category: 'bedtime',
      duration: 180,
      audioSource: { uri: 'test://audio.mp3' },
      isAvailable: true,
    };

    const { getByTestId, getByText, rerender } = render(<MusicScreen onBack={mockOnBack} />);

    // Start in player view (since track is loaded)
    expect(getByText('Music Player Screen')).toBeTruthy();

    // Press back button in player
    fireEvent.press(getByTestId('player-back-button'));

    // Should go back to selection screen, not call main onBack
    rerender(<MusicScreen onBack={mockOnBack} />);
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  it('should call main onBack when no track is loaded and back is pressed from player', () => {
    const { getByTestId } = render(<MusicScreen onBack={mockOnBack} />);

    // Navigate to player first
    fireEvent.press(getByTestId('track-button'));

    // Simulate no current track
    mockUseMusicPlayer.currentTrack = null;

    // Press back button in player
    fireEvent.press(getByTestId('player-back-button'));

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('should handle track loading errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockUseMusicPlayer.loadTrack.mockRejectedValue(new Error('Load failed'));

    const { getByTestId } = render(<MusicScreen onBack={mockOnBack} />);

    fireEvent.press(getByTestId('track-button'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load track:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle playlist loading errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockUseMusicPlayer.loadPlaylist.mockRejectedValue(new Error('Load failed'));

    const { getByTestId } = render(<MusicScreen onBack={mockOnBack} />);

    fireEvent.press(getByTestId('playlist-button'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load playlist:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle missing playlist gracefully', async () => {
    const { getPlaylistByCategory } = require('@/data/music');
    getPlaylistByCategory.mockReturnValue(null);

    const { getByTestId } = render(<MusicScreen onBack={mockOnBack} />);

    fireEvent.press(getByTestId('playlist-button'));

    // Should not crash or call loadPlaylist
    expect(mockUseMusicPlayer.loadPlaylist).not.toHaveBeenCalled();
  });
});
