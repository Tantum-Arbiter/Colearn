import React, { useEffect, useRef, useState, memo } from 'react';
import { View, StyleSheet, Text, Dimensions, PixelRatio } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

import { getScreenDimensions } from '@/components/main-menu/constants';
import { crossesView, pageOffset, snapToPixel } from '@/constants/page-slide';
import { NIGHT_VOID } from '@/constants/night-palette';

export const COLD_PAGE_FRAMES = 2;
const PIXEL_SCALE = PixelRatio.get();
const ALWAYS_MOUNTED = 'main';
const NO_PREWARM: readonly string[] = [];
const NONE_INSTANT: readonly string[] = [];

interface EnhancedPageTransitionProps {
  currentPage: string;
  pages: Record<string, React.ReactNode>;
  duration?: number;
  /** When false, page positions are set instantly (no slide animation). Default: true */
  animate?: boolean;
  /** Pages to mount, off screen, once the current page has been still for a moment, so sliding
   *  to one of them does not pay for mounting it mid-slide. They stay mounted thereafter. */
  prewarm?: readonly string[];
  prewarmAfterMs?: number;
  instant?: readonly string[];
}

interface AnimatedPageProps {
  pageKey: string;
  pageComponent: React.ReactNode;
  isActive: boolean;
  animationValue: SharedValue<number>;
}

// Memoized page component to prevent unnecessary re-renders
const AnimatedPage: React.FC<AnimatedPageProps> = memo(function AnimatedPage({
  pageKey, pageComponent, isActive, animationValue,
}) {
  // Normal slide animation
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: snapToPixel(animationValue.value, PIXEL_SCALE) }],
  }));

  return (
    <Animated.View
      key={pageKey}
      testID={`page-transition-page-${pageKey}`}
      style={[
        styles.page,
        slideStyle,
        { zIndex: isActive ? 1 : 0 },
      ]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {pageComponent || (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>Missing component for {pageKey}</Text>
        </View>
      )}
    </Animated.View>
  );
});

/**
 * EnhancedPageTransition provides vertical scroll transitions between any pages.
 * Where each page rests is `pageOffset` (constants/page-slide.ts).
 */
