import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { StoryFilterTag } from '@/types/story';
import {
  ACCENT_GOLD,
  ACCENT_PURPLE,
  BORDER_ACTIVE,
  BORDER_DEFAULT,
  SURFACE_SECONDARY,
  TEXT_PRIMARY,
} from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import {
  FILTER_PILL_PADDING_H,
  RADIUS_CONTROL,
  SPACE_1,
  SPACE_2,
  SPACE_3,
  TYPE_ROLES,
  typeSize,
} from '@/components/child-ui/tokens';
import { CATALOGUE_THEMES, CatalogueTheme } from './catalogue-story';
import { StoryFilterPill } from './story-filter-pill';

/**
 * Three tiles share the row, so on a phone each is a box a little wider than
 * it is tall; on a tablet they are wide enough to sit shorter still. The
 * phone's tile is kept short on purpose: the chooser is a way in to the shelf,
 * not the half of the screen the child has to scroll past to reach a book.
 */
const TILE_HEIGHT = { phone: 72, tablet: 84 } as const;
const TILE_RADIUS = RADIUS_CONTROL;
const TILE_ART = { phone: 30, tablet: 42 } as const;
/** Tile labels run a step smaller than pill labels and shrink to the tile's width. */
const TILE_LABEL_STEP = { phone: 2, tablet: 2 } as const;
const TILE_LABEL_MIN_SCALE = 0.75;

/**
 * A chosen tile is lit rather than merely brightened: a purple fill that
 * deepens towards its foot, a bright rim, and a soft glow spilling onto the
 * shelf. It is the one thing in the row a child should see first.
 */
export const SELECTED_TILE_FILL = ['#6F69F2', '#4A3ED0'] as const;
const SELECTED_TILE_RIM = 'rgba(255, 255, 255, 0.82)';

/** The rendered, glossy art each tile carries. */
export const THEME_TILE_ART: Record<CatalogueTheme, ImageSourcePropType> = {
  stories: require('@/assets/images/theme-icons/stories.webp'),
  learning: require('@/assets/images/theme-icons/learning.webp'),
  music: require('@/assets/images/theme-icons/music.webp'),
};

const THEME_LABEL_KEY: Record<CatalogueTheme, string> = {
  stories: 'catalogue.themes.stories',
  learning: 'catalogue.themes.learning',
  music: 'catalogue.themes.music',
};

interface StoryFilterBarProps {
  /** The tile the shelf is sorted under; there is always one. */
  theme: CatalogueTheme;
  onSelectTheme: (theme: CatalogueTheme) => void;
  /** The finer themes behind Filter, shown as pills. */
  tags: StoryFilterTag[];
  selectedTags: ReadonlySet<StoryFilterTag>;
  onToggleTag: (tag: StoryFilterTag) => void;
}

interface ThemeTileProps {
  id: CatalogueTheme;
  art: ImageSourcePropType;
  label: string;
  selected: boolean;
  onPress: () => void;
}

