import React, { useCallback, useRef, useEffect, useMemo, useState, memo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, FlatList, Pressable, ListRenderItem, findNodeHandle, UIManager } from 'react-native';
import { Image } from 'expo-image';
// All story images are loaded from local cache after batch sync - no authenticated fetching needed
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ALL_STORIES } from '@/data/stories';
import { Story, StoryCategory, StoryFilterTag, STORY_FILTER_TAGS, CatalogEntry, getLocalizedText } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { StoryLoader } from '@/services/story-loader';
import { CatalogService } from '@/services/catalog-service';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';

import { mainMenuStyles } from '@/components/main-menu/styles';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { PageHeader } from '@/components/ui/page-header';
import { useAccessibility } from '@/hooks/use-accessibility';
import { StoryPreviewModal } from './story-preview-modal';
import { CatalogStoryCard } from './catalog-story-card';
import type { SupportedLanguage } from '@/services/i18n';

// White Ionicons icon for each filter tag (replaces coloured emojis)
const TAG_ICONS: Record<StoryFilterTag, keyof typeof Ionicons.glyphMap> = {
  personalized: 'person-outline',
  calming: 'leaf-outline',
  bedtime: 'moon-outline',
  adventure: 'compass-outline',
  learning: 'book-outline',
  music: 'musical-notes-outline',
  'family-exercises': 'people-outline',
  'imagination-games': 'color-palette-outline',
  animals: 'paw-outline',
  friendship: 'heart-outline',
  nature: 'flower-outline',
  fantasy: 'sparkles-outline',
  counting: 'calculator-outline',
  emotions: 'happy-outline',
  silly: 'happy-outline',
  rhymes: 'chatbubble-ellipses-outline',
};

// Constants for card dimensions - defined once, not on every render
const CARD_WIDTH = 160;
const CARD_HEIGHT = 120;
const CARD_MARGIN = 15;
const ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;

interface StorySelectionScreenProps {
  onStorySelect?: (story: Story) => void;
}

interface StoryCardProps {
  story: Story;
  onPress: (story: Story, ref: React.RefObject<View | null>) => void;
  onLongPress: (story: Story, ref: React.RefObject<View | null>) => void;
  cardWidth: number;
  cardHeight: number;
  borderRadius: number;
  emojiFontSize: number;
  isHidden?: boolean; // Hide when this card is being animated in the transition overlay
  isUnread?: boolean; // Show shimmer effect for unread stories
  language: SupportedLanguage;
}

