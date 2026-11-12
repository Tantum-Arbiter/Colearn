import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { getLocalizedText } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { ACCENT_GOLD, ACCENT_PURPLE, NIGHT_DEEP, NIGHT_VOID, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CHILD_UI_MOTION, CHILD_UI_SCALE, motionDuration } from '@/constants/child-ui-motion';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  FEATURED_ASPECT_RATIO,
  FEATURED_ASPECT_RATIO_TABLET,
  RADIUS_CONTROL,
  RADIUS_LARGE,
  SPACE_2,
  SPACE_3,
  SPACE_4,
  SPACE_5,
  TYPE_ROLES,
  typeSize,
} from '@/components/child-ui/tokens';
import { CatalogueStory, featuredInsightImage } from './catalogue-story';
import { BookProgress } from '@/components/child-ui/book-progress';
import { ReadingPlace, readingCount, readingFraction } from '@/components/stories/reading-progress';

/**
 * The title runs smaller than the featured-title role so two words a line fit
 * the box beside the picture, as the design has it, rather than being cut short.
 */
const TITLE_SCALE = 0.8;

/**
 * The panel's geometry, as fractions of its width so it holds at any size.
 * The sharp cover takes the panel's right part, centred in it and never
 * zoomed: on a tablet that part is a cover's own shape, so the cover shows
 * whole, and on a phone only a sliver of either side goes. A blurred copy of
 * the cover fills the whole panel beneath it, so the shadow alone sets how
 * dark the panel is (operator, 2026-11-12). The sharp cover's left edge fades
 * into the blur in thin slices of rising opacity, each lined up with the
 * cover, since there is no mask to fade one image. The words take the left
 * three fifths.
 */
export const INSIGHT_INSET = 0.3;
export const INSIGHT_FEATHER = 0.1;
export const INSIGHT_FEATHER_STEPS = 8;
export const INSIGHT_BLUR = 24;
export const TEXT_WIDTH = 0.6;
export const PROGRESS_SPAN = 0.72;
export const DESCRIPTION_SPAN = 0.75;
export const READABILITY_WASH_LOCATIONS = [0, 0.1, 0.5] as const;
const READABILITY_WASH = ['rgba(9, 20, 56, 1)', 'rgba(9, 20, 56, 1)', 'rgba(9, 20, 56, 0)'] as const;
/**
 * A night tint over the glimpse, so a page lit differently from the panel
 * still sits in the night palette.
 */
