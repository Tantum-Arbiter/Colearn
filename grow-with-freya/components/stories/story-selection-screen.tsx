import React, { useCallback, useRef, useEffect, useMemo, useState, memo, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, FlatList, Pressable, ListRenderItem, findNodeHandle, UIManager } from 'react-native';
import { Image } from 'expo-image';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';
import { AuthenticatedImageService } from '@/services/authenticated-image-service';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ALL_STORIES, getRandomStory } from '@/data/stories';
import { Story } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { StoryLoader } from '@/services/story-loader';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';

import { mainMenuStyles } from '@/components/main-menu/styles';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { PageHeader } from '@/components/ui/page-header';
import { useAccessibility } from '@/hooks/use-accessibility';
import { StoryPreviewModal } from './story-preview-modal';

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
  onPress: (story: Story, ref: React.RefObject<View>) => void;
  onLongPress: (story: Story) => void;
  cardWidth: number;
  cardHeight: number;
  borderRadius: number;
  emojiFontSize: number;
  isHidden?: boolean; // Hide when this card is being animated in the transition overlay
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
}: StoryCardProps) {
  const cardRef = useRef<View>(null);

  const handlePress = useCallback(() => {
    // Pass the ref to onPress so the parent can measure position
    onPress(story, cardRef);
  }, [story, onPress]);

  const handleLongPress = useCallback(() => onLongPress(story), [story, onLongPress]);

  // When hidden, render an invisible placeholder to maintain layout but hide content completely
  if (isHidden) {
    return (
      <View ref={cardRef} collapsable={false} style={styles.cardPressable}>
        <View style={[styles.card, { width: cardWidth, height: cardHeight, borderRadius, opacity: 0 }]} />
      </View>
    );
  }

  return (
    <View ref={cardRef} collapsable={false}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={styles.cardPressable}
      >
        <View style={[styles.card, { width: cardWidth, height: cardHeight, borderRadius }]}>
          {story.coverImage ? (
            typeof story.coverImage === 'string' && story.coverImage.includes('api.colearnwithfreya.co.uk') ? (
              <AuthenticatedImage
                uri={story.coverImage}
                style={[styles.coverImage, { width: cardWidth, height: cardHeight, borderRadius }]}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
                style={[styles.coverImage, { width: cardWidth, height: cardHeight, borderRadius }]}
                contentFit="cover"
                transition={0} // Prevent flicker on remount - works on iOS and Android
                cachePolicy="memory-disk" // Use aggressive caching
              />
            )
          ) : (
            <View style={[styles.placeholderContainer, { width: cardWidth, height: cardHeight, borderRadius }]}>
              <Text style={{ fontSize: emojiFontSize }}>{story.emoji}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
});

const { width: screenWidth } = Dimensions.get('window');

export function StorySelectionScreen({ onStorySelect }: StorySelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { requestReturnToMainMenu } = useAppStore();
  const { startTransition, isTransitioning, selectedStoryId, shouldShowStoryReader, isExpandingToReader } = useStoryTransition();
  const lastCallRef = useRef<number>(0);
  const surpriseButtonRef = useRef<View>(null);
  const { scaledFontSize, scaledButtonSize, scaledPadding, textSizeScale } = useAccessibility();

  // Animation for Surprise Me button (slide down when transitioning)
  const surpriseButtonTranslateY = useSharedValue(0);

  useEffect(() => {
    if (isTransitioning) {
      surpriseButtonTranslateY.value = withTiming(200, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      surpriseButtonTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    }
  }, [isTransitioning, surpriseButtonTranslateY]);

  const surpriseButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: surpriseButtonTranslateY.value }],
  }));

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

  // Story preview modal state
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const handleLongPress = useCallback((story: Story) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPreviewStory(story);
    setIsPreviewVisible(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setPreviewStory(null);
  }, []);

  // Warm the memory cache for CMS story cover images BEFORE first render
  // This ensures images display instantly without flicker on screen remount
  useLayoutEffect(() => {
    const warmCache = async () => {
      const cmsUrls = stories
        .map(s => s.coverImage)
        .filter((img): img is string =>
          typeof img === 'string' && img.includes('api.colearnwithfreya.co.uk')
        );

      if (cmsUrls.length > 0) {
        await AuthenticatedImageService.warmMemoryCache(cmsUrls);
      }
    };

    warmCache();
  }, [stories]);

  // Load stories - instant if cached, async if first load
  useEffect(() => {
    // If we already have cached stories, no need to load again
    if (StoryLoader.getCachedStories()) {
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

  // Get organized story data from loaded stories
  const availableGenres = useMemo(() => {
    const genreMap: Record<string, Story[]> = {};
    stories.forEach(story => {
      if (!genreMap[story.category]) {
        genreMap[story.category] = [];
      }
      genreMap[story.category].push(story);
    });
    return Object.keys(genreMap).filter(genre => genreMap[genre].length > 0);
  }, [stories]);

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

    // Get the card position for transition animation
    if (pressableRef && pressableRef.current) {
      pressableRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {


        startTransition(story.id, { x: pageX, y: pageY, width, height }, story);

        // Also call the onStorySelect callback for app navigation
        if (onStorySelect) {
          onStorySelect(story);
        }
      });
    } else {
      // Fallback without animation - still call onStorySelect
      if (onStorySelect) {
        onStorySelect(story);
      }
    }
  }, [onStorySelect, startTransition]);

  const handleSurpriseMe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const randomStory = getRandomStory();
    if (randomStory && surpriseButtonRef.current) {
      // Measure the button position and start the transition from there
      surpriseButtonRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        startTransition(randomStory.id, { x: pageX, y: pageY, width, height }, randomStory);
        if (onStorySelect) {
          onStorySelect(randomStory);
        }
      });
    }
  }, [startTransition, onStorySelect]);

  // Memoized render function for story cards
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
    />
  ), [handleStoryPress, handleLongPress, scaledCardW, scaledCardH, scaledBorderRadius, scaledEmojiFontSize, isTransitioning, selectedStoryId, shouldShowStoryReader, isExpandingToReader]);

  // Memoized key extractor
  const keyExtractor = useCallback((story: Story) => story.id, []);

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
      <PageHeader title="Stories" onBack={handleBackToMenu} hideControls={isTransitioning} />

      {/* Content container with flex: 1 for proper layout - dynamic padding for scaled text */}
      <View style={{ flex: 1, paddingTop: insets.top + 140 + (textSizeScale - 1) * 60, zIndex: 10 }}>

        {/* Stories Carousels */}
        <ScrollView style={{ flex: 1 }}>
          {availableGenres.map((genre) => {
            const genreStories = stories.filter(story => story.category === genre);
            
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
                  {`${genre.charAt(0).toUpperCase() + genre.slice(1)} Stories`}
                </Text>
                
                {/* Horizontal Carousel - Optimized for performance */}
                <FlatList
                  data={genreStories}
                  renderItem={renderStoryCard}
                  keyExtractor={keyExtractor}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  // Performance optimizations
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={5}
                  windowSize={7}
                  initialNumToRender={3}
                  updateCellsBatchingPeriod={50}
                  // Scroll behavior
                  decelerationRate="fast"
                  snapToInterval={ITEM_WIDTH}
                  snapToAlignment="start"
                  contentContainerStyle={styles.carouselContent}
                />
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom Button - slides down when book is selected */}
        <Animated.View style={[{ padding: 20, paddingBottom: insets.bottom + 20, alignItems: 'center' }, surpriseButtonAnimatedStyle]}>
          <View ref={surpriseButtonRef} collapsable={false}>
            <Pressable
              style={{
                backgroundColor: '#FF6B6B',
                borderRadius: 25,
                paddingHorizontal: scaledPadding(32),
                paddingVertical: scaledPadding(15),
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
                maxWidth: 280,
                minHeight: scaledButtonSize(50),
                justifyContent: 'center',
              }}
              onPress={handleSurpriseMe}
            >
              <Text style={{
                color: 'white',
                fontSize: scaledFontSize(18),
                fontWeight: 'bold',
                fontFamily: Fonts.rounded,
              }}>
                Surprise Me!
              </Text>
            </Pressable>
          </View>
        </Animated.View>
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
  carouselContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});
