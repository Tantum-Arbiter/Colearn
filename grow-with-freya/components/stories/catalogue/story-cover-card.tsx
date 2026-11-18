import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CatalogEntry, STORY_TAGS, getLocalizedText } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { NIGHT_DEEP, NIGHT_VOID, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CHILD_UI_MOTION, CHILD_UI_SCALE, motionDuration } from '@/constants/child-ui-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  COVER_ASPECT_RATIO,
  RADIUS_CARD,
  SPACE_2,
  SPACE_3,
} from '@/components/child-ui/tokens';
import { CatalogueStory } from './catalogue-story';
import { StoryOpenHandler } from './featured-story-card';
import { useCatalogueDownload } from './use-catalogue-download';
import { CoverTitle } from './cover-title';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);


const RING_SIZE = 48;
const RING_STROKE = 3.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface StoryCoverCardProps {
  story: CatalogueStory;
  width: number;
  language: SupportedLanguage;
  onOpen: StoryOpenHandler;
  onLockedPress?: () => void;
  onShareToUnlock?: (entry: CatalogEntry) => void;
  onDownloadComplete?: (storyId: string) => void;
  onAuthError?: () => void;
  onDownloadLimitReached?: (entry: CatalogEntry) => void;
  hidden?: boolean;
  testID?: string;
}

export function StoryCoverCard({
  story,
  width,
  language,
  onOpen,
  onLockedPress,
  onShareToUnlock,
  onDownloadComplete,
  onAuthError,
  onDownloadLimitReached,
  hidden = false,
  testID,
}: StoryCoverCardProps) {
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<View>(null);
  const pressScale = useSharedValue(1);
  const title = getLocalizedText(story.title, story.title.en, language);
  const height = Math.round(width / COVER_ASPECT_RATIO);
  const remoteEntry = story.source.kind === 'remote' ? story.source.entry : null;

  const download = useCatalogueDownload(remoteEntry, {
    onDownloadComplete,
    onAuthError,
    onDownloadLimitReached,
  });

  const duration = motionDuration(CHILD_UI_MOTION.cardTap, reduceMotion);

  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * download.cardScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: download.overlayOpacity.value,
  }));

  const ringContainerStyle = useAnimatedStyle(() => ({
    opacity: download.ringOpacity.value,
    transform: [{ scale: download.ringScale.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: download.checkOpacity.value,
    transform: [{ scale: download.checkScale.value }],
  }));

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - download.progressValue.value / 100),
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(CHILD_UI_SCALE.cardPressed, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handlePress = useCallback(() => {
    if (!remoteEntry) {
      onOpen(story, cardRef);
      return;
    }
    if (story.shareToUnlock) {
      onShareToUnlock?.(remoteEntry);
      return;
    }
    if (story.locked) {
      onLockedPress?.();
      return;
    }
    void download.startOrCancel();
  }, [remoteEntry, story, onOpen, onShareToUnlock, onLockedPress, download]);

  const artworkSource = typeof story.coverArtwork === 'string'
    ? { uri: story.coverArtwork }
    : story.coverArtwork;

  if (hidden) {
    return (
      <View ref={cardRef} collapsable={false} style={[styles.hidden, { width, height }]} />
    );
  }

  return (
    <Animated.View ref={cardRef} collapsable={false} style={pressAnimatedStyle}>
      <View style={[styles.frame, { width, height, borderRadius: RADIUS_CARD }]} testID={`${testID ?? `story-cover-card-${story.id}`}-frame`}>
      <Pressable
        testID={testID ?? `story-cover-card-${story.id}`}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        {artworkSource ? (
          <Image
            source={artworkSource}
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

        <CoverTitle title={title} />

        {remoteEntry && (
          <>
            <Animated.View style={[styles.darkOverlay, overlayStyle]} pointerEvents="none" />

            {!download.downloading && !download.complete && (
              <View style={styles.statusContainer} pointerEvents="none">
                {story.shareToUnlock ? (
                  <View style={[styles.statusCircle, styles.shareCircle]} testID="story-cover-share">
                    <Ionicons name="share-outline" size={22} color={TEXT_PRIMARY} />
                  </View>
                ) : story.locked ? (
                  <View style={[styles.statusCircle, styles.lockCircle]} testID="story-cover-lock">
                    <Ionicons name="lock-closed" size={20} color={TEXT_PRIMARY} />
                  </View>
                ) : (
                  <View style={[styles.statusCircle, styles.downloadCircle]} testID="story-cover-download">
                    <Ionicons name="cloud-download-outline" size={22} color={TEXT_PRIMARY} />
                  </View>
                )}
              </View>
            )}

            {download.downloading && (
              <Animated.View style={[styles.statusContainer, ringContainerStyle]} pointerEvents="none">
                <View style={styles.ringWrapper}>
                  <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
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
                      stroke={download.statusText ? '#FFD93D' : '#4ECDC4'}
                      strokeWidth={RING_STROKE}
                      fill="transparent"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      animatedProps={animatedCircleProps}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <View style={styles.cancelIcon}>
                    <Ionicons name="stop" size={14} color="rgba(255,255,255,0.7)" />
                  </View>
                </View>
                {download.statusText ? (
                  <Text style={styles.stallText}>{download.statusText}</Text>
                ) : download.downloadInfo ? (
                  <Text style={styles.downloadInfoText} numberOfLines={1}>{download.downloadInfo}</Text>
                ) : null}
              </Animated.View>
            )}

            {download.complete && (
              <Animated.View style={[styles.statusContainer, checkmarkStyle]} pointerEvents="none">
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={26} color={TEXT_PRIMARY} />
                </View>
              </Animated.View>
            )}

            {story.free && !download.downloading && !download.complete && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            )}
          </>
        )}
      </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  // A plain rounded card: the cover art is the whole of it, with no spine or
  // page edges drawn on (operator decision 2026-09-05)
  frame: {
    overflow: 'hidden',
    backgroundColor: NIGHT_DEEP,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: NIGHT_DEEP,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: NIGHT_VOID,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 36,
    opacity: 0.6,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  statusContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  downloadCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  lockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderColor: 'rgba(255, 200, 50, 0.7)',
  },
  shareCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderColor: 'rgba(100, 180, 255, 0.7)',
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
    color: TEXT_PRIMARY,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
  },
  ringWrapper: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  cancelIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadInfoText: {
    position: 'absolute',
    bottom: 6,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: Fonts.rounded,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    paddingHorizontal: 4,
  },
  stallText: {
    position: 'absolute',
    bottom: 6,
    color: '#FFD93D',
    fontFamily: Fonts.rounded,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