function ThemeTile({ id, art, label, selected, onPress }: ThemeTileProps) {
  const { isTablet, scaledFontSize } = useAccessibility();
  const artSize = isTablet ? TILE_ART.tablet : TILE_ART.phone;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      testID={`story-theme-tile-${id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[styles.tile, isTablet ? styles.tileTablet : styles.tileBoxed, selected && styles.tileSelected]}
    >
      {selected && (
        <LinearGradient
          testID={`story-theme-glow-${id}`}
          colors={SELECTED_TILE_FILL}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.tileFill}
          pointerEvents="none"
        />
      )}
      <Image
        testID={`story-theme-art-${id}`}
        source={art}
        style={{ width: artSize, height: artSize }}
        contentFit="contain"
        transition={0}
      />
      <Text
        style={[
          styles.tileLabel,
          { fontSize: scaledFontSize(typeSize('filterLabel', isTablet) - (isTablet ? TILE_LABEL_STEP.tablet : TILE_LABEL_STEP.phone)) },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={TILE_LABEL_MIN_SCALE}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The theme chooser: "Choose a theme" with the Filter button beside it, above
 * one row of three tiles -- Stories, Learning, Music -- each a piece of glossy
 * art over a label. One tile is always chosen; the shelf is sorted under it.
 * The finer themes wait behind Filter and appear as pills beneath; a theme the
 * child has chosen from there stays in view while it is chosen, or the shelf
 * would be filtered by something they cannot see.
 */
export function StoryFilterBar({ theme, onSelectTheme, tags, selectedTags, onToggleTag }: StoryFilterBarProps) {
  const { t } = useTranslation();
  const { isTablet, scaledFontSize } = useAccessibility();
  const [expanded, setExpanded] = useState(false);

  const pills = useMemo(
    () => (expanded ? tags : tags.filter((tag) => selectedTags.has(tag))),
    [expanded, tags, selectedTags]
  );

  const renderPill = useCallback(({ item }: { item: StoryFilterTag }) => (
    <StoryFilterPill tag={item} selected={selectedTags.has(item)} onToggle={onToggleTag} />
  ), [selectedTags, onToggleTag]);

  const handleToggleExpanded = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((open) => !open);
  }, []);

  return (
    <View testID="story-filter-bar" style={[styles.chooser, { gap: isTablet ? SPACE_3 : SPACE_2 }]}>
      <View style={styles.heading}>
        <View style={styles.headingLabel}>
          <Ionicons name="star" size={isTablet ? 20 : 17} color={ACCENT_GOLD} />
          <Text
            style={[styles.headingText, { fontSize: scaledFontSize(typeSize('filterLabel', isTablet)) }]}
            numberOfLines={1}
          >
            {t('catalogue.chooseTheme')}
          </Text>
        </View>

        <Pressable
          testID="story-filter-more"
          accessibilityRole="button"
          accessibilityLabel={t('catalogue.filter')}
          accessibilityState={{ expanded }}
          onPress={handleToggleExpanded}
          style={[styles.more, expanded && styles.moreOpen]}
        >
          <Ionicons name="options-outline" size={scaledFontSize(15)} color={TEXT_PRIMARY} />
          <Text
            style={[styles.moreLabel, { fontSize: scaledFontSize(typeSize('filterLabel', isTablet) - 1) }]}
            numberOfLines={1}
          >
            {t('catalogue.filter')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.tiles}>
        {CATALOGUE_THEMES.map((id) => (
          <ThemeTile
            key={id}
            id={id}
            art={THEME_TILE_ART[id]}
            label={t(THEME_LABEL_KEY[id])}
            selected={theme === id}
            onPress={() => onSelectTheme(id)}
          />
        ))}
      </View>

      {pills.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={styles.pillContent}
          data={pills}
          keyExtractor={(tag) => tag}
          renderItem={renderPill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chooser: {
    gap: SPACE_2,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE_3,
  },
  headingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
    flexShrink: 1,
  },
  headingText: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.filterLabel.weight,
    flexShrink: 1,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_1,
    height: 34,
    paddingHorizontal: FILTER_PILL_PADDING_H - 6,
    borderRadius: RADIUS_CONTROL,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: SURFACE_SECONDARY,
  },
  moreOpen: {
    borderColor: BORDER_ACTIVE,
  },
  moreLabel: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.filterLabel.weight,
  },
  tiles: {
    flexDirection: 'row',
    gap: SPACE_2,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE_1,
    borderRadius: TILE_RADIUS,
    backgroundColor: SURFACE_SECONDARY,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  tileBoxed: {
    height: TILE_HEIGHT.phone,
  },
  tileTablet: {
    height: TILE_HEIGHT.tablet,
  },
  // The fill sits inside the rim; the glow is a shadow, so the tile itself
  // must not clip, or iOS would clip the glow with it
  tileSelected: {
    borderWidth: 1.5,
    borderColor: SELECTED_TILE_RIM,
    shadowColor: ACCENT_PURPLE,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  tileFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TILE_RADIUS - 1.5,
  },
  tileLabel: {
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: SPACE_1 / 2,
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.filterLabel.weight,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
});
