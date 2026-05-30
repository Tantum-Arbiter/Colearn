import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, Image, ImageSourcePropType } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getScreenDimensions } from './constants';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAccessibility } from '@/hooks/use-accessibility';

// Slide-in animation config
const SLIDE_IN_DURATION = 280; // ms per strip
const SLIDE_IN_STAGGER = 80; // ms between each strip
const SLIDE_IN_DISTANCE = 200; // px from below

// Module-level debounce to prevent double slide-in animation on rapid remount
// (e.g. React Strict Mode double-mount or brief currentView toggle after login)
let lastCarouselMountTime = 0;
const CAROUSEL_DEBOUNCE_MS = 1500;

/** Reset the carousel debounce timer so the next mount skips animation.
 *  Call this right before a view transition that will remount MainMenu
 *  to prevent a second slide-in (e.g. loading → app). */
export function suppressNextCarouselAnimation() {
  lastCarouselMountTime = Date.now();
}

export interface CarouselMenuItem {
  id: string;
  labelKey: string;
  destination: string;
  image: ImageSourcePropType;
}

const MENU_ITEMS: CarouselMenuItem[] = [
  { id: 'stories', labelKey: 'menu.stories', destination: 'stories', image: require('../../assets/images/menu-icons/stories-strip.webp') },
  { id: 'instruments', labelKey: 'menu.instruments', destination: 'instruments', image: require('../../assets/images/menu-icons/freeplay-strip.webp') },
  { id: 'learning', labelKey: 'menu.learning', destination: 'learning', image: require('../../assets/images/menu-icons/learning-button.webp') },
];

interface MenuCarouselProps {
  onNavigate: (destination: string) => void;
  /** Per-button refs for tutorial spotlights keyed by menu item id */
  buttonRefs?: Record<string, React.RefObject<View | null>>;
  /** Called once when all strip slide-in animations have finished */
  onLoadComplete?: () => void;
  /** Extra delay (ms) before buttons start sliding in -used to coordinate with loading screen exit */
  entranceDelay?: number;
}

export const MenuCarousel = React.memo(function MenuCarousel({
  onNavigate,
  buttonRefs,
  onLoadComplete,
  entranceDelay = 0,
}: MenuCarouselProps) {
  const { t } = useTranslation();
  const { scaledFontSize, isTablet } = useAccessibility();
  const { width: screenWidth } = getScreenDimensions();

  const stripWidth = Math.min(screenWidth * 0.88, isTablet ? 520 : 400);
  const stripHeight = isTablet ? 168 : 136;
  const gap = isTablet ? 14 : 10;

  // Decide on mount whether to animate or skip (debounce rapid remounts)
  const shouldAnimate = useMemo(() => {
    const now = Date.now();
    if (now - lastCarouselMountTime < CAROUSEL_DEBOUNCE_MS) {
      return false; // Recently animated -skip to avoid double slide-in
    }
    lastCarouselMountTime = now;
    return true;
  }, []);

  return (
    <View
      collapsable={false}
      style={styles.container}
      testID="menu-carousel"
    >
      {MENU_ITEMS.map((item, index) => (
        <StripButton
          key={item.id}
          item={item}
          onPress={() => onNavigate(item.destination)}
          label={t(item.labelKey)}
          stripWidth={stripWidth}
          stripHeight={stripHeight}
          gap={gap}
          scaledFontSize={scaledFontSize}
          buttonRef={buttonRefs?.[item.id]}
          slideIndex={index}
          isLast={index === MENU_ITEMS.length - 1}
          onSlideComplete={onLoadComplete}
          shouldAnimate={shouldAnimate}
          entranceDelay={entranceDelay}
        />
      ))}
    </View>
  );
});

// --- Individual strip button ---

interface StripButtonProps {
  item: CarouselMenuItem;
  onPress: () => void;
  label: string;
  stripWidth: number;
  stripHeight: number;
  gap: number;
  scaledFontSize: (base: number) => number;
  buttonRef?: React.RefObject<View | null>;
  /** Index in the menu list -drives stagger delay */
  slideIndex: number;
  /** Whether this is the last strip (fires onSlideComplete) */
  isLast: boolean;
  /** Called when the last strip finishes its slide-in */
  onSlideComplete?: () => void;
  /** Whether to animate the slide-in (false = appear instantly) */
  shouldAnimate: boolean;
  /** Extra delay (ms) added before slide-in starts */
  entranceDelay?: number;
}

const StripButton = React.memo(function StripButton({
  item,
  onPress,
  label,
  stripWidth,
  stripHeight,
  gap,
  scaledFontSize,
  buttonRef,
  slideIndex,
  isLast,
  onSlideComplete,
  shouldAnimate,
  entranceDelay = 0,
}: StripButtonProps) {
  const pressScale = useSharedValue(1);
  const slideY = useSharedValue(shouldAnimate ? SLIDE_IN_DISTANCE : 0);
  const slideOpacity = useSharedValue(shouldAnimate ? 0 : 1);
  const hasSlid = useRef(false);

  // Run slide-in animation on mount
  useEffect(() => {
    if (hasSlid.current) return;
    hasSlid.current = true;

    if (!shouldAnimate) {
      // Rapid remount -skip animation, show immediately
      slideY.value = 0;
      slideOpacity.value = 1;
      if (isLast && onSlideComplete) {
        onSlideComplete();
      }
      return;
    }

    const delay = entranceDelay + slideIndex * SLIDE_IN_STAGGER;

    slideOpacity.value = withDelay(delay,
      withTiming(1, { duration: SLIDE_IN_DURATION * 0.6, easing: Easing.out(Easing.cubic) }));

    slideY.value = withDelay(delay, withTiming(0, { duration: SLIDE_IN_DURATION, easing: Easing.out(Easing.cubic) }, (finished) => {
      // Fire onLoadComplete only after the last strip's animation actually finishes on the UI thread
      if (finished && isLast && onSlideComplete) {
        runOnJS(onSlideComplete)();
      }
    }));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }, { translateY: slideY.value }],
    opacity: slideOpacity.value,
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    pressScale.value = withSequence(
      withTiming(0.95, { duration: 60, easing: Easing.out(Easing.cubic) }),
      withTiming(1.02, { duration: 100, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 80, easing: Easing.out(Easing.cubic) }),
    );

    onPress();
  }, [onPress, pressScale]);

  return (
    <Animated.View ref={buttonRef} collapsable={false} style={[{ marginBottom: gap, width: stripWidth }, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.strip,
          { height: stripHeight, borderRadius: stripHeight * 0.2 },
          pressed && styles.stripPressed,
        ]}
        testID={`menu-icon-${item.id}`}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label} button`}
      >
        <Image
          source={item.image}
          style={[
            styles.stripImage,
            { borderRadius: stripHeight * 0.2 },
            item.id === 'learning' && { transform: [{ scale: 1.25 }] },
          ]}
          resizeMode="cover"
          fadeDuration={0}
        />
        <View style={styles.textOverlay}>
          <Text style={[styles.label, { fontSize: scaledFontSize(32) }]}>
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  strip: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  stripPressed: {
    opacity: 0.85,
  },
  stripImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1.5,
  },
});
