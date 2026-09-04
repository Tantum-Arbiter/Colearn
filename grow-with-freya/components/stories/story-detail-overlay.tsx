import React, { useEffect, useState, RefObject } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Story, getLocalizedText } from '@/types/story';
import { storyThemeChips } from './story-theme-chips';
import type { SupportedLanguage } from '@/services/i18n';
import type { ReadingMode } from '@/contexts/story-transition-context';
import { StoryDownloadService } from '@/services/story-download-service';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';


export interface StoryDetailOverlayProps {
  story: Story;
  heroHeight: number;
  isFavorite: boolean;
  selectedMode: ReadingMode;
  onSelectMode: (mode: ReadingMode) => void;
  onReadNow: () => void;
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

export function StoryDetailOverlay({
  story,
  heroHeight,
  isFavorite,
  selectedMode,
  onSelectMode,
  onReadNow,
  onPreview,
  onClose,
  onToggleFavorite,
  readButtonRef,
  recordButtonRef,
  narrateButtonRef,
  previewButtonRef,
}: StoryDetailOverlayProps) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();
  const currentLanguage = i18n.language as SupportedLanguage;

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


  const modeRefs: Record<ReadingMode, RefObject<View | null> | undefined> = {
    read: readButtonRef,
    record: recordButtonRef,
    narrate: narrateButtonRef,
  };

  const heroSource =
    typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        entering={FadeIn.duration(350)}
        exiting={FadeOut.duration(250)}
        style={[styles.heroContainer, { height: heroHeight }]}
        pointerEvents="box-none"
      >
        {heroSource && (
          <ExpoImage
            source={heroSource}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
          />
        )}
        <LinearGradient
          colors={['rgba(10, 15, 44, 0)', 'rgba(10, 15, 44, 0.55)', '#0A0F2C']}
          locations={[0, 0.72, 1]}
          style={styles.heroGradient}
          pointerEvents="none"
        />

        <View ref={previewButtonRef} collapsable={false} style={[styles.previewButtonWrap, { bottom: scaledPadding(18) }]}>
          <Pressable
            style={styles.heroCircleButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPreview();
            }}
            hitSlop={8}
            accessibilityLabel={t('storyMode.preview')}
          >
            <Ionicons name="images-outline" size={scaledFontSize(18)} color="#FFFFFF" />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={[styles.topBar, { top: insets.top + scaledPadding(8) }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.heroCircleButton}
          onPress={onClose}
          hitSlop={10}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={scaledFontSize(20)} color="#FFFFFF" />
        </Pressable>
        <Pressable
          style={styles.heroCircleButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleFavorite();
          }}
          hitSlop={10}
          accessibilityLabel={t('storyDetail.favourite')}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={scaledFontSize(20)}
            color={isFavorite ? '#FF6B8A' : '#FFFFFF'}
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(450).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutDown.duration(280)}
        style={[styles.sheet, { top: heroHeight - scaledPadding(24) }]}
      >
        <ScrollView
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + scaledPadding(16) }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <Text style={[styles.title, { fontSize: scaledFontSize(26) }]}>{displayTitle}</Text>

            <View style={styles.chipRow}>
              {themeChips.map((chip) => (
                <View
                  key={chip.id}
                  testID={`story-theme-chip-${chip.id}`}
                  style={[styles.categoryChip, { backgroundColor: `${chip.color}33`, borderColor: `${chip.color}66` }]}
                >
                  <Ionicons name={chip.icon} size={scaledFontSize(13)} color={chip.color} />
                  <Text style={[styles.categoryChipText, { fontSize: scaledFontSize(12) }]}>
                    {t(chip.labelKey)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.metaRow}>
              {typeof story.duration === 'number' && (
                <View style={styles.metaPill}>
                  <Ionicons name="time-outline" size={scaledFontSize(13)} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.metaText, { fontSize: scaledFontSize(12) }]}>
                    {t('storyDetail.minutes', { count: story.duration })}
                  </Text>
                </View>
              )}
              {story.ageRange && (
                <View style={styles.metaPill}>
                  <Ionicons name="people-outline" size={scaledFontSize(13)} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.metaText, { fontSize: scaledFontSize(12) }]}>
                    {t('storyDetail.ages', { range: story.ageRange })}
                  </Text>
                </View>
              )}
              {hasInteractiveContent && (
                <View style={styles.metaPill}>
                  <Ionicons name="sparkles-outline" size={scaledFontSize(13)} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.metaText, { fontSize: scaledFontSize(12) }]}>
                    {t('storyDetail.interactive')}
                  </Text>
                </View>
              )}
            </View>

            {displayDescription.length > 0 && (
              <Text style={[styles.description, { fontSize: scaledFontSize(14) }]}>{displayDescription}</Text>
            )}

          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.modeRow}>
            {MODE_OPTIONS.map((option) => {
              const isSelected = selectedMode === option.mode;
              return (
                <View key={option.mode} ref={modeRefs[option.mode]} collapsable={false} style={styles.modeButtonWrap}>
                  <Pressable
                    style={[styles.modeButton, isSelected && styles.modeButtonSelected, { borderRadius: scaledButtonSize(16) }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelectMode(option.mode);
                    }}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={scaledFontSize(22)}
                      color={isSelected ? '#B9AEFF' : 'rgba(255,255,255,0.85)'}
                    />
                    <Text style={[styles.modeButtonText, isSelected && styles.modeButtonTextSelected, { fontSize: scaledFontSize(11) }]}>
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(400)}>
            <Pressable
              style={[styles.readNowButton, { borderRadius: scaledButtonSize(16), paddingVertical: scaledPadding(14) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onReadNow();
              }}
              accessibilityLabel={t('storyDetail.readNow')}
            >
              <Ionicons name="book" size={scaledFontSize(18)} color="#FFFFFF" />
              <Text style={[styles.readNowText, { fontSize: scaledFontSize(16) }]}>{t('storyDetail.readNow')}</Text>
            </Pressable>

            {isSavedOffline && (
              <View style={[styles.offlineRow, { borderRadius: scaledButtonSize(16), paddingVertical: scaledPadding(12) }]}>
                <Ionicons name="checkmark-circle" size={scaledFontSize(16)} color="#7ED9A7" />
                <Text style={[styles.offlineText, { fontSize: scaledFontSize(13) }]}>
                  {t('storyDetail.savedOffline')}
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0F2C',
  },
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  heroCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(10, 15, 44, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButtonWrap: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontFamily: Fonts.primary,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    lineHeight: 20,
    marginBottom: 14,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeButtonWrap: {
    flex: 1,
  },
  modeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modeButtonSelected: {
    backgroundColor: 'rgba(109, 93, 245, 0.22)',
    borderColor: '#8B7CF8',
  },
  modeButtonText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  modeButtonTextSelected: {
    color: '#CFC7FF',
  },
  readNowButton: {
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
  readNowText: {
    fontFamily: Fonts.primary,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  offlineText: {
    fontFamily: Fonts.sans,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
