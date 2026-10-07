import React, { type RefObject, useCallback, useMemo, useState } from 'react';
import { Animated, FlatList, ImageSourcePropType, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
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
 * The three themes share one glass capsule (the operator's picture,
 * 2026-10-04): each a segment with its art beside its label, the chosen one
 * lit inside the capsule, inset from its edge. One line high, so the chooser
 * is a way in to the shelf rather than a block to scroll past.
 */
export const THEME_BAR = {
  height: { phone: 56, tablet: 64 },
  inset: 5,
  art: { phone: 26, tablet: 32 },
  label: { phone: 16, tablet: 19 },
  gap: 8,
} as const;
export const CHOOSER_HEADING_HEIGHT = 34;
const TILE_LABEL_MIN_SCALE = 0.75;
const BAR_FILL = 'rgba(28, 36, 112, 0.55)';
const BAR_RIM = 'rgba(160, 178, 255, 0.28)';
const LABEL_RESTING = 'rgba(226, 231, 255, 0.92)';

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
  /** So the stories tour can point the owl at the tiles and at Filter. */
  tilesRef?: RefObject<View | null>;
  toggleRef?: RefObject<View | null>;
  onThemeBarLayout?: (event: LayoutChangeEvent) => void;
  headingOpacity?: Animated.WithAnimatedValue<number>;
}

export function chooserGap(isTablet: boolean): number {
  return isTablet ? SPACE_3 : SPACE_2;
}

export function chooserLayoutEstimate(isTablet: boolean): { themeBarTop: number; height: number } {
  const themeBarTop = CHOOSER_HEADING_HEIGHT + chooserGap(isTablet);

  return { themeBarTop, height: themeBarTop + (isTablet ? THEME_BAR.height.tablet : THEME_BAR.height.phone) };
}

interface ThemeTileProps {
  id: CatalogueTheme;
  art: ImageSourcePropType;
  label: string;
  selected: boolean;
  onPress: () => void;
}

function ThemeTile({ id, art, label, selected, onPress }: ThemeTileProps) {
  const { isTablet } = useAccessibility();
  const artSize = isTablet ? THEME_BAR.art.tablet : THEME_BAR.art.phone;
  const inner = (isTablet ? THEME_BAR.height.tablet : THEME_BAR.height.phone) - THEME_BAR.inset * 2;

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
      style={[styles.tile, { borderRadius: inner / 2 }, selected && styles.tileSelected]}
    >
      {selected && (
        <LinearGradient
          testID={`story-theme-glow-${id}`}
          colors={SELECTED_TILE_FILL}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tileFill, { borderRadius: inner / 2 - 1.5 }]}
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
          { fontSize: isTablet ? THEME_BAR.label.tablet : THEME_BAR.label.phone, color: selected ? TEXT_PRIMARY : LABEL_RESTING },
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
export function StoryFilterBar({
  theme,
  onSelectTheme,
  tags,
  selectedTags,
  onToggleTag,
  tilesRef,
  toggleRef,
  onThemeBarLayout,
  headingOpacity = 1,
}: StoryFilterBarProps) {
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
    <View testID="story-filter-bar" pointerEvents="box-none" style={[styles.chooser, { gap: chooserGap(isTablet) }]}>
      <View testID="story-filter-heading" pointerEvents="box-none" style={styles.heading}>
        <Animated.View testID="story-filter-heading-label" pointerEvents="none" style={[styles.headingLabel, { opacity: headingOpacity }]}>
          <Ionicons name="star" size={isTablet ? 20 : 17} color={ACCENT_GOLD} />
          <Text
            style={[styles.headingText, { fontSize: scaledFontSize(typeSize('filterLabel', isTablet)) }]}
            numberOfLines={1}
          >
            {t('catalogue.chooseTheme')}
          </Text>
        </Animated.View>

        <View ref={toggleRef} collapsable={false}>
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
      </View>

      <View
        testID="story-theme-bar"
        style={[styles.tiles, { height: isTablet ? THEME_BAR.height.tablet : THEME_BAR.height.phone, borderRadius: (isTablet ? THEME_BAR.height.tablet : THEME_BAR.height.phone) / 2 }]}
        ref={tilesRef}
        collapsable={false}
        onLayout={onThemeBarLayout}
      >
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
    height: CHOOSER_HEADING_HEIGHT,
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
    padding: THEME_BAR.inset,
    backgroundColor: BAR_FILL,
    borderWidth: 1,
    borderColor: BAR_RIM,
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: THEME_BAR.gap,
    paddingHorizontal: SPACE_2,
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
    ...StyleSheet.absoluteFill,
  },
  tileLabel: {
    flexShrink: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_3,
  },
});
