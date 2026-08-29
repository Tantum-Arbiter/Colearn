import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { StoryFilterTag } from '@/types/story';
import { BORDER_DEFAULT, SURFACE_SECONDARY, TEXT_PRIMARY } from '@/constants/night-palette';
import {
  FILTER_TOGGLE_SIZE,
  RADIUS_SMALL,
  SPACE_3,
} from '@/components/child-ui/tokens';
import { StoryFilterPill } from './story-filter-pill';

interface StoryFilterBarProps {
  tags: StoryFilterTag[];
  selectedTags: ReadonlySet<StoryFilterTag>;
  onToggleTag: (tag: StoryFilterTag) => void;
  gridActive: boolean;
  onToggleView: () => void;
}

export function StoryFilterBar({
  tags,
  selectedTags,
  onToggleTag,
  gridActive,
  onToggleView,
}: StoryFilterBarProps) {
  const { t } = useTranslation();

  const handleToggleView = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleView();
  }, [onToggleView]);

  const renderPill = useCallback(({ item }: { item: StoryFilterTag }) => (
    <StoryFilterPill tag={item} selected={selectedTags.has(item)} onToggle={onToggleTag} />
  ), [selectedTags, onToggleTag]);

  return (
    <View style={styles.row} testID="story-filter-bar">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={styles.pillArea}
        contentContainerStyle={styles.pillContent}
        data={tags}
        keyExtractor={(tag) => tag}
        renderItem={renderPill}
      />
      <Pressable
        testID="story-view-toggle"
        accessibilityRole="button"
        accessibilityLabel={t('catalogue.viewToggle')}
        onPress={handleToggleView}
        style={styles.toggle}
      >
        <Ionicons name={gridActive ? 'albums-outline' : 'grid-outline'} size={20} color={TEXT_PRIMARY} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
  pillArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
  toggle: {
    width: FILTER_TOGGLE_SIZE,
    height: FILTER_TOGGLE_SIZE,
    borderRadius: RADIUS_SMALL,
    backgroundColor: SURFACE_SECONDARY,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
