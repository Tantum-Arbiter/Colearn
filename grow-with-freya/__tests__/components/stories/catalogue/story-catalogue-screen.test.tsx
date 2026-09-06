/**
 * The catalogue screen composes the §3 vertical order: floating controls,
 * filter row, featured card, cover grid and the journey navigation with
 * Library selected. These assert composition and wiring, not pixels.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StoryAccessService } from '@/services/story-access-service';
import { StoryDownloadService } from '@/services/story-download-service';
import { CHILD_UI_MOTION } from '@/constants/child-ui-motion';
import { glanceCloseTimeline } from '@/constants/screen-time-glance-timeline';
import { StoryCatalogueScreen } from '@/components/stories/catalogue/story-catalogue-screen';
import { useStoryTransition } from '@/contexts/story-transition-context';

const mockStartTransition = jest.fn();

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
  favoriteActivityIds: [] as string[],
  favoriteSongIds: [] as string[],
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

// the catalogue sits inside both providers in the app; the screen under test
// here is rendered bare, so what it reads from them is stubbed
const mockStartActivityTransition = jest.fn();
jest.mock('@/contexts/ActivityTransitionContext', () => ({
  useActivityTransition: () => ({ startTransition: mockStartActivityTransition }),
}));

// the catalogue sits inside the ScreenTimeProvider in the app; the screen
// under test here is rendered bare, so the allowance it reads is stubbed
jest.mock('@/hooks/use-screen-time-allowance', () => ({
  useScreenTimeAllowance: () => ({ usageSeconds: 0, limitSeconds: 3600 }),
}));

const glanceProps: any[] = [];
jest.mock('@/components/home/screen-time-glance', () => ({
  ScreenTimeGlance: (props: any) => {
    glanceProps.push(props);
    return null;
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
    mockAppState.favoriteActivityIds = [];
    mockAppState.favoriteSongIds = [];
    mockAppState.storyProgress = {};
    (useStoryTransition as jest.Mock).mockReturnValue({
      isTransitioning: false,
      selectedStoryId: null,
      shouldShowStoryReader: false,
      isExpandingToReader: false,
      startTransition: mockStartTransition,
    });
  });

  function shelfCarriedBy(testID: string, tree: ReturnType<typeof render>) {
    const card = byTestId(tree, testID).find((n: any) => n.props.accessibilityRole === 'button');
    fireEvent.press(card);
    const call = mockStartTransition.mock.calls[mockStartTransition.mock.calls.length - 1];
    return (call?.[3] ?? []).map((story: any) => story.id);
  }

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

  /**
   * Every browsing area is headed the same way -- title, then its own line on
   * two shallow arches. Only story mode goes without: there the title is
   * already the mode the child chose.
   */
  it('sets each section its own arched tagline beneath the title', async () => {
    const tree = render(<StoryCatalogueScreen />);

    function archedLines() {
      return tree.UNSAFE_root
        .findAll((n: any) => n.props.testID === 'svg-TextPath')
        .map((n: any) => n.props.children);
    }

    await waitFor(() => expect(byTestId(tree, 'page-tagline').length).toBeGreaterThan(0));
    expect(archedLines()).toEqual(['catalogue.tagline.one', 'catalogue.tagline.two']);

    fireEvent.press(
      byTestId(tree, 'navigation-item-library').find((n: any) => n.props.accessibilityRole === 'tab')
    );

    await waitFor(() => {
      expect(archedLines()).toEqual([
        'catalogue.library.tagline.one',
        'catalogue.library.tagline.two',
      ]);
    });
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

  it('carries the row a book was opened from, not the whole shelf', async () => {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-row-bedtime').length).toBeGreaterThan(0));
    const bedtime = byTestId(tree, 'story-row-bedtime')[0];

    const card = bedtime.findAll((n: any) => n.props.testID === 'story-cover-card-wombat' && n.props.accessibilityRole === 'button')[0];
    fireEvent.press(card);

    const call = mockStartTransition.mock.calls[mockStartTransition.mock.calls.length - 1];
    expect(call[3].map((story: any) => story.id).sort()).toEqual(['whale', 'wombat']);
  });

  it('carries every book on the shelf when one is opened from the grid', async () => {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-theme-tile-learning').length).toBeGreaterThan(0));
    fireEvent.press(byTestId(tree, 'story-theme-tile-learning')[0]);
    await waitFor(() => expect(byTestId(tree, 'story-cover-card-owl').length).toBeGreaterThan(0));

    const underTest = shelfCarriedBy('story-cover-card-owl', tree);

    expect(underTest).toEqual(['owl']);
  });

  it('carries only the books it can open when a row holds one that is not downloaded yet', async () => {
    mockGetCatalog.mockResolvedValue([
      {
        storyId: 'remote-1',
        title: 'Kind Moments',
        category: 'bedtime',
        isFree: true,
        isReferralReward: false,
        isPremium: false,
        thumbnailUrl: 'https://cdn/kind.jpg',
        tags: ['bedtime'],
      },
    ]);
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-row-bedtime').length).toBeGreaterThan(0));
    const bedtime = byTestId(tree, 'story-row-bedtime')[0];
    await waitFor(() => expect(bedtime.findAll((n: any) => n.props.testID === 'story-cover-card-remote-1').length).toBeGreaterThan(0));

    const card = bedtime.findAll((n: any) => n.props.testID === 'story-cover-card-wombat' && n.props.accessibilityRole === 'button')[0];
    fireEvent.press(card);

    const call = mockStartTransition.mock.calls[mockStartTransition.mock.calls.length - 1];
    expect(call[3].map((story: any) => story.id).sort()).toEqual(['whale', 'wombat']);
  });

  it('offers no Continue Reading row: a book left unfinished says so on its own card', async () => {
    mockAppState.storyProgress = {
      bear: { pageIndex: 2, totalPages: 6, updatedAt: '2026-09-05T09:00:00Z', completedCount: 0 },
    };
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

/**
 * The bar and the window are one movement, not two overlapping ones: the bar
 * draws into its own middle first, and only then does the window open out of
 * the space the ring leaves. Opening both at once was what made the nav sit
 * on top of the panel.
 */
describe('StoryCatalogueScreen screensafe choreography', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
    (useStoryTransition as jest.Mock).mockReturnValue({
      isTransitioning: false,
      selectedStoryId: null,
      shouldShowStoryReader: false,
      isExpandingToReader: false,
      startTransition: mockStartTransition,
    });
    glanceProps.length = 0;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function latestGlance() {
    return glanceProps[glanceProps.length - 1];
  }

  function pressScreensafe(tree: ReturnType<typeof render>) {
    const button = tree.UNSAFE_root.findAll(
      (node: any) => node.props.testID === 'navigation-item-screensafe',
    )[0];
    act(() => {
      button.props.onPress();
    });
  }

  it('keeps the window shut until the bar has gathered', () => {
    const tree = render(<StoryCatalogueScreen />);

    pressScreensafe(tree);

    expect(latestGlance().visible).toBe(false);
  });

  it('opens the window once the bar has gathered', () => {
    const tree = render(<StoryCatalogueScreen />);

    pressScreensafe(tree);
    act(() => {
      jest.advanceTimersByTime(CHILD_UI_MOTION.navCollapse.duration);
    });

    expect(latestGlance().visible).toBe(true);
  });

  /**
   * Where that point actually falls is the nav bar's own arithmetic, covered
   * where it lives; what matters here is that the window is told to open from
   * the ring rather than from the middle of the screen.
   */
  it('opens the window out of the ring rather than from nowhere', () => {
    const tree = render(<StoryCatalogueScreen />);

    pressScreensafe(tree);
    const { origin } = latestGlance();

    expect(typeof origin.x).toBe('number');
    expect(typeof origin.y).toBe('number');
  });

  /**
   * The bar comes back out of the splash rather than after the whole close:
   * the splash lands a long way before the window has finished with itself.
   */
  it('holds the bar in until the splash lands, then brings it back', () => {
    const tree = render(<StoryCatalogueScreen />);
    pressScreensafe(tree);
    act(() => {
      jest.advanceTimersByTime(CHILD_UI_MOTION.navCollapse.duration);
    });

    act(() => {
      latestGlance().onCloseStart();
    });
    act(() => {
      jest.advanceTimersByTime(glanceCloseTimeline().splash.at - 1);
    });
    const beforeSplash = navIsCollapsed(tree);

    act(() => {
      jest.advanceTimersByTime(2);
    });

    expect(beforeSplash).toBe(true);
    expect(navIsCollapsed(tree)).toBe(false);
  });

  function navIsCollapsed(tree: ReturnType<typeof render>) {
    const bar = tree.UNSAFE_root.findAll(
      (node: any) => node.props.testID === 'child-bottom-navigation',
    )[0];
    return bar.props.pointerEvents === 'none';
  }
});

/**
 * The saved shelf holds what the child chose to keep, laid out under the
 * themes those books belong to -- the library's own grouping, but of their
 * shelf rather than the catalogue's.
 */
describe('StoryCatalogueScreen saved shelf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
    mockAppState.readStoryIds = [];
    mockAppState.favoriteStoryIds = [];
    mockAppState.favoriteActivityIds = [];
    mockAppState.storyProgress = {};
    (useStoryTransition as jest.Mock).mockReturnValue({
      isTransitioning: false,
      selectedStoryId: null,
      shouldShowStoryReader: false,
      isExpandingToReader: false,
      startTransition: mockStartTransition,
    });
  });

  function openSaved(tree: ReturnType<typeof render>) {
    fireEvent.press(
      byTestId(tree, 'navigation-item-saved').find((n: any) => n.props.accessibilityRole === 'tab'),
    );
  }

  it('invites the child to save something when nothing is saved', async () => {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-empty').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'saved-shelves')).toHaveLength(0);
  });

  it('shelves what has been saved, under its themes', async () => {
    mockAppState.favoriteStoryIds = ['wombat', 'bear'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-shelves').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'saved-empty')).toHaveLength(0);
  });

  /** Nothing unsaved leaks onto the shelf, however much of it the app holds. */
  it('shelves only what was saved', async () => {
    mockAppState.favoriteStoryIds = ['bear'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-shelves').length).toBeGreaterThan(0));
    const shelved = byTestId(tree, 'saved-shelves')[0]
      .findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('story-cover-card-'))
      .map((n: any) => n.props.testID);
    expect(shelved.every((id: string) => id.includes('bear'))).toBe(true);
  });

  it('heads the saved shelf with its own arched lines', async () => {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'page-tagline').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => {
      const lines = tree.UNSAFE_root
        .findAll((n: any) => n.props.testID === 'svg-TextPath')
        .map((n: any) => n.props.children);
      expect(lines).toEqual(['catalogue.saved.tagline.one', 'catalogue.saved.tagline.two']);
    });
  });
});

