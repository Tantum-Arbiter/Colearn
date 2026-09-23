import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  InteractionManager,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { ALL_STORIES } from '@/data/stories';
import { CatalogEntry, STORY_FILTER_TAGS, STORY_TAGS, Story, StoryFilterTag, getLocalizedText } from '@/types/story';
import { Fonts } from '@/constants/theme';
import {
  ACCENT_GOLD,
  BORDER_DEFAULT,
  SURFACE_SECONDARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/constants/night-palette';
import { useAppStore, type SubscriptionTier } from '@/store/app-store';
import { useSessionActions } from '@/hooks/use-session-actions';
import { profileTourTargets as profileTourTargetsFor } from '@/constants/owl-guide';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { StoryLoader } from '@/services/story-loader';
import { CatalogService } from '@/services/catalog-service';
import { StoryDownloadService } from '@/services/story-download-service';
import { StoryAccessService } from '@/services/story-access-service';
import type { SupportedLanguage } from '@/services/i18n';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { CelestialBackground } from '@/components/child-ui/celestial-background';
import { PlanetHeaderArtwork } from '@/components/child-ui/planet-header-artwork';
import { SectionCrossfade } from '@/components/child-ui/section-crossfade';
import { PlanetCover, usePlanetCover } from '@/components/child-ui/planet-cover';
import { BalancedHeaderRow } from '@/components/child-ui/balanced-header-row';
import { ContentSwap } from '@/components/child-ui/content-swap';
import { CircleActionButton } from '@/components/child-ui/circle-action-button';
import { PageTitle } from '@/components/child-ui/page-title';
import { PageTagline } from '@/components/child-ui/page-tagline';
import { SectionHeading } from '@/components/child-ui/section-heading';
import { JourneyShell } from '@/components/child-ui/journey-shell';
import { ChildNavItemId, navClearance, navItemCentre } from '@/components/child-ui/child-bottom-navigation';
import { ScreenTimeGlance } from '@/components/home/screen-time-glance';
import { useScreenTimeAllowance } from '@/hooks/use-screen-time-allowance';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { isScreenTimeExceeded } from '@/constants/screen-time-ring';
import { CHILD_UI_MOTION, motionDuration } from '@/constants/child-ui-motion';
import { glanceCloseTimeline } from '@/constants/screen-time-glance-timeline';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  COVER_GRID_GAP,
  RADIUS_CONTROL,
  SPACE_2,
  journeyHeaderTop,
  SPACE_3,
  SPACE_4,
  SPACE_5,
  contentMargin,
} from '@/components/child-ui/tokens';
import { ProgressScreen } from '@/components/progress/progress-screen';
import { BadgeDetailSheet } from '@/components/progress/badge-detail-sheet';
import { useProgressData } from '@/components/progress/use-progress-data';
import type { Badge } from '@/components/progress/progress-model';
import { ProfileView } from '@/components/profile/profile-view';
import { ProfileEditSheet } from '@/components/profile/profile-edit-sheet';
import { OwlGuide } from '@/components/owl-guide';
import { useGuideScroller } from '@/components/owl-guide/use-guide-scroller';
import { ParentsOnlyModal } from '@/components/ui/parents-only-modal';
import { useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';
import {
  APP_LAUNCH_SEED,
  CatalogueMode,
  CatalogueStory,
  CatalogueTheme,
  buildSavedRows,
  buildShelves,
  entryMatchesMode,
  filterByTheme,
  fromCatalogEntry,
  fromStory,
  matchesGender,
  recommendationTarget,
  selectFeatured,
  continuingStoryId,
  selectContinuing,
  storyMatchesMode,
} from './catalogue-story';
import { StoryFilterBar } from './story-filter-bar';
import { FILTER_PILL_ICONS } from './story-filter-pill';
import { FeaturedStoryCard } from './featured-story-card';
import { catalogueLayout, coverColumns, coverWidthFor } from '@/constants/catalogue-columns';
import { SearchPanel } from './search-panel';
import { StoryCoverCard } from './story-cover-card';
import { StoryRow } from './story-row';
import { SavedActivityCard } from './saved-activity-card';
import { SavedSongCard } from './saved-song-card';
import { getAllPracticeSongs, type PracticeSong } from '@/services/music-asset-registry';
import { ALL_LEARNING_ACTIVITIES, type LearningActivity } from '@/data/learning-activities';
import { useActivityTransition } from '@/contexts/ActivityTransitionContext';

// The finer themes behind Filter. Learning and Music are tiles, not pills
const FILTER_TAG_SET: StoryFilterTag[] = [
  'bedtime', 'adventure', 'calming', 'family', 'creativity', 'animals',
  'friendship', 'nature', 'fantasy', 'counting', 'emotions', 'silly', 'rhymes',
];

/** Each browsing area is headed by its own two arched lines. */
const TAGLINE_LINES: Record<'home' | 'search' | 'profile' | 'screensafe', (t: (key: string) => string) => readonly [string, string]> = {
  home: (t) => [t('catalogue.tagline.one'), t('catalogue.tagline.two')],
  search: (t) => [t('search.tagline.one'), t('search.tagline.two')],
  profile: (t) => [t('catalogue.profile.tagline.one'), t('catalogue.profile.tagline.two')],
  // Screensafe opens a window rather than a section, so the bar it is pressed
  // from never changes what is behind it -- this is only here for the type
  screensafe: (t) => [t('catalogue.tagline.one'), t('catalogue.tagline.two')],
};

export interface CatalogueSectionRequest {
  section: ChildNavItemId;
  key: number;
}

interface StoryCatalogueScreenProps {
  onStorySelect?: (story: Story) => void;
  /** Opens the music journey, for a saved song tapped from the shelf. */
  onNavigateToMusic?: () => void;
  /** Opens the grown-ups' area, once the parents-only challenge is answered. */
  onOpenSettings?: () => void;
  initialMode?: CatalogueMode | null;
  sectionRequest?: CatalogueSectionRequest;
  isActive?: boolean;
}

export function StoryCatalogueScreen({ onStorySelect, initialMode, sectionRequest, onNavigateToMusic, onOpenSettings, isActive = true }: StoryCatalogueScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { requestReturnToMainMenu, setShowLoginAfterOnboarding, getEffectiveTier } = useAppStore();
  const session = useSessionActions();
  const favoriteStoryIds = useAppStore((state) => state.favoriteStoryIds);
  const favoriteActivityIds = useAppStore((state) => state.favoriteActivityIds);
  const favoriteSongIds = useAppStore((state) => state.favoriteSongIds);
  const recentSearches = useAppStore((state) => state.recentSearches);
  const recordSearch = useAppStore((state) => state.recordSearch);
  const clearRecentSearches = useAppStore((state) => state.clearRecentSearches);
  const toggleFavoriteStory = useAppStore((state) => state.toggleFavoriteStory);
  const userAvatarType = useAppStore((state) => state.userAvatarType);
  const effectiveTier: SubscriptionTier = getEffectiveTier();
  const { startTransition, isTransitioning, selectedStoryId, shouldShowStoryReader, isExpandingToReader } = useStoryTransition();
  const { startTransition: startActivityTransition } = useActivityTransition();
  const { isMuted, toggleMute } = useGlobalSound();
  const { isTablet, textSizeScale, scaledFontSize } = useAccessibility();
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;
  const lastBackRef = useRef<number>(0);

  // what each tour points the owl at, measured live from these
  const themeTilesRef = useRef<View>(null);
  const filterToggleRef = useRef<View>(null);
  const featuredRef = useRef<View>(null);
  const shelvesRef = useRef<View>(null);
  const progressHeroRef = useRef<View>(null);
  const progressChallengesRef = useRef<View>(null);
  const progressMilestonesRef = useRef<View>(null);
  const progressBadgesRef = useRef<View>(null);
  const searchFieldRef = useRef<View>(null);
  const searchRecentRef = useRef<View>(null);
  const profileHeroRef = useRef<View>(null);
  const profileTabsRef = useRef<View>(null);
  const profileSettingsRef = useRef<View>(null);
  const profileLoginRef = useRef<View>(null);
  // The header's Home pill is shared by every section; the profile tour is the
  // only one that points at it, and it only runs while profile is on show.
  const headerHomeRef = useRef<View>(null);

  // the two scrolling pages a tour runs over: this screen's own column, and
  // the progress page's, which brings its own scroll view
  const pageScroller = useGuideScroller();
  const progressScroller = useGuideScroller();
  const catalogueTourTargets = useMemo(() => ({
    theme_tiles: themeTilesRef,
    filter_toggle: filterToggleRef,
    featured_story: featuredRef,
    story_shelves: shelvesRef,
  }), []);
  const progressTourTargets = useMemo(() => ({
    progress_hero: progressHeroRef,
    progress_challenges: progressChallengesRef,
    progress_milestones: progressMilestonesRef,
    progress_badges: progressBadgesRef,
  }), []);
  const progressGuideTargets = useMemo(() => ({
    hero: progressHeroRef,
    challenges: progressChallengesRef,
    milestones: progressMilestonesRef,
    badges: progressBadgesRef,
  }), []);
  const searchTourTargets = useMemo(() => ({
    search_field: searchFieldRef,
    search_recent: searchRecentRef,
  }), []);
  const searchGuideTargets = useMemo(() => ({ field: searchFieldRef, recent: searchRecentRef }), []);
  const profileTourTargets = useMemo(
    () => profileTourTargetsFor(
      { hero: profileHeroRef, login: profileLoginRef, tabs: profileTabsRef, home: headerHomeRef, settings: profileSettingsRef },
      session.needsSignIn
    ),
    [session.needsSignIn]
  );
  const profileGuideTargets = useMemo(
    () => ({ hero: profileHeroRef, tabs: profileTabsRef, login: profileLoginRef }),
    []
  );

  const margin = contentMargin(isTablet);
  const isLandscapeTablet = isTablet && windowWidth > windowHeight;

  const [stories, setStories] = useState<Story[]>(() => {
    const cached = StoryLoader.getCachedStories();
    return cached && cached.length > 0 ? cached : ALL_STORIES;
  });
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);
  const [theme, setTheme] = useState<CatalogueTheme>('stories');
  const [selectedTags, setSelectedTags] = useState<Set<StoryFilterTag>>(new Set());
  const [storyMode, setStoryMode] = useState<CatalogueMode | null>(initialMode ?? null);
  const [shareUnlockedIds, setShareUnlockedIds] = useState<Set<string>>(new Set());
  const [navSection, setNavSection] = useState<ChildNavItemId>(sectionRequest?.section ?? 'home');
  const [sectionInstant, setSectionInstant] = useState(false);
  const [appliedRequestKey, setAppliedRequestKey] = useState(sectionRequest?.key);
  if (sectionRequest && sectionRequest.key !== appliedRequestKey) {
    setAppliedRequestKey(sectionRequest.key);
    setSectionInstant(true);
    setNavSection(sectionRequest.section);
  }
  const [searchQuery, setSearchQuery] = useState('');
  const [badgeDetailOpen, setBadgeDetailOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [showScreenTime, setShowScreenTime] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const { coverHeight, onHeaderLayout } = usePlanetCover();
  const { badges } = useProgressData();
  const parentsOnly = useParentsOnlyChallenge();
  const screenTime = useScreenTimeAllowance();
  const timeOfDay = useTimeOfDay();
  const reduceMotion = useReducedMotion();
  const navTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const afterDelay = useCallback((ms: number, run: () => void) => {
    if (ms <= 0) {
      run();
      return;
    }
    navTimers.current.push(setTimeout(run, ms));
  }, []);

  useEffect(() => () => {
    navTimers.current.forEach(clearTimeout);
    navTimers.current = [];
  }, []);
  const [showSubscription, setShowSubscription] = useState(false);

  useEffect(() => {
    setStoryMode(initialMode ?? null);
  }, [initialMode]);


  useEffect(() => {
    const cachedStories = StoryLoader.getCachedStories();
    if (cachedStories && cachedStories.length > 0) {
      setStories(cachedStories);
      return;
    }
    const timeoutId = setTimeout(() => {
      StoryLoader.getStories()
        .then((loaded) => setStories(loaded))
        .catch(() => undefined);
    }, 600);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const entries = await CatalogService.getCatalog();
        setCatalogEntries(entries);
      } catch {
        // No catalog available yet -that's fine
      }
    };
    const handle = InteractionManager.runAfterInteractions(() => {
      loadCatalog();
    });
    const unsubscribe = CatalogService.onCatalogUpdated(() => {
      loadCatalog();
    });
    return () => {
      handle.cancel();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    StoryAccessService.hasCompletedShareUnlock().then((unlocked) => {
      if (unlocked) {
        const ids = catalogEntries.filter((e) => e.isShareToUnlock).map((e) => e.storyId);
        if (ids.length > 0) setShareUnlockedIds(new Set(ids));
      }
    });
  }, [catalogEntries]);

  const refreshLibrary = useCallback(async () => {
    try {
      StoryLoader.invalidateCache();
      const [loadedStories, entries] = await Promise.all([
        StoryLoader.getStories(),
        CatalogService.getCatalog(),
      ]);
      setStories(loadedStories);
      setCatalogEntries(entries);
    } catch {
      // Best-effort refresh
    }
  }, []);

  const searchableStories = useMemo(() => {
    const downloaded = stories
      .filter((story) => matchesGender(story, userAvatarType))
      .filter((story) => storyMatchesMode(story, storyMode))
      .map(fromStory);

    const downloadedIds = new Set(downloaded.map((story) => story.id));

    const remote = catalogEntries
      .filter((entry) => !downloadedIds.has(entry.storyId))
      .filter((entry) => matchesGender(entry, userAvatarType))
      .filter((entry) => entryMatchesMode(entry, storyMode))
      .map((entry) => fromCatalogEntry(entry, {
        locked: effectiveTier === 'free' && !entry.isFree && !entry.isShareToUnlock,
        shareToUnlock: !!entry.isShareToUnlock && !shareUnlockedIds.has(entry.storyId),
      }));

    return [...downloaded, ...remote];
  }, [stories, catalogEntries, userAvatarType, storyMode, effectiveTier, shareUnlockedIds]);

  // What a search runs over: every book the child could reach, installed or
  // still only a thumbnail from the catalogue, with no theme or tag narrowing
  // it -- the search page carries no filters to narrow it by.
  const catalogueStories = useMemo(() => {
    const underTheme = filterByTheme(searchableStories, theme);
    if (selectedTags.size === 0) return underTheme;
    return underTheme.filter((story) => Array.from(selectedTags).some((tag) => story.theme.includes(tag)));
  }, [searchableStories, theme, selectedTags]);

  // A book the child has installed, picked afresh each time the app opens and
  // held for that run, so it does not change under them as they browse
  const storyProgress = useAppStore((state) => state.storyProgress);
  const continuing = useMemo(
    () => selectContinuing(catalogueStories, continuingStoryId(storyProgress)),
    [catalogueStories, storyProgress],
  );
  const featured = useMemo(
    () => continuing ?? selectFeatured(catalogueStories, { seed: APP_LAUNCH_SEED, isPreInstalled: StoryLoader.isLocalStory }),
    [catalogueStories, continuing],
  );

  // A finer theme chosen turns the whole shelf, featured panel included, into
  // one grid of what matches, headed by that theme
  const browsing = selectedTags.size > 0;
  // what the shelves are showing: the theme, and the filters narrowing it.
  // A change to either replaces every book on the page.
  const collectionKey = `${theme}:${[...selectedTags].sort().join(',')}`;

  // The shelves under the featured panel, laid out afresh each time the app opens
  const savedStories = useMemo(
    () => catalogueStories.filter((story) => favoriteStoryIds.includes(story.id)),
    [catalogueStories, favoriteStoryIds],
  );

  const savedActivities = useMemo(
    () => ALL_LEARNING_ACTIVITIES.filter((activity) => favoriteActivityIds.includes(activity.id)),
    [favoriteActivityIds],
  );

  const savedSongs = useMemo(
    () => getAllPracticeSongs().filter((song) => favoriteSongIds.includes(song.id)),
    [favoriteSongIds],
  );

  const savedRows = useMemo(
    () => (navSection === 'profile' ? buildSavedRows(savedStories) : []),
    [navSection, savedStories],
  );

  const shelves = useMemo(
    () => (navSection !== 'home' || browsing
      ? []
      : buildShelves(catalogueStories, {
        seed: APP_LAUNCH_SEED,
        featuredId: featured?.id ?? null,
      })),
    [navSection, browsing, catalogueStories, featured],
  );

  const interactionLocked = isTransitioning || shouldShowStoryReader || isExpandingToReader;
  // the sheet rises over the shelf, so the bar stays put beneath it; only
  // the book itself, which takes the whole screen, sends the bar away
  const readerTakesScreen = shouldShowStoryReader || isExpandingToReader;

  const handleToggleTag = useCallback((tag: StoryFilterTag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const handleExitJourney = useCallback(() => {
    const now = Date.now();
    if (now - lastBackRef.current < 500) return;
    lastBackRef.current = now;
    requestReturnToMainMenu();
  }, [requestReturnToMainMenu]);

  /**
   * Screensafe is a control, not a destination: it opens the usage window over
   * whatever the child was looking at and hands them back to it on close, so
   * the section they were browsing is deliberately left where it was.
   */
  const handleNavSelect = useCallback((id: ChildNavItemId) => {
    if (id === 'screensafe') {
      // the bar gathers into its own middle first, and the window opens out of
      // the space the ring leaves -- one movement rather than two overlapping
      setNavCollapsed(true);
      afterDelay(motionDuration(CHILD_UI_MOTION.navCollapse, reduceMotion), () => setShowScreenTime(true));
      return;
    }
    if (id === 'home' || id === 'search' || id === 'profile') {
      setStoryMode(null);
      setSelectedTags(new Set());
    }
    if (id !== 'search') setSearchQuery('');
    if (id !== 'profile') {
      setSelectedBadge(null);
      setEditProfileOpen(false);
    }
    setSectionInstant(false);
    setNavSection(id);
  }, [afterDelay, reduceMotion]);

  /** The bar comes back out of the splash, which lands before the close ends. */
  const handleScreenTimeCloseStart = useCallback(() => {
    afterDelay(reduceMotion ? 0 : glanceCloseTimeline().splash.at, () => setNavCollapsed(false));
  }, [afterDelay, reduceMotion]);

  const handleScreenTimeClosed = useCallback(() => {
    setShowScreenTime(false);
    setNavCollapsed(false);
  }, []);

  const handleRecommend = useCallback((tag: StoryFilterTag | null) => {
    setNavSection('home');
    setStoryMode(null);
    const target = recommendationTarget(tag);
    if (target.theme) setTheme(target.theme);
    setSelectedTags(new Set(target.tags));
  }, []);

  const handleSeeAll = useCallback((tag: StoryFilterTag) => {
    setSelectedTags(new Set([tag]));
  }, []);

  // Every book the child could open from here, in shelf order, so the story
  // card can carry them as a carousel to swipe between
  const openableFrom = (entries: CatalogueStory[]): Story[] => entries
    .map((entry) => (entry.source.kind === 'downloaded' ? entry.source.story : null))
    .filter((story): story is Story => !!story && story.isAvailable);

  const renderRowCard = (rowStories: CatalogueStory[]) => {
    const shelf = openableFrom(rowStories);
    return (story: CatalogueStory, width: number) => renderCoverCard(story, width, shelf);
  };

  const openableStories = useMemo(
    () => catalogueStories
      .map((entry) => (entry.source.kind === 'downloaded' ? entry.source.story : null))
      .filter((story): story is Story => !!story && story.isAvailable),
    [catalogueStories],
  );

  const openDownloadedStory = useCallback((story: Story, position: { x: number; y: number; width: number; height: number }, shelf?: Story[]) => {
    startTransition(story.id, position, story, shelf && shelf.length > 0 ? shelf : openableStories);
    onStorySelect?.(story);
  }, [startTransition, onStorySelect, openableStories]);

  const handleOpenStory = useCallback((catalogueStory: CatalogueStory, ref: React.RefObject<View | null>, shelf?: Story[]) => {
    if (catalogueStory.source.kind !== 'downloaded') return;
    const story = catalogueStory.source.story;
    if (!story.isAvailable) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (ref.current) {
      ref.current.measure((_x, _y, width, height, pageX, pageY) => {
        openDownloadedStory(story, { x: pageX, y: pageY, width, height }, shelf);
      });
      return;
    }

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const fallbackWidth = 160;
    const fallbackHeight = 235;
    openDownloadedStory(story, {
      x: (screenWidth - fallbackWidth) / 2,
      y: (screenHeight - fallbackHeight) / 2,
      width: fallbackWidth,
      height: fallbackHeight,
    }, shelf);
  }, [openDownloadedStory]);

  const handleDeleteStory = useCallback((story: Story) => {
    Alert.alert(
      t('storyPreview.removeFromDevice'),
      t('storyPreview.removeConfirm', { title: story.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await StoryDownloadService.deleteStory(story.id);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (favoriteStoryIds.includes(story.id)) {
                toggleFavoriteStory(story.id);
              }
              await refreshLibrary();
            }
          },
        },
      ]
    );
  }, [t, favoriteStoryIds, toggleFavoriteStory, refreshLibrary]);

  const handleAuthError = useCallback(() => {
    setShowLoginAfterOnboarding(true);
  }, [setShowLoginAfterOnboarding]);

  /**
   * A book opened from the download list grows out of its own thumbnail, so
   * the transition begins where the child's finger was rather than from the
   * middle of a list they were scrolling.
   */
  const handleOpenDownload = useCallback((story: Story, cover: React.RefObject<View | null>) => {
    if (!story.isAvailable) return;

    if (cover.current) {
      cover.current.measure((_x, _y, width, height, pageX, pageY) => {
        openDownloadedStory(story, { x: pageX, y: pageY, width, height });
      });
      return;
    }

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    openDownloadedStory(story, { x: screenWidth / 2, y: screenHeight / 2, width: 0, height: 0 });
  }, [openDownloadedStory]);

  /** Settings belong to the grown-ups, so the same challenge stands here. */
  const handleOpenSettings = useCallback(() => {
    parentsOnly.showChallenge(() => onOpenSettings?.());
  }, [parentsOnly, onOpenSettings]);

  const handleSignIn = useCallback(() => {
    parentsOnly.showChallenge(session.login);
  }, [parentsOnly, session.login]);

  /** So does changing the child's name and age. */
  const handleEditProfile = useCallback(() => {
    parentsOnly.showChallenge(() => setEditProfileOpen(true));
  }, [parentsOnly]);

  const handleSelectBadge = useCallback((badge: Badge) => {
    setSelectedBadge(badge);
    setBadgeDetailOpen(true);
  }, []);

  const handleCloseBadge = useCallback(() => {
    setSelectedBadge(null);
    setBadgeDetailOpen(false);
  }, []);

  const handleRecommendFromBadge = useCallback((badge: Badge) => {
    handleCloseBadge();
    handleRecommend(badge.recommendation?.tag ?? null);
  }, [handleCloseBadge, handleRecommend]);

  const handleShareToUnlock = useCallback(async (entry: CatalogEntry) => {
    try {
      const result = await Share.share({
        message: `Check out "${entry.title}" on Early Roots! A magical story app for kids`,
      });
      if (result.action === Share.sharedAction) {
        await StoryAccessService.completeShareUnlock();
        setShareUnlockedIds((prev) => new Set(prev).add(entry.storyId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // User cancelled or share failed -do nothing
    }
  }, []);

  const handleDownloadLimitReached = useCallback(async (_entry: CatalogEntry) => {
    const limit = StoryAccessService.getDownloadLimit();
    const tier = StoryAccessService.getEffectiveTier();
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

    const suggestedStory = await StoryAccessService.getSuggestedStoryToDelete();
    const suggestedTitle = suggestedStory
      ? getLocalizedText(suggestedStory.localizedTitle, suggestedStory.title, currentLanguage)
      : null;

    const buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] = [
      { text: t('common.cancel'), style: 'cancel' },
    ];

    if (tier !== 'premium') {
      const nextTier = tier === 'free' ? 'Basic' : 'Premium';
      buttons.push({
        text: t('storyPreview.upgradePlan', { defaultValue: `Upgrade to ${nextTier}` }),
        onPress: () => setShowSubscription(true),
      });
    }

    if (suggestedStory && suggestedTitle) {
      buttons.push({
        text: t('storyPreview.deleteBook', { defaultValue: `Delete "${suggestedTitle}"` }),
        style: 'destructive',
        onPress: () => handleDeleteStory(suggestedStory),
      });
    }

    Alert.alert(
      t('storyPreview.downloadLimitTitle', { defaultValue: 'Download Limit Reached' }),
      t('storyPreview.downloadLimitMessage', {
        defaultValue: `You have ${limit} stories on your ${tierLabel} plan. Upgrade your plan to download more, or delete a book to make room.`,
        limit,
        tier: tierLabel,
      }),
      buttons,
    );
  }, [t, currentLanguage, handleDeleteStory]);

  const handleClearFilters = useCallback(() => {
    setSelectedTags(new Set());
  }, []);

  const handleSelectTheme = useCallback((next: CatalogueTheme) => {
    setSelectedTags(new Set());
    setTheme(next);
  }, []);

  const contentWidth = windowWidth - margin * 2;
  const todaysPick = shelves.find((shelf) => shelf.kind === 'pick');
  const layout = catalogueLayout({ isTablet, landscape: isLandscapeTablet, contentWidth, hasPick: Boolean(todaysPick) });
  const gridAreaWidth = layout.shelfWidth;
  const columns = coverColumns(isTablet, gridAreaWidth);
  const coverWidth = coverWidthFor(gridAreaWidth, columns);
  const featuredWidth = layout.featuredWidth;

  const rowCardWidth = coverWidth;

  const renderCoverCard = useCallback((story: CatalogueStory, width: number = coverWidth, shelf?: Story[]) => (
    <StoryCoverCard
      key={story.id}
      story={story}
      width={width}
      language={currentLanguage}
      onOpen={(opened, ref) => handleOpenStory(opened, ref, shelf)}
      onLockedPress={() => setShowSubscription(true)}
      onShareToUnlock={handleShareToUnlock}
      onDownloadComplete={refreshLibrary}
      onAuthError={handleAuthError}
      onDownloadLimitReached={handleDownloadLimitReached}
    />
  ), [coverWidth, currentLanguage, handleOpenStory, handleShareToUnlock, refreshLibrary, handleAuthError, handleDownloadLimitReached]);

  const featuredSection = featured && (
    <FeaturedStoryCard
      story={featured}
      width={featuredWidth}
      language={currentLanguage}
      onOpen={handleOpenStory}
      label={continuing ? t('storyDetail.continueReading') : undefined}
      place={continuing && storyProgress[continuing.id]
        ? { currentPage: storyProgress[continuing.id].pageIndex + 1, totalPages: storyProgress[continuing.id].totalPages }
        : undefined}
    />
  );

  // A row is headed "<Genre> Stories" where the theme is also a genre, else by the theme alone
  const rowHeading = (tag: StoryFilterTag) => (tag in STORY_TAGS
    ? t('stories.genreStories', { genre: t(`stories.genres.${tag}`) })
    : t(STORY_FILTER_TAGS[tag].labelKey));

  const shelvesView = (
    <View testID="story-shelves" style={styles.shelves}>
      {shelves.map((shelf) => {
        if (shelf.kind === 'pick') {
          if (layout.pickBesideFeatured) return null;
          return (
            <View key="pick" style={styles.pickSpacing}>
              <FeaturedStoryCard
                story={shelf.story}
                width={layout.pickWidth}
                language={currentLanguage}
                label={t('catalogue.todaysPick')}
                onOpen={handleOpenStory}
                testID="todays-pick-card"
              />
            </View>
          );
        }
        if (shelf.kind === 'more') {
          return (
            <StoryRow
              key="more"
              testID="story-row-more"
              heading={t('catalogue.moreStories')}
              stories={shelf.stories}
              cardWidth={rowCardWidth}
              edgeInset={margin}
              renderCard={renderRowCard(shelf.stories)}
            />
          );
        }
        return (
          <StoryRow
            key={shelf.tag}
            testID={`story-row-${shelf.tag}`}
            heading={rowHeading(shelf.tag)}
            icon={FILTER_PILL_ICONS[shelf.tag].icon}
            iconColor={FILTER_PILL_ICONS[shelf.tag].color}
            stories={shelf.stories}
            cardWidth={rowCardWidth}
            edgeInset={margin}
            renderCard={renderRowCard(shelf.stories)}
            actionLabel={t('catalogue.seeAll')}
            onAction={() => handleSeeAll(shelf.tag)}
          />
        );
      })}
    </View>
  );

  const chosenTags = Array.from(selectedTags);
  const browseHeading = chosenTags.length === 1
    ? { label: rowHeading(chosenTags[0]), icon: FILTER_PILL_ICONS[chosenTags[0]].icon, iconColor: FILTER_PILL_ICONS[chosenTags[0]].color }
    : { label: t('catalogue.moreStories'), icon: undefined, iconColor: undefined };
  const moreSection = (
    <>
      <View style={styles.sectionHeadingSpacing}>
        <SectionHeading
          label={browseHeading.label}
          icon={browseHeading.icon}
          iconColor={browseHeading.iconColor}
          testID="more-section-heading"
        />
      </View>
      <View style={styles.coverGrid} testID="story-cover-grid">
        {catalogueStories.map((story) => renderCoverCard(story))}
      </View>
    </>
  );

  /**
   * A saved activity opens the same way it would from the learning screen --
   * through the shared transition, which owns the preview and the game after
   * it. The card has no measured position here, so the transition begins from
   * the middle of the screen rather than from a card that is about to leave.
   */
  const handleOpenActivity = useCallback((activity: LearningActivity) => {
    startActivityTransition(
      {
        id: activity.id,
        nameKey: activity.nameKey,
        descKey: activity.descKey,
        ageKey: activity.ageKey,
        icon: activity.icon,
        color: activity.color,
      },
      { x: windowWidth / 2, y: windowHeight / 2, width: 0, height: 0 },
    );
  }, [startActivityTransition, windowWidth, windowHeight]);

  const savedActivitiesRow = savedActivities.length > 0 ? (
    <StoryRow
      testID="saved-row-activities"
      heading={t('catalogue.saved.activities')}
      stories={savedActivities as unknown as CatalogueStory[]}
      cardWidth={rowCardWidth}
      edgeInset={margin}
      renderCard={(entry, width) => (
        <SavedActivityCard
          key={(entry as unknown as LearningActivity).id}
          activity={entry as unknown as LearningActivity}
          width={width}
          onOpen={handleOpenActivity}
        />
      )}
    />
  ) : null;

  /**
   * A saved song opens the practice screen it belongs to. The instrument is
   * the child's to choose there -- a song is a melody, not a fixed pairing.
   */
  const handleOpenSong = useCallback((_song: PracticeSong) => {
    onNavigateToMusic?.();
  }, [onNavigateToMusic]);

  const savedSongsRow = savedSongs.length > 0 ? (
    <StoryRow
      testID="saved-row-songs"
      heading={t('catalogue.saved.songs')}
      stories={savedSongs as unknown as CatalogueStory[]}
      cardWidth={rowCardWidth}
      edgeInset={margin}
      renderCard={(entry, width) => (
        <SavedSongCard
          key={(entry as unknown as PracticeSong).id}
          song={entry as unknown as PracticeSong}
          width={width}
          onOpen={handleOpenSong}
        />
      )}
    />
  ) : null;

  const favouritesView = savedRows.length === 0 && savedActivities.length === 0 && savedSongs.length === 0 ? (
    <View style={styles.noResultsContainer} testID="saved-empty">
      <Text style={[styles.noResultsText, { fontSize: scaledFontSize(16) }]}>
        {t('catalogue.saved.empty')}
      </Text>
    </View>
  ) : (
    <View testID="saved-shelves" style={styles.shelves}>
      {savedActivitiesRow}
      {savedSongsRow}
      {savedRows.map((shelf) => {
        if (shelf.kind !== 'row' && shelf.kind !== 'more') return null;
        const key = shelf.kind === 'more' ? 'more' : shelf.tag;
        return (
          <StoryRow
            key={key}
            testID={`saved-row-${key}`}
            heading={shelf.kind === 'more' ? t('catalogue.moreStories') : rowHeading(shelf.tag)}
            stories={shelf.stories}
            cardWidth={rowCardWidth}
            edgeInset={margin}
            renderCard={renderRowCard(shelf.stories)}
          />
        );
      })}
    </View>
  );

  const profileView = (
    <ProfileView
      favourites={favouritesView}
      downloads={stories}
      downloadLimit={StoryAccessService.getDownloadLimit()}
      badges={badges}
      language={currentLanguage}
      width={contentWidth}
      onOpenDownload={handleOpenDownload}
      onDeleteDownload={handleDeleteStory}
      onSelectBadge={handleSelectBadge}
      onEditProfile={handleEditProfile}
      needsSignIn={session.needsSignIn}
      onLogin={handleSignIn}
      guideTargets={profileGuideTargets}
    />
  );

  return (
    <View style={styles.fill}>
    <JourneyShell
      navigationSlotKey="stories"
      selected={navSection}
      onSelect={handleNavSelect}
      navigationHidden={
        navSection === 'progress'
          ? badgeDetailOpen
          : navSection === 'profile'
            ? badgeDetailOpen || editProfileOpen
            : readerTakesScreen
      }
      screenTime={screenTime}
      navigationCollapsed={navCollapsed}
    >
      <CelestialBackground>
        <PlanetHeaderArtwork />

        <SectionCrossfade sectionKey={navSection} instant={sectionInstant}>
          {navSection === 'progress' ? (
            <ProgressScreen
              embedded
              onBack={handleExitJourney}
              onRecommend={handleRecommend}
              onDetailVisibleChange={setBadgeDetailOpen}
              guideTargets={progressGuideTargets}
              scrollBinding={progressScroller}
            />
          ) : (
            <View style={styles.fill}>
            <ScrollView
              testID="catalogue-scroll"
              ref={pageScroller.scrollRef}
              onScroll={pageScroller.onScroll}
              onLayout={pageScroller.onLayout}
              onContentSizeChange={pageScroller.onContentSizeChange}
              scrollEventThrottle={16}
              style={[styles.scroll, { bottom: navClearance(insets.bottom) }]}
              scrollIndicatorInsets={{ top: coverHeight }}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingTop: coverHeight + SPACE_3,
                  paddingHorizontal: margin,
                  paddingBottom: SPACE_4 + (textSizeScale - 1) * 40 + pageScroller.reserve,
                },
              ]}
              scrollEnabled={!interactionLocked}
            >
              {navSection !== 'search' && navSection !== 'profile' && (
                <View style={isTablet ? styles.filterBarSpacing : styles.filterBarSpacingPhone}>
                  <StoryFilterBar
                    theme={theme}
                    onSelectTheme={handleSelectTheme}
                    tags={FILTER_TAG_SET}
                    selectedTags={selectedTags}
                    onToggleTag={handleToggleTag}
                    tilesRef={themeTilesRef}
                    toggleRef={filterToggleRef}
                  />
                </View>
              )}

              {navSection === 'search' ? (
                <SearchPanel
                  stories={searchableStories}
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  recentSearches={recentSearches}
                  onClearRecent={clearRecentSearches}
                  onSearchSettled={recordSearch}
                  language={currentLanguage}
                  renderCard={(story) => renderCoverCard(story)}
                  guideTargets={searchGuideTargets}
                />
              ) : navSection === 'profile' ? (
                profileView
              ) : catalogueStories.length === 0 ? (
                <View style={styles.noResultsContainer}>
                  <Text style={[styles.noResultsText, { fontSize: scaledFontSize(16) }]}>
                    {t('catalogue.noResults')}
                  </Text>
                  {selectedTags.size > 0 && (
                    <Pressable style={styles.clearFilterButton} onPress={handleClearFilters}>
                      <Text style={[styles.clearFilterText, { fontSize: scaledFontSize(15) }]}>
                        {t('catalogue.clearFilters')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                // the shelves change wholesale when a theme or a filter is
                // tapped; without this they were replaced between one frame
                // and the next, which read as the page glitching
                <ContentSwap contentKey={collectionKey} testID="catalogue-collection">
                  {browsing ? (
                    moreSection
                  ) : layout.pickBesideFeatured && featured && todaysPick?.kind === 'pick' ? (
                    <>
                      <View style={styles.landscapeTopRow} testID="catalogue-top-row">
                        <View ref={featuredRef} collapsable={false}>{featuredSection}</View>
                        <FeaturedStoryCard
                          story={todaysPick.story}
                          width={layout.pickWidth}
                          language={currentLanguage}
                          label={t('catalogue.todaysPick')}
                          onOpen={handleOpenStory}
                          testID="todays-pick-card"
                        />
                      </View>
                      <View ref={shelvesRef} collapsable={false}>{shelvesView}</View>
                    </>
                  ) : (
                    <>
                      <View ref={featuredRef} collapsable={false}>{featuredSection}</View>
                      <View ref={shelvesRef} collapsable={false}>{shelvesView}</View>
                    </>
                  )}
                </ContentSwap>
              )}
            </ScrollView>
            <PlanetCover height={coverHeight} testID="catalogue-planet-over-shelves" />
            <View
              testID="catalogue-header"
              style={styles.header}
              pointerEvents="box-none"
              onLayout={onHeaderLayout}
            >
            <BalancedHeaderRow
              testID="catalogue-header-row"
              style={{ marginTop: journeyHeaderTop(insets.top, isTablet), marginHorizontal: margin }}
              left={
                <View ref={headerHomeRef} collapsable={false}>
                  <CircleActionButton
                    type="home"
                    label={t('common.home')}
                    onPress={handleExitJourney}
                    accessibilityLabel={t('common.home')}
                  />
                </View>
              }
              title={
                <PageTitle
                  title={
                    storyMode
                      ? t(`storyModes.${storyMode}`)
                      : navSection === 'search'
                        ? t('childUi.nav.search')
                        : navSection === 'profile'
                          ? t('childUi.nav.profile')
                          : t('stories.title')
                  }
                />
              }
              right={
                navSection === 'profile' ? (
                  <View ref={profileSettingsRef} collapsable={false}>
                    <CircleActionButton
                      type="settings"
                      label={t('home.grownUps')}
                      onPress={handleOpenSettings}
                      accessibilityLabel={t('home.grownUps')}
                    />
                  </View>
                ) : (
                  <CircleActionButton
                    type="audio"
                    muted={isMuted}
                    onPress={() => { void toggleMute(); }}
                    accessibilityLabel={t('catalogue.sound')}
                  />
                )
              }
            />
            {!storyMode && (
              <View style={[styles.tagline, { marginHorizontal: margin }]} pointerEvents="none">
                <PageTagline lines={TAGLINE_LINES[navSection](t)} width={contentWidth} />
              </View>
            )}
            </View>
            </View>
          )}
        </SectionCrossfade>

        <ScreenTimeGlance
          visible={showScreenTime}
          timeOfDay={timeOfDay}
          onClose={handleScreenTimeClosed}
          onCloseStart={handleScreenTimeCloseStart}
          origin={navItemCentre('screensafe', windowWidth, windowHeight, insets.bottom, isTablet)}
          exceeded={
            screenTime
              ? isScreenTimeExceeded(screenTime.usageSeconds, screenTime.limitSeconds)
              : false
          }
          usageSeconds={screenTime?.usageSeconds ?? 0}
          limitSeconds={screenTime?.limitSeconds ?? 0}
        />

        <SubscriptionOverlay
          visible={showSubscription}
          onClose={() => setShowSubscription(false)}
        />

        {navSection === 'profile' && (
          <>
            <BadgeDetailSheet
              badge={selectedBadge}
              onClose={handleCloseBadge}
              onRecommend={handleRecommendFromBadge}
            />
            <ProfileEditSheet visible={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
          </>
        )}

        <ParentsOnlyModal
          visible={parentsOnly.isVisible}
          challenge={parentsOnly.challenge}
          inputValue={parentsOnly.inputValue}
          onInputChange={parentsOnly.setInputValue}
          onSubmit={parentsOnly.handleSubmit}
          onClose={parentsOnly.handleClose}
          isInputValid={parentsOnly.isInputValid}
        />
      </CelestialBackground>
    </JourneyShell>

    {/* one tour per page, over the whole shell so the bar can be pointed at;
        each starts only while its own section is the one on show */}
    <OwlGuide
      id="catalogue_tour"
      active={isActive && navSection === 'home' && !interactionLocked}
      targets={catalogueTourTargets}
      scroller={pageScroller.scroller}
    />
    <OwlGuide
      id="progress_tour"
      active={isActive && navSection === 'progress'}
      targets={progressTourTargets}
      scroller={progressScroller.scroller}
    />
    <OwlGuide
      id="search_tour"
      active={isActive && navSection === 'search'}
      targets={searchTourTargets}
      scroller={pageScroller.scroller}
    />
    <OwlGuide
      id="profile_tour"
      active={isActive && navSection === 'profile' && !editProfileOpen}
      targets={profileTourTargets}
      scroller={pageScroller.scroller}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  tagline: {
    zIndex: 10,
  },
  scroll: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: SPACE_4,
  },
  // The chooser is a way in to the shelf, not a screenful: on a phone the
  // featured book follows it closely enough to be seen without scrolling
  filterBarSpacingPhone: {
    marginBottom: SPACE_3,
  },
  filterBarSpacing: {
    marginBottom: SPACE_5,
  },
  sectionHeadingSpacing: {
    marginBottom: SPACE_3,
    marginTop: SPACE_2,
  },
  coverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COVER_GRID_GAP,
  },
  shelves: {
    marginTop: SPACE_3,
  },
  pickSpacing: {
    marginTop: SPACE_2,
    marginBottom: SPACE_4,
  },
  landscapeTopRow: {
    flexDirection: 'row',
    gap: SPACE_5,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: SPACE_4,
  },
  noResultsText: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    textAlign: 'center',
  },
  clearFilterButton: {
    backgroundColor: SURFACE_SECONDARY,
    paddingHorizontal: SPACE_5,
    paddingVertical: SPACE_3,
    borderRadius: RADIUS_CONTROL,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  clearFilterText: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '600',
  },
});
