import React, { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FilterPill } from '@/components/child-ui/filter-pill';
import { SPACE_3 } from '@/components/child-ui/tokens';
import { BADGE_CATEGORIES, BadgeCategoryInfo, BadgeFilter } from './progress-model';

interface BadgeCategoryBarProps {
  selected: BadgeFilter;
  onSelect: (filter: BadgeFilter) => void;
}

export function BadgeCategoryBar({ selected, onSelect }: BadgeCategoryBarProps) {
  const { t } = useTranslation();

  const renderPill = useCallback(({ item }: { item: BadgeCategoryInfo }) => (
    <FilterPill
      testID={`badge-category-${item.id}`}
      icon={item.icon}
      iconColor={item.color}
      label={t(item.labelKey)}
      selected={item.id === selected}
      onPress={() => onSelect(item.id)}
    />
  ), [selected, onSelect, t]);

  return (
    <FlatList
      testID="badge-category-bar"
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      data={BADGE_CATEGORIES}
      keyExtractor={(item) => item.id}
      renderItem={renderPill}
      contentContainerStyle={styles.row}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
});
