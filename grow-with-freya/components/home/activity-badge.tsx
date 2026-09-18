import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { HomeActivityId } from '@/constants/home-scene';

const BADGE_ART = {
  interactive: require('../../assets/images/menu-icons/home-badge-storybooks.webp'),
  music: require('../../assets/images/menu-icons/home-badge-music.webp'),
  jigsaw: require('../../assets/images/menu-icons/home-badge-puzzles.webp'),
} as const;

export interface ActivityBadgeProps {
  activityId: HomeActivityId;
  size: number;
  testID?: string;
}

export const ActivityBadge = memo(function ActivityBadge({
  activityId,
  size,
  testID,
}: ActivityBadgeProps) {
  return (
    <Image
      testID={testID}
      source={BADGE_ART[activityId]}
      style={[styles.badge, { width: size, height: size }]}
      contentFit="contain"
      transition={0}
    />
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
  },
});
