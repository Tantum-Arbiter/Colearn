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
import { ACCENT_GOLD, BORDER_DEFAULT, SURFACE_SECONDARY, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { useAppStore, type SubscriptionTier } from '@/store/app-store';
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
  SPACE_3,
  SPACE_4,
  SPACE_5,
  contentMargin,
} from '@/components/child-ui/tokens';
import { ProgressScreen } from '@/components/progress/progress-screen';
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
  storyMatchesMode,
} from './catalogue-story';
import { StoryFilterBar } from './story-filter-bar';
import { FILTER_PILL_ICONS } from './story-filter-pill';
import { FeaturedStoryCard } from './featured-story-card';
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
const TAGLINE_LINES: Record<'home' | 'library' | 'saved' | 'screensafe', (t: (key: string) => string) => readonly [string, string]> = {
  home: (t) => [t('catalogue.tagline.one'), t('catalogue.tagline.two')],
  library: (t) => [t('catalogue.library.tagline.one'), t('catalogue.library.tagline.two')],
  saved: (t) => [t('catalogue.saved.tagline.one'), t('catalogue.saved.tagline.two')],
  // Screensafe opens a window rather than a section, so the bar it is pressed
  // from never changes what is behind it -- this is only here for the type
  screensafe: (t) => [t('catalogue.tagline.one'), t('catalogue.tagline.two')],
};

/** A book on a shelf row is a little narrower than one in the grid, so the next one shows. */
const ROW_CARD_SCALE = 0.86;

// Landscape books: two to a row on a phone, three on a tablet
const coverColumns = (isTablet: boolean) => (isTablet ? 3 : 2);
const LIBRARY_RECENT_LIMIT = 6;

export interface CatalogueSectionRequest {
  section: ChildNavItemId;
  key: number;
}

interface StoryCatalogueScreenProps {
  onStorySelect?: (story: Story) => void;
  /** Opens the music journey, for a saved song tapped from the shelf. */
  onNavigateToMusic?: () => void;
  initialMode?: CatalogueMode | null;
  sectionRequest?: CatalogueSectionRequest;
}

