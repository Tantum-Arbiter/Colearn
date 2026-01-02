import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, FlatList, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ALL_STORIES, getStoriesByGenre, getGenresWithStories, getRandomStory } from '@/data/stories';
import { Story, StoryCategory, STORY_TAGS } from '@/types/story';
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


interface StorySelectionScreenProps {
  onStorySelect?: (story: Story) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function StorySelectionScreen({ onStorySelect }: StorySelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { requestReturnToMainMenu } = useAppStore();
  const { startTransition } = useStoryTransition();
  const lastCallRef = useRef<number>(0);
  const { scaledFontSize, scaledButtonSize, scaledPadding, textSizeScale } = useAccessibility();

  // Scroll tracking for dynamic carousel effects
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({});

  // Load stories from StoryLoader (synced metadata or fallback to MOCK_STORIES)
  const [stories, setStories] = useState<Story[]>(ALL_STORIES);
  const [isLoadingStories, setIsLoadingStories] = useState(true);

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

  // PERFORMANCE: Defer story loading until after page transition to prevent jitter
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const loadStories = async () => {
        try {
          const loadedStories = await StoryLoader.getStories();
          setStories(loadedStories);
          console.log(`[StorySelectionScreen] Loaded ${loadedStories.length} stories`);
        } catch (error) {
          console.error('[StorySelectionScreen] Error loading stories:', error);
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
    if (randomStory) {
      handleLongPress(randomStory);
    }
  }, [handleLongPress]);

  // Handle scroll events to track current position for each carousel
  const handleScroll = useCallback((genre: string, event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    setScrollPositions(prev => ({
      ...prev,
      [genre]: scrollX
    }));
  }, []);

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
      <PageHeader title="Stories" onBack={handleBackToMenu} />

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
                
                {/* Horizontal Carousel */}
                <View style={{ 
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%'
                }}>
                  <FlatList
                    data={genreStories}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={false}
                    decelerationRate="fast"
                    snapToOffsets={genreStories.map((_, index) => index * 175)} // Exact snap positions
                    disableIntervalMomentum={true}
                    onScroll={(event) => handleScroll(genre, event)}
                    scrollEventThrottle={16}
                    getItemLayout={(data, index) => ({
                      length: 175,
                      offset: 175 * index,
                      index,
                    })}
                    initialScrollIndex={0}
                    style={{
                      flexGrow: 0,
                      alignSelf: 'center'
                    }}
                    contentContainerStyle={{
                      paddingLeft: (Dimensions.get('window').width / 2) - 80, // Center the first item (half of 160px card width)
                      paddingRight: (Dimensions.get('window').width / 2) - 80, // Center the last item
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                    }}
                    keyExtractor={(story) => story.id}
                    renderItem={({ item: story, index }) => {
                      // Create a ref for this specific card
                      const cardRef = React.createRef();

                      // Calculate dynamic opacity and scale based on scroll position
                      const scrollX = scrollPositions[genre] || 0;
                      const cardWidth = 175; // Card width (160) + margin (15)
                      const containerWidth = Dimensions.get('window').width;
                      const paddingLeft = (containerWidth / 2) - 80; // Our padding offset (half of card width, not including margin)

                      // Calculate the position of this card relative to the center of the screen
                      const cardPosition = (index * cardWidth) + paddingLeft - scrollX + 80; // +80 for card center (excluding margin)
                      const screenCenter = containerWidth / 2;
                      const distanceFromCenter = Math.abs(cardPosition - screenCenter);

                      // Determine if this card is the selected (center) one
                      const isSelected = distanceFromCenter < cardWidth / 2;

                      // Calculate position relative to selected item
                      const cardCenterX = cardPosition;
                      const selectedItemX = screenCenter;
                      const relativePosition = (cardCenterX - selectedItemX) / cardWidth;

                      // Calculate smooth scale and opacity based on distance from center
                      const absRelativePosition = Math.abs(relativePosition);

                      let cardOpacity = 1.0;
                      let cardScale = 1.0;

                      if (absRelativePosition < 0.5) {
                        // Selected item (center): largest and fully visible
                        cardOpacity = 1.0;
                        cardScale = 1.0;
                      } else if (absRelativePosition < 1.5) {
                        // Adjacent items: smooth transition from 1.0 to 0.9
                        const transitionProgress = (absRelativePosition - 0.5) / 1.0; // 0 to 1
                        cardOpacity = 1.0 - (transitionProgress * 0.2); // 1.0 to 0.8
                        cardScale = 1.0 - (transitionProgress * 0.1); // 1.0 to 0.9
                      } else {
                        // Distant items: smooth transition from 0.9 to 0.8
                        const transitionProgress = Math.min((absRelativePosition - 1.5) / 1.0, 1.0); // 0 to 1, capped
                        cardOpacity = 0.8 - (transitionProgress * 0.2); // 0.8 to 0.6
                        cardScale = 0.9 - (transitionProgress * 0.1); // 0.9 to 0.8
                      }

                      // Scale story card dimensions based on accessibility settings
                      const scaledCardW = scaledButtonSize(160);
                      const scaledCardH = scaledButtonSize(120);

                      return (
                        <Pressable
                          onPress={() => handleStoryPress(story)}
                          onLongPress={() => handleLongPress(story)}
                          delayLongPress={400}
                        >
                          <Animated.View
                            style={{
                              opacity: cardOpacity,
                              transform: [{ scale: cardScale }],
                              marginRight: 15,
                              backgroundColor: 'white',
                              borderRadius: scaledButtonSize(15),
                              padding: 0,
                              width: scaledCardW,
                              height: scaledCardH,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4,
                              elevation: 3,
                              overflow: 'hidden',
                            }}
                          >

                          {story.coverImage ? (
                            <Image
                              source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
                              style={{
                                width: scaledCardW,
                                height: scaledCardH,
                                borderRadius: scaledButtonSize(15),
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{
                              width: scaledCardW,
                              height: scaledCardH,
                              backgroundColor: '#f0f0f0',
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderRadius: scaledButtonSize(15),
                            }}>
                              <Text style={{ fontSize: scaledFontSize(48) }}>{story.emoji}</Text>
                            </View>
                          )}
                          </Animated.View>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom Button */}
        <View style={{ padding: 20, paddingBottom: insets.bottom + 20, alignItems: 'center' }}>
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

// Removed StyleSheet to avoid caching issues - using inline styles instead
