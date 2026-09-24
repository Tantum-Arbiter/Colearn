import React, { RefObject, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInDown,
  SlideInDown,
  SlideOutDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Story, getLocalizedText, storyPageCount } from '@/types/story';
import { storyThemeChips } from './story-theme-chips';
import type { SupportedLanguage } from '@/services/i18n';
import type { ReadingMode } from '@/contexts/story-transition-context';
import { StoryDownloadService } from '@/services/story-download-service';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { ReadingPlace, readingFraction } from './reading-progress';
import { STORY_DETAIL_OPENING } from '@/constants/story-opening';
import { STORY_CARD, cardIndexAtOffset, type StoryCardLayout } from '@/constants/story-card';
import { StoryPageSlideshow } from './story-page-slideshow';
import { OnboardingProgressBar } from '@/components/onboarding/onboarding-progress-bar';

export interface StoryCardSheetProps {
  /** The books the child can swipe between, in shelf order. */
  stories: Story[];
  /** Which of them was tapped. */
  initialIndex: number;
  layout: StoryCardLayout;
  isFavorite: boolean;
  onStoryChange: (story: Story, index: number) => void;
  /** Choosing a way to read opens the book from the card. */
  onChooseMode: (mode: ReadingMode) => void;
  onClose: () => void;
  onToggleFavorite: () => void;
  /** How far through each book the child is, for the books they have begun. */
  progress?: Record<string, ReadingPlace | undefined>;
  readButtonRef?: RefObject<View | null>;
  recordButtonRef?: RefObject<View | null>;
  narrateButtonRef?: RefObject<View | null>;
}

