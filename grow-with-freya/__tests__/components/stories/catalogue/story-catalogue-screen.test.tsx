/**
 * The catalogue screen composes the §3 vertical order: floating controls,
 * filter row, featured card, cover grid and the journey navigation with
 * Search selected. These assert composition and wiring, not pixels.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StoryAccessService } from '@/services/story-access-service';
import { StoryDownloadService } from '@/services/story-download-service';
import { CHILD_UI_MOTION } from '@/constants/child-ui-motion';
import { glanceCloseTimeline } from '@/constants/screen-time-glance-timeline';
import { StoryCatalogueScreen } from '@/components/stories/catalogue/story-catalogue-screen';
import { PLANET_HEADER_ESTIMATE } from '@/components/child-ui/planet-cover';
import * as catalogueStoryModule from '@/components/stories/catalogue/catalogue-story';
import { COVER_GRID_GAP } from '@/components/child-ui/tokens';
import { coverColumns, coverWidthFor } from '@/constants/catalogue-columns';
import { StyleSheet } from 'react-native';
import { useStoryTransition } from '@/contexts/story-transition-context';

const mockStartTransition = jest.fn();
let mockIsTablet = false;

jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({
    textSizeScale: 1.0,
    scaledFontSize: (size: number) => size,
    scaledButtonSize: (size: number) => size,
    scaledPadding: (padding: number) => padding,
    isTablet: mockIsTablet,
    contentMaxWidth: mockIsTablet ? 700 : 375,
    fontSizes: { tiny: 12, small: 14, body: 16, subtitle: 18, title: 24, largeTitle: 34 },
    buttonSizes: { small: 36, medium: 44, large: 56 },
  }),
}));

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
  finishedStoryIds: [] as string[],
  challengeCounts: {},
  earnedAchievementIds: [] as string[],
  recentSearches: [] as string[],
  recordSearch: jest.fn(),
  clearRecentSearches: jest.fn(),
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

// The tours themselves are the owl guide's business; what this screen owes
// them is to run the right one for the section on show, with that section's
// controls to point at. The stub records exactly that.
const mockGuides: { id: string; active: boolean; targets: string[] }[] = [];
jest.mock('@/components/owl-guide', () => {
  const { View } = jest.requireActual('react-native');
  return {
    OwlGuide: ({ id, active, targets }: { id: string; active?: boolean; targets?: Record<string, unknown> }) => {
      mockGuides.push({ id, active: active !== false, targets: Object.keys(targets ?? {}) });
      return active !== false ? <View testID={`owl-guide-${id}`} /> : null;
    },
  };
});

jest.mock('@/components/account/edit-profile-screen', () => {
  const { View } = jest.requireActual('react-native');
  return { EditProfileContent: () => <View testID="edit-profile-content" /> };
});

// The gate is the real hook; only its face is stubbed. A touch-end types the
// challenge's own answer, a touch-start submits it -- two steps, because the
// hook judges the input on the render after it changes.
jest.mock('@/components/ui/parents-only-modal', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ParentsOnlyModal: ({
      visible,
      challenge,
      onInputChange,
      onSubmit,
    }: {
      visible: boolean;
      challenge: { type: string; answer?: number; word?: string };
      onInputChange: (value: string) => void;
      onSubmit: () => void;
    }) =>
      (visible ? (
        <View
          testID="parents-only-modal"
          onTouchEnd={() =>
            onInputChange(
              challenge.type === 'math'
                ? String(challenge.answer)
                : `parentsOnly.animals.${challenge.word} (defaultValue:${challenge.word})`,
            )
          }
          onTouchStart={onSubmit}
        />
      ) : null),
  };
});

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

function byTestId(tree: ReturnType<typeof render>, testID: string): any[] {
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
      expect(byTestId(tree, 'circle-action-home').length).toBeGreaterThan(0);
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

    // each line is drawn twice -- a halo beneath the words -- so read it once
    function archedLines() {
      return [...new Set(tree.UNSAFE_root
        .findAll((n: any) => n.props.testID === 'svg-TextPath')
        .map((n: any) => n.props.children))];
    }

    await waitFor(() => expect(byTestId(tree, 'page-tagline').length).toBeGreaterThan(0));
    expect(archedLines()).toEqual(['catalogue.tagline.one', 'catalogue.tagline.two']);

    fireEvent.press(
      byTestId(tree, 'navigation-item-search').find((n: any) => n.props.accessibilityRole === 'tab')
    );

    await waitFor(() => {
      expect(archedLines()).toEqual(['search.tagline.one', 'search.tagline.two']);
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

  it('sizes shelf books so two of them, and the gap between, span exactly the featured card', async () => {
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 402, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 874, configurable: true });
    window.dispatchEvent(new Event('resize'));
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-row-bedtime').length).toBeGreaterThan(0));

    const shelf = byTestId(tree, 'story-row-bedtime-shelf')[0];
    const bookWidths = shelf
      .findAll((n: any) => n.props.testID === undefined && typeof StyleSheet.flatten(n.props.style)?.width === 'number')
      .map((n: any) => StyleSheet.flatten(n.props.style).width as number);
    const featured = byTestId(tree, 'featured-story-card')[0];
    const featuredWidth = featured.props.width ?? StyleSheet.flatten(featured.props.style)?.width;

    expect(bookWidths.length).toBeGreaterThan(0);
    expect(new Set(bookWidths).size).toBe(1);
    expect(bookWidths[0] * 2 + COVER_GRID_GAP).toBe(featuredWidth);
    expect(bookWidths[0]).toBe(Math.floor((402 - 22 * 2 - COVER_GRID_GAP) / 2));
  });

  describe('on a tablet', () => {
    const viewport = (width: number, height: number) => {
      Object.defineProperty(document.documentElement, 'clientWidth', { value: width, configurable: true });
      Object.defineProperty(document.documentElement, 'clientHeight', { value: height, configurable: true });
      window.dispatchEvent(new Event('resize'));
    };
    const shelfBookWidth = async (tree: ReturnType<typeof render>) => {
      await waitFor(() => expect(byTestId(tree, 'story-row-bedtime').length).toBeGreaterThan(0));
      const shelf = byTestId(tree, 'story-row-bedtime-shelf')[0];
      const widths = shelf
        .findAll((n: any) => n.props.testID === undefined && typeof StyleSheet.flatten(n.props.style)?.width === 'number')
        .map((n: any) => StyleSheet.flatten(n.props.style).width as number);
      return widths[0];
    };

    beforeEach(() => {
      mockIsTablet = true;
    });

    afterEach(() => {
      mockIsTablet = false;
      viewport(0, 0);
    });

    it('fits four books across an 11-inch tablet held upright', async () => {
      viewport(834, 1194);
      const gridWidth = 834 - 32 * 2;

      const underTest = await shelfBookWidth(render(<StoryCatalogueScreen />));

      expect(underTest).toBe(coverWidthFor(gridWidth, 4));
    });

    it('runs the shelves the full width when the same tablet is turned sideways', async () => {
      viewport(1194, 834);
      const gridWidth = 1194 - 32 * 2;

      const underTest = await shelfBookWidth(render(<StoryCatalogueScreen />));

      expect(underTest).toBe(coverWidthFor(gridWidth, coverColumns(true, gridWidth)));
    });

    it('sets the featured book and Today\'s pick side by side above the shelves when turned sideways', async () => {
      viewport(1194, 834);
      const tree = render(<StoryCatalogueScreen />);
      await waitFor(() => expect(byTestId(tree, 'todays-pick-card').length).toBeGreaterThan(0));

      const topRow = byTestId(tree, 'catalogue-top-row')[0];
      const shelves = byTestId(tree, 'story-shelves')[0];
      const inTopRow = (testID: string) => topRow.findAll((n: any) => n.props.testID === testID).length;

      expect(inTopRow('featured-story-card')).toBeGreaterThan(0);
      expect(inTopRow('todays-pick-card')).toBeGreaterThan(0);
      expect(shelves.findAll((n: any) => n.props.testID === 'todays-pick-card')).toHaveLength(0);
    });
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

  it('opens straight on the section it was asked for, without drawing Stories first or fading from it', async () => {
    const buildShelves = jest.spyOn(catalogueStoryModule, 'buildShelves');
    const tree = render(<StoryCatalogueScreen sectionRequest={{ section: 'search', key: 1 }} />);

    expect(buildShelves).not.toHaveBeenCalled();
    buildShelves.mockRestore();

    expect(byTestId(tree, 'page-title')[0].props.children).toBe('childUi.nav.search');
    expect(byTestId(tree, 'featured-story-card')).toHaveLength(0);
    expect(byTestId(tree, 'section-crossfade-leaving')).toHaveLength(0);
  });

  it('hands Progress the badge it was sent to open, once the page has come to rest', async () => {
    const progressOf = (tree: ReturnType<typeof render>) =>
      tree.UNSAFE_root.findAll((n: any) => n.props.embedded === true && typeof n.props.onDetailVisibleChange === 'function')[0];
    const tree = render(<StoryCatalogueScreen isActive sectionRequest={{ section: 'progress', key: 3, badgeId: 'calm-champion' }} />);

    const atOnce = progressOf(tree).props.focusBadge;

    await waitFor(() => expect(progressOf(tree).props.focusBadge).toEqual({ id: 'calm-champion', key: 3 }), { timeout: 3000 });
    expect(atOnce).toBeUndefined();
  });

  it('takes up a badge sent with a later request, while it is already showing', async () => {
    const progressOf = (tree: ReturnType<typeof render>) =>
      tree.UNSAFE_root.findAll((n: any) => n.props.embedded === true && typeof n.props.onDetailVisibleChange === 'function')[0];
    const tree = render(<StoryCatalogueScreen isActive sectionRequest={{ section: 'progress', key: 3 }} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    tree.rerender(<StoryCatalogueScreen isActive sectionRequest={{ section: 'progress', key: 4, badgeId: 'calm-champion' }} />);

    await waitFor(() => expect(progressOf(tree).props.focusBadge).toEqual({ id: 'calm-champion', key: 4 }));
  });

  // A badge's suggestion, followed from its window on the home (operator, 2026-10-05), lands on
  // the shelf the way it does from Progress
  it.each([
    ['a theme of its own', 'music', 'story-theme-tile-music', null],
    ['a filter on the stories', 'bedtime', 'story-theme-tile-stories', 'story-filter-pill-bedtime'],
  ] as const)('takes up a badge suggestion sent with a request, as %s', async (_, tag, tile, pill) => {
    const selected = (tree: ReturnType<typeof render>, id: string) =>
      byTestId(tree, id).find((n: any) => n.props.accessibilityRole === 'button' || n.props.accessibilityState)?.props.accessibilityState?.selected;
    const tree = render(<StoryCatalogueScreen isActive sectionRequest={{ section: 'home', key: 1 }} />);
    await waitFor(() => expect(byTestId(tree, 'story-theme-tile-music').length).toBeGreaterThan(0));

    tree.rerender(<StoryCatalogueScreen isActive sectionRequest={{ section: 'home', key: 2, recommend: { tag } }} />);

    await waitFor(() => expect(selected(tree, tile)).toBe(true));
    if (pill) expect(selected(tree, pill)).toBe(true);
  });

  it('hands Progress no badge when it was only sent to the page', async () => {
    const tree = render(<StoryCatalogueScreen isActive sectionRequest={{ section: 'progress', key: 3 }} />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    const progress = tree.UNSAFE_root.findAll((n: any) => n.props.embedded === true && typeof n.props.onDetailVisibleChange === 'function')[0];

    expect(progress.props.focusBadge).toBeUndefined();
  });

  it('switches at once, with no crossfade, when it is sent to another section from outside', async () => {
    const tree = render(<StoryCatalogueScreen sectionRequest={{ section: 'home', key: 1 }} />);
    await waitFor(() => expect(byTestId(tree, 'featured-story-card').length).toBeGreaterThan(0));

    tree.rerender(<StoryCatalogueScreen sectionRequest={{ section: 'search', key: 2 }} />);

    await waitFor(() => expect(byTestId(tree, 'page-title')[0].props.children).toBe('childUi.nav.search'));
    expect(byTestId(tree, 'section-crossfade-leaving')).toHaveLength(0);
  });

  it('still crossfades when the child changes section from the bar', async () => {
    const tree = render(<StoryCatalogueScreen sectionRequest={{ section: 'home', key: 1 }} />);
    await waitFor(() => expect(byTestId(tree, 'navigation-item-search').length).toBeGreaterThan(0));

    fireEvent.press(byTestId(tree, 'navigation-item-search').find((n: any) => n.props.accessibilityRole === 'tab'));

    await waitFor(() => expect(byTestId(tree, 'section-crossfade-leaving').length).toBeGreaterThan(0));
  });

  it('leads with the book left part-way through, offered as Continue reading with the same Read Now button', async () => {
    mockAppState.storyProgress = {
      wombat: { pageIndex: 2, totalPages: 6, updatedAt: '2026-09-05T09:00:00Z', completedCount: 0 },
    };
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'featured-story-card').length).toBeGreaterThan(0));

    const card = byTestId(tree, 'featured-story-card')[0];
    expect(card.props.accessibilityLabel).toContain('Snuggle Little Wombat');
    expect(byTestId(tree, 'featured-story-card-label').some((n: any) => n.props.children === 'storyDetail.continueReading')).toBe(true);
    expect(byTestId(tree, 'featured-story-card-label').some((n: any) => n.props.children === 'catalogue.featuredStory')).toBe(false);
    expect(card.findAll((n: any) => n.props.accessibilityLabel === 'storyDetail.readNow').length).toBeGreaterThan(0);
    expect(card.findAll((n: any) => n.props.testID === 'featured-story-progress-track').length).toBeGreaterThan(0);
    expect(card.findAll((n: any) => n.props.children === 'home.pagePosition (page:3, total:6)').length).toBeGreaterThan(0);
  });

  it('keeps the day\'s pick a different book from the one being continued', async () => {
    mockAppState.storyProgress = {
      wombat: { pageIndex: 2, totalPages: 6, updatedAt: '2026-09-05T09:00:00Z', completedCount: 0 },
    };
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'todays-pick-card').length).toBeGreaterThan(0));

    const pick = byTestId(tree, 'todays-pick-card').find((n: any) => typeof n.props.accessibilityLabel === 'string');
    expect(pick?.props.accessibilityLabel).toBeDefined();
    expect(pick?.props.accessibilityLabel).not.toContain('Snuggle Little Wombat');
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

  async function openSearch() {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'navigation-item-search').length).toBeGreaterThan(0));
    fireEvent.press(
      byTestId(tree, 'navigation-item-search').find((n: any) => n.props.accessibilityRole === 'tab')
    );
    await waitFor(() => expect(byTestId(tree, 'search-panel').length).toBeGreaterThan(0));
    // the section leaving is still mounted while it fades, and it is the one
    // carrying the filter bar
    await waitFor(() => expect(byTestId(tree, 'section-crossfade-leaving')).toHaveLength(0), { timeout: 4000 });
    return tree;
  }

  it('opens the search page from the bar, titled as Search', async () => {
    const tree = await openSearch();

    expect(byTestId(tree, 'page-title')[0].props.children).toBe('childUi.nav.search');
  });

  // The page is the catalogue's, minus the one thing a search replaces: there
  // is nothing to filter when the child has said what they are looking for.
  it('carries no filter bar', async () => {
    const tree = await openSearch();

    expect(byTestId(tree, 'story-filter-bar')).toHaveLength(0);
  });

  it('searches what is installed and what the catalogue has sent alike', async () => {
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

    const tree = await openSearch();
    fireEvent.changeText(byTestId(tree, 'search-panel-input')[0], 'kind');

    await waitFor(() => {
      expect(byTestId(tree, 'story-cover-card-remote-1').length).toBeGreaterThan(0);
    });
  });

  it('says so when neither the device nor the catalogue has an answer', async () => {
    const tree = await openSearch();

    fireEvent.changeText(byTestId(tree, 'search-panel-input')[0], 'dinosaur');

    await waitFor(() => expect(byTestId(tree, 'search-panel-empty').length).toBeGreaterThan(0));
  });

  it('offers back what was searched before until something is typed', async () => {
    mockAppState.recentSearches = ['wombat'];

    const tree = await openSearch();

    expect(byTestId(tree, 'search-panel-recent').length).toBeGreaterThan(0);

    fireEvent.changeText(byTestId(tree, 'search-panel-input')[0], 'wombat');

    await waitFor(() => expect(byTestId(tree, 'search-panel-recent')).toHaveLength(0));
  });

  it('goes home from the floating home control, named for screen readers as the way back to the menu', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'circle-action-home').length).toBeGreaterThan(0));
    const home = byTestId(tree, 'circle-action-home')[0];

    fireEvent.press(home);

    expect(home.props.accessibilityLabel).toBe('common.home');
    expect(byTestId(tree, 'circle-action-back')).toHaveLength(0);
    expect(mockAppState.requestReturnToMainMenu).toHaveBeenCalledTimes(1);
  });

  it('opens the Progress journey page from the Progress item and returns home from its home control', async () => {
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'navigation-item-progress').length).toBeGreaterThan(0));

    fireEvent.press(
      byTestId(tree, 'navigation-item-progress').find((n: any) => n.props.accessibilityRole === 'tab')
    );

    await waitFor(() => expect(byTestId(tree, 'progress-title').length).toBeGreaterThan(0));
    await waitFor(() => expect(byTestId(tree, 'section-crossfade-leaving')).toHaveLength(0), { timeout: 4000 });
    expect(byTestId(tree, 'child-bottom-navigation').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'featured-story-card')).toHaveLength(0);

    fireEvent.press(byTestId(tree, 'circle-action-home')[0]);

    expect(mockAppState.requestReturnToMainMenu).toHaveBeenCalledTimes(1);
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
 * shelf rather than the catalogue's. It now heads the Profile page, which is
 * where a child goes looking for the things that are theirs.
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
      byTestId(tree, 'navigation-item-profile').find((n: any) => n.props.accessibilityRole === 'tab'),
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

  it('heads the profile page with its own arched lines', async () => {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'page-tagline').length).toBeGreaterThan(0));

    openSaved(tree);

    await waitFor(() => {
      const lines = tree.UNSAFE_root
        .findAll((n: any) => n.props.testID === 'svg-TextPath')
        .map((n: any) => n.props.children);
      expect([...new Set(lines)]).toEqual(['catalogue.profile.tagline.one', 'catalogue.profile.tagline.two']);
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
      byTestId(tree, 'navigation-item-profile').find((n: any) => n.props.accessibilityRole === 'tab'),
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
      byTestId(tree, 'navigation-item-profile').find((n: any) => n.props.accessibilityRole === 'tab'),
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
      byTestId(tree, 'navigation-item-profile').find((n: any) => n.props.accessibilityRole === 'tab'),
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

/**
 * The Profile page is the child's own corner: their face and name, the
 * favourites shelf they already knew, the books they keep on the device, and
 * the badges they have earned. Its top-right control is the way out to the
 * grown-ups' settings -- audio belongs to pages a child is browsing.
 */
