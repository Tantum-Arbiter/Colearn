import React, { ReactNode, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { useAccessibility } from '@/hooks/use-accessibility';

// the bar carries no labels and stands 76 tall, so the glyphs take the room
// that leaves rather than sitting in the middle of it
export const NAV_GLYPH_SIZE_PHONE = 38;
export const NAV_GLYPH_SIZE_TABLET = 42;
/** The selected glyph is drawn a touch larger, which on a filled glyph reads as bolder. */
export const NAV_GLYPH_SELECTED_BOOST = 3;

export interface NavigationItemProps {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  selectedIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Stands in for the glyph, for an item whose icon is a live control. */
  glyph?: ReactNode;
}

/**
 * One slot of the bar: a glyph and nothing under it. The label is the
 * accessible name alone -- the bar is read by its pictures, and the height
 * the words took goes to the glyphs instead.
 */
export function NavigationItem({ id, icon, selectedIcon, label, selected, onSelect, glyph }: NavigationItemProps) {
  const { isTablet } = useAccessibility();
  const color = selected ? TEXT_PRIMARY : TEXT_SECONDARY;
  const size = (isTablet ? NAV_GLYPH_SIZE_TABLET : NAV_GLYPH_SIZE_PHONE) + (selected ? NAV_GLYPH_SELECTED_BOOST : 0);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
  }, [id, onSelect]);

  return (
    <Pressable
      testID={`navigation-item-${id}`}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={styles.item}
    >
      {glyph ?? (
        <Ionicons name={selected ? selectedIcon : icon} size={size} color={color} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
});
