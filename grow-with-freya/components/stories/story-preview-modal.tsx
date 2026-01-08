import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Story, STORY_TAGS } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

interface StoryPreviewModalProps {
  story: Story | null;
  visible: boolean;
  onClose: () => void;
  onReadStory?: (story: Story) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

export function StoryPreviewModal({
  story,
  visible,
  onClose,
  onReadStory,
}: StoryPreviewModalProps) {
  const { scaledFontSize, scaledPadding, scaledButtonSize } = useAccessibility();

  // Animation values for slide up/down
  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const isAnimatingOut = useSharedValue(false);

  // Animate in when visible changes
  useEffect(() => {
    if (visible && story) {
      // Slide up from bottom
      translateY.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    }
  }, [visible, story]);

  // Handle close with slide down animation
  const handleClose = useCallback(() => {
    isAnimatingOut.value = true;
    backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    translateY.value = withTiming(
      screenHeight,
      {
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
          isAnimatingOut.value = false;
        }
      }
    );
  }, [onClose]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Don't render if not visible and no story
  if (!visible && !story) return null;
  if (!story) return null;

  const tagInfo = STORY_TAGS[story.category];
  const displayTags = story.tags || [story.tag];

  return (
    <View style={styles.absoluteContainer} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop - tap to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        </Animated.View>
      </Pressable>

      {/* Modal Content - slides up from bottom */}
      <Animated.View style={[styles.modalWrapper, modalAnimatedStyle]}>
        <Pressable
          style={[styles.modalContent, { maxHeight: screenHeight * 0.75 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* X Close Button - top left */}
          <Pressable style={styles.xCloseButton} onPress={handleClose}>
            <Text style={styles.xCloseButtonText}>✕</Text>
          </Pressable>

          {/* Cover Image */}
          <View style={styles.coverContainer}>
            {story.coverImage ? (
              typeof story.coverImage === 'string' && story.coverImage.includes('api.colearnwithfreya.co.uk') ? (
                <AuthenticatedImage
                  uri={story.coverImage}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
                  style={styles.coverImage}
                  contentFit="cover"
                  transition={0}
                  cachePolicy="memory-disk"
                />
              )
            ) : (
              <View style={[styles.coverImage, styles.placeholderCover]}>
                <Text style={{ fontSize: 64 }}>{story.emoji}</Text>
              </View>
            )}
          </View>

          <ScrollView
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Text style={[styles.title, { fontSize: scaledFontSize(24) }]}>
              {story.title}
            </Text>

            {/* Author */}
            {story.author && (
              <Text style={[styles.author, { fontSize: scaledFontSize(14) }]}>
                by {story.author}
              </Text>
            )}

            {/* Metadata Row */}
            <View style={styles.metaRow}>
              {story.ageRange && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Audience</Text>
                  <Text style={[styles.metaValue, { fontSize: scaledFontSize(14) }]}>
                    Ages {story.ageRange}
                  </Text>
                </View>
              )}
              {story.duration && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Duration</Text>
                  <Text style={[styles.metaValue, { fontSize: scaledFontSize(14) }]}>
                    {story.duration} min
                  </Text>
                </View>
              )}
            </View>

            {/* Tags */}
            <View style={styles.tagsContainer}>
              <Text style={styles.sectionLabel}>Tags</Text>
              <View style={styles.tagsRow}>
                {displayTags.map((tag, index) => (
                  <View
                    key={index}
                    style={[styles.tag, { backgroundColor: tagInfo?.color || '#E0E0E0' }]}
                  >
                    <Text style={[styles.tagText, { fontSize: scaledFontSize(12) }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Description */}
            {story.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionLabel}>About this story</Text>
                <Text style={[styles.description, { fontSize: scaledFontSize(14) }]}>
                  {story.description}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons - only show if Read Story is available */}
          {story.isAvailable && onReadStory && (
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.readButton, { flex: 1 }]}
                onPress={() => {
                  handleClose();
                  // Delay the story navigation until after modal slides out
                  setTimeout(() => onReadStory(story), ANIMATION_DURATION);
                }}
              >
                <Text style={[styles.readButtonText, { fontSize: scaledFontSize(16) }]}>
                  Read Story
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  xCloseButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  xCloseButtonText: {
    color: '#333',
    fontSize: 20,
    fontWeight: '600',
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderCover: {
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScroll: {
    padding: 20,
    maxHeight: 300,
  },
  title: {
    fontFamily: Fonts.primary,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  author: {
    fontFamily: Fonts.sans,
    color: '#636E72',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 24,
  },
  metaItem: {},
  metaLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: '#B2BEC3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#2D3436',
  },
  tagsContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: '#B2BEC3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  descriptionContainer: {
    marginBottom: 8,
  },
  description: {
    fontFamily: Fonts.sans,
    color: '#636E72',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#636E72',
  },
  readButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  readButtonText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