/**
 * Saved is one shelf, not one per kind of thing: a child who saved a book and
 * a counting game expects both waiting there.
 */
describe('StoryCatalogueScreen saved activities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
    mockAppState.readStoryIds = [];
    mockAppState.favoriteStoryIds = [];
    mockAppState.favoriteActivityIds = [];
    mockAppState.storyProgress = {};
    (useStoryTransition as jest.Mock).mockReturnValue({
      isTransitioning: false,
      selectedStoryId: null,
      shouldShowStoryReader: false,
      isExpandingToReader: false,
      startTransition: mockStartTransition,
    });
  });

  function openSaved(tree: ReturnType<typeof render>) {
    fireEvent.press(
      byTestId(tree, 'navigation-item-saved').find((n: any) => n.props.accessibilityRole === 'tab'),
    );
  }

  it('shelves saved activities alongside saved books', async () => {
    mockAppState.favoriteActivityIds = ['abc-animals'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-row-activities').length).toBeGreaterThan(0));
  });

  it('leaves the activities row out when none are saved', async () => {
    mockAppState.favoriteStoryIds = ['bear'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-shelves').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'saved-row-activities')).toHaveLength(0);
  });

  /** A saved activity with no saved book is still a shelf worth showing. */
  it('does not call the shelf empty when only activities are saved', async () => {
    mockAppState.favoriteActivityIds = ['abc-animals'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-shelves').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'saved-empty')).toHaveLength(0);
  });

  it('opens a saved activity through the shared transition', async () => {
    mockAppState.favoriteActivityIds = ['abc-animals'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));
    openSaved(tree);
    await waitFor(() => expect(byTestId(tree, 'saved-row-activities').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'saved-activity-card-abc-animals')[0]);

    expect(mockStartActivityTransition).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'abc-animals' }),
      expect.anything(),
    );
  });
});

