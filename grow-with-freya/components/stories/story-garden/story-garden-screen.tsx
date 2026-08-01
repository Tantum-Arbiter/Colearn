import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Story } from '@/types/story';
import { ALL_STORIES } from '@/data/stories';
import { StoryLoader } from '@/services/story-loader';
import { Fonts } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';
import { ParentsOnlyModal } from '@/components/ui/parents-only-modal';
import { useStoryTransition } from '@/contexts/story-transition-context';
import { useBookOpening } from '@/hooks/use-book-opening';
import { PageHeader } from '@/components/ui/page-header';
import type { SupportedLanguage } from '@/services/i18n';
import { STORY_PLACES, groupIntoPlaces } from '@/constants/story-places';
import { STORY_GARDEN_SCALE } from '@/constants/story-garden-motion';
import { GardenGreeting } from './garden-greeting';
import { ContinueReadingBook } from './continue-reading-book';
import { StoryShelf } from './story-shelf';
import { BookOpeningOverlay } from './book-opening-overlay';

export interface StoryGardenScreenProps {
  onStorySelect?: (story: Story) => void;
  onOpenParentCorner?: () => void;
}

export function StoryGardenScreen({ onStorySelect, onOpenParentCorner }: StoryGardenScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { contentMaxWidth, isTablet, scaledFontSize } = useAccessibility();
  const { i18n, t } = useTranslation();
  const language = i18n.language as SupportedLanguage;

  const { requestGardenOpen } = useStoryTransition();
  const opening = useBookOpening();
  const parentsOnly = useParentsOnlyChallenge();

  const requestReturnToMainMenu = useAppStore((state) => state.requestReturnToMainMenu);
  const userAvatarType = useAppStore((state) => state.userAvatarType);
  const userNickname = useAppStore((state) => state.userNickname);
  const storyProgress = useAppStore((state) => state.storyProgress);
  const getContinueReadingStoryId = useAppStore((state) => state.getContinueReadingStoryId);

  const [stories, setStories] = useState<Story[]>(
    () => StoryLoader.getCachedStories() ?? ALL_STORIES
  );

  useEffect(() => {
    let isMounted = true;

    StoryLoader.getStories()
      .then((loaded) => {
        if (isMounted && loaded.length > 0) {
          setStories(loaded);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStories(ALL_STORIES);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const availableStories = useMemo(
    () =>
      stories.filter((story) => {
        if (!story.isAvailable) {
          return false;
        }
        if (!userAvatarType) {
          return true;
        }
        return !story.gender || story.gender === 'unisex' || story.gender === userAvatarType;
      }),
    [stories, userAvatarType]
  );

  const shelves = useMemo(() => groupIntoPlaces(availableStories), [availableStories]);

  const continueReadingStoryId = getContinueReadingStoryId();
  const continueReadingStory = useMemo(
    () => availableStories.find((story) => story.id === continueReadingStoryId) ?? null,
    [availableStories, continueReadingStoryId]
  );

  const usableWidth = Math.min(windowWidth, contentMaxWidth);
  const bookWidth = Math.round(usableWidth * STORY_GARDEN_SCALE.shelfCoverWidthRatio);
  const continueWidth = Math.round(usableWidth * STORY_GARDEN_SCALE.focusedCoverWidthRatio);

  const { phase, story: openingStory, mode, voiceOver, reset } = opening;

  useEffect(() => {
    if (phase !== 'open' && phase !== 'openPortrait') {
      return;
    }

    if (!openingStory) {
      return;
    }

    requestGardenOpen(openingStory, mode ?? 'read', voiceOver);
    onStorySelect?.(openingStory);
    reset();
  }, [phase, openingStory, mode, voiceOver, requestGardenOpen, onStorySelect, reset]);

  const handleSelectBook = useCallback(
    (story: Story, bookRef?: React.RefObject<View | null>) => {
      if (!story.isAvailable) {
        return;
      }

      if (typeof bookRef?.current?.measure === 'function') {
        bookRef.current.measure((_x, _y, width, height, pageX, pageY) => {
          opening.pickUp(story, { x: pageX, y: pageY, width, height });
        });
        return;
      }

      opening.pickUp(story, null);
    },
    [opening]
  );

  const handleBack = useCallback(() => {
    requestReturnToMainMenu();
  }, [requestReturnToMainMenu]);

  const handleParentCorner = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    parentsOnly.showChallenge(() => {
      onOpenParentCorner?.();
    });
  }, [parentsOnly, onOpenParentCorner]);

  const handleRecordVoice = useCallback(() => {
    parentsOnly.showChallenge(() => {
      opening.putBack();
      onOpenParentCorner?.();
    });
  }, [parentsOnly, opening, onOpenParentCorner]);

  const handleTurnTheScreen = useCallback(() => undefined, []);

  const isEmpty = availableStories.length === 0;
  const isChoosing = phase !== 'idle';

  return (
    <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={styles.root}>
      <PageHeader title={t('storyGarden.title')} onBack={handleBack} hideControls={isChoosing} useBackArrow />

      <ScrollView
        style={styles.scroll}
        scrollEnabled={!isChoosing}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 90,
          paddingBottom: insets.bottom + 48,
          alignSelf: isTablet ? 'center' : 'auto',
          width: usableWidth,
        }}
        testID="story-garden-scroll"
      >
        <GardenGreeting nickname={userNickname} />

        {continueReadingStory && (
          <ContinueReadingBook
            story={continueReadingStory}
            width={continueWidth}
            pageIndex={storyProgress[continueReadingStory.id]?.pageIndex ?? 0}
            totalPages={storyProgress[continueReadingStory.id]?.totalPages ?? 0}
            language={language}
            onPress={handleSelectBook}
          />
        )}

        {isEmpty ? (
          <View style={styles.emptyState} testID="story-garden-empty">
            <Text style={styles.emptyText}>{t('storyGarden.empty')}</Text>
          </View>
        ) : (
          STORY_PLACES.map((place) => (
            <StoryShelf
              key={place.id}
              place={place}
              stories={shelves[place.id]}
              containerWidth={usableWidth}
              bookWidth={bookWidth}
              bookmarkedStoryId={continueReadingStoryId}
              language={language}
              onSelectBook={handleSelectBook}
            />
          ))
        )}

        <Pressable
          onPress={handleParentCorner}
          accessibilityRole="button"
          style={styles.parentCorner}
          testID="story-garden-parent-corner"
        >
          <Text style={styles.parentCornerText}>{t('storyGarden.parentCorner')}</Text>
        </Pressable>
      </ScrollView>

      <BookOpeningOverlay
        story={openingStory}
        phase={phase}
        origin={opening.origin}
        showRotationEscape={opening.showRotationEscape}
        isLandscape={opening.isLandscape}
        reduceMotion={opening.reduceMotion}
        language={language}
        onChoose={opening.choose}
        onRecordVoice={handleRecordVoice}
        onPutBack={opening.putBack}
        onTurnTheScreen={handleTurnTheScreen}
        onReadThisWay={opening.readThisWay}
      />

      <ParentsOnlyModal
        visible={parentsOnly.isVisible}
        challenge={parentsOnly.challenge}
        inputValue={parentsOnly.inputValue}
        onInputChange={parentsOnly.setInputValue}
        onSubmit={parentsOnly.handleSubmit}
        onClose={parentsOnly.handleClose}
        isInputValid={parentsOnly.isInputValid}
        scaledFontSize={scaledFontSize}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  emptyState: {
    paddingHorizontal: 32,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    color: '#FFFFFF',
    opacity: 0.85,
    textAlign: 'center',
  },
  parentCorner: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  parentCornerText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.6,
  },
});
