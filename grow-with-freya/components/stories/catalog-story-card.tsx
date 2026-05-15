import React, { memo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useAnimatedProps, useSharedValue, withTiming, withSequence, withDelay, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { CatalogEntry, getLocalizedText } from '@/types/story';
import { StoryDownloadService, DownloadProgress } from '@/services/story-download-service';
import { Fonts } from '@/constants/theme';
import type { SupportedLanguage } from '@/services/i18n';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  const [complete, setComplete] = useState(false);

  // Animated values
  const progressValue = useSharedValue(0);   // 0-100
  const overlayOpacity = useSharedValue(1);  // grey overlay fade
  const checkOpacity = useSharedValue(0);    // checkmark fade-in
  const ringOpacity = useSharedValue(0);     // progress ring visibility

  // Circular progress ring constants
  const RING_SIZE = 48;
  const RING_STROKE = 3.5;
  const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // Animated props for the SVG circle stroke
  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progressValue.value / 100),
  }));

  // Card reveal: overlay shrinks from top as progress fills from bottom
  const revealStyle = useAnimatedStyle(() => ({
    height: `${100 - progressValue.value}%`,
    opacity: overlayOpacity.value,
  }));

  const ringFadeStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  const handlePress = useCallback(async () => {
    if (downloading || complete) return;
    console.log(`[CatalogStoryCard] Download pressed for ${entry.storyId}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);
    ringOpacity.value = withTiming(1, { duration: 200 });

    try {
      const result = await StoryDownloadService.downloadStory(
        entry.storyId,
        entry,
        (p) => {
          progressValue.value = withTiming(p.progress, { duration: 250, easing: Easing.out(Easing.ease) });
        }
      );

      if (result.success) {
        // Finish reveal, show checkmark, then notify parent
        progressValue.value = withTiming(100, { duration: 200 });
        ringOpacity.value = withTiming(0, { duration: 200 });
        checkOpacity.value = withSequence(
          withTiming(1, { duration: 250 }),
          withDelay(600, withTiming(0, { duration: 250 }))
        );
        overlayOpacity.value = withDelay(200, withTiming(0, { duration: 300 }));
        setComplete(true);
        setTimeout(() => onDownloadComplete?.(entry.storyId), 1100);
      } else {
        setDownloading(false);
        progressValue.value = withTiming(0, { duration: 200 });
        ringOpacity.value = withTiming(0, { duration: 200 });
        overlayOpacity.value = withTiming(1, { duration: 200 });
        Alert.alert('Download Failed', result.error || 'Something went wrong. Please try again.', [{ text: 'OK' }]);
      }
    } catch (err) {
      setDownloading(false);
      progressValue.value = withTiming(0, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
      overlayOpacity.value = withTiming(1, { duration: 200 });
      Alert.alert('Download Failed', 'An unexpected error occurred. Please try again.', [{ text: 'OK' }]);
    }
  }, [downloading, complete, entry, onDownloadComplete, progressValue, ringOpacity, checkOpacity, overlayOpacity]);

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
            source={{ uri: entry.thumbnailUrl, cacheKey: `catalog-thumb-${entry.storyId}` }}
            style={[cardStyles.coverImage, { width: cardWidth, height: cardHeight, borderRadius }]}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={(e) => console.warn(`[CatalogCard] Image failed for ${entry.storyId}:`, e)}
          />
        ) : (
          <View style={[cardStyles.placeholder, { width: cardWidth, height: cardHeight, borderRadius }]}>
            <Text style={cardStyles.emoji}>{entry.emoji}</Text>
          </View>
        )}

        {/* Grey overlay — shrinks from top to reveal thumbnail as download progresses */}
        {!complete && (
          <Animated.View
            style={[cardStyles.greyOverlay, { borderRadius }, downloading ? revealStyle : undefined]}
          />
        )}

        {/* Download icon (before downloading) */}
        {!downloading && !complete && (
          <View style={cardStyles.iconContainer}>
            <View style={cardStyles.iconCircle}>
              <Ionicons name="cloud-download-outline" size={22} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Circular progress ring (during download) */}
        {downloading && !complete && (
          <Animated.View style={[cardStyles.iconContainer, ringFadeStyle]}>
            <View style={cardStyles.ringContainer}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
                {/* Background track */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth={RING_STROKE}
                  fill="rgba(0, 0, 0, 0.4)"
                />
                {/* Animated progress arc */}
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="#4ECDC4"
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  animatedProps={animatedCircleProps}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </Animated.View>
        )}

        {/* Checkmark on completion */}
        {complete && (
          <Animated.View style={[cardStyles.iconContainer, checkmarkStyle]}>
            <View style={cardStyles.checkCircle}>
              <Ionicons name="checkmark" size={26} color="#FFFFFF" />
            </View>
          </Animated.View>
        )}

        {/* Free badge */}
        {entry.isFree && !downloading && !complete && (
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  ringContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(78, 205, 196, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
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
