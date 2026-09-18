import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Fonts } from '@/constants/theme';
import {
  HOME_SCENE_LAYOUT,
  HOME_SCENE_TYPE,
  HOME_THEMES,
  type HomeActivity,
  type TimeOfDay,
} from '@/constants/home-scene';
import { ActivityBadge } from './activity-badge';

const ACTIVITY_ART = {
  interactive: {
    night: require('../../assets/images/menu-icons/home-storybooks-night.webp'),
    day: require('../../assets/images/menu-icons/home-storybooks-day.webp'),
  },
  music: {
    night: require('../../assets/images/menu-icons/home-music-night.webp'),
    day: require('../../assets/images/menu-icons/home-music-day.webp'),
  },
  jigsaw: {
    night: require('../../assets/images/menu-icons/home-puzzles-night.webp'),
    day: require('../../assets/images/menu-icons/home-puzzles-day.webp'),
  },
} as const;

export interface ActivityCardProps {
  activity: HomeActivity;
  width: number;
  height: number;
  timeOfDay: TimeOfDay;
  onPress: (activity: HomeActivity) => void;
  testID?: string;
}

export const ActivityCard = memo(function ActivityCard({
  activity,
  width,
  height,
  timeOfDay,
  onPress,
  testID = 'activity-card',
}: ActivityCardProps) {
  const { t } = useTranslation();
  const theme = HOME_THEMES[timeOfDay];

  const artShift = Math.round(width * HOME_SCENE_LAYOUT.artShiftRatio);
  const artWidth = Math.round(width * HOME_SCENE_LAYOUT.artWidthRatio) + artShift;
  const badgeSize = Math.round(width * HOME_SCENE_LAYOUT.badgeSizeRatio);
  const badgeLeft = Math.round(width * HOME_SCENE_LAYOUT.badgeLeftRatio);
  const haloSize = Math.round(badgeSize * HOME_SCENE_LAYOUT.badgeHaloRatio);
  const textLeft = badgeLeft + badgeSize + 12;
  const title = t(activity.titleKey);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(activity);
  }, [activity, onPress]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={t(activity.descriptionKey)}
      onPress={handlePress}
      style={[styles.card, { width, height, borderColor: theme.cardEdge, shadowColor: theme.cardShadow }]}
    >
      <LinearGradient
        colors={[activity.wash[timeOfDay], theme.cardFade]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.artClip, { width: artWidth, height, left: -artShift }]}>
        <Image
          testID="activity-card-art"
          source={ACTIVITY_ART[activity.id][timeOfDay]}
          style={styles.art}
          contentFit="cover"
          contentPosition="center"
          transition={0}
        />
        <LinearGradient
          colors={['transparent', 'transparent', theme.cardFade, theme.cardFade]}
          locations={[0, HOME_SCENE_LAYOUT.artFadeStart, HOME_SCENE_LAYOUT.artFadeMid, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <LinearGradient
        colors={[theme.cardGloss, 'transparent']}
        locations={[0, 1]}
        style={[styles.gloss, { height: Math.round(height * 0.46) }]}
        pointerEvents="none"
      />

      <LinearGradient
        testID="activity-card-sheen"
        colors={[theme.cardSheen, 'transparent', 'transparent']}
        locations={[0, 0.48, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <LinearGradient
        testID="activity-card-hairline"
        colors={['transparent', theme.cardHairline, theme.cardHairline, 'transparent']}
        locations={[0, 0.2, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.hairline}
        pointerEvents="none"
      />

      <View
        style={[
          styles.halo,
          {
            left: badgeLeft - (haloSize - badgeSize) / 2,
            top: (height - haloSize) / 2,
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: theme.badgeHalo,
          },
        ]}
        pointerEvents="none"
      />

      <View style={[styles.badge, { left: badgeLeft, top: (height - badgeSize) / 2 }]}>
        <ActivityBadge testID="activity-card-badge" activityId={activity.id} size={badgeSize} />
      </View>

      <View style={[styles.words, { left: textLeft, right: 34 }]}>
        <Text style={[styles.title, { color: theme.cardTitle }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.description, { color: theme.cardSubtitle }]} numberOfLines={1}>
          {t(activity.descriptionKey)}
        </Text>
      </View>

      <View testID="activity-card-chevron" style={styles.chevron}>
        <View style={[styles.chevronUpper, { backgroundColor: theme.cardChevron }]} />
        <View style={[styles.chevronLower, { backgroundColor: theme.cardChevron }]} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: HOME_SCENE_LAYOUT.cardRadius,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.34,
    shadowRadius: 10,
    elevation: 5,
  },
  gloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  hairline: {
    position: 'absolute',
    left: HOME_SCENE_LAYOUT.cardRadius * 0.5,
    right: HOME_SCENE_LAYOUT.cardRadius * 0.5,
    top: 1,
    height: 1,
  },
  halo: {
    position: 'absolute',
  },
  artClip: {
    position: 'absolute',
    top: 0,
  },
  art: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
  },
  words: {
    position: 'absolute',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.cardTitle,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  description: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.cardDescription,
    fontWeight: '400',
    marginTop: 5,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    width: 12,
    height: 20,
  },
  chevronUpper: {
    position: 'absolute',
    top: 2,
    left: 1,
    width: 11,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  chevronLower: {
    position: 'absolute',
    bottom: 2,
    left: 1,
    width: 11,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
});
