import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { COVER_GRID_GAP, MIN_TOUCH_TARGET, SPACE_2, SPACE_3 } from '@/components/child-ui/tokens';
import { Badge } from '@/components/progress/progress-model';
import { BadgeArtwork } from '@/components/progress/badge-artwork';
import { BadgeWallProgress } from './badge-wall-progress';

export const BADGE_WALL_COLUMNS = 5;

/**
 * The medallion takes what the row leaves once the gaps between the columns
 * are paid for, floored at a size a small finger can still land on.
 */
export function badgeDiameter(width: number, columns: number): number {
  const available = width - COVER_GRID_GAP * (columns - 1);
  return Math.max(MIN_TOUCH_TARGET, Math.floor(available / columns));
}

interface BadgeWallItemProps {
  badge: Badge;
  size: number;
  onPress: (badge: Badge) => void;
}

function BadgeWallItem({ badge, size, onPress }: BadgeWallItemProps) {
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(badge);
  }, [onPress, badge]);

  return (
    <Pressable
      testID={`badge-wall-item-${badge.id}`}
      accessibilityRole="button"
      accessibilityLabel={t(badge.titleKey)}
      accessibilityValue={{ text: t('progress.count', { current: badge.currentProgress, target: badge.targetProgress }) }}
      onPress={handlePress}
      hitSlop={4}
    >
      <BadgeArtwork artwork={badge.artwork} status={badge.status} size={size} />
    </Pressable>
  );
}

interface BadgeWallProps {
  badges: readonly Badge[];
  /** The content width the wall lays itself out across. */
  width: number;
  columns?: number;
  onPress: (badge: Badge) => void;
}

export function BadgeWall({ badges, width, columns = BADGE_WALL_COLUMNS, onPress }: BadgeWallProps) {
  if (badges.length === 0) return null;

  const size = badgeDiameter(width, columns);
  const earned = badges.filter((badge) => badge.status === 'earned').length;

  return (
    <View testID="badge-wall">
      <View style={styles.summary}>
        <BadgeWallProgress earned={earned} total={badges.length} />
      </View>
      <View style={styles.grid}>
        {badges.map((badge) => (
          <BadgeWallItem key={badge.id} badge={badge} size={size} onPress={onPress} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginBottom: SPACE_3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COVER_GRID_GAP,
    rowGap: SPACE_2 + COVER_GRID_GAP,
  },
});