interface ModeOption {
  mode: ReadingMode;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const MODE_OPTIONS: ModeOption[] = [
  { mode: 'read', labelKey: 'storyDetail.readTogether', icon: 'book-outline' },
  { mode: 'narrate', labelKey: 'storyDetail.playAlong', icon: 'volume-medium-outline' },
  { mode: 'record', labelKey: 'storyDetail.record', icon: 'mic-outline' },
];

/** How far a card that is not the chosen one drops back, and how much it shrinks and darkens. */
export const CARD_REST = {
  drop: 26,
  scale: 0.94,
  shade: 0.5,
} as const;

export function StoryCardSheet({
  stories,
  initialIndex,
  layout,
  isFavorite,
  onStoryChange,
  onChooseMode,
  onClose,
  onToggleFavorite,
  progress,
  readButtonRef,
  recordButtonRef,
  narrateButtonRef,
}: StoryCardSheetProps) {
  const { t, i18n } = useTranslation();
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();
  const currentLanguage = i18n.language as SupportedLanguage;
  const [index, setIndex] = useState(initialIndex);
  const scrollX = useSharedValue(initialIndex * layout.step);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const modeRefs: Record<ReadingMode, RefObject<View | null> | undefined> = {
    read: readButtonRef,
    record: recordButtonRef,
    narrate: narrateButtonRef,
  };

  const settleOn = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = cardIndexAtOffset(event.nativeEvent.contentOffset.x, layout.step, stories.length);
    if (next === index) return;
    setIndex(next);
    Haptics.selectionAsync();
    onStoryChange(stories[next], next);
  }, [index, layout.step, stories, onStoryChange]);

  return (
    <Animated.View
      entering={SlideInDown.duration(STORY_DETAIL_OPENING.sheetRiseMs).easing(Easing.out(Easing.cubic))}
      exiting={SlideOutDown.duration(STORY_DETAIL_OPENING.sheetSinkMs).easing(Easing.in(Easing.cubic))}
      style={styles.container}
      pointerEvents="box-none"
      testID="story-card-sheet"
    >
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={layout.step}
        snapToAlignment="start"
        decelerationRate="fast"
        contentOffset={{ x: initialIndex * layout.step, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: layout.edgePadding, paddingTop: layout.y }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={settleOn}
        style={styles.carousel}
        testID="story-card-carousel"
      >
        {stories.map((story, i) => (
          <StoryCard
            key={story.id}
            story={story}
            place={progress?.[story.id]}
            index={i}
            scrollX={scrollX}
            layout={layout}
            isCurrent={i === index}
            isLast={i === stories.length - 1}
            isFavorite={i === index ? isFavorite : false}
            currentLanguage={currentLanguage}
            modeRefs={i === index ? modeRefs : undefined}
            scaledFontSize={scaledFontSize}
            scaledButtonSize={scaledButtonSize}
            scaledPadding={scaledPadding}
            t={t}
            onChooseMode={onChooseMode}
            onClose={onClose}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </Animated.ScrollView>
    </Animated.View>
  );
}

interface StoryCardProps {
  story: Story;
  place?: ReadingPlace;
  index: number;
  scrollX: { value: number };
  layout: StoryCardLayout;
  isCurrent: boolean;
  isLast: boolean;
  isFavorite: boolean;
  currentLanguage: SupportedLanguage;
  modeRefs?: Record<ReadingMode, RefObject<View | null> | undefined>;
  scaledFontSize: (size: number) => number;
  scaledButtonSize: (size: number) => number;
  scaledPadding: (size: number) => number;
  t: (key: string, options?: Record<string, unknown>) => string;
  onChooseMode: (mode: ReadingMode) => void;
  onClose: () => void;
  onToggleFavorite: () => void;
}

function StoryCard({
  story,
  place,
  index,
  scrollX,
  layout,
  isCurrent,
  isLast,
  isFavorite,
  currentLanguage,
  modeRefs,
  scaledFontSize,
  scaledButtonSize,
  scaledPadding,
  t,
  onChooseMode,
  onClose,
  onToggleFavorite,
}: StoryCardProps) {
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const underway = place !== undefined && place.pageIndex > 0;
  const readPercent = underway ? Math.round(readingFraction(place) * 100) : 0;
  const readLabelKey = underway ? 'storyDetail.continueReading' : 'storyDetail.readTogether';

  useEffect(() => {
    let isActive = true;
    StoryDownloadService.isDownloaded(story.id)
      .then((downloaded) => {
        if (isActive) setIsSavedOffline(downloaded);
      })
      .catch(() => {
        if (isActive) setIsSavedOffline(false);
      });
    return () => {
      isActive = false;
    };
  }, [story.id]);

  // The chosen card stands proud; the others sit back, smaller and in shadow,
  // following the finger continuously as the shelf is swiped
  const step = layout.step;
  const raiseStyle = useAnimatedStyle(() => {
    const distance = Math.min(1, Math.abs(scrollX.value / step - index));
    return {
      transform: [
        { translateY: interpolate(distance, [0, 1], [0, CARD_REST.drop]) },
        { scale: interpolate(distance, [0, 1], [1, CARD_REST.scale]) },
      ],
    };
  });
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.min(1, Math.abs(scrollX.value / step - index)), [0, 1], [0, CARD_REST.shade]),
  }));

  const displayTitle = getLocalizedText(story.localizedTitle, story.title, currentLanguage);
  const displayDescription = getLocalizedText(story.localizedDescription, story.description || '', currentLanguage);
  const themeChips = storyThemeChips(story);
  const pageCount = storyPageCount(story);
  const hasInteractiveContent = Boolean(
    story.pages?.some(
      (page) => (page.interactionType && page.interactionType !== 'none') || page.interactiveElements?.length
    )
  );

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: layout.width,
          height: layout.height,
          marginRight: isLast ? 0 : STORY_CARD.gap,
          borderRadius: STORY_CARD.radius,
        },
        raiseStyle,
      ]}
      testID={`story-card-${story.id}`}
    >
      <View style={[styles.cover, { height: layout.coverHeight }]}>
        <StoryPageSlideshow story={story} isCurrent={isCurrent} width={layout.width} height={layout.coverHeight} />
        <LinearGradient
          colors={['rgba(19, 26, 63, 0)', 'rgba(19, 26, 63, 0)', 'rgba(19, 26, 63, 0.7)', '#131A3F']}
          locations={[0, 0.55, 0.85, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.coverBar} pointerEvents="box-none">
          <Pressable
            style={styles.circleButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleFavorite();
            }}
            hitSlop={10}
            accessibilityLabel={t('storyDetail.favourite')}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={scaledFontSize(19)} color={isFavorite ? '#FF6B8A' : '#FFFFFF'} />
          </Pressable>
          <Pressable style={styles.circleButton} onPress={onClose} hitSlop={10} accessibilityLabel={t('common.back')}>
            <Ionicons name="close" size={scaledFontSize(20)} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View entering={FadeInDown.delay(STORY_DETAIL_OPENING.staggerMs).duration(STORY_DETAIL_OPENING.contentMs)} style={styles.body}>
          <Text style={[styles.title, { fontSize: scaledFontSize(22) }]} numberOfLines={2}>{displayTitle}</Text>

          <View style={styles.metaRow}>
            {pageCount !== undefined && (
              <View style={styles.metaPill}>
                <Ionicons name="book-outline" size={scaledFontSize(12)} color="rgba(255,255,255,0.8)" />
                <Text style={[styles.metaText, { fontSize: scaledFontSize(12) }]}>{t('storyDetail.pages', { count: pageCount })}</Text>
              </View>
            )}
            {story.ageRange && (
              <View style={styles.metaPill}>
                <Ionicons name="people-outline" size={scaledFontSize(12)} color="rgba(255,255,255,0.8)" />
                <Text style={[styles.metaText, { fontSize: scaledFontSize(12) }]}>{t('storyDetail.ages', { range: story.ageRange })}</Text>
              </View>
            )}
            {hasInteractiveContent && (
              <View style={styles.metaPill}>
                <Ionicons name="sparkles-outline" size={scaledFontSize(12)} color="rgba(255,255,255,0.8)" />
                <Text style={[styles.metaText, { fontSize: scaledFontSize(12) }]}>{t('storyDetail.interactive')}</Text>
              </View>
            )}
          </View>

          {displayDescription.length > 0 && (
            <Text style={[styles.description, { fontSize: scaledFontSize(13) }]} numberOfLines={2}>{displayDescription}</Text>
          )}

          <View style={styles.chipRow}>
            {themeChips.map((chip) => (
              <View
                key={chip.id}
                testID={`story-theme-chip-${chip.id}`}
                style={[styles.categoryChip, { backgroundColor: `${chip.color}33`, borderColor: `${chip.color}66` }]}
              >
                <Ionicons name={chip.icon} size={scaledFontSize(12)} color={chip.color} />
                <Text style={[styles.categoryChipText, { fontSize: scaledFontSize(11) }]}>{t(chip.labelKey)}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {underway && (
          <View style={styles.progressRow} testID="story-card-progress">
            <OnboardingProgressBar
              currentStep={place.pageIndex}
              totalSteps={place.totalPages - 1}
              maxWidth={layout.width}
              testIDPrefix="story-card-progress"
            />
            <Text style={[styles.progressText, { fontSize: scaledFontSize(12) }]}>{`${readPercent}%`}</Text>
          </View>
        )}

        <Animated.View
          entering={FadeInDown.delay(STORY_DETAIL_OPENING.staggerMs * 2).duration(STORY_DETAIL_OPENING.contentMs)}
          style={styles.actions}
          testID="story-card-actions"
        >
          <View ref={modeRefs?.read} collapsable={false}>
            <Pressable
              style={[styles.primaryButton, { borderRadius: scaledButtonSize(24), paddingVertical: scaledPadding(14) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onChooseMode('read');
              }}
              accessibilityLabel={t(readLabelKey)}
              testID="story-card-mode-read"
            >
              <Ionicons name="book" size={scaledFontSize(18)} color="#FFFFFF" />
              <Text style={[styles.primaryText, { fontSize: scaledFontSize(15) }]}>{t(readLabelKey)}</Text>
            </Pressable>
          </View>

          <View ref={modeRefs?.narrate} collapsable={false}>
            <Pressable
              style={[styles.secondaryButton, { borderRadius: scaledButtonSize(24), paddingVertical: scaledPadding(12) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onChooseMode('narrate');
              }}
              accessibilityLabel={t('storyDetail.playAlong')}
              testID="story-card-mode-narrate"
            >
              <Ionicons name="volume-medium-outline" size={scaledFontSize(18)} color="#FFFFFF" />
              <Text style={[styles.secondaryText, { fontSize: scaledFontSize(14) }]}>{t('storyDetail.playAlong')}</Text>
            </Pressable>
          </View>

          <View ref={modeRefs?.record} collapsable={false}>
            <Pressable
              style={[styles.secondaryButton, { borderRadius: scaledButtonSize(24), paddingVertical: scaledPadding(12) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onChooseMode('record');
              }}
              accessibilityLabel={t('storyDetail.record')}
              testID="story-card-mode-record"
            >
              <Ionicons name="mic-outline" size={scaledFontSize(18)} color="#FFFFFF" />
              <Text style={[styles.secondaryText, { fontSize: scaledFontSize(14) }]}>{t('storyDetail.record')}</Text>
            </Pressable>
          </View>

          {isSavedOffline && (
            <View style={styles.offlineRow}>
              <Ionicons name="checkmark-circle" size={scaledFontSize(14)} color="#7ED9A7" />
              <Text style={[styles.offlineText, { fontSize: scaledFontSize(12) }]}>{t('storyDetail.savedOffline')}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Animated.View style={[styles.shade, shadeStyle]} pointerEvents="none" testID={`story-card-shade-${story.id}`} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  carousel: {
    flex: 1,
  },
  card: {
    backgroundColor: '#131A3F',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    shadowColor: '#04091F',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
    alignSelf: 'flex-start',
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#04091F',
  },
  cover: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0A0F2C',
  },
  coverBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 15, 44, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyScrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  title: {
    fontFamily: Fonts.primary,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  metaText: {
    fontFamily: Fonts.sans,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  description: {
    fontFamily: Fonts.sans,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actions: {
    marginTop: 'auto',
    paddingHorizontal: 18,
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6D5DF5',
    shadowColor: '#6D5DF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryText: {
    fontFamily: Fonts.primary,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  secondaryText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  offlineText: {
    fontFamily: Fonts.sans,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
