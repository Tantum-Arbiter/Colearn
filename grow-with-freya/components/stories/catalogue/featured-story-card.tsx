import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { getLocalizedText } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { ACCENT_GOLD, ACCENT_PURPLE, NIGHT_DEEP, NIGHT_VOID, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
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

/**
 * The title runs smaller than the featured-title role so two words a line fit
 * the box beside the picture, as the design has it, rather than being cut short.
 */
const TITLE_SCALE = 0.8;

/**
 * The panel's geometry, as fractions of its width so it holds at any size --
 * the panel keeps one aspect ratio, so a fraction of its width is the same
 * fraction of the picture on a phone and on a tablet.
 *
 * The glimpse inside the book starts a tenth of the way in and runs to the
 * right edge, anchored to the right so what it shows is the picture's right
 * side rather than a centred crop. The words take the left three fifths; the
 * panel's own colour lies solid over the strip the picture leaves bare, holds
 * nearly solid behind the start of the words, and clears just past where they
 * end, so the picture is plain from there to the edge.
 */
export const INSIGHT_INSET = 0.1;
export const TEXT_WIDTH = 0.6;
export const READABILITY_WASH_LOCATIONS = [0, INSIGHT_INSET, 0.42, TEXT_WIDTH + 0.02] as const;
const READABILITY_WASH = [
  'rgba(9, 20, 56, 1)',
  'rgba(9, 20, 56, 0.96)',
  'rgba(9, 20, 56, 0.62)',
  'rgba(9, 20, 56, 0)',
] as const;
/**
 * A night tint over the glimpse, so a page lit differently from the panel
 * still sits in the night palette.
 */
const INSIGHT_TINT = 'rgba(9, 20, 56, 0.18)';

/**
 * How much of a page asset is the paper it is printed on rather than the
 * picture. Story pages are illustrations centred on near-white paper -- across
 * every bundled page the margin measures 22% at the sides and 26% top and
 * bottom -- so the panel zooms past it to show the picture rather than a pale
 * slab. Covers are edge-to-edge artwork and are left alone.
 */
const PAGE_PAPER_MARGIN = 0.26;
const PAGE_CROP = 1 / (1 - 2 * PAGE_PAPER_MARGIN);

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
  hidden?: boolean;
  testID?: string;
}

/**
 * The featured panel: what the story is, and a way straight into it.
 *
 * It leads with the title, a line or two about the story and a Read Now
 * button, beside a glimpse of what is inside -- the book's third page rather
 * than the cover, which the child has already seen on the shelf behind.
 */
export function FeaturedStoryCard({ story, width, language, onOpen, label, hidden = false, testID = 'featured-story-card' }: FeaturedStoryCardProps) {
  const { isTablet, scaledFontSize } = useAccessibility();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<View>(null);
  const pressScale = useSharedValue(1);
  const title = getLocalizedText(story.title, story.title.en, language);
  const description = story.description
    ? getLocalizedText(story.description, story.description.en ?? '', language)
    : '';
  const insight = featuredInsightImage(story);
  // Only a page carries the paper margin; a cover fills its own frame
  const insightIsPage = insight !== undefined && insight !== story.coverArtwork;
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
        style={[styles.card, { width, height, borderRadius: RADIUS_LARGE }]}
      >
        {insight ? (
          <Image
            testID="featured-story-insight"
            source={typeof insight === 'string' ? { uri: insight } : insight}
            style={[styles.insight, insightIsPage && { transform: [{ scale: PAGE_CROP }] }]}
            contentFit="cover"
            contentPosition="right"
            transition={0}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.insight, styles.placeholder]} />
        )}

        <View style={[styles.insight, styles.tint]} pointerEvents="none" />

        <LinearGradient
          colors={READABILITY_WASH}
          locations={READABILITY_WASH_LOCATIONS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
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
            numberOfLines={2}
          >
            {title}
          </Text>

          {description.length > 0 && (
            <Text
              testID="featured-story-description"
              style={[styles.description, { fontSize: scaledFontSize(isTablet ? 15 : 13) }]}
              numberOfLines={3}
            >
              {description}
            </Text>
          )}

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
  // No border: the artwork is scaled up to crop its paper margin, so it runs
  // under the panel's own edge, and a translucent border laid over it lit up
  // as a white line down the left side where the page's paper showed through
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
  },
  description: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.sans,
    lineHeight: 18,
  },
  readNow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
    marginTop: SPACE_3,
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
