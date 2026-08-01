import React, { memo, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Story, STORY_TAGS, getLocalizedText } from '@/types/story';
import { Fonts } from '@/constants/theme';
import type { SupportedLanguage } from '@/services/i18n';
import { STORY_GARDEN_SCALE } from '@/constants/story-garden-motion';

export interface ContinueReadingBookProps {
  story: Story;
  width: number;
  pageIndex: number;
  totalPages: number;
  language: SupportedLanguage;
  onPress: (story: Story, bookRef: React.RefObject<View | null>) => void;
}

export const ContinueReadingBook = memo(function ContinueReadingBook({
  story,
  width,
  pageIndex,
  totalPages,
  language,
  onPress,
}: ContinueReadingBookProps) {
  const { t } = useTranslation();
  const bookRef = useRef<View>(null);
  const displayTitle = getLocalizedText(story.localizedTitle, story.title, language);

  const height = width / STORY_GARDEN_SCALE.coverAspectRatio;
  const progress = totalPages > 0 ? Math.min(Math.max(pageIndex / totalPages, 0), 1) : 0;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(story, bookRef);
  }, [onPress, story]);

  return (
    <View style={styles.container} testID="continue-reading-book">
      <Pressable
        ref={bookRef}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('storyGarden.continueReading')}
        testID={`continue-reading-${story.id}`}
        style={styles.pressable}
      >
        <View style={[styles.book, { width, height }]}>
          <View style={styles.spine} />
          {story.coverImage ? (
            <Image
              source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
              style={styles.cover}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
              recyclingKey={story.id}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderEmoji}>{STORY_TAGS[story.category]?.emoji}</Text>
            </View>
          )}

          <View style={styles.ribbon} testID="continue-reading-ribbon">
            <View style={[styles.ribbonFill, { height: `${progress * 100}%` }]} />
          </View>
        </View>

        <Text style={styles.label} testID="continue-reading-label">
          {t('storyGarden.continueReading')}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {displayTitle}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pressable: {
    alignItems: 'center',
  },
  book: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    zIndex: 2,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    right: 26,
    width: 18,
    height: '55%',
    backgroundColor: 'rgba(228, 100, 90, 0.35)',
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    overflow: 'hidden',
    zIndex: 3,
  },
  ribbonFill: {
    width: '100%',
    backgroundColor: '#E4645A',
  },
  label: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 14,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 19,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
});