/**
 * The last kind of thing a child can keep. A song has no cover, so its card
 * shows the opening of the melody instead -- the notes they play first.
 */
describe('StoryCatalogueScreen saved songs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
    mockAppState.readStoryIds = [];
    mockAppState.favoriteStoryIds = [];
    mockAppState.favoriteActivityIds = [];
    mockAppState.favoriteSongIds = [];
    mockAppState.storyProgress = {};
    (useStoryTransition as jest.Mock).mockReturnValue({
      isTransitioning: false,
      selectedStoryId: null,
      shouldShowStoryReader: false,
      isExpandingToReader: false,
      startTransition: mockStartTransition,
    });
  });

  function openSaved(tree: ReturnType<typeof render>) {
    fireEvent.press(
      byTestId(tree, 'navigation-item-saved').find((n: any) => n.props.accessibilityRole === 'tab'),
    );
  }

  it('shelves saved songs', async () => {
    mockAppState.favoriteSongIds = ['hot_cross_buns'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-row-songs').length).toBeGreaterThan(0));
  });

  it('leaves the songs row out when none are saved', async () => {
    mockAppState.favoriteStoryIds = ['bear'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-shelves').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'saved-row-songs')).toHaveLength(0);
  });

  it('does not call the shelf empty when only songs are saved', async () => {
    mockAppState.favoriteSongIds = ['hot_cross_buns'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => expect(byTestId(tree, 'saved-shelves').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'saved-empty')).toHaveLength(0);
  });

  it('sends a tapped song to the music journey', async () => {
    mockAppState.favoriteSongIds = ['hot_cross_buns'];
    const onNavigateToMusic = jest.fn();
    const tree = render(<StoryCatalogueScreen onNavigateToMusic={onNavigateToMusic} />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));
    openSaved(tree);
    await waitFor(() => expect(byTestId(tree, 'saved-row-songs').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'saved-song-card-hot_cross_buns')[0]);

    expect(onNavigateToMusic).toHaveBeenCalled();
  });
});

