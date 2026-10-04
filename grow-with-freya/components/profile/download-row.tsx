import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { STORY_TAGS, getLocalizedText, storyPageCount, type Story } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import {
  BORDER_DEFAULT,
  ACCENT_CORAL,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import {
  COVER_ASPECT_RATIO,
  MIN_TOUCH_TARGET,
  RADIUS_CARD,
  RADIUS_SMALL,
  SPACE_2,
  SPACE_3,
} from '@/components/child-ui/tokens';

const ROW_SURFACE = 'rgba(7, 29, 84, 0.55)';
const THUMBNAIL_WIDTH = 74;

export type DownloadOpenHandler = (story: Story, cover: React.RefObject<View | null>) => void;

interface DownloadRowProps {
  story: Story;
  language: SupportedLanguage;
  onOpen: DownloadOpenHandler;
  onDelete: (story: Story) => void;
}

export function DownloadRow({ story, language, onOpen, onDelete }: DownloadRowProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const coverRef = useRef<View>(null);

  const title = getLocalizedText(story.localizedTitle, story.title, language);
  const artwork = typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage;
  const pageCount = storyPageCount(story);

  const handleOpen = useCallback(() => {
    if (!story.isAvailable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpen(story, coverRef);
  }, [story, onOpen]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(story);
  }, [story, onDelete]);

  return (
    <View style={styles.row}>
      <Pressable
        testID={`download-row-${story.id}`}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: !story.isAvailable }}
        onPress={handleOpen}
        style={styles.book}
      >
        <View ref={coverRef} collapsable={false} style={styles.thumbnail}>
          {artwork ? (
            <Image
              source={artwork}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
              <Text style={styles.placeholderEmoji}>{STORY_TAGS[story.category].emoji}</Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <Text
            style={[styles.title, { fontSize: scaledFontSize(15) }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {pageCount !== undefined && (
            <Text
              testID={`download-row-meta-${story.id}`}
              style={[styles.meta, { fontSize: scaledFontSize(12) }]}
              numberOfLines={1}
            >
              {t('storyDetail.pages', { count: pageCount })}
            </Text>
          )}
        </View>
      </Pressable>

      <Pressable
        testID={`download-row-delete-${story.id}`}
        accessibilityRole="button"
        accessibilityLabel={t('storyPreview.removeFromDevice')}
        onPress={handleDelete}
        hitSlop={8}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={20} color={ACCENT_CORAL} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROW_SURFACE,
    borderRadius: RADIUS_CARD,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    padding: SPACE_2,
  },
  book: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
  thumbnail: {
    width: THUMBNAIL_WIDTH,
    height: Math.round(THUMBNAIL_WIDTH / COVER_ASPECT_RATIO),
    borderRadius: RADIUS_SMALL,
    overflow: 'hidden',
    backgroundColor: 'rgba(4, 16, 47, 0.5)',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 22,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  meta: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '500',
  },
  deleteButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