// Memoized story card component - prevents re-renders during scroll
const StoryCard = memo(function StoryCard({
  story,
  onPress,
  onLongPress,
  cardWidth,
  cardHeight,
  borderRadius,
  emojiFontSize,
  isHidden,
  isUnread,
  language,
}: StoryCardProps) {
  const cardRef = useRef<View>(null);
  const displayTitle = getLocalizedText(story.localizedTitle, story.title, language);

  // Track previous hidden state to detect when card becomes visible again
  const wasHiddenRef = useRef(isHidden);
  const fadeOpacity = useSharedValue(isHidden ? 0 : 1);

  // Shimmer animation for unread stories — slides a highlight across the card periodically
  const shimmerTranslate = useSharedValue(-cardWidth);

  useEffect(() => {
    if (isUnread && !isHidden) {
      // Periodic shimmer: slide across, pause 3s, repeat
      shimmerTranslate.value = -cardWidth;
      shimmerTranslate.value = withRepeat(
        withSequence(
          withTiming(cardWidth * 1.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withDelay(3000, withTiming(-cardWidth, { duration: 0 }))
        ),
        -1,
        false
      );
    } else {
      shimmerTranslate.value = -cardWidth;
    }
  }, [isUnread, isHidden, cardWidth]);

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }],
  }));

  // Fade in when transitioning from hidden to visible (Android fix)
  useEffect(() => {
    if (wasHiddenRef.current && !isHidden) {
      // Was hidden, now visible - fade in
      fadeOpacity.value = 0;
      fadeOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else if (isHidden) {
      // Becoming hidden - instant
      fadeOpacity.value = 0;
    }
    wasHiddenRef.current = isHidden;
  }, [isHidden]);

  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const handlePress = useCallback(() => {
    // Pass the ref to onPress so the parent can measure position
    onPress(story, cardRef);
  }, [story, onPress]);

  // Pass the ref to onLongPress so we can use it when "Read Story" is pressed from preview
  const handleLongPress = useCallback(() => onLongPress(story, cardRef), [story, onLongPress]);

  // When hidden, render an invisible placeholder to maintain layout but hide content completely
  if (isHidden) {
    return (
      <View ref={cardRef} collapsable={false} style={styles.cardPressable}>
        <View style={[styles.card, { width: cardWidth, height: cardHeight, borderRadius, opacity: 0 }]} />
        <View style={[styles.cardTitleContainer, { width: cardWidth }]}>
          <Text style={[styles.cardTitle, { opacity: 0 }]} numberOfLines={2}>{displayTitle}</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View ref={cardRef} collapsable={false} style={fadeAnimatedStyle}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={styles.cardPressable}
      >
        {/* Cover Image - loaded from local cache after batch sync */}
        <View style={[styles.card, { width: cardWidth, height: cardHeight, borderRadius }]}>
          {story.coverImage ? (
            <Image
              source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
              style={[styles.coverImage, { width: cardWidth, height: cardHeight, borderRadius }]}
              contentFit="cover"
              transition={0} // Prevent flicker on remount - works on iOS and Android
              cachePolicy="memory-disk" // Use aggressive caching
            />
          ) : (
            <View style={[styles.placeholderContainer, { width: cardWidth, height: cardHeight, borderRadius }]}>
              <Text style={{ fontSize: emojiFontSize }}>{story.emoji}</Text>
            </View>
          )}

          {/* Shimmer overlay for unread stories */}
          {isUnread && (
            <Animated.View
              style={[
                styles.shimmerOverlay,
                { borderRadius },
                shimmerAnimatedStyle,
              ]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.45)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          )}
        </View>
        {/* Story title below the cover */}
        <View style={[styles.cardTitleContainer, { width: cardWidth }]}>
          <Text style={styles.cardTitle} numberOfLines={2}>{displayTitle}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const { width: screenWidth } = Dimensions.get('window');

export function StorySelectionScreen({ onStorySelect }: StorySelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { requestReturnToMainMenu } = useAppStore();
  const { startTransition, isTransitioning, selectedStoryId, shouldShowStoryReader, isExpandingToReader } = useStoryTransition();
  const lastCallRef = useRef<number>(0);
  const { scaledFontSize, scaledButtonSize, scaledPadding, textSizeScale } = useAccessibility();
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;

  // Pre-calculate scaled dimensions once (not on every render item)
  const scaledCardW = scaledButtonSize(CARD_WIDTH);
  const scaledCardH = scaledButtonSize(CARD_HEIGHT);
  const scaledBorderRadius = scaledButtonSize(15);
  const scaledEmojiFontSize = scaledFontSize(48);

  // Load stories from StoryLoader with instant cache support
  // If stories are already cached (from previous visit), use them immediately - no flicker
  const initialStories = useMemo(() => {
    const cached = StoryLoader.getCachedStories();
    if (cached && cached.length > 0) {
      return cached;
    }
    return ALL_STORIES;
  }, []);

  const [stories, setStories] = useState<Story[]>(initialStories);
  const [isLoadingStories, setIsLoadingStories] = useState(!StoryLoader.getCachedStories());
  const [selectedTags, setSelectedTags] = useState<Set<StoryFilterTag>>(new Set());

  // Catalog entries (not-yet-downloaded stories) merged into genre rows
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([]);

  // Union type for items in genre carousels: either a downloaded story or a catalog entry
  type StoryDisplayItem = { type: 'story'; data: Story } | { type: 'catalog'; data: CatalogEntry };

  // Get favorite and read story IDs from store
  const favoriteStoryIds = useAppStore((state) => state.favoriteStoryIds);
  const readStoryIds = useAppStore((state) => state.readStoryIds);

  // Filter stories based on selected tags (OR logic - match any selected tag)
  const filteredStories = useMemo(() => {
    if (selectedTags.size === 0) return stories;
    return stories.filter(story =>
      Array.from(selectedTags).some(tag => story.tags?.includes(tag))
    );
  }, [stories, selectedTags]);

  // Get favorite stories (respects current filters)
  const favoriteStories = useMemo(() => {
    return filteredStories.filter(story => favoriteStoryIds.includes(story.id));
  }, [filteredStories, favoriteStoryIds]);

  // Available filter tags - all 16 children's genres (including personalized)
  const filterTags: StoryFilterTag[] = [
    'personalized', 'calming', 'bedtime', 'adventure', 'learning', 'music',
    'family-exercises', 'imagination-games', 'animals', 'friendship',
    'nature', 'fantasy', 'counting', 'emotions', 'silly', 'rhymes'
  ];

  const handleTagPress = useCallback((tag: StoryFilterTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  // Story preview modal state
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  // Store the card ref for the currently previewed story so we can animate from it
  const previewCardRef = useRef<React.RefObject<View | null> | null>(null);

  const handleLongPress = useCallback((story: Story, cardRef: React.RefObject<View | null>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPreviewStory(story);
    setIsPreviewVisible(true);
    // Store the ref so we can use it when "Read Story" is pressed
    previewCardRef.current = cardRef;
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setPreviewStory(null);
    previewCardRef.current = null;
  }, []);

  // All story images are loaded from local cache after batch sync
  // No need for warm cache - images are already local file paths

  // Load stories - instant if cached, async if first load
  useEffect(() => {
    // If we already have cached stories, use them immediately
    const cachedStories = StoryLoader.getCachedStories();
    if (cachedStories && cachedStories.length > 0) {
      // Always update state with cached stories - fixes race condition where
      // initial state was ALL_STORIES but cache was populated during auth flow
      setStories(cachedStories);
      setIsLoadingStories(false);
      return;
    }

    // First load - defer until after page transition to prevent jitter
    const timeoutId = setTimeout(() => {
      const loadStories = async () => {
        try {
          const loadedStories = await StoryLoader.getStories();
          setStories(loadedStories);
        } catch {
          // Fallback to ALL_STORIES already set in state
        } finally {
          setIsLoadingStories(false);
        }
      };

      loadStories();
    }, 600); // Wait for page transition (500ms + 100ms buffer)

    return () => clearTimeout(timeoutId);
  }, []);

  // Load catalog entries for not-yet-downloaded stories
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const entries = await CatalogService.getCatalog();
        setCatalogEntries(entries);
      } catch {
        // No catalog available yet — that's fine
      }
    };
    loadCatalog();
  }, []);

  // When a catalog story finishes downloading, refresh both stories list and catalog
  const handleCatalogDownloadComplete = useCallback(async (_storyId: string) => {
    try {
      // Invalidate StoryLoader cache so it picks up the newly downloaded story
      StoryLoader.invalidateCache();
      // Refresh the downloaded stories list
      const loadedStories = await StoryLoader.getStories();
      setStories(loadedStories);
      // Refresh catalog (entry was removed by StoryDownloadService)
      const entries = await CatalogService.getCatalog();
      setCatalogEntries(entries);
    } catch {
      // Best-effort refresh
    }
  }, []);

  // Generate star positions for background
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation
  const starRotation = useSharedValue(0);

  // PERFORMANCE: Defer star animation until after page transition to prevent jitter
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      starRotation.value = withRepeat(
        withTiming(360, {
          duration: 20000, // 20 second rotation cycle
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }, 600); // Wait for page transition (500ms + 100ms buffer)

    return () => clearTimeout(timeoutId);
  }, []);

  // Animated style for star rotation
  const starAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${starRotation.value}deg` }],
    };
  });

  // Preferred genre order - personalized first, then others
  const GENRE_ORDER: StoryCategory[] = [
    'personalized', 'bedtime', 'adventure', 'nature', 'friendship',
    'learning', 'fantasy', 'music', 'activities', 'growing'
  ];

  // Build unified genre map: downloaded stories + catalog entries merged per category
  const { availableGenres, genreItems } = useMemo(() => {
    const itemMap: Record<string, StoryDisplayItem[]> = {};

    // Add downloaded stories
    filteredStories.forEach(story => {
      const cat = story.category;
      if (!itemMap[cat]) itemMap[cat] = [];
      itemMap[cat].push({ type: 'story', data: story });
    });

    // Add catalog entries into their category rows
    catalogEntries.forEach(entry => {
      const cat = entry.category;
      if (!itemMap[cat]) itemMap[cat] = [];
      // Avoid duplicates (story already downloaded)
      const isDuplicate = itemMap[cat].some(
        item => item.type === 'story' && item.data.id === entry.storyId
      );
      if (!isDuplicate) {
        itemMap[cat].push({ type: 'catalog', data: entry });
      }
    });

    const genres = Object.keys(itemMap)
      .filter(g => itemMap[g].length > 0)
      .sort((a, b) => {
        const aIndex = GENRE_ORDER.indexOf(a as StoryCategory);
        const bIndex = GENRE_ORDER.indexOf(b as StoryCategory);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });

    return { availableGenres: genres, genreItems: itemMap };
  }, [filteredStories, catalogEntries]);

  const handleBackToMenu = useCallback(() => {
    // Debounce rapid back button presses (500ms)
    const now = Date.now();
    if (now - lastCallRef.current < 500) {
      return; // Ignore rapid presses
    }
    lastCallRef.current = now;


    requestReturnToMainMenu();
  }, [requestReturnToMainMenu]);

  const handleStoryPress = useCallback((story: Story, pressableRef?: any) => {
    if (!story.isAvailable) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Use the provided ref, or fall back to the stored preview card ref
    const refToUse = pressableRef || previewCardRef.current;

    // Get the card position for transition animation
    if (refToUse && refToUse.current) {
      refToUse.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        startTransition(story.id, { x: pageX, y: pageY, width, height }, story);

        // Also call the onStorySelect callback for app navigation
        if (onStorySelect) {
          onStorySelect(story);
        }
      });
    } else {
      // Last resort fallback - use a default centered position for the animation
      const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
      const fallbackWidth = 160;
      const fallbackHeight = 120;
      const fallbackX = (screenWidth - fallbackWidth) / 2;
      const fallbackY = (screenHeight - fallbackHeight) / 2;

      startTransition(story.id, { x: fallbackX, y: fallbackY, width: fallbackWidth, height: fallbackHeight }, story);

      if (onStorySelect) {
        onStorySelect(story);
      }
    }
  }, [onStorySelect, startTransition]);

  // Preview for catalog entries — build a lightweight Story-like object for the preview modal
  const handleCatalogPreview = useCallback((entry: CatalogEntry) => {
    console.log(`[StorySelection] Preview catalog entry: ${entry.storyId}, thumbnailUrl: ${entry.thumbnailUrl || 'NONE'}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const previewAsStory: Story = {
      id: entry.storyId,
      title: entry.title,
      localizedTitle: entry.localizedTitle,
      description: entry.description,
      localizedDescription: entry.localizedDescription,
      category: entry.category,
      tag: entry.tag || entry.category,
      tags: entry.tags,
      emoji: entry.emoji,
      coverImage: entry.thumbnailUrl,
      isAvailable: false, // Not downloaded — prevents "Read Story" button
      ageRange: entry.ageRange,
      duration: entry.duration,
      isFree: entry.isFree,
      isPremium: entry.isPremium,
      isReferralReward: entry.isReferralReward,
    };
    setPreviewStory(previewAsStory);
    setIsPreviewVisible(true);
  }, []);

  // Render a single display item (downloaded story or catalog entry)
  const renderDisplayItem: ListRenderItem<StoryDisplayItem> = useCallback(({ item }) => {
    if (item.type === 'story') {
      const story = item.data;
      return (
        <StoryCard
          story={story}
          onPress={handleStoryPress}
          onLongPress={handleLongPress}
          cardWidth={scaledCardW}
          cardHeight={scaledCardH}
          borderRadius={scaledBorderRadius}
          emojiFontSize={scaledEmojiFontSize}
          isHidden={(isTransitioning || shouldShowStoryReader || isExpandingToReader) && selectedStoryId === story.id}
          isUnread={story.isAvailable && !readStoryIds.includes(story.id)}
          language={currentLanguage}
        />
      );
    }
    // Catalog entry — show download card with long-press for preview
    return (
      <CatalogStoryCard
        entry={item.data}
        cardWidth={scaledCardW}
        cardHeight={scaledCardH}
        borderRadius={scaledBorderRadius}
        language={currentLanguage}
        onDownloadComplete={handleCatalogDownloadComplete}
        onLongPress={handleCatalogPreview}
      />
    );
  }, [handleStoryPress, handleLongPress, scaledCardW, scaledCardH, scaledBorderRadius, scaledEmojiFontSize, isTransitioning, selectedStoryId, shouldShowStoryReader, isExpandingToReader, currentLanguage, readStoryIds, handleCatalogDownloadComplete, handleCatalogPreview]);

  // Memoized render function for story cards (favorites only — pure Story[])
  const renderStoryCard: ListRenderItem<Story> = useCallback(({ item: story }) => (
    <StoryCard
      story={story}
      onPress={handleStoryPress}
      onLongPress={handleLongPress}
      cardWidth={scaledCardW}
      cardHeight={scaledCardH}
      borderRadius={scaledBorderRadius}
      emojiFontSize={scaledEmojiFontSize}
      isHidden={(isTransitioning || shouldShowStoryReader || isExpandingToReader) && selectedStoryId === story.id}
      isUnread={story.isAvailable && !readStoryIds.includes(story.id)}
      language={currentLanguage}
    />
  ), [handleStoryPress, handleLongPress, scaledCardW, scaledCardH, scaledBorderRadius, scaledEmojiFontSize, isTransitioning, selectedStoryId, shouldShowStoryReader, isExpandingToReader, currentLanguage, readStoryIds]);

  // Key extractors
  const keyExtractor = useCallback((story: Story) => story.id, []);
  const displayItemKeyExtractor = useCallback((item: StoryDisplayItem) =>
    item.type === 'story' ? item.data.id : `catalog-${item.data.storyId}`, []);

  // Memoized getItemLayout for fast scrolling
  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
  }), []);

  // CENTERED CAROUSELS WITH STARRY BACKGROUND
  return (
    <LinearGradient
      colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
      style={{ flex: 1 }}
    >
      {/* Bear top background image */}
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>

      {/* Animated Stars */}
      {starPositions.map((star, index) => (
        <Animated.View
          key={`star-${star.id}`}
          style={[
            {
              position: 'absolute',
              width: VISUAL_EFFECTS.STAR_SIZE,
              height: VISUAL_EFFECTS.STAR_SIZE,
              backgroundColor: 'white',
              borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
              opacity: star.opacity,
              left: star.left,
              top: star.top,
              zIndex: 2,
            },
            starAnimatedStyle,
          ]}
        />
      ))}

      {/* Shared page header component */}
      <PageHeader title="Stories" onBack={handleBackToMenu} hideControls={isTransitioning} useHomeIcon />

      {/* Content container with flex: 1 for proper layout - dynamic padding for scaled text */}
      <View style={{ flex: 1, paddingTop: insets.top + 90 + (textSizeScale - 1) * 40, zIndex: 10 }}>

        {/* Tag Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagScrollView}
          contentContainerStyle={styles.tagContainer}
        >
          {filterTags.map((tag) => {
            const tagInfo = STORY_FILTER_TAGS[tag];
            const isSelected = selectedTags.has(tag);
            const tagLabel = t(tagInfo.labelKey);
            return (
              <Pressable
                key={tag}
                style={[
                  styles.tagButton,
                  isSelected && { backgroundColor: tagInfo.color }
                ]}
                onPress={() => handleTagPress(tag)}
              >
                <Ionicons name={TAG_ICONS[tag]} size={14} color="#FFFFFF" style={styles.tagIcon} />
                <Text style={[styles.tagLabel, { fontSize: scaledFontSize(12) }]}>
                  {tagLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Stories Carousels */}
        {/* Disable scrolling when a story is selected to prevent position drift */}
        <ScrollView style={{ flex: 1 }} scrollEnabled={!isTransitioning && !shouldShowStoryReader && !isExpandingToReader}>
          {availableGenres.length === 0 && selectedTags.size > 0 && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                No stories found with selected filters
              </Text>
              <Pressable
                style={styles.clearFilterButton}
                onPress={() => setSelectedTags(new Set())}
              >
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </Pressable>
            </View>
          )}

          {/* Your Favorites Carousel - shown only if there are favorites */}
          {favoriteStories.length > 0 && (
            <View style={{ marginBottom: 40 }}>
              <Text style={{
                color: '#FFD700',
                fontSize: 24,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 15,
                textShadowColor: 'rgba(0, 0, 0, 0.9)',
                textShadowOffset: { width: 0, height: 3 },
                textShadowRadius: 6,
              }}>
                ⭐ {t('stories.yourFavorites', { defaultValue: 'Your Favorites' })}
              </Text>
              <FlatList
                data={favoriteStories}
                renderItem={renderStoryCard}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={false}
                getItemLayout={getItemLayout}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={7}
                initialNumToRender={3}
                updateCellsBatchingPeriod={50}
                decelerationRate="fast"
                snapToInterval={ITEM_WIDTH}
                snapToAlignment="start"
                contentContainerStyle={styles.carouselContent}
                scrollEnabled={!isTransitioning && !shouldShowStoryReader && !isExpandingToReader}
              />
            </View>
          )}

          {availableGenres.map((genre) => {
            const items = genreItems[genre] || [];
            // Use translated genre name
            const genreName = t(`stories.genres.${genre}`, { defaultValue: genre.charAt(0).toUpperCase() + genre.slice(1) });
            const genreHeading = genre === 'personalized'
              ? t('stories.filterTags.personalized', { defaultValue: 'Your Story' })
              : t('stories.genreStories', { genre: genreName, defaultValue: `${genreName} Stories` });

            return (
              <View key={genre} style={{ marginBottom: 40 }}>
                {/* Centered Genre Heading - Shadow only */}
                <Text style={{
                  color: 'white',
                  fontSize: 24,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  marginBottom: 15,
                  textShadowColor: 'rgba(0, 0, 0, 0.9)',
                  textShadowOffset: { width: 0, height: 3 },
                  textShadowRadius: 6,
                }}>
                  {genreHeading}
                </Text>

                {/* Horizontal Carousel — merged downloaded + catalog items */}
                <FlatList
                  data={items}
                  renderItem={renderDisplayItem}
                  keyExtractor={displayItemKeyExtractor}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={5}
                  windowSize={7}
                  initialNumToRender={3}
                  updateCellsBatchingPeriod={50}
                  decelerationRate="fast"
                  snapToInterval={ITEM_WIDTH}
                  snapToAlignment="start"
                  contentContainerStyle={styles.carouselContent}
                  scrollEnabled={!isTransitioning && !shouldShowStoryReader && !isExpandingToReader}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Story Preview Modal */}
      <StoryPreviewModal
        story={previewStory}
        visible={isPreviewVisible}
        onClose={handleClosePreview}
        onReadStory={(story) => handleStoryPress(story)}
      />
    </LinearGradient>
  );
}

// Static styles - created once, not on every render
const styles = StyleSheet.create({
  cardPressable: {
    marginRight: CARD_MARGIN,
  },
  card: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  coverImage: {
    // Dynamic width/height/borderRadius applied via inline style
    // Background color prevents flash while image loads
    backgroundColor: '#e8e8e8',
  },
  placeholderContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  cardTitle: {
    color: 'white',
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    minHeight: 32, // Space for 2 lines
  },
  carouselContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tagScrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  tagContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  tagIcon: {
    marginRight: 2,
  },
  tagLabel: {
    color: 'white',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    color: 'white',
    fontFamily: Fonts.rounded,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  clearFilterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  clearFilterText: {
    color: 'white',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '60%',
    overflow: 'hidden',
  },
  shimmerGradient: {
    flex: 1,
    width: '100%',
  },
});