describe('StoryCatalogueScreen profile page', () => {
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

  function openProfile(tree: ReturnType<typeof render>) {
    fireEvent.press(
      byTestId(tree, 'navigation-item-profile').find((n: any) => n.props.accessibilityRole === 'tab'),
    );
  }

  async function renderProfile(props: Record<string, unknown> = {}) {
    const tree = render(<StoryCatalogueScreen {...props} />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));
    openProfile(tree);
    await waitFor(() => expect(byTestId(tree, 'profile-view').length).toBeGreaterThan(0));
    return tree;
  }

  /**
   * The section the child is actually looking at. The page it came from is
   * still mounted for the length of the crossfade, and its controls are not
   * the ones under their finger.
   */
  function inCurrentSection(tree: ReturnType<typeof render>, testID: string) {
    return byTestId(tree, 'section-crossfade-current')[0]
      .findAll((n: any) => n.props.testID === testID);
  }

  function openTab(tree: ReturnType<typeof render>, id: 'saved' | 'badges' | 'manage') {
    fireEvent.press(
      inCurrentSection(tree, `profile-tab-${id}`).find((n: any) => n.props.accessibilityRole === 'button'),
    );
  }

  it('offers the three tabs into what is the child’s own', async () => {
    const tree = await renderProfile();

    expect(inCurrentSection(tree, 'profile-tab-saved').length).toBeGreaterThan(0);
    expect(inCurrentSection(tree, 'profile-tab-badges').length).toBeGreaterThan(0);
    expect(inCurrentSection(tree, 'profile-tab-manage').length).toBeGreaterThan(0);
  });

  it('swaps the sound control for the grown-ups control, gear and word together', async () => {
    const tree = await renderProfile();

    const control = inCurrentSection(tree, 'circle-action-settings').find((n: any) => n.props.accessibilityRole === 'button');

    expect(control.props.accessibilityLabel).toBe('home.grownUps');
    expect(control.findAll((n: any) => n.props.children === 'home.grownUps').length).toBeGreaterThan(0);
    expect(inCurrentSection(tree, 'circle-action-audio')).toHaveLength(0);
  });

  it('labels the home control Home', async () => {
    const tree = await renderProfile();

    const control = inCurrentSection(tree, 'circle-action-home').find((n: any) => n.props.accessibilityRole === 'button');

    expect(control.props.accessibilityLabel).toBe('common.home');
    expect(control.findAll((n: any) => n.props.children === 'common.home').length).toBeGreaterThan(0);
  });

  it('keeps the title centred between controls of different widths', async () => {
    const tree = await renderProfile();

    const flexOf = (testID: string) =>
      inCurrentSection(tree, testID).map((n: any) => StyleSheet.flatten(n.props.style).flex);

    expect(new Set(flexOf('catalogue-header-row-left'))).toEqual(new Set([1]));
    expect(new Set(flexOf('catalogue-header-row-right'))).toEqual(new Set([1]));
  });

  it('keeps the back button that returns to the main menu', async () => {
    const tree = await renderProfile();

    fireEvent.press(
      inCurrentSection(tree, 'circle-action-home').find((n: any) => n.props.accessibilityRole === 'button'),
    );

    expect(mockAppState.requestReturnToMainMenu).toHaveBeenCalled();
  });

  /** Settings sit behind the same challenge the Grown-ups pill asks for. */
  it('raises the parents-only challenge instead of opening settings outright', async () => {
    const onOpenSettings = jest.fn();
    const tree = await renderProfile({ onOpenSettings });

    expect(byTestId(tree, 'parents-only-modal')).toHaveLength(0);

    fireEvent.press(
      inCurrentSection(tree, 'circle-action-settings').find((n: any) => n.props.accessibilityRole === 'button'),
    );

    expect(onOpenSettings).not.toHaveBeenCalled();
    expect(byTestId(tree, 'parents-only-modal').length).toBeGreaterThan(0);
  });

  it('leaves the theme filters off the page -- there is nothing here to filter', async () => {
    const tree = await renderProfile();

    expect(inCurrentSection(tree, 'story-filter-bar')).toHaveLength(0);
  });

  it('lists the books held on the device under manage', async () => {
    const tree = await renderProfile();
    openTab(tree, 'manage');

    expect(byTestId(tree, 'download-row-wombat').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'download-row-bear').length).toBeGreaterThan(0);
  });

  it('confirms before removing a book, and removes it once confirmed', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderProfile();
    openTab(tree, 'manage');

    fireEvent.press(byTestId(tree, 'download-row-delete-wombat')[0]);

    expect(alert).toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2] as { text: string; style?: string; onPress?: () => void }[];
    const destructive = buttons.find((button) => button.style === 'destructive');
    expect(destructive).toBeTruthy();

    await act(async () => {
      destructive?.onPress?.();
    });

    expect(StoryDownloadService.deleteStory).toHaveBeenCalledWith('wombat');
    alert.mockRestore();
  });

  it('opens a book straight from the download list', async () => {
    const tree = await renderProfile();
    openTab(tree, 'manage');

    fireEvent.press(byTestId(tree, 'download-row-wombat')[0]);

    await waitFor(() => expect(mockStartTransition).toHaveBeenCalled());
    expect(mockStartTransition.mock.calls[0][0]).toBe('wombat');
  });

  it('opens the shared badge detail when a badge on the wall is tapped', async () => {
    const tree = await renderProfile();
    openTab(tree, 'badges');
    const badge = byTestId(tree, 'badge-wall')[0]
      .findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('badge-wall-item-'))[0];

    fireEvent.press(badge);

    await waitFor(() => expect(byTestId(tree, 'badge-detail-sheet').length).toBeGreaterThan(0));
  });

  /** Signing in leaves the app for Google or Apple, so a grown-up says yes first. */
  describe('signing in from the profile', () => {
    beforeEach(() => {
      (mockAppState as Record<string, unknown>).isGuestMode = true;
    });

    afterEach(() => {
      delete (mockAppState as Record<string, unknown>).isGuestMode;
    });

    function pressLogin(tree: ReturnType<typeof render>) {
      fireEvent.press(
        inCurrentSection(tree, 'profile-session').find((n: any) => n.props.accessibilityRole === 'button'),
      );
    }

    it('asks the parents-only question before the login page comes up', async () => {
      const tree = await renderProfile();

      pressLogin(tree);

      expect(mockAppState.setShowLoginAfterOnboarding).not.toHaveBeenCalled();
      expect(byTestId(tree, 'parents-only-modal').length).toBeGreaterThan(0);
    });

    it('brings the login page up once the question is answered', async () => {
      const tree = await renderProfile();
      pressLogin(tree);

      await act(async () => {
        byTestId(tree, 'parents-only-modal')[0].props.onTouchEnd();
      });
      await act(async () => {
        byTestId(tree, 'parents-only-modal')[0].props.onTouchStart();
      });

      await waitFor(() => expect(mockAppState.setShowLoginAfterOnboarding).toHaveBeenCalledWith(true));
    });
  });

  /** Editing the child's details is a grown-up's job, like the settings gear. */
  it('challenges a grown-up before opening the edit page from the hero', async () => {
    const tree = await renderProfile();

    fireEvent.press(
      inCurrentSection(tree, 'profile-hero').find((n: any) => n.props.accessibilityRole === 'button'),
    );

    expect(byTestId(tree, 'profile-edit-sheet')).toHaveLength(0);
    expect(byTestId(tree, 'parents-only-modal').length).toBeGreaterThan(0);
  });

  it('opens the edit page once the challenge is answered, and puts the bar away', async () => {
    const tree = await renderProfile();
    fireEvent.press(
      inCurrentSection(tree, 'profile-hero').find((n: any) => n.props.accessibilityRole === 'button'),
    );

    await act(async () => {
      byTestId(tree, 'parents-only-modal')[0].props.onTouchEnd();
    });
    await act(async () => {
      byTestId(tree, 'parents-only-modal')[0].props.onTouchStart();
    });

    await waitFor(() => expect(byTestId(tree, 'profile-edit-sheet').length).toBeGreaterThan(0));
    expect(byTestId(tree, 'edit-profile-content').length).toBeGreaterThan(0);
    expect(byTestId(tree, 'child-bottom-navigation')).toHaveLength(0);
  });

  /** The sheet is the whole screen's business, so the bar steps out of it. */
  it('hides the journey bar while a badge detail is open', async () => {
    const tree = await renderProfile();
    openTab(tree, 'badges');
    const badge = byTestId(tree, 'badge-wall')[0]
      .findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.startsWith('badge-wall-item-'))[0];

    fireEvent.press(badge);

    await waitFor(() => expect(byTestId(tree, 'child-bottom-navigation')).toHaveLength(0));
  });
});

