import React, { type RefObject, useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { SectionHeading } from '@/components/child-ui/section-heading';
import {
  COVER_GRID_GAP,
  RADIUS_CONTROL,
  SPACE_2,
  SPACE_3,
  SPACE_4,
  SPACE_5,
} from '@/components/child-ui/tokens';
import {
  BORDER_DEFAULT,
  SURFACE_PRIMARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import type { SupportedLanguage } from '@/services/i18n';
import type { CatalogueStory } from './catalogue-story';
import { isSearching, searchStories } from './story-search';

export interface SearchPanelProps {
  /** Everything reachable: installed books and catalogue thumbnails alike. */
  stories: readonly CatalogueStory[];
  query: string;
  onQueryChange: (query: string) => void;
  /** Terms the child has searched before, newest first. */
  recentSearches: readonly string[];
  onClearRecent: () => void;
  /** Called when a search is worth keeping: submitted, or a result opened. */
  onSearchSettled: (query: string) => void;
  language: SupportedLanguage;
  renderCard: (story: CatalogueStory) => React.ReactNode;
  /** So the search tour can point the owl at the field and the recent list. */
  guideTargets?: { field?: RefObject<View | null>; recent?: RefObject<View | null> };
  testID?: string;
}

/**
 * The search area: a field, then either what the child searched for before or
 * what they are searching for now.
 *
 * Results are worked out here rather than being passed in, because the panel
 * is the only thing that knows what has been typed -- the shelf it searches
 * over is the whole catalogue, unfiltered, since this page carries no filters.
 */
export function SearchPanel({
  stories,
  query,
  onQueryChange,
  recentSearches,
  onClearRecent,
  onSearchSettled,
  language,
  renderCard,
  guideTargets,
  testID = 'search-panel',
}: SearchPanelProps) {
  const { t } = useTranslation();
  const { scaledFontSize, isTablet } = useAccessibility();
  const inputRef = useRef<TextInput>(null);

  const searching = isSearching(query);
  const results = useMemo(
    () => (searching ? searchStories(stories, query, language) : []),
    [searching, stories, query, language],
  );

  const handleRecentPress = useCallback((term: string) => {
    onQueryChange(term);
    onSearchSettled(term);
    inputRef.current?.focus();
  }, [onQueryChange, onSearchSettled]);

  const fieldFontSize = scaledFontSize(isTablet ? 18 : 16);

  return (
    <View testID={testID}>
      <View style={styles.field} ref={guideTargets?.field} collapsable={false}>
        <Ionicons name="search" size={scaledFontSize(20)} color={TEXT_SECONDARY} />
        <TextInput
          ref={inputRef}
          testID={`${testID}-input`}
          style={[styles.input, { fontSize: fieldFontSize }]}
          value={query}
          onChangeText={onQueryChange}
          onSubmitEditing={() => onSearchSettled(query)}
          placeholder={t('search.placeholder')}
          placeholderTextColor={TEXT_SECONDARY}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel={t('search.placeholder')}
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <Pressable
            testID={`${testID}-clear`}
            onPress={() => onQueryChange('')}
            hitSlop={12}
            accessibilityLabel={t('search.clear')}
          >
            <Ionicons name="close-circle" size={scaledFontSize(20)} color={TEXT_SECONDARY} />
          </Pressable>
        )}
      </View>

      {!searching && recentSearches.length > 0 && (
        <View testID={`${testID}-recent`} style={styles.recent} ref={guideTargets?.recent} collapsable={false}>
          <SectionHeading
            testID={`${testID}-recent-heading`}
            label={t('search.recent')}
            icon="time-outline"
            iconColor={TEXT_SECONDARY}
            actionLabel={t('search.clearRecent')}
            onAction={onClearRecent}
          />
          {recentSearches.map((term) => (
            <Pressable
              key={term}
              testID={`${testID}-recent-${term}`}
              style={styles.recentRow}
              onPress={() => handleRecentPress(term)}
              accessibilityRole="button"
            >
              <Ionicons name="search-outline" size={scaledFontSize(16)} color={TEXT_SECONDARY} />
              <Text style={[styles.recentText, { fontSize: scaledFontSize(16) }]} numberOfLines={1}>
                {term}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {searching && results.length === 0 && (
        <View testID={`${testID}-empty`} style={styles.empty}>
          <Text style={[styles.emptyText, { fontSize: scaledFontSize(16) }]}>
            {t('search.noResults')}
          </Text>
        </View>
      )}

      {searching && results.length > 0 && (
        <View testID={`${testID}-results`} style={styles.results}>
          {results.map((story) => renderCard(story))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
    paddingHorizontal: SPACE_4,
    paddingVertical: SPACE_3,
    borderRadius: RADIUS_CONTROL,
    backgroundColor: SURFACE_PRIMARY,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  input: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    padding: 0,
  },
  recent: {
    marginTop: SPACE_5,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
    paddingVertical: SPACE_3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  recentText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
  },
  empty: {
    marginTop: SPACE_5,
    alignItems: 'center',
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    textAlign: 'center',
  },
  // the catalogue's own grid: a plain wrap on the same gap the cover width was
  // worked out from, so two cards to a phone row and three to a tablet's
  results: {
    marginTop: SPACE_5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COVER_GRID_GAP,
  },
});
