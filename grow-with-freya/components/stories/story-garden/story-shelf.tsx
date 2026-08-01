import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  type ListRenderItem,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Story } from '@/types/story';
import { Fonts } from '@/constants/theme';
import type { SupportedLanguage } from '@/services/i18n';
import type { StoryPlace } from '@/constants/story-places';
import { ShelfBook } from './shelf-book';

export const SHELF_GAP = 20;

export function computeCentredIndex(offsetX: number, itemPitch: number, count: number): number {
  if (count <= 0 || itemPitch <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(count - 1, Math.round(offsetX / itemPitch)));
}

export function computeShelfSidePadding(containerWidth: number, bookWidth: number): number {
  return Math.max((containerWidth - bookWidth) / 2, 0);
}

export interface StoryShelfProps {
  place: StoryPlace;
  stories: Story[];
  containerWidth: number;
  bookWidth: number;
  bookmarkedStoryId: string | null;
  language: SupportedLanguage;
  onSelectBook: (story: Story, bookRef: React.RefObject<View | null>) => void;
  onCentredIndexChange?: (placeId: StoryPlace['id'], index: number) => void;
}

export const StoryShelf = memo(function StoryShelf({
  place,
  stories,
  containerWidth,
  bookWidth,
  bookmarkedStoryId,
  language,
  onSelectBook,
  onCentredIndexChange,
}: StoryShelfProps) {
  const { t } = useTranslation();
  const [centredIndex, setCentredIndex] = useState(0);

  const itemPitch = bookWidth + SHELF_GAP;
  const sidePadding = computeShelfSidePadding(containerWidth, bookWidth);

  const updateCentredIndex = useCallback(
    (offsetX: number) => {
      const nextIndex = computeCentredIndex(offsetX, itemPitch, stories.length);

      if (nextIndex === centredIndex) {
        return;
      }

      setCentredIndex(nextIndex);
      onCentredIndexChange?.(place.id, nextIndex);
    },
    [itemPitch, stories.length, centredIndex, onCentredIndexChange, place.id]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateCentredIndex(event.nativeEvent.contentOffset.x);
    },
    [updateCentredIndex]
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<Story> | null | undefined, index: number) => ({
      length: itemPitch,
      offset: itemPitch * index,
      index,
    }),
    [itemPitch]
  );

  const renderBook: ListRenderItem<Story> = useCallback(
    ({ item, index }) => (
      <View style={{ width: bookWidth, marginRight: index === stories.length - 1 ? 0 : SHELF_GAP }}>
        <ShelfBook
          story={item}
          width={bookWidth}
          isCentred={index === centredIndex}
          isBookmarked={item.id === bookmarkedStoryId}
          language={language}
          onPress={onSelectBook}
        />
      </View>
    ),
    [bookWidth, stories.length, centredIndex, bookmarkedStoryId, language, onSelectBook]
  );

  const keyExtractor = useCallback((item: Story) => item.id, []);

  const contentContainerStyle = useMemo(
    () => ({ paddingHorizontal: sidePadding }),
    [sidePadding]
  );

  if (stories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={`story-shelf-${place.id}`}>
      <Text style={styles.heading} testID={`story-shelf-heading-${place.id}`}>
        {t(place.titleKey)}
      </Text>

      <FlatList
        horizontal
        data={stories}
        renderItem={renderBook}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemPitch}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={contentContainerStyle}
        testID={`story-shelf-list-${place.id}`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 36,
  },
  heading: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.92,
    marginBottom: 14,
    marginLeft: 24,
  },
});
