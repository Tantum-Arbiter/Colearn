import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { StoryFilterTag } from '@/types/story';
import { SPACE_3 } from '@/components/child-ui/tokens';
import { StoryFilterPill } from './story-filter-pill';

interface StoryFilterBarProps {
  tags: StoryFilterTag[];
  selectedTags: ReadonlySet<StoryFilterTag>;
  onToggleTag: (tag: StoryFilterTag) => void;
}

export function StoryFilterBar({ tags, selectedTags, onToggleTag }: StoryFilterBarProps) {
  const renderPill = useCallback(({ item }: { item: StoryFilterTag }) => (
    <StoryFilterPill tag={item} selected={selectedTags.has(item)} onToggle={onToggleTag} />
  ), [selectedTags, onToggleTag]);

  return (
    <View style={styles.row} testID="story-filter-bar">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={styles.pillContent}
        data={tags}
        keyExtractor={(tag) => tag}
        renderItem={renderPill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
});