const INSIGHT_TINT = 'rgba(9, 20, 56, 0.18)';
const WORDS_SHADOW = {
  textShadowColor: 'rgba(9, 20, 56, 0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

export interface StoryOpenHandler {
  (story: CatalogueStory, ref: React.RefObject<View | null>): void;
}

interface FeaturedStoryCardProps {
  story: CatalogueStory;
  /** The width the panel is given on the shelf. */
  width: number;
  language: SupportedLanguage;
  onOpen: StoryOpenHandler;
  /** What the panel is offering: "Featured Story" unless told otherwise, as for the day's pick. */
  label?: string;
  /** Where the child is in the book, for one they are part-way through. */
  place?: ReadingPlace;
  hidden?: boolean;
  testID?: string;
}

/**
 * The featured panel: what the story is, and a way straight into it.
 *
 * It leads with the title, a line or two about the story and a Read Now
 * button, beside the book's cover.
 */
export function FeaturedStoryCard({ story, width, language, onOpen, label, place, hidden = false, testID = 'featured-story-card' }: FeaturedStoryCardProps) {
  const { isTablet, scaledFontSize } = useAccessibility();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<View>(null);
  const pressScale = useSharedValue(1);
  const title = getLocalizedText(story.title, story.title.en, language);
  const description = story.description
    ? getLocalizedText(story.description, story.description.en ?? '', language)
    : '';
  const insight = featuredInsightImage(story, place?.pageIndex);
  const count = place ? readingCount(place) : undefined;
  const descriptionSize = scaledFontSize(isTablet ? 15 : 13);
  const insightSource = insight === undefined ? undefined : typeof insight === 'string' ? { uri: insight } : insight;
  const sharpWidth = width * (1 - INSIGHT_INSET);
  const featherWidth = width * INSIGHT_FEATHER;
  const featherStep = featherWidth / INSIGHT_FEATHER_STEPS;
  const height = Math.round(width / (isTablet ? FEATURED_ASPECT_RATIO_TABLET : FEATURED_ASPECT_RATIO));

  const duration = motionDuration(CHILD_UI_MOTION.cardTap, reduceMotion);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(CHILD_UI_SCALE.cardPressed, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handleOpen = useCallback(() => {
    onOpen(story, cardRef);
  }, [onOpen, story]);

  return (
    <Animated.View ref={cardRef} collapsable={false} style={[animatedStyle, hidden && styles.hidden]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={handleOpen}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { width, minHeight: height, borderRadius: RADIUS_LARGE }]}
      >
        {insightSource ? (
          <>
            <Image
              testID="featured-story-insight-backdrop"
              source={insightSource}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={INSIGHT_BLUR}
              transition={0}
              cachePolicy="memory-disk"
            />
            <View testID="featured-story-insight-frame" style={styles.insight} pointerEvents="none">
              {Array.from({ length: INSIGHT_FEATHER_STEPS }, (_, step) => (
                <View
                  key={step}
                  testID={`featured-story-insight-feather-${step}`}
                  style={[styles.slice, { left: step * featherStep, width: featherStep, opacity: (step + 1) / (INSIGHT_FEATHER_STEPS + 1) }]}
                >
                  <Image
                    source={insightSource}
                    style={[styles.sharp, { left: -step * featherStep, width: sharpWidth }]}
                    contentFit="cover"
                    contentPosition="center"
                    transition={0}
                    cachePolicy="memory-disk"
                  />
                </View>
              ))}
              <View testID="featured-story-insight-clip" style={[styles.slice, { left: featherWidth, right: 0 }]}>
                <Image
                  testID="featured-story-insight"
                  source={insightSource}
                  style={[styles.sharp, { left: -featherWidth, width: sharpWidth }]}
                  contentFit="cover"
                  contentPosition="center"
                  transition={0}
                  cachePolicy="memory-disk"
                />
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.insight, styles.placeholder]} />
        )}

        <View testID="featured-story-tint" style={[StyleSheet.absoluteFill, styles.tint]} pointerEvents="none" />

        <LinearGradient
          testID="featured-story-shadow"
          colors={READABILITY_WASH}
          locations={READABILITY_WASH_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View testID="featured-story-body" style={styles.body} pointerEvents="box-none">
          <View style={styles.labelRow}>
            <Ionicons name="sparkles" size={scaledFontSize(isTablet ? 15 : 13)} color={ACCENT_GOLD} />
            <Text testID={`${testID}-label`} style={[styles.label, { fontSize: scaledFontSize(isTablet ? 14 : 12) }]} numberOfLines={1}>
              {label ?? t('catalogue.featuredStory')}
            </Text>
          </View>
          <Text
            testID="featured-story-title"
            style={[styles.title, { fontSize: scaledFontSize(Math.round(typeSize('featuredTitle', isTablet) * TITLE_SCALE)) }]}
          >
            {title}
          </Text>

          {description.length > 0 && (
            <Text
              testID="featured-story-description"
              style={[styles.description, { fontSize: descriptionSize, lineHeight: Math.round(descriptionSize * 1.35) }]}
            >
              {description}
            </Text>
          )}

          {place && count && (
            <View testID="featured-story-progress-block" style={styles.progress}>
              <BookProgress
                size="small"
                fraction={readingFraction(place)}
                label={t('home.pagePosition', { page: count.page, total: count.of })}
                testID="featured-story-progress"
              />
            </View>
          )}

          <View testID="featured-story-spring" style={styles.spring} />

          <Pressable
            testID="featured-story-read-now"
            accessibilityRole="button"
            accessibilityLabel={t('storyDetail.readNow')}
            onPress={handleOpen}
            style={styles.readNow}
          >
            <Ionicons name="play" size={scaledFontSize(14)} color={TEXT_PRIMARY} />
            <Text style={[styles.readNowLabel, { fontSize: scaledFontSize(isTablet ? 16 : 14) }]}>
              {t('storyDetail.readNow')}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  card: {
    backgroundColor: NIGHT_DEEP,
    overflow: 'hidden',
  },
  insight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: `${INSIGHT_INSET * 100}%`,
  },
  slice: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  sharp: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  placeholder: {
    backgroundColor: NIGHT_VOID,
  },
  tint: {
    backgroundColor: INSIGHT_TINT,
  },
  // The words sit at the top of the box, as the design has them, and Read
  // Now follows the description rather than being pinned to the foot
  body: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: SPACE_5,
    paddingBottom: SPACE_5,
    paddingLeft: SPACE_5,
    paddingRight: SPACE_3,
    width: `${TEXT_WIDTH * 100}%`,
    gap: SPACE_2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2 - 2,
  },
  label: {
    color: ACCENT_GOLD,
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.featuredTitle.weight,
    ...WORDS_SHADOW,
  },
  description: {
    width: `${DESCRIPTION_SPAN * 100}%`,
    color: TEXT_PRIMARY,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    ...WORDS_SHADOW,
  },
  progress: {
    alignSelf: 'flex-start',
    width: `${PROGRESS_SPAN * 100}%`,
    marginTop: SPACE_2,
  },
  spring: {
    flexGrow: 1,
    minHeight: SPACE_2,
  },
  readNow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
    paddingVertical: SPACE_3 - 2,
    paddingHorizontal: SPACE_4 + 2,
    borderRadius: RADIUS_CONTROL,
    backgroundColor: ACCENT_PURPLE,
  },
  readNowLabel: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
});