export const EnhancedPageTransition: React.FC<EnhancedPageTransitionProps> = ({
  currentPage,
  pages,
  duration = 600,
  animate = true,
  prewarm = NO_PREWARM,
  prewarmAfterMs = 1200,
  instant = NONE_INSTANT,
}) => {
  // Get initial screen height and track changes
  const [screenHeight, setScreenHeight] = React.useState(() => getScreenDimensions().height);

  // Block touch input during page transitions so buttons can't be pressed mid-slide
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPageRef = useRef(currentPage);
  const [slide, setSlide] = useState<{ from: string | null; to: string; recent: string | null }>({
    from: null,
    to: currentPage,
    recent: null,
  });
  if (slide.to !== currentPage) {
    setSlide({ from: slide.to, to: currentPage, recent: slide.recent === currentPage ? slide.from : slide.recent });
  }
  const [warmed, setWarmed] = useState<readonly string[]>(NO_PREWARM);
  const showing = [currentPage, slide.from, slide.recent];
  const coldKey = prewarm.filter((key) => !warmed.includes(key) && !showing.includes(key)).join('|');

  useEffect(() => {
    if (coldKey === '') return undefined;
    const timer = setTimeout(() => setWarmed((current) => [...current, ...coldKey.split('|')]), prewarmAfterMs);
    return () => clearTimeout(timer);
  }, [currentPage, coldKey, prewarmAfterMs]);

  const mounted = new Set(
    [ALWAYS_MOUNTED, currentPage, slide.from, slide.recent, ...warmed].filter((key): key is string => key !== null)
  );
  const committedMounted = useRef<ReadonlySet<string>>(mounted);

  // Update screen height when dimensions change (orientation changes)
  useEffect(() => {
    const updateDimensions = () => {
      const { height } = getScreenDimensions();
      setScreenHeight(height);
    };

    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', updateDimensions);

    return () => subscription?.remove();
  }, []);

  const restingAt = (pageKey: string) => pageOffset(pageKey, currentPage, screenHeight);
  const mainTranslateY = useSharedValue(restingAt('main'));
  const storiesTranslateY = useSharedValue(restingAt('stories'));
  const sensoryTranslateY = useSharedValue(restingAt('sensory'));
  const screenTimeTranslateY = useSharedValue(restingAt('screen_time'));
  const practiseTranslateY = useSharedValue(restingAt('practise'));
  const freeplayTranslateY = useSharedValue(restingAt('freeplay'));
  const spellingTranslateY = useSharedValue(restingAt('spelling'));
  const numbersTranslateY = useSharedValue(restingAt('numbers'));
  const feelingsTranslateY = useSharedValue(restingAt('feelings'));
  const spellingGameTranslateY = useSharedValue(restingAt('spelling-game'));
  const accountTranslateY = useSharedValue(restingAt('account'));
  const islandTranslateY = useSharedValue(restingAt('island'));

  // Map page keys to their animation values
  const pageAnimations: Record<string, SharedValue<number>> = {
    main: mainTranslateY,
    stories: storiesTranslateY,
    sensory: sensoryTranslateY,
    'screen_time': screenTimeTranslateY,
    practise: practiseTranslateY,
    freeplay: freeplayTranslateY,
    spelling: spellingTranslateY,
    numbers: numbersTranslateY,
    feelings: feelingsTranslateY,
    'spelling-game': spellingGameTranslateY,
    account: accountTranslateY,
    island: islandTranslateY,
  };

  // Update animation values when screen height changes (orientation change)
  // Set values immediately without animation to prevent visual glitches
  useEffect(() => {
    Object.entries(pageAnimations).forEach(([pageKey, value]) => {
      if (pageKey !== currentPage) value.value = pageOffset(pageKey, currentPage, screenHeight);
    });
  }, [screenHeight]);

  useEffect(() => {
    // Use bezier curve for smoother animation that doesn't "snap" at the end
    const animationConfig = {
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth ease-out curve
    };

    const noSlide = (page: string) => page === ALWAYS_MOUNTED || instant.includes(page);
    const slides = animate && !(noSlide(currentPage) && noSlide(prevPageRef.current));

    // Helper: set value with or without animation
    const set = (sv: SharedValue<number>, target: number) => {
      sv.value = slides && !crossesView(sv.value, target) ? withTiming(target, animationConfig) : target;
    };

    // Block touch input while the slide animation is in progress
    if (prevPageRef.current !== currentPage) {
      const leaving = prevPageRef.current;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (slides) {
        setIsTransitioning(true);
      }
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        transitionTimerRef.current = null;
        setSlide((current) => ({
          ...current,
          from: current.from === leaving ? null : current.from,
          recent: leaving === ALWAYS_MOUNTED ? current.recent : leaving,
        }));
      }, slides ? duration : 0);
    }
    const arriving = prevPageRef.current !== currentPage;
    prevPageRef.current = currentPage;

    const slideAll = () => {
      Object.entries(pageAnimations).forEach(([pageKey, value]) => {
        set(value, pageOffset(pageKey, currentPage, screenHeight));
      });
    };

    if (!slides || !arriving || committedMounted.current.has(currentPage)) {
      slideAll();
      return undefined;
    }
    let frame = 0;
    let handle = requestAnimationFrame(function wait() {
      frame += 1;
      if (frame >= COLD_PAGE_FRAMES) {
        slideAll();
        return;
      }
      handle = requestAnimationFrame(wait);
    });
    return () => cancelAnimationFrame(handle);
  }, [currentPage, duration, animate]);

  useEffect(() => {
    committedMounted.current = mounted;
  });

  return (
    <View testID="page-transition-backdrop" style={styles.container}>
      {Object.entries(pages).map(([pageKey, pageComponent]) => {
        // Only render pages that have animation values, and only the ones in play:
        // home, the page showing, the page it is sliding away from, and the last
        // one left so a bounce back is instant. Everything else is unmounted.
        if (!pageAnimations[pageKey] || !mounted.has(pageKey)) {
          return null;
        }

        const isActive = currentPage === pageKey;

        return (
          <AnimatedPage
            key={pageKey}
            pageKey={pageKey}
            pageComponent={pageComponent}
            isActive={isActive}
            animationValue={pageAnimations[pageKey]}
          />
        );
      })}
      {/* swallows touches while pages slide, without re-rendering the pages themselves */}
      <View
        testID="page-transition-touch-guard"
        style={styles.touchGuard}
        pointerEvents={isTransitioning ? 'auto' : 'none'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: NIGHT_VOID,
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -1 / PIXEL_SCALE,
  },
  touchGuard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
});
