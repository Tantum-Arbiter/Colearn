import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { StorySelectionScreen } from '../story-selection-screen';
import { ScreenTimeProvider } from '../../screen-time/screen-time-provider';

// Mock all dependencies to prevent import errors
jest.mock('@/data/stories', () => ({
  ALL_STORIES: [],
  getStoriesByGenre: jest.fn(() => []),
  getGenresWithStories: jest.fn(() => []),
  getRandomStory: jest.fn(() => null)
}));

const mockAppState = {
  requestReturnToMainMenu: jest.fn(),
  setShowLoginAfterOnboarding: jest.fn(),
  getEffectiveTier: () => 'free' as const,
  readStoryIds: [] as string[],
  favoriteStoryIds: [] as string[],
  toggleFavoriteStory: jest.fn(),
  userAvatarType: null,
};
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: any) => any) =>
    selector ? selector(mockAppState) : mockAppState,
}));

jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: () => ({
    startTransition: jest.fn(),
  }),
}));

jest.mock('@/components/main-menu/utils', () => ({
  generateStarPositions: jest.fn(() => []),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock CatalogService for the "More Stories" section
const mockGetCatalog = jest.fn();
jest.mock('@/services/catalog-service', () => ({
  CatalogService: {
    getCatalog: (...args: any[]) => mockGetCatalog(...args),
    updateCatalog: jest.fn().mockResolvedValue(undefined),
    removeEntry: jest.fn().mockResolvedValue(undefined),
    onCatalogUpdated: jest.fn(() => jest.fn()), // returns unsubscribe function
  },
}));

// Mock StoryDownloadService used by CatalogStoryCard
jest.mock('@/services/story-download-service', () => ({
  StoryDownloadService: {
    downloadStory: jest.fn().mockResolvedValue({ success: true, storyId: 'test', assetsDownloaded: 0, assetsFailed: 0, bytesDownloaded: 0, durationMs: 100 }),
    isDownloading: jest.fn(() => false),
    isDownloaded: jest.fn().mockResolvedValue(false),
  },
}));

describe('StorySelectionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
  });

  it('renders without crashing', () => {
    const result = render(
      <ScreenTimeProvider>
        <StorySelectionScreen />
      </ScreenTimeProvider>
    );
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('renders with onStorySelect prop', () => {
    const mockOnStorySelect = jest.fn();
    const result = render(
      <ScreenTimeProvider>
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      </ScreenTimeProvider>
    );
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('loads catalog entries on mount', async () => {
    mockGetCatalog.mockResolvedValue([
      { storyId: 'catalog-1', title: 'Catalog Story', category: 'adventure', emoji: '🌟', isFree: true, isReferralReward: false, isPremium: false },
    ]);

    const result = render(
      <ScreenTimeProvider>
        <StorySelectionScreen />
      </ScreenTimeProvider>
    );

    // Verify CatalogService.getCatalog() was called during mount
    await waitFor(() => {
      expect(mockGetCatalog).toHaveBeenCalled();
    });

    // Component should still render without crashing after catalog loads
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('handles empty catalog gracefully', async () => {
    mockGetCatalog.mockResolvedValue([]);

    const result = render(
      <ScreenTimeProvider>
        <StorySelectionScreen />
      </ScreenTimeProvider>
    );

    await waitFor(() => {
      expect(mockGetCatalog).toHaveBeenCalled();
    });

    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('handles catalog load failure gracefully', async () => {
    mockGetCatalog.mockRejectedValue(new Error('Network error'));

    const result = render(
      <ScreenTimeProvider>
        <StorySelectionScreen />
      </ScreenTimeProvider>
    );

    await waitFor(() => {
      expect(mockGetCatalog).toHaveBeenCalled();
    });

    // Component should not crash when catalog fails to load
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  // ── Story Mode Tests (mode is now pre-selected via initialMode prop) ──

  // Helper: find nodes whose text children contain the given string
  function findByText(root: any, text: string) {
    return root.findAll(
      (node: any) => typeof node.children?.[0] === 'string' && node.children[0] === text
    );
  }

  it('does not show mode picker cards (mode cards are now on main menu)', () => {
    const { UNSAFE_root } = render(
      <ScreenTimeProvider>
        <StorySelectionScreen />
      </ScreenTimeProvider>
    );

    // Mode description texts should NOT appear -mode picker was moved to main menu
    expect(findByText(UNSAFE_root, 'storyModes.interactiveDesc').length).toBe(0);
    expect(findByText(UNSAFE_root, 'storyModes.musicDesc').length).toBe(0);
    expect(findByText(UNSAFE_root, 'storyModes.jigsawDesc').length).toBe(0);
  });

  it('shows interactive sub-filters when initialMode is interactive', () => {
    const { UNSAFE_root } = render(
      <ScreenTimeProvider>
        <StorySelectionScreen initialMode="interactive" />
      </ScreenTimeProvider>
    );

    expect(findByText(UNSAFE_root, 'storyModes.filterTouch').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'storyModes.filterJigsaw').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'storyModes.filterLearning').length).toBeGreaterThan(0);
  });

  it('does not show interactive sub-filters when initialMode is music', () => {
    const { UNSAFE_root } = render(
      <ScreenTimeProvider>
        <StorySelectionScreen initialMode="music" />
      </ScreenTimeProvider>
    );

    expect(findByText(UNSAFE_root, 'storyModes.filterTouch').length).toBe(0);
    expect(findByText(UNSAFE_root, 'storyModes.filterJigsaw').length).toBe(0);
    expect(findByText(UNSAFE_root, 'storyModes.filterLearning').length).toBe(0);
  });

  it('calls requestReturnToMainMenu when back is pressed', () => {
    const { UNSAFE_root } = render(
      <ScreenTimeProvider>
        <StorySelectionScreen initialMode="jigsaw" />
      </ScreenTimeProvider>
    );

    // Find the back Pressable (first Pressable in the tree from PageHeader)
    const allPressables = UNSAFE_root.findAll(
      (node: any) => typeof node.props?.onPress === 'function'
    );
    if (allPressables.length > 0) {
      act(() => { allPressables[0].props.onPress(); });
    }

    // Back should go directly to main menu now
    expect(mockAppState.requestReturnToMainMenu).toHaveBeenCalled();
  });

  it('renders without crashing with each initialMode', () => {
    const modes = ['interactive', 'music', 'jigsaw'] as const;
    for (const mode of modes) {
      const { unmount } = render(
        <ScreenTimeProvider>
          <StorySelectionScreen initialMode={mode} />
        </ScreenTimeProvider>
      );

      // Should not crash
      expect(true).toBe(true);
      unmount();
    }
  });
});
