import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions, FlatList, Image } from 'react-native';
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
import { ALL_STORIES, getStoriesByGenre, getGenresWithStories, getRandomStory } from '@/data/stories';
import { Story, StoryCategory, STORY_TAGS } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';

import { mainMenuStyles } from '@/components/main-menu/styles';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { MusicControl } from '@/components/ui/music-control';
import { useScreenTimeTracking } from '@/hooks/use-screen-time-tracking';


interface StorySelectionScreenProps {
  onStorySelect?: (story: Story) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function StorySelectionScreen({ onStorySelect }: StorySelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { requestReturnToMainMenu } = useAppStore();
  const { startTransition } = useStoryTransition();
  const lastCallRef = useRef<number>(0);

  // Track screen time for story browsing
  useScreenTimeTracking({
    activity: 'story',
    autoStart: true,
    autoEnd: true,
  });

  // Scroll tracking for dynamic carousel effects
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({});

  // Generate star positions for background
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation
  const starRotation = useSharedValue(0);

  useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, {
        duration: 20000, // 20 second rotation cycle
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  // Animated style for star rotation
  const starAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${starRotation.value}deg` }],
    };
  });

  // Get organized story data
  const availableGenres = useMemo(() => {
    const genres = getGenresWithStories();
    console.log('StorySelectionScreen: Available genres:', genres);
    console.log('StorySelectionScreen: ALL_STORIES length:', ALL_STORIES.length);
    console.log('StorySelectionScreen: Using CENTERED horizontal carousels with centered headings');
    return genres;
  }, []);

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
    console.log('Story pressed:', story.title, 'isAvailable:', story.isAvailable);

    if (!story.isAvailable) {
      console.log('Story not available:', story.title);
      return;
    }

    // Get the card position for transition animation
    if (pressableRef && pressableRef.current) {
      pressableRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        console.log('Card layout for transition:', { x: pageX, y: pageY, width, height });


        startTransition(story.id, { x: pageX, y: pageY, width, height }, story);

        // Also call the onStorySelect callback for app navigation
        if (onStorySelect) {
          onStorySelect(story);
        }
      });
    } else {
      // Fallback without animation - still call onStorySelect
      console.log('Using fallback story selection (no animation)');
      if (onStorySelect) {
        onStorySelect(story);
      }
    }
  }, [onStorySelect, startTransition]);

  const handleSurpriseMe = useCallback(() => {
    const randomStory = getRandomStory();
    if (randomStory) {
      handleStoryPress(randomStory);
    }
  }, [handleStoryPress]);

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

      {/* Header with back button and audio button - ABSOLUTE POSITIONING */}
      <View style={{
        position: 'absolute',
        top: insets.top + 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        zIndex: 30,
      }}>
          <Pressable
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginBottom: 20,
            }}
            onPress={handleBackToMenu}
          >
            <Text style={{
              color: 'white',
              fontSize: 16,
              fontWeight: 'bold',
              fontFamily: Fonts.rounded,
            }}>← Back</Text>
          </Pressable>

          <MusicControl
            size={24}
            color="#FFFFFF"
            style={{ marginBottom: 20 }}
          />
        </View>

      {/* Content container with flex: 1 for proper layout */}
      <View style={{ flex: 1, paddingTop: insets.top + 80, zIndex: 10 }}>
        {/* Title - Enhanced with shadow only */}
        <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
          <Text style={{
            color: 'white',
            fontSize: 34,
            fontWeight: 'bold',
            textAlign: 'center',
            textShadowColor: 'rgba(0, 0, 0, 0.9)',
            textShadowOffset: { width: 0, height: 3 },
            textShadowRadius: 8,
          }}>
            Choose Your Adventure
          </Text>
        </View>

        {/* Stories Carousels */}
        <ScrollView style={{ flex: 1 }}>
          {availableGenres.map((genre) => {
            const genreStories = ALL_STORIES.filter(story => story.category === genre);
            
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
                      console.log(`CAROUSEL: Rendering ${story.title} in ${genre}`);

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

                      return (
                        <Pressable
                          onPress={() => {
                            console.log('Pressable onPress triggered for:', story.title);
                            // Temporarily use fallback without animation to test
                            handleStoryPress(story);
                          }}
                        >
                          <Animated.View
                            style={{
                              opacity: cardOpacity,
                              transform: [{ scale: cardScale }],
                              marginRight: 15, // Add spacing between items
                              backgroundColor: 'white',
                              borderRadius: 15,
                              padding: 0, // No padding for full fill
                              width: 160,
                              height: 120, // Fixed height
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4,
                              elevation: 3,
                              overflow: 'hidden', // Ensure content respects border radius
                            }}
                          >

                          {story.coverImage ? (
                            <Image
                              source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
                              style={{
                                width: 160,
                                height: 120,
                                borderRadius: 15,
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{
                              width: 160,
                              height: 120,
                              backgroundColor: '#f0f0f0',
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderRadius: 15,
                            }}>
                              <Text style={{ fontSize: 48 }}>{story.emoji}</Text>
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
              paddingHorizontal: 32,
              paddingVertical: 15,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
              maxWidth: 250,
            }}
            onPress={handleSurpriseMe}
          >
            <Text style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: Fonts.rounded,
            }}>
Surprise Me!
            </Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

// Removed StyleSheet to avoid caching issues - using inline styles instead
