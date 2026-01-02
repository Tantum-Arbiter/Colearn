import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ListRenderItem, ViewToken } from 'react-native';
import { Story, StoryCategory, STORY_TAGS } from '@/types/story';
import { StoryThumbnail } from './story-thumbnail';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

interface GenreCarouselProps {
  genre: StoryCategory;
  stories: Story[];
  onStoryPress: (story: Story) => void;
}

interface ViewabilityInfo {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

const ITEM_WIDTH = 140;
const ITEM_SPACING = 16;

export const GenreCarousel: React.FC<GenreCarouselProps> = ({
  genre,
  stories,
  onStoryPress,
}) => {
  const [viewableItems, setViewableItems] = useState<Set<string>>(new Set());
  const { scaledFontSize } = useAccessibility();

  const genreInfo = STORY_TAGS[genre];

  // Filter stories for this genre
  const genreStories = useMemo(() => {
    return stories.filter(story => story.category === genre);
  }, [stories, genre]);

  // Handle viewability changes for performance optimization
  const onViewableItemsChanged = useCallback(({ viewableItems: newViewableItems }: ViewabilityInfo) => {
    const newViewableSet = new Set(
      newViewableItems.map(item => item.item?.id).filter(Boolean)
    );
    setViewableItems(newViewableSet);
  }, []);

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 10, // Item is considered visible when 10% is visible
    minimumViewTime: 100, // Minimum time item must be visible
  }), []);

  const renderStoryItem: ListRenderItem<Story> = useCallback(({ item: story }) => {
    const isVisible = viewableItems.has(story.id);
    
    return (
      <StoryThumbnail
        story={story}
        onPress={onStoryPress}
        isVisible={isVisible}
      />
    );
  }, [onStoryPress, viewableItems]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_WIDTH + ITEM_SPACING,
    offset: (ITEM_WIDTH + ITEM_SPACING) * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: Story) => item.id, []);

  // Don't render if no stories in this genre
  if (genreStories.length === 0) {
    console.log(`GenreCarousel ${genre}: Returning null due to no stories`);
    return null;
  }

  console.log(`GenreCarousel ${genre}: Rendering with ${genreStories.length} stories`);

  return (
    <View style={styles.container} testID={`genre-carousel-${genre}`}>
      {/* Genre Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.emoji, { fontSize: scaledFontSize(20) }]}>{genreInfo.emoji}</Text>
          <Text style={[styles.title, { fontSize: scaledFontSize(18) }]}>{genreInfo.label}</Text>
        </View>
        <Text style={[styles.count, { fontSize: scaledFontSize(12) }]}>{genreStories.length} stories</Text>
      </View>

      {/* Stories Carousel */}
      <FlatList
        data={genreStories}
        renderItem={renderStoryItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={true} // Performance optimization
        maxToRenderPerBatch={5} // Render 5 items per batch
        windowSize={10} // Keep 10 items in memory
        initialNumToRender={3} // Initially render 3 items
        updateCellsBatchingPeriod={50} // Batch updates every 50ms
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH + ITEM_SPACING} // Snap to items
        snapToAlignment="start"
        bounces={false}
        testID={`genre-carousel-list-${genre}`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.rounded,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  count: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Fonts.rounded,
  },
  listContainer: {
    paddingLeft: 20,
    paddingRight: 20,
  },
});
