/**
 * The catalogue screen composes the §3 vertical order: floating controls,
 * filter row, featured card, cover grid and the journey navigation with
 * Library selected. These assert composition and wiring, not pixels.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StoryCatalogueScreen } from '@/components/stories/catalogue/story-catalogue-screen';

jest.mock('@/data/stories', () => ({
  ALL_STORIES: [
    {
      id: 'wombat',
      title: 'Snuggle Little Wombat',
      category: 'bedtime',
      isAvailable: true,
      coverImage: 'file://wombat.webp',
      tags: ['bedtime', 'calming'],
    },
    {
      id: 'bear',
      title: 'A Brave Little Bear',
      category: 'adventure',
      isAvailable: true,
      coverImage: 'file://bear.webp',
      tags: ['adventure'],
    },
    {
      id: 'whale',
      title: 'The Ocean Lullaby',
      category: 'bedtime',
      isAvailable: true,
      coverImage: 'file://whale.webp',
      tags: ['bedtime'],
    },
  ],
}));

const mockAppState = {
  requestReturnToMainMenu: jest.fn(),
  setShowLoginAfterOnboarding: jest.fn(),
  getEffectiveTier: () => 'free' as const,
  storyViewMode: 'carousel',
  setStoryViewMode: jest.fn(),
  favoriteStoryIds: [] as string[],
  toggleFavoriteStory: jest.fn(),
  userAvatarType: null,
};
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: any) => any) =>
    selector ? selector(mockAppState) : mockAppState,
}));

jest.mock('@/services/story-loader', () => ({
  StoryLoader: {
    getCachedStories: jest.fn(() => null),
    getStories: jest.fn().mockResolvedValue([]),
    invalidateCache: jest.fn(),
    isLocalStory: jest.fn(() => false),
  },
}));

const mockGetCatalog = jest.fn();
jest.mock('@/services/catalog-service', () => ({
  CatalogService: {
    getCatalog: (...args: any[]) => mockGetCatalog(...args),
    onCatalogUpdated: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@/services/story-access-service', () => ({
  StoryAccessService: {
    hasCompletedShareUnlock: jest.fn().mockResolvedValue(false),
    checkDownloadLimit: jest.fn().mockResolvedValue({ atLimit: false }),
    getDownloadLimit: jest.fn(() => 2),
    getEffectiveTier: jest.fn(() => 'free'),
    getSuggestedStoryToDelete: jest.fn().mockResolvedValue(null),
    completeShareUnlock: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/story-download-service', () => ({
  StoryDownloadService: {
    downloadStory: jest.fn().mockResolvedValue({ success: true }),
    cancelDownload: jest.fn(),
    deleteStory: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/services/api-client', () => ({
  ApiClient: { isAuthenticated: jest.fn().mockResolvedValue(true) },
}));

jest.mock('@/components/ui/subscription-overlay', () => ({
  SubscriptionOverlay: () => null,
}));

jest.mock('@/components/stories/story-preview-modal', () => ({
  StoryPreviewModal: () => null,
}));

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('StoryCatalogueScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
  });

  it('composes environment, controls, filters, featured card, grid and navigation', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => {
      expect(byTestId(tree, 'planet-header-artwork').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'circle-action-back').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'circle-action-audio').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'page-title').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'featured-story-card').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'story-cover-grid').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'child-bottom-navigation').length).toBeGreaterThan(0);
    });
  });

  it('titles the page through the stories translation key', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => {
      expect(byTestId(tree, 'page-title')[0].props.children).toBe('stories.title');
    });
  });

  it('features the first bedtime story and keeps it out of More Stories', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => {
      const featuredTitle = byTestId(tree, 'featured-story-title')[0];
      expect(featuredTitle.props.children).toBe('Snuggle Little Wombat');

      expect(byTestId(tree, 'story-cover-card-wombat')).toHaveLength(0);
      expect(byTestId(tree, 'story-cover-card-bear').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'story-cover-card-whale').length).toBeGreaterThan(0);
    });
  });

  it('heads the featured section with the genre key and the grid with More Stories', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => {
      const featuredHeading = byTestId(tree, 'featured-section-heading');
      expect(featuredHeading.length).toBeGreaterThan(0);

      const featuredLabel = featuredHeading[0].findAll((n: any) => typeof n.props.children === 'string')
        .map((n: any) => n.props.children)
        .join(' ');
      expect(featuredLabel).toContain('stories.genreStories');

      const moreHeading = byTestId(tree, 'more-section-heading')[0];
      const moreLabel = moreHeading.findAll((n: any) => typeof n.props.children === 'string')
        .map((n: any) => n.props.children)
        .join(' ');
      expect(moreLabel).toContain('catalogue.moreStories');
    });
  });

  it('marks Home as the selected journey area on entry', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => {
      const home = byTestId(tree, 'navigation-item-home')
        .find((n: any) => n.props.accessibilityRole === 'tab');
      expect(home.props.accessibilityState.selected).toBe(true);
    });
  });

  it('returns to the full catalogue home from the Home item instead of leaving the journey', async () => {
    const tree = render(<StoryCatalogueScreen initialMode="interactive" />);

    await waitFor(() => {
      expect(tree.UNSAFE_root.findAll((n: any) => n.props.children === 'catalogue.noResults').length)
        .toBeGreaterThan(0);
    });

    fireEvent.press(
      byTestId(tree, 'navigation-item-home').find((n: any) => n.props.accessibilityRole === 'tab')
    );

    await waitFor(() => {
      expect(byTestId(tree, 'featured-story-card').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'page-title')[0].props.children).toBe('stories.title');
    });
    expect(mockAppState.requestReturnToMainMenu).not.toHaveBeenCalled();
  });

  it('shows only on-device stories in the Library section', async () => {
    mockGetCatalog.mockResolvedValue([
      {
        storyId: 'remote-1',
        title: 'Kind Moments',
        category: 'friendship',
        isFree: true,
        isReferralReward: false,
        isPremium: false,
        thumbnailUrl: 'https://cdn/kind.jpg',
      },
    ]);
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-cover-card-remote-1').length).toBeGreaterThan(0));

    fireEvent.press(
      byTestId(tree, 'navigation-item-library').find((n: any) => n.props.accessibilityRole === 'tab')
    );

    await waitFor(() => {
      expect(byTestId(tree, 'story-cover-card-remote-1')).toHaveLength(0);
      expect(byTestId(tree, 'featured-story-card')).toHaveLength(0);
      expect(byTestId(tree, 'story-cover-card-wombat').length).toBeGreaterThan(0);
    });
  });

  it('exits the journey from the floating back control', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'circle-action-back').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'circle-action-back')[0]);

    expect(mockAppState.requestReturnToMainMenu).toHaveBeenCalledTimes(1);
  });

  it('routes the Progress navigation item to the parent corner', async () => {
    const onOpenParentCorner = jest.fn();
    const tree = render(<StoryCatalogueScreen onOpenParentCorner={onOpenParentCorner} />);

    await waitFor(() => expect(byTestId(tree, 'navigation-item-progress').length).toBeGreaterThan(0));

    fireEvent.press(
      byTestId(tree, 'navigation-item-progress').find((n: any) => n.props.accessibilityRole === 'tab')
    );

    expect(onOpenParentCorner).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state without a clear-filters button when a mode matches nothing', async () => {
    const tree = render(<StoryCatalogueScreen initialMode="interactive" />);

    await waitFor(() => {
      const message = tree.UNSAFE_root.findAll((n: any) => n.props.children === 'catalogue.noResults');
      expect(message.length).toBeGreaterThan(0);

      const clearButton = tree.UNSAFE_root.findAll((n: any) => n.props.children === 'catalogue.clearFilters');
      expect(clearButton).toHaveLength(0);

      expect(byTestId(tree, 'more-section-heading')).toHaveLength(0);
    });
  });

  it('shows the localised empty state when filters match nothing', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-filter-pill-music').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'story-filter-pill-music')[0]);

    await waitFor(() => {
      const texts = tree.UNSAFE_root.findAll((n: any) => n.props.children === 'catalogue.noResults');
      expect(texts.length).toBeGreaterThan(0);
    });
  });
});
