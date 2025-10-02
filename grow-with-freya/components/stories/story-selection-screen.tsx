import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { BookCard } from './book-card';
import { ALL_STORIES, getRandomStory, MOCK_STORIES, PLACEHOLDER_STORIES } from '@/data/stories';
import { Story } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

interface StorySelectionScreenProps {
  onStorySelect?: (story: Story) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function StorySelectionScreen({ onStorySelect }: StorySelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { requestReturnToMainMenu } = useAppStore();
  const lastCallRef = useRef<number>(0);

  // Animation values
  const fadeOpacity = useSharedValue(0);
  const slideY = useSharedValue(30);
  const titleScale = useSharedValue(0.8);
  const cardsOpacity = useSharedValue(1); // Temporarily disable animation
  const buttonOpacity = useSharedValue(0);

  // Initialize entrance animation
  useEffect(() => {
    const animationConfig = {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    };

    // Staggered entrance animation
    fadeOpacity.value = withTiming(1, animationConfig);
    slideY.value = withTiming(0, animationConfig);
    titleScale.value = withTiming(1, { ...animationConfig, duration: 500 });
    cardsOpacity.value = withDelay(200, withTiming(1, animationConfig));
    buttonOpacity.value = withDelay(400, withTiming(1, animationConfig));
  }, []);

  const handleBackToMenu = useCallback(() => {
    // Debounce rapid back button presses (500ms)
    const now = Date.now();
    if (now - lastCallRef.current < 500) {
      return; // Ignore rapid presses
    }
    lastCallRef.current = now;

    // Request return to main menu via global state
    requestReturnToMainMenu();
  }, [requestReturnToMainMenu]);

  const handleStoryPress = useCallback((story: Story) => {
    if (onStorySelect) {
      onStorySelect(story);
    } else {
      // Default behavior - could navigate to story reader
      console.log('Selected story:', story.title);
    }
  }, [onStorySelect]);

  const handleSurpriseMe = useCallback(() => {
    const randomStory = getRandomStory();
    if (randomStory) {
      handleStoryPress(randomStory);
    }
  }, [handleStoryPress]);

  const availableStoriesCount = ALL_STORIES.filter(story => story.isAvailable).length;
  const isSurpriseMeDisabled = availableStoriesCount === 0;

  // Debug logging - temporary
  console.log('=== STORY DEBUG INFO ===');
  console.log('MOCK_STORIES length:', MOCK_STORIES.length);
  console.log('PLACEHOLDER_STORIES length:', PLACEHOLDER_STORIES.length);
  console.log('ALL_STORIES length:', ALL_STORIES.length);
  console.log('Available stories count:', availableStoriesCount);
  console.log('ALL_STORIES:', ALL_STORIES.map(s => ({ id: s.id, title: s.title, available: s.isAvailable })));
  console.log('========================');

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateY: slideY.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));

  const cardsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardsOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  return (
    <Animated.View style={[styles.fullContainer, containerAnimatedStyle]}>
      <LinearGradient
        colors={['#FFF8F0', '#F0F8FF', '#F5F0FF']}
        style={styles.container}
      >
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Pressable style={styles.backButton} onPress={handleBackToMenu}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Title and subtitle */}
        <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
          <Text style={styles.title}>Choose a Story!</Text>
          <Text style={styles.subtitle}>Tap a book to start your adventure.</Text>
          {/* Temporary debug info */}
          <Text style={styles.debugText}>
            Debug: {ALL_STORIES.length} total stories ({availableStoriesCount} available, {ALL_STORIES.length - availableStoriesCount} placeholders)
          </Text>
        </Animated.View>

        {/* Stories grid */}
        <Animated.View style={cardsAnimatedStyle}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 100 } // Account for bottom button
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: 20, color: 'red', backgroundColor: 'white', padding: 10 }}>
              DEBUG: About to render {ALL_STORIES.length} cards
            </Text>
            <View style={[styles.grid, { backgroundColor: 'yellow', padding: 10, minHeight: 500 }]}>
              <Text style={{ fontSize: 16, color: 'black', backgroundColor: 'white' }}>
                Grid container - should contain {ALL_STORIES.length} cards
              </Text>
              {ALL_STORIES.map((story, index) => {
                console.log(`Rendering card ${index}: ${story.title} (${story.isAvailable ? 'available' : 'placeholder'})`);
                return (
                  <View key={story.id} style={{
                    backgroundColor: story.isAvailable ? 'blue' : 'red',
                    width: 150,
                    height: 200,
                    margin: 5,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Text style={{ color: 'white', fontSize: 14, textAlign: 'center' }}>
                      {index}: {story.title}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </View>

      {/* Surprise Me button - sticky at bottom */}
      <Animated.View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }, buttonAnimatedStyle]}>
        <Pressable
          style={[
            styles.surpriseMeButton,
            isSurpriseMeDisabled && styles.surpriseMeButtonDisabled
          ]}
          onPress={handleSurpriseMe}
          disabled={isSurpriseMeDisabled}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
        >
          <LinearGradient
            colors={
              isSurpriseMeDisabled
                ? ['#BDC3C7', '#95A5A6']
                : ['#FF6B6B', '#FF8E8E']
            }
            style={styles.surpriseMeGradient}
          >
            <Text style={[
              styles.surpriseMeText,
              isSurpriseMeDisabled && styles.surpriseMeTextDisabled
            ]}>
              ✨ Surprise Me! ✨
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: Fonts.rounded,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    fontFamily: Fonts.rounded,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    lineHeight: 22,
  },
  debugText: {
    fontSize: 12,
    color: '#E74C3C',
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    marginTop: 8,
    backgroundColor: '#FFF',
    padding: 4,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12, // Modern gap property for consistent spacing
    minHeight: 1000, // Force minimum height to ensure all cards are visible
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  surpriseMeButton: {
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  surpriseMeButtonDisabled: {
    elevation: 1,
    shadowOpacity: 0.1,
  },
  surpriseMeGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  surpriseMeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
  },
  surpriseMeTextDisabled: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
});
