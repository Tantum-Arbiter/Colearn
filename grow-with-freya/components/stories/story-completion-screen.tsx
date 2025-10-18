import React, { useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing
} from 'react-native-reanimated';
import { Story } from '@/types/story';
import { ALL_STORIES, getRandomStory } from '@/data/stories';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { Fonts } from '@/constants/theme';

interface StoryCompletionScreenProps {
  completedStory: Story;
  onReadAnother: (story: Story) => void;
  onRereadCurrent: () => void;
  onBedtimeMusic: () => void;
  onClose: () => void;
}

export function StoryCompletionScreen({
  completedStory,
  onReadAnother,
  onRereadCurrent,
  onBedtimeMusic,
  onClose
}: StoryCompletionScreenProps) {
  const insets = useSafeAreaInsets();

  // Force portrait orientation on phones, allow landscape/portrait on tablets
  useEffect(() => {
    const handleOrientation = async () => {
      try {
        const { width, height } = Dimensions.get('window');
        const isTablet = Math.min(width, height) >= 768; // iPad and larger

        if (!isTablet) {
          // Force portrait on phones
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          console.log('Story completion: Forced portrait orientation on phone');
        } else {
          // Allow both orientations on tablets
          await ScreenOrientation.unlockAsync();
          console.log('Story completion: Unlocked orientation for tablet');
        }
      } catch (error) {
        console.warn('Failed to set orientation in story completion:', error);
      }
    };

    handleOrientation();
  }, []);

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

  const starAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${starRotation.value}deg` }],
    };
  });

  // Smart recommendation logic
  const recommendation = useMemo(() => {
    const category = completedStory.category;
    
    // Get similar stories (same category, excluding current story)
    const similarStories = ALL_STORIES.filter(story => 
      story.isAvailable && 
      story.category === category && 
      story.id !== completedStory.id
    );

    // If bedtime story, suggest bedtime music more often
    const shouldSuggestMusic = category === 'bedtime' ? Math.random() < 0.7 : Math.random() < 0.3;
    
    if (shouldSuggestMusic) {
      return {
        type: 'music' as const,
        title: '🎵 Bedtime Music',
        description: 'Drift off to sleep with gentle melodies',
        emoji: '🌙',
        action: onBedtimeMusic
      };
    } else {
      const suggestedStory = similarStories.length > 0 
        ? similarStories[Math.floor(Math.random() * similarStories.length)]
        : getRandomStory();
      
      return {
        type: 'story' as const,
        title: suggestedStory?.title || 'Another Adventure',
        description: `Continue with ${suggestedStory?.category || 'another'} stories`,
        emoji: suggestedStory?.emoji || '📚',
        story: suggestedStory,
        action: () => suggestedStory && onReadAnother(suggestedStory)
      };
    }
  }, [completedStory, onReadAnother, onBedtimeMusic]);

  // Get similar stories for dedicated tile
  const similarStories = useMemo(() => {
    const category = completedStory.category;
    return ALL_STORIES.filter(story =>
      story.isAvailable &&
      story.category === category &&
      story.id !== completedStory.id
    );
  }, [completedStory]);

  // Get a random similar story for the dedicated tile
  const randomSimilarStory = useMemo(() => {
    return similarStories.length > 0
      ? similarStories[Math.floor(Math.random() * similarStories.length)]
      : null;
  }, [similarStories]);

  return (
    <LinearGradient
      colors={VISUAL_EFFECTS.GRADIENT_COLORS}
      style={styles.container}
    >
      {/* Animated Stars Background */}
      {starPositions.map((star) => (
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
            },
            starAnimatedStyle,
          ]}
        />
      ))}

      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Completion Message */}
        <View style={styles.completionSection}>
          <Text style={styles.completionEmoji}>🎉</Text>
          <Text style={styles.completionTitle}>Story Complete!</Text>
          <Text style={styles.completionSubtitle}>
            You finished "{completedStory.title}"
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {/* Primary Recommendation */}
          <Pressable
            style={[styles.actionButton, styles.primaryButton]}
            onPress={recommendation.action}
          >
            <Text style={styles.actionEmoji}>{recommendation.emoji}</Text>
            <Text style={styles.actionTitle}>{recommendation.title}</Text>
            <Text style={styles.actionDescription}>{recommendation.description}</Text>
          </Pressable>

          {/* Secondary Actions */}
          <View style={styles.secondaryActions}>
            <Pressable
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={onRereadCurrent}
            >
              <Text style={styles.secondaryEmoji}>🔄</Text>
              <Text style={styles.secondaryTitle}>Read Again</Text>
            </Pressable>

            {recommendation.type === 'story' && (
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={onBedtimeMusic}
              >
                <Text style={styles.secondaryEmoji}>🎵</Text>
                <Text style={styles.secondaryTitle}>Bedtime Music</Text>
              </Pressable>
            )}

            {recommendation.type === 'music' && recommendation.story && (
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => recommendation.story && onReadAnother(recommendation.story)}
              >
                <Text style={styles.secondaryEmoji}>📚</Text>
                <Text style={styles.secondaryTitle}>Another Story</Text>
              </Pressable>
            )}

            {/* Always show similar story tile if available */}
            {randomSimilarStory && (
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => onReadAnother(randomSimilarStory)}
              >
                <Text style={styles.secondaryEmoji}>{randomSimilarStory.emoji || '📚'}</Text>
                <Text style={styles.secondaryTitle}>{randomSimilarStory.title}</Text>
              </Pressable>
            )}
          </View>

          {/* Close Button - Same width as secondary tiles */}
          <View style={styles.secondaryActions}>
            <Pressable
              style={[styles.actionButton, styles.secondaryButton, { marginBottom: insets.bottom + 20 }]}
              onPress={onClose}
            >
              <Text style={styles.secondaryEmoji}>✕</Text>
              <Text style={styles.secondaryTitle}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  completionSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  completionEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  completionSubtitle: {
    fontSize: 18,
    color: 'white',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionsSection: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  actionButton: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 20,
    paddingVertical: 25,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 15,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: Fonts.rounded,
    marginBottom: 5,
  },
  actionDescription: {
    fontSize: 16,
    color: '#5D6D7E',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  secondaryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  secondaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Fonts.rounded,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
