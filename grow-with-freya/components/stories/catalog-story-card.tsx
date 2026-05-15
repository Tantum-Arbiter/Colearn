import React, { memo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useAnimatedProps, useSharedValue, withTiming, withSpring, withSequence, withDelay, Easing } from 'react-native-reanimated';
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
  const progressValue = useSharedValue(0);     // 0-100 ring progress
  const overlayOpacity = useSharedValue(1);    // dark overlay
  const ringOpacity = useSharedValue(0);       // progress ring visibility
  const ringScale = useSharedValue(1);         // ring scale on completion
  const checkOpacity = useSharedValue(0);      // checkmark
  const checkScale = useSharedValue(0.5);      // checkmark scale
  const cardScale = useSharedValue(1);         // card pop on reveal

  // Circular progress ring constants
  const RING_SIZE = 48;
  const RING_STROKE = 3.5;
  const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progressValue.value / 100),
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const ringContainerStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePress = useCallback(async () => {
    if (downloading || complete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);
    ringOpacity.value = withTiming(1, { duration: 200 });

    try {
      const result = await StoryDownloadService.downloadStory(
        entry.storyId,
        entry,
        (p) => {
          progressValue.value = withTiming(p.progress, { duration: 800, easing: Easing.linear });
        }
      );

      if (result.success) {
        // 1. Complete the ring
        progressValue.value = withTiming(100, { duration: 300, easing: Easing.out(Easing.ease) });

        // 2. Ring scales up and fades out
        ringScale.value = withDelay(300, withTiming(1.8, { duration: 350, easing: Easing.out(Easing.ease) }));
        ringOpacity.value = withDelay(300, withTiming(0, { duration: 350 }));

        // 3. Checkmark pops in with spring
        checkOpacity.value = withDelay(400, withTiming(1, { duration: 200 }));
        checkScale.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 200 }));

        // 4. Overlay fades out to reveal the full-colour thumbnail
        overlayOpacity.value = withDelay(500, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));

        // 5. Subtle card pop to punctuate the reveal
        cardScale.value = withDelay(600, withSequence(
          withSpring(1.04, { damping: 15, stiffness: 300 }),
          withSpring(1, { damping: 15, stiffness: 300 })
        ));

        // 6. Checkmark fades out
        checkOpacity.value = withDelay(900, withTiming(0, { duration: 300 }));
        checkScale.value = withDelay(900, withTiming(1.3, { duration: 300 }));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setComplete(true);
        setTimeout(() => onDownloadComplete?.(entry.storyId), 1300);
      } else {
        setDownloading(false);
        progressValue.value = withTiming(0, { duration: 200 });
        ringOpacity.value = withTiming(0, { duration: 200 });
        Alert.alert('Download Failed', result.error || 'Something went wrong. Please try again.', [{ text: 'OK' }]);
      }
    } catch (err) {
      setDownloading(false);
      progressValue.value = withTiming(0, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
      Alert.alert('Download Failed', 'An unexpected error occurred. Please try again.', [{ text: 'OK' }]);
    }
  }, [downloading, complete, entry, onDownloadComplete, progressValue, ringOpacity, ringScale, checkOpacity, checkScale, overlayOpacity, cardScale]);

  const handleLongPress = useCallback(() => {
    if (downloading) return;
    onLongPress?.(entry);
  }, [downloading, entry, onLongPress]);

  return (
    <Pressable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={400} style={cardStyles.pressable}>
      <Animated.View style={[cardStyles.card, { width: cardWidth, height: cardHeight, borderRadius }, cardAnimStyle]}>
        {/* Thumbnail image */}
        {entry.thumbnailUrl ? (
          <Image
            source={{ uri: entry.thumbnailUrl, cacheKey: `catalog-thumb-${entry.storyId}` }}
            style={[cardStyles.coverImage, { width: cardWidth, height: cardHeight, borderRadius }]}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
            onError={(e) => console.warn(`[CatalogCard] Image failed for ${entry.storyId}:`, e)}
          />
        ) : (
          <View style={[cardStyles.placeholder, { width: cardWidth, height: cardHeight, borderRadius }]}>
            <Text style={cardStyles.emoji}>{entry.emoji}</Text>
          </View>
        )}

        {/* Dark overlay — stays full during download, fades on completion */}
        <Animated.View style={[cardStyles.darkOverlay, { borderRadius }, overlayStyle]} />

        {/* Download icon (before downloading) */}
        {!downloading && !complete && (
          <View style={cardStyles.iconContainer}>
            <View style={cardStyles.iconCircle}>
              <Ionicons name="cloud-download-outline" size={22} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Circular progress ring (during download) */}
        {downloading && (
          <Animated.View style={[cardStyles.iconContainer, ringContainerStyle]}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth={RING_STROKE}
                fill="rgba(0, 0, 0, 0.3)"
              />
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
      </Animated.View>

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
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
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