/**
 * The story sheet rises over the shelf, not instead of it: the journey bar
 * stays where it was beneath the panel. It only steps out once the book
 * itself opens, which takes the whole screen.
 */
describe('the journey bar and the story sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalog.mockResolvedValue([]);
  });

  function transition(flags: Partial<{ isTransitioning: boolean; shouldShowStoryReader: boolean; isExpandingToReader: boolean }>) {
    (useStoryTransition as jest.Mock).mockReturnValue({
      isTransitioning: false,
      selectedStoryId: null,
      shouldShowStoryReader: false,
      isExpandingToReader: false,
      startTransition: mockStartTransition,
      ...flags,
    });
  }

  it('keeps the bar while the story sheet is up', async () => {
    transition({ isTransitioning: true });
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    expect(byTestId(tree, 'child-bottom-navigation').length).toBeGreaterThan(0);
  });

  it.each([
    ['the book is expanding into the reader', { isExpandingToReader: true }],
    ['the reader is open', { shouldShowStoryReader: true }],
  ])('puts the bar away once %s', async (_case, flags) => {
    transition(flags);
    const tree = render(<StoryCatalogueScreen />);

    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    expect(byTestId(tree, 'child-bottom-navigation')).toHaveLength(0);
  });
});

/**
 * Each journey page has a tour of its own, and the screen runs only the one
 * for the section on show, handing it that section's controls to point at.
 */