export function StoryCatalogueScreen({ onStorySelect, initialMode, sectionRequest, onNavigateToMusic }: StoryCatalogueScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { requestReturnToMainMenu, setShowLoginAfterOnboarding, getEffectiveTier } = useAppStore();
  const favoriteStoryIds = useAppStore((state) => state.favoriteStoryIds);
  const favoriteActivityIds = useAppStore((state) => state.favoriteActivityIds);
  const favoriteSongIds = useAppStore((state) => state.favoriteSongIds);
  const readStoryIds = useAppStore((state) => state.readStoryIds);
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
  const [navSection, setNavSection] = useState<ChildNavItemId>('home');
  const [badgeDetailOpen, setBadgeDetailOpen] = useState(false);
  const [showScreenTime, setShowScreenTime] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
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
    if (sectionRequest) {
      setNavSection(sectionRequest.section);
    }
  }, [sectionRequest]);

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

  const catalogueStories = useMemo(() => {
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

    const all = navSection === 'library'
      ? downloaded
      : [...downloaded, ...remote];
    const underTheme = filterByTheme(all, theme);
    if (selectedTags.size === 0) return underTheme;
    return underTheme.filter((story) => Array.from(selectedTags).some((tag) => story.theme.includes(tag)));
  }, [stories, catalogEntries, userAvatarType, storyMode, effectiveTier, shareUnlockedIds, theme, selectedTags, navSection]);

  // A book the child has installed, picked afresh each time the app opens and
  // held for that run, so it does not change under them as they browse
  const featured = useMemo(
    () => (navSection === 'library'
      ? null
      : selectFeatured(catalogueStories, { seed: APP_LAUNCH_SEED, isPreInstalled: StoryLoader.isLocalStory })),
    [catalogueStories, navSection],
  );

  // A finer theme chosen turns the whole shelf, featured panel included, into
  // one grid of what matches, headed by that theme
  const browsing = selectedTags.size > 0;

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
    () => (navSection === 'saved' ? buildSavedRows(savedStories) : []),
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
    if (id === 'home') {
      setStoryMode(null);
      setSelectedTags(new Set());
      }
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

  const handleShareToUnlock = useCallback(async (entry: CatalogEntry) => {
    try {
      const result = await Share.share({
        message: `Check out "${entry.title}" on Grow with Freya! A magical story app for kids`,
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
  const gridAreaWidth = isLandscapeTablet ? (contentWidth - SPACE_5) * 0.55 : contentWidth;
  const columns = coverColumns(isTablet);
  const coverWidth = Math.floor((gridAreaWidth - COVER_GRID_GAP * (columns - 1)) / columns);
  // The featured book's width on the shelf: its own column on a landscape
  // tablet, otherwise the full content width, from the left margin
  const featuredWidth = isLandscapeTablet
    ? Math.floor((contentWidth - SPACE_5) * 0.45)
    : contentWidth;

  const rowCardWidth = Math.floor(coverWidth * ROW_CARD_SCALE);

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
          return (
            <View key="pick" style={styles.pickSpacing}>
              <FeaturedStoryCard
                story={shelf.story}
                width={isLandscapeTablet ? Math.floor(gridAreaWidth) : featuredWidth}
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
              edgeInset={isLandscapeTablet ? 0 : margin}
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
            edgeInset={isLandscapeTablet ? 0 : margin}
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

  const librarySections = useMemo(() => {
    if (navSection !== 'library') return [];
    const byId = new Map(catalogueStories.map((story) => [story.id, story]));
    const recentlyRead = [...readStoryIds]
      .reverse()
      .map((id) => byId.get(id))
      .filter((story): story is CatalogueStory => story !== undefined)
      .slice(0, LIBRARY_RECENT_LIMIT);
    const favourites = catalogueStories.filter((story) => favoriteStoryIds.includes(story.id));
    const newToYou = catalogueStories.filter((story) => !readStoryIds.includes(story.id));

    return [
      { id: 'recentlyRead', labelKey: 'catalogue.library.recentlyRead', stories: recentlyRead },
      { id: 'favourites', labelKey: 'catalogue.library.favourites', stories: favourites },
      { id: 'newToYou', labelKey: 'catalogue.library.newToYou', stories: newToYou },
      { id: 'onThisDevice', labelKey: 'catalogue.library.onThisDevice', stories: catalogueStories },
    ].filter((section) => section.stories.length > 0);
  }, [navSection, catalogueStories, readStoryIds, favoriteStoryIds]);

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
      edgeInset={isLandscapeTablet ? 0 : margin}
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
      edgeInset={isLandscapeTablet ? 0 : margin}
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

  const savedView = savedRows.length === 0 && savedActivities.length === 0 && savedSongs.length === 0 ? (
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
            edgeInset={isLandscapeTablet ? 0 : margin}
            renderCard={renderRowCard(shelf.stories)}
          />
        );
      })}
    </View>
  );

  const librarySectionsView = (
    <>
      {librarySections.map((section) => (
        <View key={section.id} testID={`library-section-${section.id}`}>
          <View style={styles.sectionHeadingSpacing}>
            <SectionHeading label={t(section.labelKey)} testID={`library-heading-${section.id}`} />
          </View>
          <View style={styles.coverGrid}>{section.stories.map((story) => renderCoverCard(story))}</View>
        </View>
      ))}
    </>
  );

  return (
    <JourneyShell
      selected={navSection}
      onSelect={handleNavSelect}
      navigationHidden={navSection === 'progress' ? badgeDetailOpen : interactionLocked}
      screenTime={screenTime}
      navigationCollapsed={navCollapsed}
    >
      <CelestialBackground>
        <PlanetHeaderArtwork />

        <SectionCrossfade sectionKey={navSection}>
          {navSection === 'progress' ? (
            <ProgressScreen
              embedded
              onBack={() => handleNavSelect('home')}
              onRecommend={handleRecommend}
              onDetailVisibleChange={setBadgeDetailOpen}
            />
          ) : (
            <>
            <View
              style={[
                styles.headerRow,
                {
                  marginTop: insets.top + (isTablet ? SPACE_2 : 0),
                  marginHorizontal: margin,
                },
              ]}
            >
              <CircleActionButton
                type="back"
                onPress={handleExitJourney}
                accessibilityLabel={t('common.back')}
              />
              <View style={styles.titleWrapper}>
                <PageTitle
                  title={
                    storyMode
                      ? t(`storyModes.${storyMode}`)
                      : navSection === 'library'
                        ? t('childUi.nav.library')
                        : navSection === 'saved'
                          ? t('childUi.nav.saved')
                          : t('stories.title')
                  }
                />
              </View>
              <CircleActionButton
                type="audio"
                muted={isMuted}
                onPress={() => { void toggleMute(); }}
                accessibilityLabel={t('catalogue.sound')}
              />
            </View>
            {!storyMode && (
              <View style={[styles.tagline, { marginHorizontal: margin }]}>
                <PageTagline lines={TAGLINE_LINES[navSection](t)} width={contentWidth} />
              </View>
            )}

            <ScrollView
              style={[styles.scroll, { marginBottom: navClearance(insets.bottom) }]}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingTop: isTablet ? SPACE_4 : 0,
                  paddingHorizontal: margin,
                  paddingBottom: SPACE_4 + (textSizeScale - 1) * 40,
                },
              ]}
              scrollEnabled={!interactionLocked}
            >
              <View style={isTablet ? styles.filterBarSpacing : styles.filterBarSpacingPhone}>
                <StoryFilterBar
                  theme={theme}
                  onSelectTheme={handleSelectTheme}
                  tags={FILTER_TAG_SET}
                  selectedTags={selectedTags}
                  onToggleTag={handleToggleTag}
                />
              </View>

              {navSection === 'saved' ? (
                savedView
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
              ) : navSection === 'library' ? (
                librarySectionsView
              ) : browsing ? (
                moreSection
              ) : isLandscapeTablet && featured ? (
                <View style={styles.landscapeColumns}>
                  <View style={styles.landscapeFeaturedColumn}>{featuredSection}</View>
                  <View style={styles.landscapeGridColumn}>{shelvesView}</View>
                </View>
              ) : (
                <>
                  {featuredSection}
                  {shelvesView}
                </>
              )}
            </ScrollView>
            </>
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
      </CelestialBackground>
    </JourneyShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  titleWrapper: {
    flex: 1,
  },
  tagline: {
    zIndex: 10,
  },
  scroll: {
    flex: 1,
    zIndex: 5,
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
  landscapeColumns: {
    flexDirection: 'row',
    gap: SPACE_5,
  },
  landscapeFeaturedColumn: {
    flex: 0.45,
  },
  landscapeGridColumn: {
    flex: 0.55,
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
