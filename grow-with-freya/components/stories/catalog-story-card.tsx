import React, { memo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CatalogEntry, getLocalizedText } from '@/types/story';
import { StoryDownloadService, DownloadProgress } from '@/services/story-download-service';
import { AssetDownloadUtils } from '@/services/asset-download-utils';
import { Fonts } from '@/constants/theme';
import type { SupportedLanguage } from '@/services/i18n';

interface CatalogStoryCardProps {
  entry: CatalogEntry;
  cardWidth: number;
  cardHeight: number;
  borderRadius: number;
  language: SupportedLanguage;
  onDownloadComplete?: (storyId: string) => void;
  onLongPress?: (entry: CatalogEntry) => void;
}

export const CatalogStoryCard = memo(function CatalogStoryCard({
  entry,
  cardWidth,
  cardHeight,
  borderRadius,
  language,
  onDownloadComplete,
  onLongPress,
}: CatalogStoryCardProps) {
  const displayTitle = getLocalizedText(entry.localizedTitle, entry.title, language);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  // Animated progress bar width
  const progressWidth = useSharedValue(0);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handlePress = useCallback(async () => {
    if (downloading) return;
    console.log(`[CatalogStoryCard] Download pressed for ${entry.storyId}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);

    try {
      const result = await StoryDownloadService.downloadStory(
        entry.storyId,
        entry,
        (p) => {
          console.log(`[CatalogStoryCard] Progress: ${p.phase} ${p.progress}% - ${p.message}`);
          setProgress(p);
          progressWidth.value = withTiming(p.progress, { duration: 200 });
        }
      );

      if (result.success) {
        console.log(`[CatalogStoryCard] Download complete for ${entry.storyId}`);
        onDownloadComplete?.(entry.storyId);
      } else {
        // Reset on failure so user can retry
        setDownloading(false);
        setProgress(null);
        progressWidth.value = 0;
        console.warn(`[CatalogStoryCard] Download failed for ${entry.storyId}: ${result.error}`);
        Alert.alert(
          'Download Failed',
          result.error || 'Something went wrong. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      setDownloading(false);
      setProgress(null);
      progressWidth.value = 0;
      console.error(`[CatalogStoryCard] Download error for ${entry.storyId}:`, err);
      Alert.alert('Download Failed', 'An unexpected error occurred. Please try again.', [{ text: 'OK' }]);
    }
  }, [downloading, entry, onDownloadComplete, progressWidth]);

  const showProgressBar = downloading && progress && progress.phase !== 'complete' && progress.phase !== 'failed';
  const bytesMsg = progress?.detail?.bytesDownloaded !== undefined
    ? `${AssetDownloadUtils.formatBytes(progress.detail.bytesDownloaded)}${progress.detail.totalBytes ? ` / ${AssetDownloadUtils.formatBytes(progress.detail.totalBytes)}` : ''}`
    : progress?.message;

  const handleLongPress = useCallback(() => {
    if (downloading) return;
    onLongPress?.(entry);
  }, [downloading, entry, onLongPress]);

  return (
    <Pressable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={400} style={cardStyles.pressable}>
      <View style={[cardStyles.card, { width: cardWidth, height: cardHeight, borderRadius }]}>
        {/* Thumbnail image */}
        {entry.thumbnailUrl ? (
          <Image
            source={{ uri: entry.thumbnailUrl }}
            style={[cardStyles.coverImage, { width: cardWidth, height: cardHeight, borderRadius }]}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={(e) => console.warn(`[CatalogCard] Image failed for ${entry.storyId}:`, e)}
            onLoad={() => console.log(`[CatalogCard] Image loaded for ${entry.storyId}`)}
          />
        ) : (
          <View style={[cardStyles.placeholder, { width: cardWidth, height: cardHeight, borderRadius }]}>
            <Text style={cardStyles.emoji}>{entry.emoji}</Text>
          </View>
        )}

        {/* Grey overlay to indicate not-downloaded */}
        {!downloading && (
          <View style={[cardStyles.greyOverlay, { borderRadius }]} />
        )}

        {/* Download icon centred on card (only when not downloading) */}
        {!downloading && (
          <View style={cardStyles.iconContainer}>
            <View style={cardStyles.iconCircle}>
              <Ionicons name="cloud-download-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Progress bar overlay at bottom */}
        {showProgressBar && (
          <View style={[cardStyles.progressContainer, { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }]}>
            <View style={cardStyles.progressTrack}>
              <Animated.View style={[cardStyles.progressFill, progressBarStyle]} />
            </View>
            <Text style={cardStyles.progressText} numberOfLines={1}>
              {progress.phase === 'downloading-assets' ? bytesMsg : progress.message}
            </Text>
          </View>
        )}

        {/* Free badge */}
        {entry.isFree && !downloading && (
          <View style={cardStyles.freeBadge}>
            <Text style={cardStyles.freeBadgeText}>FREE</Text>
          </View>
        )}
      </View>

      {/* Title below the card */}
      <View style={[cardStyles.titleContainer, { width: cardWidth }]}>
        <Text style={cardStyles.title} numberOfLines={2}>{displayTitle}</Text>
      </View>
    </Pressable>
  );
});

const cardStyles = StyleSheet.create({
  pressable: {
    marginRight: 15,
  },
  card: {
    backgroundColor: '#666',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  coverImage: {
    backgroundColor: '#e8e8e8',
  },
  placeholder: {
    backgroundColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 36,
    opacity: 0.5,
  },
  greyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  iconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    marginTop: 2,
  },
  freeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  titleContainer: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    minHeight: 32,
  },
});
