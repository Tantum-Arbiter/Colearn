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
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Story, STORY_TAGS, getLocalizedText } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';
import { useAppStore } from '@/store/app-store';

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
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;

  // Favorites state from store
  const favoriteStoryIds = useAppStore((state) => state.favoriteStoryIds);
  const toggleFavoriteStory = useAppStore((state) => state.toggleFavoriteStory);
  const isFavorited = story ? favoriteStoryIds.includes(story.id) : false;

  // Get localized content
  const displayTitle = story ? getLocalizedText(story.localizedTitle, story.title, currentLanguage) : '';
  const displayDescription = story ? getLocalizedText(story.localizedDescription, story.description || '', currentLanguage) : '';

  // Animation values for slide up/down
  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const isAnimatingOut = useSharedValue(false);

  // Favorite star animation
  const starScale = useSharedValue(1);

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

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  // Handle toggling favorite with animation
  const handleToggleFavorite = useCallback(() => {
    if (!story) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Bounce animation
    starScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );

    toggleFavoriteStory(story.id);
  }, [story, toggleFavoriteStory, starScale]);

  // Don't render if not visible and no story
  if (!visible && !story) return null;
  if (!story) return null;

  const tagInfo = STORY_TAGS[story.category];
  const displayTags = story.tags || [story.tag];

  // Helper to translate tag names
  const translateTag = (tag: string): string => {
    // Try translating using filterTags (covers most common tags)
    const normalizedTag = tag.toLowerCase().replace(/\s+/g, '');
    const translationKey = `stories.filterTags.${normalizedTag}`;
    const translated = t(translationKey, { defaultValue: '' });
    // If translation exists and is not the key itself, use it
    if (translated && translated !== translationKey) {
      return translated;
    }
    // Fallback to genre translation
    const genreKey = `stories.genres.${normalizedTag}`;
    const genreTranslated = t(genreKey, { defaultValue: '' });
    if (genreTranslated && genreTranslated !== genreKey) {
      return genreTranslated;
    }
    // Return original tag if no translation found
    return tag;
  };

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

          {/* Favorite Star Button - top right */}
          <Pressable style={styles.favoriteButton} onPress={handleToggleFavorite}>
            <Animated.Text style={[styles.favoriteButtonText, starAnimatedStyle]}>
              {isFavorited ? '⭐' : '☆'}
            </Animated.Text>
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
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            scrollEnabled={true}
          >
            {/* Title */}
            <Text style={[styles.title, { fontSize: scaledFontSize(24) }]}>
              {displayTitle}
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
                  <Text style={styles.metaLabel}>{t('storyPreview.audience')}</Text>
                  <Text style={[styles.metaValue, { fontSize: scaledFontSize(14) }]}>
                    {t('storyPreview.ages', { range: story.ageRange })}
                  </Text>
                </View>
              )}
              {story.duration && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>{t('storyPreview.duration')}</Text>
                  <Text style={[styles.metaValue, { fontSize: scaledFontSize(14) }]}>
                    {t('storyPreview.durationMinutes', { count: story.duration })}
                  </Text>
                </View>
              )}
            </View>

            {/* Tags */}
            <View style={styles.tagsContainer}>
              <Text style={styles.sectionLabel}>{t('storyPreview.tags')}</Text>
              <View style={styles.tagsRow}>
                {displayTags.map((tag, index) => (
                  <View
                    key={index}
                    style={[styles.tag, { backgroundColor: tagInfo?.color || '#E0E0E0' }]}
                  >
                    <Text style={[styles.tagText, { fontSize: scaledFontSize(12) }]}>
                      {translateTag(tag)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Description */}
            {displayDescription && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionLabel}>{t('storyPreview.aboutThisStory')}</Text>
                <Text style={[styles.description, { fontSize: scaledFontSize(14) }]}>
                  {displayDescription}
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
                  // Start the story transition FIRST (before closing modal)
                  // This ensures the card ref is still available for measuring position
                  // The transition overlay will cover this modal anyway
                  onReadStory(story);
                  // Then close the modal (with a small delay to let transition start)
                  setTimeout(() => handleClose(), 50);
                }}
              >
                <Text style={[styles.readButtonText, { fontSize: scaledFontSize(16) }]}>
                  {t('storyPreview.readStory')}
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
    zIndex: 2000, // Higher than story transition overlay (1001) to ensure modal is on top
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
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
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
  favoriteButtonText: {
    fontSize: 24,
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
    maxHeight: 400, // Increased for XL text accessibility
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