describe('the journey tours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuides.length = 0;
    mockGetCatalog.mockResolvedValue([]);
    (useStoryTransition as jest.Mock).mockReturnValue({
      isTransitioning: false,
      selectedStoryId: null,
      shouldShowStoryReader: false,
      isExpandingToReader: false,
      startTransition: mockStartTransition,
    });
  });

  function latest(id: string) {
    return [...mockGuides].reverse().find((entry) => entry.id === id);
  }

  function openSection(tree: ReturnType<typeof render>, id: string) {
    fireEvent.press(
      byTestId(tree, `navigation-item-${id}`).find((n: any) => n.props.accessibilityRole === 'tab'),
    );
  }

  /**
   * The catalogue is mounted off screen before the child opens it, and under the
   * login page. A tour that ran there took the owl from the page on show, so after
   * a reset the main menu's tour never came.
   */
  it('runs none of its tours while it waits off screen, whatever section it holds', async () => {
    const tree = render(<StoryCatalogueScreen isActive={false} />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    for (const id of ['catalogue_tour', 'progress_tour', 'search_tour', 'profile_tour']) {
      expect(latest(id)?.active).toBe(false);
    }
  });

  // The trophy orb opens Progress with a badge's sheet up; a first visit's tour
  // started over it, ringing the page behind the sheet and blocking its close.
  it('holds the Progress tour off while a badge sheet is up, and lets it run once it is closed', async () => {
    const tree = render(<StoryCatalogueScreen isActive sectionRequest={{ section: 'progress', key: 3 }} />);
    const progress = () =>
      tree.UNSAFE_root.findAll((n: any) => n.props.embedded === true && typeof n.props.onDetailVisibleChange === 'function')[0];
    await waitFor(() => expect(latest('progress_tour')?.active).toBe(true));

    act(() => progress().props.onDetailVisibleChange(true));
    const whileOpen = latest('progress_tour')?.active;
    act(() => progress().props.onDetailVisibleChange(false));

    expect(whileOpen).toBe(false);
    expect(latest('progress_tour')?.active).toBe(true);
  });

  // The whole shelf column was the subject: taller than the screen, so the
  // ring ran off both ends and nothing on show was lit (review, 2026-10-04).
  it('gives the shelves step the first shelf to ring, one row the screen can hold', async () => {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-shelves').length).toBeGreaterThan(0));

    const shelves = byTestId(tree, 'story-shelves')[0];
    const wrappers = shelves.findAll((n: any) => n.props.testID === 'tour-first-shelf' && n.props.collapsable === false);
    const ringed = new Set(
      wrappers.flatMap((wrapper: any) =>
        wrapper.findAll((n: any) => Array.isArray(n.props.stories) && typeof n.props.heading === 'string').map((row: any) => row.props.heading)
      )
    );
    const firstRow = shelves.findAll((n: any) => Array.isArray(n.props.stories) && typeof n.props.heading === 'string')[0];

    expect([...ringed]).toEqual([firstRow.props.heading]);
  });

  it('runs the tour for its section once it comes on screen', async () => {
    const tree = render(<StoryCatalogueScreen isActive={false} />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    tree.rerender(<StoryCatalogueScreen isActive />);

    expect(latest('catalogue_tour')?.active).toBe(true);
  });

  it('runs the stories tour on the shelf, pointing at the chooser and the shelf, and leaves the bar to the home tour', async () => {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    expect(byTestId(tree, 'owl-guide-catalogue_tour').length).toBeGreaterThan(0);
    expect(latest('catalogue_tour')?.targets).toEqual(['theme_tiles', 'filter_toggle', 'featured_story', 'story_shelves']);
    for (const other of ['progress_tour', 'search_tour', 'profile_tour']) {
      expect(byTestId(tree, `owl-guide-${other}`)).toHaveLength(0);
    }
  });

  it.each([
    ['before the first search, with nothing yet to come back to', [], ['search_field']],
    ['once there are searches to come back to', ['wombat'], ['search_field', 'search_recent']],
  ])('points the search tour at the recent searches only %s', async (_, recent, targets) => {
    mockAppState.recentSearches = recent;
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSection(tree, 'search');

    await waitFor(() => expect(latest('search_tour')?.targets).toEqual(targets));
    mockAppState.recentSearches = [];
  });

  it.each([
    ['profile', 'profile_tour', ['profile_hero', 'profile_tabs', 'profile_settings']],
    ['progress', 'progress_tour', ['progress_hero', 'progress_challenges', 'progress_milestones', 'progress_badges']],
    ['search', 'search_tour', ['search_field']],
  ])('runs the %s tour once that section is open, and puts the others away', async (section, tourId, targets) => {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    openSection(tree, section);

    await waitFor(() => expect(byTestId(tree, `owl-guide-${tourId}`).length).toBeGreaterThan(0));
    expect(latest(tourId)?.targets).toEqual(expect.arrayContaining(targets));
    expect(byTestId(tree, 'owl-guide-catalogue_tour')).toHaveLength(0);
  });
});