/**
 * A saved book the child has not downloaded still belongs on their shelf --
 * saving is a wish, not a transfer. The card is the catalogue's own, so it
 * carries the same download and download-limit behaviour there as anywhere.
 */
describe('StoryCatalogueScreen saved downloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
    mockAppState.readStoryIds = [];
    mockAppState.favoriteStoryIds = [];
    mockAppState.favoriteActivityIds = [];
    mockAppState.favoriteSongIds = [];
    mockAppState.storyProgress = {};
    (useStoryTransition as jest.Mock).mockReturnValue({
      isTransitioning: false,
      selectedStoryId: null,
      shouldShowStoryReader: false,
      isExpandingToReader: false,
      startTransition: mockStartTransition,
    });
  });

  function openSaved(tree: ReturnType<typeof render>) {
    fireEvent.press(
      byTestId(tree, 'navigation-item-saved').find((n: any) => n.props.accessibilityRole === 'tab'),
    );
  }

  const REMOTE = {
    storyId: 'remote-1',
    title: 'Kind Moments',
    category: 'bedtime',
    isFree: true,
    isReferralReward: false,
    isPremium: false,
    thumbnailUrl: 'https://cdn/kind.jpg',
    tags: ['bedtime'],
  };

  it('shelves a saved book that has not been downloaded', async () => {
    mockGetCatalog.mockResolvedValue([REMOTE]);
    mockAppState.favoriteStoryIds = ['remote-1'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() =>
      expect(byTestId(tree, 'story-cover-card-remote-1').length).toBeGreaterThan(0),
    );
  });

  it('shelves downloaded and undownloaded saves side by side', async () => {
    mockGetCatalog.mockResolvedValue([REMOTE]);
    mockAppState.favoriteStoryIds = ['remote-1', 'wombat'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => {
      expect(byTestId(tree, 'story-cover-card-remote-1').length).toBeGreaterThan(0);
      expect(byTestId(tree, 'story-cover-card-wombat').length).toBeGreaterThan(0);
    });
  });

  /**
   * Tapping an undownloaded save is a request to download it. With the plan's
   * shelf already full, that has to become the choice the parent actually has
   * -- make room, or buy more room -- rather than a silent no.
   */
  it('offers to make room when a saved book cannot be downloaded', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (StoryAccessService.checkDownloadLimit as jest.Mock).mockResolvedValue({ atLimit: true });
    (StoryAccessService.getSuggestedStoryToDelete as jest.Mock).mockResolvedValue({
      storyId: 'wombat',
      title: 'Snuggle Little Wombat',
      localizedTitle: { en: 'Snuggle Little Wombat' },
    });
    mockGetCatalog.mockResolvedValue([REMOTE]);
    mockAppState.favoriteStoryIds = ['remote-1'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));
    openSaved(tree);
    await waitFor(() => expect(byTestId(tree, 'story-cover-card-remote-1').length).toBeGreaterThan(0));

    fireEvent.press(
      byTestId(tree, 'story-cover-card-remote-1').find((n: any) => n.props.accessibilityRole === 'button'),
    );

    await waitFor(() => expect(alert).toHaveBeenCalled());
    const buttons = alert.mock.calls[0][2] as { text: string; style?: string }[];
    expect(buttons.some((button) => button.style === 'destructive')).toBe(true);
    alert.mockRestore();
  });

  it('downloads a saved book when there is room for it', async () => {
    (StoryAccessService.checkDownloadLimit as jest.Mock).mockResolvedValue({ atLimit: false });
    mockGetCatalog.mockResolvedValue([REMOTE]);
    mockAppState.favoriteStoryIds = ['remote-1'];
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));
    openSaved(tree);
    await waitFor(() => expect(byTestId(tree, 'story-cover-card-remote-1').length).toBeGreaterThan(0));

    fireEvent.press(
      byTestId(tree, 'story-cover-card-remote-1').find((n: any) => n.props.accessibilityRole === 'button'),
    );

    await waitFor(() => expect(StoryDownloadService.downloadStory).toHaveBeenCalled());
  });
});
