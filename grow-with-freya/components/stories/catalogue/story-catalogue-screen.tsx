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
import { CatalogEntry, Story, StoryFilterTag, getLocalizedText } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { BORDER_DEFAULT, SURFACE_SECONDARY, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
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
import { CircleActionButton } from '@/components/child-ui/circle-action-button';
import { PageTitle } from '@/components/child-ui/page-title';
import { SectionHeading } from '@/components/child-ui/section-heading';
import { JourneyShell } from '@/components/child-ui/journey-shell';
import { ChildNavItemId, navClearance } from '@/components/child-ui/child-bottom-navigation';
import {
  COVER_GRID_GAP,
  RADIUS_CONTROL,
  SPACE_2,
  SPACE_3,
  SPACE_4,
  SPACE_5,
  contentMargin,
} from '@/components/child-ui/tokens';
import { StoryPreviewModal } from '../story-preview-modal';
import {
  CatalogueMode,
  CatalogueStory,
  entryMatchesMode,
  fromCatalogEntry,
  fromStory,
  matchesGender,
  selectFeatured,
  storyMatchesMode,
} from './catalogue-story';
import { StoryFilterBar } from './story-filter-bar';
import { FeaturedStoryCard } from './featured-story-card';
import { StoryCoverCard } from './story-cover-card';

const FILTER_TAG_SET: StoryFilterTag[] = [
  'calming', 'bedtime', 'adventure', 'learning', 'music',
  'family', 'creativity', 'animals', 'friendship',
  'nature', 'fantasy', 'counting', 'emotions', 'silly', 'rhymes',
];

const COVER_COLUMNS = 3;

interface StoryCatalogueScreenProps {
  onStorySelect?: (story: Story) => void;
  initialMode?: CatalogueMode | null;
  onOpenParentCorner?: () => void;
}

export function StoryCatalogueScreen({ onStorySelect, initialMode, onOpenParentCorner }: StoryCatalogueScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { requestReturnToMainMenu, setShowLoginAfterOnboarding, getEffectiveTier, storyViewMode, setStoryViewMode } = useAppStore();
  const favoriteStoryIds = useAppStore((state) => state.favoriteStoryIds);
  const toggleFavoriteStory = useAppStore((state) => state.toggleFavoriteStory);
  const userAvatarType = useAppStore((state) => state.userAvatarType);
  const effectiveTier: SubscriptionTier = getEffectiveTier();
  const { startTransition, isTransitioning, selectedStoryId, shouldShowStoryReader, isExpandingToReader } = useStoryTransition();
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
  const [selectedTags, setSelectedTags] = useState<Set<StoryFilterTag>>(new Set());
  const [storyMode, setStoryMode] = useState<CatalogueMode | null>(initialMode ?? null);
  const [shareUnlockedIds, setShareUnlockedIds] = useState<Set<string>>(new Set());
  const [navSection, setNavSection] = useState<'home' | 'library'>('home');
  const [showSubscription, setShowSubscription] = useState(false);
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

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
    if (selectedTags.size === 0) return all;
    return all.filter((story) => Array.from(selectedTags).some((tag) => story.theme.includes(tag)));
  }, [stories, catalogEntries, userAvatarType, storyMode, effectiveTier, shareUnlockedIds, selectedTags, navSection]);

  const featured = useMemo(
    () => (storyViewMode === 'grid' || navSection === 'library' ? null : selectFeatured(catalogueStories)),
    [catalogueStories, storyViewMode, navSection],
  );

  const moreStories = useMemo(
    () => catalogueStories.filter((story) => story.id !== featured?.id),
    [catalogueStories, featured],
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

  const handleToggleView = useCallback(() => {
    setStoryViewMode(storyViewMode === 'grid' ? 'carousel' : 'grid');
  }, [storyViewMode, setStoryViewMode]);

  const handleExitJourney = useCallback(() => {
    const now = Date.now();
    if (now - lastBackRef.current < 500) return;
    lastBackRef.current = now;
    requestReturnToMainMenu();
  }, [requestReturnToMainMenu]);

  const handleNavSelect = useCallback((id: ChildNavItemId) => {
    if (id === 'home') {
      setNavSection('home');
      setStoryMode(null);
      setSelectedTags(new Set());
      return;
    }
    if (id === 'library') {
      setNavSection('library');
      return;
    }
    if (id === 'progress') {
      onOpenParentCorner?.();
    }
  }, [onOpenParentCorner]);

  const openDownloadedStory = useCallback((story: Story, position: { x: number; y: number; width: number; height: number }) => {
    startTransition(story.id, position, story);
    onStorySelect?.(story);
  }, [startTransition, onStorySelect]);

  const handleOpenStory = useCallback((catalogueStory: CatalogueStory, ref: React.RefObject<View | null>) => {
    if (catalogueStory.source.kind !== 'downloaded') return;
    const story = catalogueStory.source.story;
    if (!story.isAvailable) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (ref.current) {
      ref.current.measure((_x, _y, width, height, pageX, pageY) => {
        openDownloadedStory(story, { x: pageX, y: pageY, width, height });
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
    });
  }, [openDownloadedStory]);

  const handleReadFromPreview = useCallback((story: Story) => {
    handleOpenStory(fromStory(story), { current: null });
  }, [handleOpenStory]);

  const handleLongPress = useCallback((catalogueStory: CatalogueStory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (catalogueStory.source.kind === 'downloaded') {
      setPreviewStory(catalogueStory.source.story);
    } else {
      const entry = catalogueStory.source.entry;
      setPreviewStory({
        id: entry.storyId,
        title: entry.title,
        localizedTitle: entry.localizedTitle,
        description: entry.description,
        localizedDescription: entry.localizedDescription,
        category: entry.category,
        tags: entry.tags,
        coverImage: entry.thumbnailUrl,
        isAvailable: false,
        ageRange: entry.ageRange,
        duration: entry.duration,
        isFree: entry.isFree,
        isPremium: entry.isPremium,
        isReferralReward: entry.isReferralReward,
      });
    }
    setIsPreviewVisible(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setPreviewStory(null);
  }, []);

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

  const contentWidth = windowWidth - margin * 2;
  const gridAreaWidth = isLandscapeTablet ? (contentWidth - SPACE_5) * 0.55 : contentWidth;
  const coverWidth = Math.floor((gridAreaWidth - COVER_GRID_GAP * (COVER_COLUMNS - 1)) / COVER_COLUMNS);

  const isCardHidden = useCallback((storyId: string) =>
    interactionLocked && selectedStoryId === storyId,
  [interactionLocked, selectedStoryId]);

  const renderCoverCard = useCallback((story: CatalogueStory) => (
    <StoryCoverCard
      key={story.id}
      story={story}
      width={coverWidth}
      language={currentLanguage}
      onOpen={handleOpenStory}
      onLongPress={handleLongPress}
      onLockedPress={() => setShowSubscription(true)}
      onShareToUnlock={handleShareToUnlock}
      onDownloadComplete={refreshLibrary}
      onAuthError={handleAuthError}
      onDownloadLimitReached={handleDownloadLimitReached}
      hidden={isCardHidden(story.id)}
    />
  ), [coverWidth, currentLanguage, handleOpenStory, handleLongPress, handleShareToUnlock, refreshLibrary, handleAuthError, handleDownloadLimitReached, isCardHidden]);

  const featuredSection = featured && (
    <>
      <View style={styles.sectionHeadingSpacing}>
        <SectionHeading
          label={t('stories.genreStories', { genre: t(`stories.genres.${featured.category}`) })}
          testID="featured-section-heading"
        />
      </View>
      <View style={isTablet && !isLandscapeTablet ? styles.featuredCapped : undefined}>
        <FeaturedStoryCard
          story={featured}
          language={currentLanguage}
          onOpen={handleOpenStory}
          hidden={isCardHidden(featured.id)}
        />
      </View>
    </>
  );

  const moreSection = (
    <>
      <View style={styles.sectionHeadingSpacing}>
        <SectionHeading
          label={t(navSection === 'library' ? 'childUi.nav.library' : 'catalogue.moreStories')}
          testID="more-section-heading"
        />
      </View>
      <View style={styles.coverGrid} testID="story-cover-grid">
        {moreStories.map(renderCoverCard)}
      </View>
    </>
  );

  return (
    <JourneyShell selected={navSection} onSelect={handleNavSelect} navigationHidden={interactionLocked}>
      <CelestialBackground>
        <PlanetHeaderArtwork />

        <View
          style={[
            styles.headerRow,
            {
              marginTop: insets.top + SPACE_2,
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
            <PageTitle title={storyMode ? t(`storyModes.${storyMode}`) : t('stories.title')} />
          </View>
          <CircleActionButton
            type="audio"
            muted={isMuted}
            onPress={() => { void toggleMute(); }}
            accessibilityLabel={t('catalogue.sound')}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: margin,
              paddingBottom: navClearance(insets.bottom) + (textSizeScale - 1) * 40,
            },
          ]}
          scrollEnabled={!interactionLocked}
        >
          <View style={styles.filterBarSpacing}>
            <StoryFilterBar
              tags={FILTER_TAG_SET}
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
              gridActive={storyViewMode === 'grid'}
              onToggleView={handleToggleView}
            />
          </View>

          {catalogueStories.length === 0 ? (
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
          ) : isLandscapeTablet && featured ? (
            <View style={styles.landscapeColumns}>
              <View style={styles.landscapeFeaturedColumn}>{featuredSection}</View>
              <View style={styles.landscapeGridColumn}>{moreSection}</View>
            </View>
          ) : (
            <>
              {featuredSection}
              {moreSection}
            </>
          )}
        </ScrollView>

        <StoryPreviewModal
          story={previewStory}
          visible={isPreviewVisible}
          onClose={handleClosePreview}
          onReadStory={handleReadFromPreview}
          onDeleteStory={previewStory?.isAvailable && !StoryLoader.isLocalStory(previewStory.id) ? handleDeleteStory : undefined}
          isPreInstalled={previewStory ? StoryLoader.isLocalStory(previewStory.id) : false}
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
  scroll: {
    flex: 1,
    zIndex: 5,
  },
  scrollContent: {
    paddingTop: SPACE_4,
  },
  filterBarSpacing: {
    marginBottom: SPACE_5,
  },
  sectionHeadingSpacing: {
    marginBottom: SPACE_3,
    marginTop: SPACE_2,
  },
  featuredCapped: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
  },
  coverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COVER_GRID_GAP,
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
