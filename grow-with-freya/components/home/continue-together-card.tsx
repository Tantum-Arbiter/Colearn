import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Polygon, Stop } from 'react-native-svg';
import { Fonts } from '@/constants/theme';
import {
  HOME_SCENE_LAYOUT,
  HOME_SCENE_TYPE,
  HOME_THEMES,
  progressFraction,
  type TimeOfDay,
} from '@/constants/home-scene';

export interface ContinueTogetherCardProps {
  title: string;
  coverImage: string;
  pageIndex: number;
  totalPages: number;
  width: number;
  timeOfDay: TimeOfDay;
  onPress: () => void;
  testID?: string;
}

export const ContinueTogetherCard = memo(function ContinueTogetherCard({
  title,
  coverImage,
  pageIndex,
  totalPages,
  width,
  timeOfDay,
  onPress,
  testID = 'continue-together-card',
}: ContinueTogetherCardProps) {
  const { t } = useTranslation();
  const theme = HOME_THEMES[timeOfDay];

  const thumbnail = HOME_SCENE_LAYOUT.thumbnailSize;
  const fraction = progressFraction(pageIndex, totalPages);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t('home.resumeStory', { title })}
      onPress={handlePress}
      style={[styles.card, { width, borderColor: theme.panelEdge }]}
    >
      <LinearGradient
        colors={[theme.panelTop, theme.panelBottom]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        testID="continue-hairline"
        colors={['transparent', theme.cardHairline, theme.cardHairline, 'transparent']}
        locations={[0, 0.2, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.hairline}
        pointerEvents="none"
      />

      <View style={styles.row}>
        <View style={[styles.thumbnail, { width: thumbnail, height: thumbnail, borderColor: theme.thumbnailEdge }]}>
          <Image
            testID="continue-thumbnail"
            source={{ uri: coverImage }}
            style={styles.thumbnailImage}
            contentFit="cover"
            transition={0}
          />
        </View>

        <View style={styles.words}>
          <Text style={[styles.eyebrow, { color: theme.eyebrow }]}>{t('home.continueTogether')}</Text>
          <Text style={[styles.title, { color: theme.title }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.meta, { color: theme.meta }]}>
            {t('home.pagePosition', { page: pageIndex + 1, total: totalPages })}
          </Text>

          <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
            <View
              testID="continue-progress-fill"
              style={[styles.fill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: theme.progressFrom }]}
            />
          </View>
        </View>
      </View>

      <View style={styles.ribbon} pointerEvents="none">
        <Svg width={HOME_SCENE_LAYOUT.ribbonWidth} height={HOME_SCENE_LAYOUT.ribbonHeight} viewBox="0 0 70 112">
          <Defs>
            <SvgGradient id="ribbon" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.ribbonFrom} />
              <Stop offset="100%" stopColor={theme.ribbonTo} />
            </SvgGradient>
          </Defs>
          <Path d="M0 8 A8 8 0 0 1 8 0 H62 A8 8 0 0 1 70 8 V104 L35 80 L0 104 Z" fill="url(#ribbon)" />
          <Polygon
            points="35,32 41,47 57,48 44,58 48,74 35,65 22,74 26,58 13,48 29,47"
            fill={theme.ribbonStar}
          />
        </Svg>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: HOME_SCENE_LAYOUT.continueRadius,
    borderWidth: 1,
    overflow: 'visible',
  },
  hairline: {
    position: 'absolute',
    left: HOME_SCENE_LAYOUT.continueRadius * 0.5,
    right: HOME_SCENE_LAYOUT.continueRadius * 0.5,
    top: 1,
    height: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  thumbnail: {
    borderRadius: HOME_SCENE_LAYOUT.thumbnailRadius,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  words: {
    flex: 1,
    marginLeft: 14,
  },
  eyebrow: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.eyebrow,
    fontWeight: '700',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.continueTitle,
    fontWeight: '700',
    marginTop: 4,
  },
  meta: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.continueMeta,
    fontWeight: '400',
    marginTop: 4,
  },
  track: {
    height: HOME_SCENE_LAYOUT.progressHeight,
    borderRadius: HOME_SCENE_LAYOUT.progressHeight / 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: HOME_SCENE_LAYOUT.progressHeight / 2,
  },
  ribbon: {
    position: 'absolute',
    right: 16,
    top: -6,
  },
});
