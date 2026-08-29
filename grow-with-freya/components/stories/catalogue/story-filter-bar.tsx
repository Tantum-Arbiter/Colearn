import React, { useCallback, useMemo } from 'react';
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

const PILLS_PER_PAGE = 3;

interface StoryFilterBarProps {
  tags: StoryFilterTag[];
  selectedTags: ReadonlySet<StoryFilterTag>;
  onToggleTag: (tag: StoryFilterTag) => void;
  gridActive: boolean;
  onToggleView: () => void;
  pageWidth: number;
}

export function StoryFilterBar({
  tags,
  selectedTags,
  onToggleTag,
  gridActive,
  onToggleView,
  pageWidth,
}: StoryFilterBarProps) {
  const { t } = useTranslation();

  const pages = useMemo(() => {
    const grouped: StoryFilterTag[][] = [];
    for (let i = 0; i < tags.length; i += PILLS_PER_PAGE) {
      grouped.push(tags.slice(i, i + PILLS_PER_PAGE));
    }
    return grouped;
  }, [tags]);

  const handleToggleView = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleView();
  }, [onToggleView]);

  const renderPage = useCallback(({ item }: { item: StoryFilterTag[] }) => (
    <View style={[styles.page, { width: pageWidth }]}>
      {item.map((tag) => (
        <StoryFilterPill key={tag} tag={tag} selected={selectedTags.has(tag)} onToggle={onToggleTag} />
      ))}
    </View>
  ), [pageWidth, selectedTags, onToggleTag]);

  return (
    <View style={styles.row} testID="story-filter-bar">
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pillArea}
        data={pages}
        keyExtractor={(_page, index) => `filter-page-${index}`}
        renderItem={renderPage}
        scrollEnabled={pages.length > 1}
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
  page: {
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
