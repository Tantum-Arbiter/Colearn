/**
 * StoryVariationPicker
 *
 * Shows all available story variations for a learning activity as
 * tappable cards. The user picks which story to play, then the
 * spelling game launches with that specific story.
 *
 * Visual style matches the LearningScreen (gradient, stars, bear).
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/ui/page-header';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { getSpellingStories } from '@/data/spelling-stories';
import type { SpellingStory } from '@/types/spelling-game';

const STAR_POSITIONS = generateStarPositions(VISUAL_EFFECTS.STAR_COUNT);

/** Pastel accent colours for story cards */
const CARD_COLORS = [
  '#FF9AA2', '#FFB7B2', '#FFDAC1', '#B5EAD7', '#C7CEEA',
];

interface StoryVariationPickerProps {
  activityId: string;
  activityNameKey: string;
  onSelect: (storyId: string) => void;
  onBack: () => void;
}

export function StoryVariationPicker({
  activityId,
  activityNameKey,
  onSelect,
  onBack,
}: StoryVariationPickerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, textSizeScale } = useAccessibility();

  const stories = useMemo(() => getSpellingStories(activityId), [activityId]);

  // Star rotation
  const starRotation = useSharedValue(0);
  React.useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, { duration: 120000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [starRotation]);
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const titleFontSize = scaledFontSize(18);
  const descFontSize = scaledFontSize(14);
  const cardNumberSize = scaledFontSize(28);

  const renderStoryCard = ({ item, index }: { item: SpellingStory; index: number }) => {
    const color = CARD_COLORS[index % CARD_COLORS.length];
    return (
      <Pressable
        style={({ pressed }) => [
          styles.storyCard,
          pressed && styles.storyCardPressed,
        ]}
        onPress={() => onSelect(item.id)}
        testID={`story-card-${item.id}`}
      >
        <View style={[styles.cardNumberCircle, { backgroundColor: color }]}>
          <Text style={[styles.cardNumber, { fontSize: cardNumberSize }]}>{index + 1}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { fontSize: titleFontSize }]}>
            {t(item.titleKey)}
          </Text>
          <Text style={[styles.cardSubtitle, { fontSize: descFontSize }]}>
            {t('learning.storyPicker.pages', { count: item.pages.length })}
          </Text>
        </View>
        <Ionicons name="play-circle-outline" size={28} color="rgba(255,255,255,0.7)" />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={StyleSheet.absoluteFill} />
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>
      {STAR_POSITIONS.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          style={[{
            position: 'absolute', width: VISUAL_EFFECTS.STAR_SIZE, height: VISUAL_EFFECTS.STAR_SIZE,
            backgroundColor: 'white', borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
            opacity: star.opacity, left: star.left, top: star.top, zIndex: 2,
          }, starAnimatedStyle]}
        />
      ))}

      <PageHeader title={t(activityNameKey)} onBack={onBack} useBackArrow />

      <View style={{ flex: 1, paddingTop: insets.top + 90 + (textSizeScale - 1) * 40, zIndex: 10 }}>
        {/* Prompt */}
        <Text style={[styles.prompt, { fontSize: scaledFontSize(16) }]}>
          {t('learning.storyPicker.choose')}
        </Text>

        <FlatList
          data={stories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          renderItem={renderStoryCard}
        />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  prompt: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 12,
  },
  storyCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  storyCardPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ scale: 0.98 }],
  },
  cardNumberCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNumber: {
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Fonts.sans,
    fontWeight: '400',
    marginTop: 3,
  },
});