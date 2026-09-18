import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BORDER_DEFAULT, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { RADIUS_CARD, SPACE_2, SPACE_3 } from '@/components/child-ui/tokens';
import { Milestone } from './progress-model';

const CARD_SURFACE = 'rgba(7, 29, 84, 0.55)';
const TICK_LAVENDER = '#8E72F3';

interface MilestoneCardProps {
  milestone: Milestone;
  width: number;
}

export function MilestoneCard({ milestone, width }: MilestoneCardProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  return (
    <View
      testID={`milestone-card-${milestone.id}`}
      accessibilityLabel={t(milestone.titleKey)}
      accessibilityState={{ checked: milestone.achieved }}
      style={[styles.card, { width }]}
    >
      <Image
        source={milestone.artwork}
        style={[styles.artwork, !milestone.achieved && styles.artworkDimmed]}
        contentFit="contain"
        transition={0}
        cachePolicy="memory-disk"
      />
      <Text style={[styles.title, { fontSize: scaledFontSize(14) }]} numberOfLines={2}>
        {t(milestone.titleKey)}
      </Text>
      <Text style={[styles.description, { fontSize: scaledFontSize(11) }]} numberOfLines={3}>
        {t(milestone.descriptionKey)}
      </Text>
      {milestone.achieved && (
        <View style={styles.tick} testID={`milestone-tick-${milestone.id}`}>
          <Ionicons name="checkmark" size={20} color={TEXT_PRIMARY} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS_CARD,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: CARD_SURFACE,
    padding: SPACE_3,
    alignItems: 'center',
    gap: SPACE_2,
  },
  artwork: {
    width: '84%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  artworkDimmed: {
    opacity: 0.72,
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  tick: {
    position: 'absolute',
    top: SPACE_2,
    right: SPACE_2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TICK_LAVENDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