/**
 * The shelves scroll away behind the planet and its clouds rather than being
 * cut off at an invisible line beneath the tagline. So the scroll area runs to
 * the top of the screen, the planet is drawn over it, and the title and the
 * two buttons are drawn over the planet.
 */
describe('the shelves and the planet', () => {
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
  });

  async function renderLibrary() {
    const tree = render(<StoryCatalogueScreen />);
    await waitFor(() => expect(byTestId(tree, 'story-filter-bar').length).toBeGreaterThan(0));

    return tree;
  }

  function firstIndex(tree: ReturnType<typeof render>, testID: string): number {
    const all = tree.UNSAFE_root.findAll((n: any) => typeof n.props.testID === 'string');

    return all.findIndex((n: any) => n.props.testID === testID);
  }

  it('runs the scroll area to the top of the screen, under the header', async () => {
    const tree = await renderLibrary();

    const scroll = byTestId(tree, 'catalogue-scroll').find((n: any) => n.props.contentContainerStyle);
    const frame = StyleSheet.flatten(scroll.props.style);

    expect(frame.position).toBe('absolute');
    expect(frame.top).toBe(0);
  });

  it('starts the shelves below the planet and the header, so nothing is hidden at rest', async () => {
    const tree = await renderLibrary();

    const scroll = byTestId(tree, 'catalogue-scroll').find((n: any) => n.props.contentContainerStyle);
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle);

    expect(content.paddingTop).toBeGreaterThanOrEqual(PLANET_HEADER_ESTIMATE.phone);
  });

  it('draws the planet over the shelves and the title over the planet', async () => {
    const tree = await renderLibrary();

    const scroll = firstIndex(tree, 'catalogue-scroll');
    const planet = firstIndex(tree, 'catalogue-planet-over-shelves');
    const title = firstIndex(tree, 'page-title');

    expect(scroll).toBeGreaterThanOrEqual(0);
    expect(planet).toBeGreaterThan(scroll);
    expect(title).toBeGreaterThan(planet);
  });

  it('dissolves the shelves into the sky as they rise under the header, before they reach the buttons', async () => {
    const tree = await renderLibrary();

    const scroll = firstIndex(tree, 'catalogue-scroll');
    const veil = firstIndex(tree, 'catalogue-planet-over-shelves-veil');
    const globe = firstIndex(tree, 'planet-header-artwork-planet');
    const veilStyle = StyleSheet.flatten(byTestId(tree, 'catalogue-planet-over-shelves-veil')[0].props.style);

    expect(veil).toBeGreaterThan(scroll);
    expect(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'planet-header-artwork-planet').length).toBeGreaterThan(1);
    expect(globe).toBeGreaterThanOrEqual(0);
    expect(veilStyle.top).toBe(0);
    expect(veilStyle.height).toBeGreaterThanOrEqual(PLANET_HEADER_ESTIMATE.phone);
  });

  it('lets a drag that starts on the header reach the shelves beneath it', async () => {
    const tree = await renderLibrary();

    const header = byTestId(tree, 'catalogue-header').find((n: any) => n.props.onLayout);

    expect(header.props.pointerEvents).toBe('box-none');
  });
});
