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
    {
      id: 'owl',
      title: 'Owl Spells It Out',
      category: 'learning',
      isAvailable: true,
      coverImage: 'file://owl.webp',
      tags: ['learning', 'animals'],
    },
  ],
}));

const mockAppState = {
  requestReturnToMainMenu: jest.fn(),
  setShowLoginAfterOnboarding: jest.fn(),
  getEffectiveTier: () => 'free' as const,
  favoriteStoryIds: [] as string[],
  toggleFavoriteStory: jest.fn(),
  userAvatarType: null,
  readStoryIds: [] as string[],
  storyProgress: {} as Record<string, { pageIndex: number; totalPages: number; updatedAt: string; completedCount: number }>,
  childAgeInMonths: 36,
};
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: any) => any) =>
    selector ? selector(mockAppState) : mockAppState,
}));

jest.mock('@/services/story-loader', () => ({
  StoryLoader: {
    getCachedStories: jest.fn(() => null),
    getStories: jest.fn(() => Promise.resolve(jest.requireMock('@/data/stories').ALL_STORIES)),
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

jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      getRecentUsage: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('@/components/ui/subscription-overlay', () => ({
  SubscriptionOverlay: () => null,
}));

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('StoryCatalogueScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
    mockAppState.readStoryIds = [];
    mockAppState.favoriteStoryIds = [];
    mockAppState.storyProgress = {};
  });

  it('carries no view toggle in the filter row', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    expect(byTestId(tree, 'story-view-toggle')).toHaveLength(0);
  });

  it('always shows the featured card on the catalogue home', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'featured-story-card').length).toBeGreaterThan(0));
  });

  it('composes environment, controls, filters, featured card, shelves and navigation', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => {
      expect(byTestId(tree, 'planet-header-artwork').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'circle-action-back').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'circle-action-audio').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'page-title').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'featured-story-card').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'story-shelves').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'child-bottom-navigation').length).toBeGreaterThan(0);
    });
  });

  it('sets the tagline beneath the title on the catalogue home, and nowhere else', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'page-tagline').length).toBeGreaterThan(0));
    const onPaths = tree.UNSAFE_root
      .findAll((n: any) => n.props.testID === 'svg-TextPath')
      .map((n: any) => n.props.children);
    expect(onPaths).toEqual(['catalogue.tagline.one', 'catalogue.tagline.two']);

    fireEvent.press(
      byTestId(tree, 'navigation-item-library').find((n: any) => n.props.accessibilityRole === 'tab')
    );

    await waitFor(() => expect(byTestId(tree, 'page-tagline')).toHaveLength(0));
  });

  it('titles the page through the stories translation key', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => {
      expect(byTestId(tree, 'page-title')[0].props.children).toBe('stories.title');
    });
  });

  it("should feature a book the child has, and offer a different one as the day's pick", async () => {
    // Which books they are changes each time the app opens, so the test pins
    // the rule rather than the names: the two big panels never show one book.
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => {
      expect(byTestId(tree, 'featured-story-card').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'todays-pick-card').length).toBeGreaterThan(0);
    });

    const titles = byTestId(tree, 'featured-story-title').map((n: any) => n.props.children).filter((c: any) => typeof c === 'string');
    const featuredTitle = byTestId(tree, 'featured-story-card')[0].props.accessibilityLabel;
    const pickTitle = byTestId(tree, 'todays-pick-card')[0].props.accessibilityLabel;

    expect(titles.length).toBeGreaterThan(0);
    expect(pickTitle).not.toBe(featuredTitle);
    expect(byTestId(tree, 'featured-story-card-label').some((n: any) => n.props.children === 'catalogue.featuredStory')).toBe(true);
    expect(byTestId(tree, 'todays-pick-card-label').some((n: any) => n.props.children === 'catalogue.todaysPick')).toBe(true);
    expect(byTestId(tree, 'featured-section-heading')).toHaveLength(0);
  });

  it('lays out a row for each theme with books, headed by its genre, with See all leading to that theme', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-row-bedtime').length).toBeGreaterThan(0));

    const bedtime = byTestId(tree, 'story-row-bedtime')[0];
    const heading = bedtime.findAll((n: any) => n.props.testID === 'story-row-bedtime-heading')[0];
    const label = heading.findAll((n: any) => typeof n.props.children === 'string').map((n: any) => n.props.children).join(' ');
    expect(label).toContain('stories.genreStories');
    expect(bedtime.findAll((n: any) => n.props.testID === 'story-cover-card-wombat').length).toBeGreaterThan(0);
    expect(bedtime.findAll((n: any) => n.props.testID === 'story-cover-card-bear')).toHaveLength(0);
    expect(byTestId(tree, 'story-row-adventure').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'story-row-family')).toHaveLength(0);

    fireEvent.press(
      bedtime.findAll((n: any) => n.props.testID === 'story-row-bedtime-heading-action' && n.props.accessibilityRole === 'button')[0]
    );

    await waitFor(() => expect(byTestId(tree, 'story-cover-grid').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'story-shelves')).toHaveLength(0);
    expect(byTestId(tree, 'featured-story-card')).toHaveLength(0);
    expect(byTestId(tree, 'story-cover-card-bear')).toHaveLength(0);
    // Every match is in the grid, the featured book included, so a theme with
    // one book never shows an empty grid under the featured panel
    expect(byTestId(tree, 'story-cover-card-wombat').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'story-cover-card-whale').length).toBeGreaterThan(0);
    const gridHeading = byTestId(tree, 'more-section-heading')[0];
    expect(gridHeading.findAll((n: any) => typeof n.props.children === 'string').map((n: any) => n.props.children).join(' ')).toContain('stories.genreStories');
    const pill = byTestId(tree, 'story-filter-pill-bedtime').find((n: any) => n.props.accessibilityRole === 'button');
    expect(pill?.props.accessibilityState).toEqual({ selected: true });
  });

  it('leads the shelves with Continue Reading when a book is underway, showing how far along it is', async () => {
    mockAppState.storyProgress = { bear: { pageIndex: 2, totalPages: 6, updatedAt: '2026-09-05T09:00:00Z', completedCount: 0 } };
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-row-continue').length).toBeGreaterThan(0));

    const row = byTestId(tree, 'story-row-continue')[0];
    expect(row.findAll((n: any) => n.props.testID === 'story-cover-card-bear').length).toBeGreaterThan(0);
    expect(row.findAll((n: any) => n.props.testID === 'story-cover-progress').length).toBeGreaterThan(0);
    expect(row.findAll((n: any) => n.props.testID === 'story-cover-card-wombat')).toHaveLength(0);
    const order = byTestId(tree, 'story-shelves')[0]
      .findAll((n: any) => typeof n.props.testID === 'string' && (n.props.testID.startsWith('story-row-') || n.props.testID === 'todays-pick-card'))
      .map((n: any) => n.props.testID)
      .filter((id: string) => !id.includes('-heading') && !id.includes('-shelf'));
    expect(order[0]).toBe('story-row-continue');
  });

  it('leads Continue Reading to every book underway, and back home from the theme tiles', async () => {
    mockAppState.storyProgress = {
      bear: { pageIndex: 2, totalPages: 6, updatedAt: '2026-09-05T09:00:00Z', completedCount: 0 },
      whale: { pageIndex: 3, totalPages: 8, updatedAt: '2026-09-04T09:00:00Z', completedCount: 0 },
    };
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-row-continue').length).toBeGreaterThan(0));

    fireEvent.press(
      byTestId(tree, 'story-row-continue-heading-action').find((n: any) => n.props.accessibilityRole === 'button')
    );

    await waitFor(() => expect(byTestId(tree, 'story-cover-grid').length).toBeGreaterThan(0));
    const heading = byTestId(tree, 'more-section-heading')[0];
    expect(heading.findAll((n: any) => typeof n.props.children === 'string').map((n: any) => n.props.children).join(' '))
      .toContain('catalogue.continueReading');
    // Only what is underway, and never the shelves or the featured panel beside it
    expect(byTestId(tree, 'story-cover-card-bear').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'story-cover-card-whale').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'story-cover-card-wombat')).toHaveLength(0);
    expect(byTestId(tree, 'featured-story-card')).toHaveLength(0);

    fireEvent.press(byTestId(tree, 'story-theme-tile-stories')[0]);

    await waitFor(() => expect(byTestId(tree, 'story-shelves').length).toBeGreaterThan(0));
  });

  it('hides Continue Reading when nothing is underway', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-shelves').length).toBeGreaterThan(0));

    expect(byTestId(tree, 'story-row-continue')).toHaveLength(0);
  });

  it('sorts the shelf under the chosen tile: Stories first, Learning on its tile', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-row-bedtime').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'story-cover-card-owl')).toHaveLength(0);

    fireEvent.press(byTestId(tree, 'story-theme-tile-learning')[0]);

    await waitFor(() => expect(byTestId(tree, 'story-cover-card-owl').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'story-cover-card-wombat')).toHaveLength(0);
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
    await waitFor(() => expect(byTestId(tree, 'library-section-onThisDevice').length).toBeGreaterThan(0));
    await waitFor(() => expect(byTestId(tree, 'section-crossfade-leaving')).toHaveLength(0), { timeout: 4000 });

    expect(byTestId(tree, 'story-cover-card-remote-1')).toHaveLength(0);
    expect(byTestId(tree, 'featured-story-card')).toHaveLength(0);
    expect(byTestId(tree, 'story-cover-card-wombat').length).toBeGreaterThan(0);
  });

  async function openLibrary() {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'navigation-item-library').length).toBeGreaterThan(0));
    fireEvent.press(
      byTestId(tree, 'navigation-item-library').find((n: any) => n.props.accessibilityRole === 'tab')
    );
    await waitFor(() => expect(byTestId(tree, 'library-section-onThisDevice').length).toBeGreaterThan(0));
    return tree;
  }

  it('gives the Library the sections a phone media library expects, hiding empty ones', async () => {
    mockAppState.readStoryIds = ['bear'];
    mockAppState.favoriteStoryIds = ['whale'];

    const tree = await openLibrary();

    ['recentlyRead', 'favourites', 'newToYou', 'onThisDevice'].forEach((section) => {
      expect(byTestId(tree, `library-section-${section}`).length).toBeGreaterThan(0);
      const heading = byTestId(tree, `library-heading-${section}`)[0];
      const label = heading.findAll((n: any) => typeof n.props.children === 'string').map((n: any) => n.props.children).join(' ');
      expect(label).toContain(`catalogue.library.${section}`);
    });

    const recent = byTestId(tree, 'library-section-recentlyRead')[0];
    expect(recent.findAll((n: any) => n.props.testID === 'story-cover-card-bear').length).toBeGreaterThan(0);
    expect(recent.findAll((n: any) => n.props.testID === 'story-cover-card-wombat')).toHaveLength(0);

    const newToYou = byTestId(tree, 'library-section-newToYou')[0];
    expect(newToYou.findAll((n: any) => n.props.testID === 'story-cover-card-bear')).toHaveLength(0);
    expect(newToYou.findAll((n: any) => n.props.testID === 'story-cover-card-wombat').length).toBeGreaterThan(0);

    const favourites = byTestId(tree, 'library-section-favourites')[0];
    expect(favourites.findAll((n: any) => n.props.testID === 'story-cover-card-whale').length).toBeGreaterThan(0);
  });

  it('hides Recently read and Favourites in the Library when nothing has been read or favourited', async () => {
    const tree = await openLibrary();

    expect(byTestId(tree, 'library-section-recentlyRead')).toHaveLength(0);
    expect(byTestId(tree, 'library-section-favourites')).toHaveLength(0);
    expect(byTestId(tree, 'library-section-newToYou').length).toBeGreaterThan(0);
  });

  it('exits the journey from the floating back control', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'circle-action-back').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'circle-action-back')[0]);

    expect(mockAppState.requestReturnToMainMenu).toHaveBeenCalledTimes(1);
  });

  it('opens the Progress journey page from the Progress item and returns home from its back control', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'navigation-item-progress').length).toBeGreaterThan(0));

    fireEvent.press(
      byTestId(tree, 'navigation-item-progress').find((n: any) => n.props.accessibilityRole === 'tab')
    );

    await waitFor(() => expect(byTestId(tree, 'progress-title').length).toBeGreaterThan(0));
    await waitFor(() => expect(byTestId(tree, 'section-crossfade-leaving')).toHaveLength(0), { timeout: 4000 });
    expect(byTestId(tree, 'child-bottom-navigation').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'featured-story-card')).toHaveLength(0);

    fireEvent.press(byTestId(tree, 'circle-action-back')[0]);

    await waitFor(() => {
      expect(byTestId(tree, 'featured-story-card').length).toBeGreaterThan(0);
    }, { timeout: 4000 });
    expect(mockAppState.requestReturnToMainMenu).not.toHaveBeenCalled();
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

    await waitFor(() => expect(byTestId(tree, 'story-theme-tile-music').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'story-theme-tile-music')[0]);

    await waitFor(() => {
      const texts = tree.UNSAFE_root.findAll((n: any) => n.props.children === 'catalogue.noResults');
      expect(texts.length).toBeGreaterThan(0);
    });
  });
});
