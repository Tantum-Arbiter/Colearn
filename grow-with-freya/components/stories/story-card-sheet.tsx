import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Story, getLocalizedText } from '@/types/story';
import { storyThemeChips } from './story-theme-chips';
import type { SupportedLanguage } from '@/services/i18n';
import type { ReadingMode } from '@/contexts/story-transition-context';
import { StoryDownloadService } from '@/services/story-download-service';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { STORY_DETAIL_OPENING, heroFadeDelay } from '@/constants/story-opening';
import { STORY_CARD, cardIndexAtOffset, type StoryCardLayout } from '@/constants/story-card';

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
  onPreview: () => void;
  onClose: () => void;
  onToggleFavorite: () => void;
  readButtonRef?: RefObject<View | null>;
  recordButtonRef?: RefObject<View | null>;
  narrateButtonRef?: RefObject<View | null>;
  previewButtonRef?: RefObject<View | null>;
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

export function StoryCardSheet({
  stories,
  initialIndex,
  layout,
  isFavorite,
  onStoryChange,
  onChooseMode,
  onPreview,
  onClose,
  onToggleFavorite,
  readButtonRef,
  recordButtonRef,
  narrateButtonRef,
  previewButtonRef,
}: StoryCardSheetProps) {
  const { t, i18n } = useTranslation();
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();
  const currentLanguage = i18n.language as SupportedLanguage;
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

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
    <View style={styles.container} pointerEvents="box-none" testID="story-card-sheet">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={layout.step}
        snapToAlignment="start"
        decelerationRate="fast"
        contentOffset={{ x: initialIndex * layout.step, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: layout.edgePadding, paddingTop: layout.y }}
        onMomentumScrollEnd={settleOn}
        style={styles.carousel}
        testID="story-card-carousel"
      >
        {stories.map((story, i) => (
          <StoryCard
            key={story.id}
            story={story}
            layout={layout}
            isCurrent={i === index}
            isTapped={i === initialIndex}
            isLast={i === stories.length - 1}
            isFavorite={i === index ? isFavorite : false}
            currentLanguage={currentLanguage}
            modeRefs={i === index ? modeRefs : undefined}
            previewButtonRef={i === index ? previewButtonRef : undefined}
            scaledFontSize={scaledFontSize}
            scaledButtonSize={scaledButtonSize}
            scaledPadding={scaledPadding}
            t={t}
            onChooseMode={onChooseMode}
            onPreview={onPreview}
            onClose={onClose}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface StoryCardProps {
  story: Story;
  layout: StoryCardLayout;
  isCurrent: boolean;
  isTapped: boolean;
  isLast: boolean;
  isFavorite: boolean;
  currentLanguage: SupportedLanguage;
  modeRefs?: Record<ReadingMode, RefObject<View | null> | undefined>;
  previewButtonRef?: RefObject<View | null>;
  scaledFontSize: (size: number) => number;
  scaledButtonSize: (size: number) => number;
  scaledPadding: (size: number) => number;
  t: (key: string, options?: Record<string, unknown>) => string;
  onChooseMode: (mode: ReadingMode) => void;
  onPreview: () => void;
  onClose: () => void;
  onToggleFavorite: () => void;
}

function StoryCard({
  story,
  layout,
  isCurrent,
  isTapped,
  isLast,
  isFavorite,
  currentLanguage,
  modeRefs,
  previewButtonRef,
  scaledFontSize,
  scaledButtonSize,
  scaledPadding,
  t,
  onChooseMode,
  onPreview,
  onClose,
  onToggleFavorite,
}: StoryCardProps) {
  const [isSavedOffline, setIsSavedOffline] = useState(false);

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

  const displayTitle = getLocalizedText(story.localizedTitle, story.title, currentLanguage);
  const displayDescription = getLocalizedText(story.localizedDescription, story.description || '', currentLanguage);
  const themeChips = storyThemeChips(story);
  const hasInteractiveContent = Boolean(
    story.pages?.some(
      (page) => (page.interactionType && page.interactionType !== 'none') || page.interactiveElements?.length
    )
  );
  const coverSource = typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage;

  // The tapped card's cover waits for the flying book to land on it before
  // fading in over it; every other card is simply there when swiped to.
  const coverEntering = isTapped
    ? FadeIn.delay(heroFadeDelay()).duration(STORY_DETAIL_OPENING.heroFadeMs)
    : FadeIn.duration(1);

  return (
    <Animated.View
      entering={FadeIn.duration(STORY_DETAIL_OPENING.sheetRiseMs).easing(Easing.out(Easing.cubic))}
      exiting={FadeOut.duration(200)}
      style={[
        styles.card,
        {
          width: layout.width,
          height: layout.height,
          marginRight: isLast ? 0 : STORY_CARD.gap,
          borderRadius: STORY_CARD.radius,
        },
      ]}
      testID={`story-card-${story.id}`}
    >
      <View style={[styles.cover, { height: layout.coverHeight }]}>
        <Animated.View entering={coverEntering} style={StyleSheet.absoluteFill}>
          {coverSource && (
            <ExpoImage source={coverSource} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" priority="high" />
          )}
          <LinearGradient
            colors={['rgba(19, 26, 63, 0)', 'rgba(19, 26, 63, 0)', 'rgba(19, 26, 63, 0.7)', '#131A3F']}
            locations={[0, 0.55, 0.85, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </Animated.View>

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

        <View ref={previewButtonRef} collapsable={false} style={styles.previewWrap}>
          <Pressable
            style={styles.circleButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPreview();
            }}
            hitSlop={8}
            accessibilityLabel={t('storyMode.preview')}
          >
            <Ionicons name="images-outline" size={scaledFontSize(17)} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView


        style={styles.bodyScroll}


        contentContainerStyle={styles.bodyContent}


        showsVerticalScrollIndicator={false}


        bounces={false}


        scrollEnabled={isCurrent}


      >


      <Animated.View entering={FadeInDown.delay(STORY_DETAIL_OPENING.staggerMs).duration(STORY_DETAIL_OPENING.contentMs)} style={styles.body}>
        <Text style={[styles.title, { fontSize: scaledFontSize(22) }]} numberOfLines={2}>{displayTitle}</Text>

        <View style={styles.metaRow}>
          {typeof story.duration === 'number' && (
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={scaledFontSize(12)} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.metaText, { fontSize: scaledFontSize(12) }]}>{t('storyDetail.minutes', { count: story.duration })}</Text>
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

      <Animated.View entering={FadeInDown.delay(STORY_DETAIL_OPENING.staggerMs * 2).duration(STORY_DETAIL_OPENING.contentMs)} style={styles.actions}>
        <View ref={modeRefs?.read} collapsable={false}>
          <Pressable
            style={[styles.primaryButton, { borderRadius: scaledButtonSize(24), paddingVertical: scaledPadding(14) }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onChooseMode('read');
            }}
            accessibilityLabel={t('storyDetail.readTogether')}
            testID="story-card-mode-read"
          >
            <Ionicons name="book" size={scaledFontSize(18)} color="#FFFFFF" />
            <Text style={[styles.primaryText, { fontSize: scaledFontSize(15) }]}>{t('storyDetail.readTogether')}</Text>
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

        <View style={styles.divider} />

        <View ref={modeRefs?.record} collapsable={false}>
          <Pressable
            style={[styles.tertiaryButton, { paddingVertical: scaledPadding(10) }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onChooseMode('record');
            }}
            accessibilityLabel={t('storyDetail.record')}
            testID="story-card-mode-record"
          >
            <Ionicons name="mic-outline" size={scaledFontSize(16)} color="rgba(255,255,255,0.85)" />
            <Text style={[styles.tertiaryText, { fontSize: scaledFontSize(13) }]}>{t('storyDetail.record')}</Text>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
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
  previewWrap: {
    position: 'absolute',
    right: 12,
    bottom: 12,
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
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 16,
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
    paddingHorizontal: 18,
    gap: 8,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginTop: 4,
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tertiaryText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: 'rgba(255, 255, 255, 0.85)',
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
