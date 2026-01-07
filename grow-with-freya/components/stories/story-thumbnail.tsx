import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Story } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

interface StoryThumbnailProps {
  story: Story;
  onPress: (story: Story) => void;
  width?: number;
  height?: number;
  isVisible?: boolean; // For lazy loading optimization
}

const THUMBNAIL_WIDTH = 140;
const THUMBNAIL_HEIGHT = 180;

export const StoryThumbnail: React.FC<StoryThumbnailProps> = ({
  story,
  onPress,
  width = THUMBNAIL_WIDTH,
  height = THUMBNAIL_HEIGHT,
  isVisible = true,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(story.isAvailable ? 1 : 0.6);

  const handlePressIn = useCallback(() => {
    if (!story.isAvailable) return;
    
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [story.isAvailable]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  }, []);

  const handlePress = useCallback(() => {
    if (!story.isAvailable) return;
    
    // Quick scale animation for feedback
    scale.value = withTiming(1.05, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    }, () => {
      scale.value = withTiming(1, {
        duration: 100,
        easing: Easing.out(Easing.quad),
      });
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(story);
  }, [story, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const isCmsImage = typeof story.coverImage === 'string' && story.coverImage.includes('api.colearnwithfreya.co.uk');

  const getCoverImageSource = (): ImageSourcePropType | null => {
    if (!story.coverImage) {
      console.log(`[StoryThumbnail] ${story.id}: No cover image`);
      return null;
    }

    // Handle both require() and URL string formats
    if (typeof story.coverImage === 'string') {
      console.log(`[StoryThumbnail] ${story.id}: Loading cover from URL: ${story.coverImage}, isCMS=${isCmsImage}`);
      return { uri: story.coverImage };
    }
    console.log(`[StoryThumbnail] ${story.id}: Loading cover from require()`);
    return story.coverImage;
  };

  const coverImageSource = getCoverImageSource();

  // Debug logging
  React.useEffect(() => {
    console.log(`[StoryThumbnail] ${story.id}: Render state - isVisible=${isVisible}, coverImageSource=${!!coverImageSource}, imageError=${imageError}, isCmsImage=${isCmsImage}`);
  }, [isVisible, coverImageSource, imageError, isCmsImage, story.id]);

  return (
    <Animated.View style={[styles.container, { width, height }, animatedStyle]}>
      <Pressable
        style={[styles.pressable, { width, height }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={!story.isAvailable}
      >
        {/* Cover Image */}
        <View style={styles.imageContainer}>
          {coverImageSource && !imageError ? (
            isCmsImage ? (
              <AuthenticatedImage
                uri={story.coverImage as string}
                style={styles.coverImage}
                resizeMode="cover"
                onLoad={() => {
                  console.log(`[StoryThumbnail] ${story.id}: CMS image loaded successfully`);
                  setImageLoaded(true);
                }}
                onError={(error) => {
                  console.error(`[StoryThumbnail] ${story.id}: CMS image load error:`, error);
                  setImageError(true);
                }}
              />
            ) : (
              <Image
                source={coverImageSource}
                style={styles.coverImage}
                onLoad={() => {
                  console.log(`[StoryThumbnail] ${story.id}: Image loaded successfully`);
                  setImageLoaded(true);
                }}
                onError={(error) => {
                  console.error(`[StoryThumbnail] ${story.id}: Image load error:`, JSON.stringify(error));
                  console.error(`[StoryThumbnail] ${story.id}: Attempted to load:`, coverImageSource);
                  setImageError(true);
                }}
                resizeMode="cover"
              />
            )
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: story.isAvailable ? '#E8F4FD' : '#F5F5F5' }]}>
              <Text style={styles.placeholderEmoji}>{story.emoji}</Text>
            </View>
          )}
          
          {/* Loading overlay */}
          {isVisible && coverImageSource && !imageLoaded && !imageError && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>📖</Text>
            </View>
          )}
        </View>

        {/* Story Info */}
        <View style={styles.infoContainer}>
          <Text 
            style={[
              styles.title, 
              { color: story.isAvailable ? '#FFFFFF' : '#CCCCCC' }
            ]} 
            numberOfLines={2}
          >
            {story.title}
          </Text>
          
          {story.isAvailable && (
            <View style={styles.metaContainer}>
              <Text style={styles.duration}>{story.duration}min</Text>
              <Text style={styles.ageRange}>{story.ageRange}</Text>
            </View>
          )}
          
          {!story.isAvailable && (
            <Text style={styles.comingSoon}>Coming Soon</Text>
          )}
        </View>

        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: story.isAvailable ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.2)' }]}>
          <Text style={styles.categoryText}>{story.tag}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
  },
  pressable: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '70%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  loadingText: {
    fontSize: 24,
  },
  infoContainer: {
    padding: 8,
    height: '30%',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.rounded,
    lineHeight: 14,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Fonts.rounded,
  },
  ageRange: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Fonts.rounded,
  },
  comingSoon: {
    fontSize: 10,
    color: '#CCCCCC',
    fontStyle: 'italic',
    fontFamily: Fonts.rounded,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '500',
    fontFamily: Fonts.rounded,
  },
});
