import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { BORDER_DEFAULT, SURFACE_NAV, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { useAccessibility } from '@/hooks/use-accessibility';
import { RADIUS_NAV_ITEM, SPACE_1, SPACE_2 } from '@/components/child-ui/tokens';
import type { PracticeSong } from '@/services/music-asset-registry';

/** The first few notes, which is what a child recognises a melody by. */
const NOTES_SHOWN = 5;

export interface SavedSongCardProps {
  song: PracticeSong;
  width: number;
  onOpen: (song: PracticeSong) => void;
  testID?: string;
}

/**
 * A saved practice song, shaped to stand in a row beside saved books.
 *
 * A song has no cover either, so the card shows the opening of its melody --
 * the notes the child plays first, which is how they tell one tune from
 * another before they can read its name.
 */
export const SavedSongCard = memo(function SavedSongCard({ song, width, onOpen, testID }: SavedSongCardProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpen(song);
  }, [song, onOpen]);

  const label = t(song.nameKey);

  return (
    <Pressable
      testID={testID ?? `saved-song-card-${song.id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={[styles.card, { width }]}
    >
      <View style={styles.notes}>
        {song.sequence.slice(0, NOTES_SHOWN).map((note, index) => (
          <View key={`${note}-${index}`} style={styles.note}>
            <Text style={[styles.noteText, { fontSize: scaledFontSize(11) }]}>{note}</Text>
          </View>
        ))}
      </View>
      <View style={styles.titleRow}>
        <Ionicons name="musical-notes" size={13} color={TEXT_SECONDARY} />
        <Text style={[styles.title, { fontSize: scaledFontSize(13) }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS_NAV_ITEM,
    backgroundColor: SURFACE_NAV,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    padding: SPACE_2,
    gap: SPACE_1,
  },
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: SPACE_2,
  },
  note: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
});
