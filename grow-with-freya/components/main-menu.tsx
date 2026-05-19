import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  cancelAnimation,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppStore, type SubscriptionTier } from '@/store/app-store';
import { MusicControl } from '@/components/ui/music-control';
import { ParentsOnlyModal } from '@/components/ui/parents-only-modal';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';
import { TutorialOverlay, StoryModeTipsOverlay } from '@/components/tutorial';
import { useTutorial } from '@/contexts/tutorial-context';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import * as Haptics from 'expo-haptics';
import { STORY_MODES, type StoryMode } from '@/components/stories/story-selection-screen';
import { Fonts } from '@/constants/theme';


import { ErrorBoundary } from './error-boundary';
import {
  animationLimiter
} from './main-menu/performance-utils';

import {
  MenuCarousel,
  Cloud1,
  Cloud2,

  BearImage,
  MoonImage,
  ANIMATION_TIMINGS,
  LAYOUT,
  VISUAL_EFFECTS,
  getScreenDimensions,
  ASSET_DIMENSIONS,

  generateStarPositions,
  mainMenuStyles,
} from './main-menu/index';

import { createCloudAnimationNew } from './main-menu/cloud-animations';

// PERFORMANCE: Generate star positions once at module level to prevent recalculation on every mount
// This is safe because star positions are random and don't need to change between mounts
const MEMOIZED_STAR_POSITIONS = generateStarPositions();

// PERFORMANCE: Resolve mode card images once at module level so they aren't
// re-required on every render.  Local require() assets are bundled -no need
// for Image.prefetch (which only accepts URL strings, not numeric asset IDs).
const MODE_CARD_IMAGES = {
  interactive: require('../assets/images/menu-icons/classic-button.webp'),
  jigsaw: require('../assets/images/menu-icons/jigsaw-button.webp'),
  music: require('../assets/images/menu-icons/stories-strip.webp'),
} as const;

// Module-level flag to skip the container fade-in on the next mount.
// Set by suppressNextContainerFadeIn() before a loading→app transition so the menu
// doesn't flash from opacity 0→1 when it was already visible behind the loading overlay.
let _skipNextFadeIn = false;

/** Call before remounting MainMenu (e.g. loading → app) to prevent the 300ms opacity flash. */
export function suppressNextContainerFadeIn() {
  _skipNextFadeIn = true;
}

interface MainMenuProps {
  onNavigate: (destination: string) => void;
  isActive?: boolean; // Kept for API compatibility with EnhancedPageTransition
  disableTutorial?: boolean; // When true, don't show the tutorial (used during login transition)
  /** Extra delay (ms) before carousel buttons slide in -used for loading screen reveal */
  entranceDelay?: number;
  /** When true, immediately show mode cards (Interactive/Musical/Jigsaw) instead of carousel */
  returnToModeCards?: boolean;
}

function MainMenuComponent({ onNavigate, isActive, disableTutorial = false, entranceDelay = 0, returnToModeCards = false }: MainMenuProps) {
  const insets = useSafeAreaInsets();
  const { scaledButtonSize, scaledFontSize } = useAccessibility();

  // Subscription state
  const { getEffectiveTier } = useAppStore();
  const effectiveTier: SubscriptionTier = getEffectiveTier();
  const isPremium = effectiveTier === 'premium';
  const [showSubscription, setShowSubscription] = useState(false);

  // Unlock button animations -gentle pulse + shimmer + slide-out on navigate
  const unlockPulse = useSharedValue(1);
  const unlockShimmer = useSharedValue(0);
  const unlockSlideY = useSharedValue(0);

  useEffect(() => {
    // Gentle scale pulse
    unlockPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1200, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
        withTiming(1, { duration: 1200, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
      ),
      -1, true
    );
    // Shimmer sweep every 3s
    unlockShimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
      -1, false
    );
  }, []);

  const unlockBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: unlockPulse.value },
      { translateY: unlockSlideY.value },
    ],
  }));

  const unlockShimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(unlockShimmer.value, [0, 0.3, 0.5, 0.7, 1], [0, 0, 0.35, 0, 0]),
  }));

  // Slide unlock button back into view after the page transition completes (800ms)
  useEffect(() => {
    if (isActive) {
      unlockSlideY.value = withDelay(800, withTiming(0, { duration: 300, easing: ReanimatedEasing.out(ReanimatedEasing.ease) }));
    }
  }, [isActive]);

  // Track when the menu carousel slide-in animation has finished
  const [carouselReady, setCarouselReady] = useState(false);
  const handleCarouselLoadComplete = useCallback(() => {
    setCarouselReady(true);
  }, []);

  const { t } = useTranslation();

  // ── Story mode cards (shown in-place of carousel when Stories is tapped) ──
  const [showModeCards, setShowModeCards] = useState(false);
  const carouselOpacity = useSharedValue(1);
  const carouselSlideY = useSharedValue(0);
  const modeCardsOpacity = useSharedValue(0);
  const SLIDE_DISTANCE = Math.round(getScreenDimensions().height * 0.45); // enough to fully exit the visible area
  const SLIDE_DURATION = 500;
  const modeCardsSlideY = useSharedValue(SLIDE_DISTANCE); // starts below
  const slideEasingOut = ReanimatedEasing.out(ReanimatedEasing.cubic);
  const slideEasingIn = ReanimatedEasing.in(ReanimatedEasing.cubic);

  const carouselFadeStyle = useAnimatedStyle(() => ({
    opacity: carouselOpacity.value,
    transform: [{ translateY: carouselSlideY.value }],
  }));
  const modeCardsFadeStyle = useAnimatedStyle(() => ({
    opacity: modeCardsOpacity.value,
    transform: [{ translateY: modeCardsSlideY.value }],
  }));

  // When returning from stories, immediately show mode cards (no animation)
  useEffect(() => {
    if (returnToModeCards && isActive) {
      setShowModeCards(true);
      carouselOpacity.value = 0;
      carouselSlideY.value = -SLIDE_DISTANCE;
      modeCardsOpacity.value = 1;
      modeCardsSlideY.value = 0;
    }
  }, [returnToModeCards, isActive]);

  const handleShowModeCards = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowModeCards(true);
    // 1) Carousel slides up and fades out
    carouselOpacity.value = withTiming(0, { duration: SLIDE_DURATION, easing: slideEasingIn });
    carouselSlideY.value = withTiming(-SLIDE_DISTANCE, { duration: SLIDE_DURATION, easing: slideEasingIn });
    // 2) After carousel exits, mode cards slide up from below
    modeCardsSlideY.value = SLIDE_DISTANCE; // reset start position
    modeCardsOpacity.value = 0;
    modeCardsOpacity.value = withDelay(SLIDE_DURATION, withTiming(1, { duration: SLIDE_DURATION, easing: slideEasingOut }));
    modeCardsSlideY.value = withDelay(SLIDE_DURATION, withTiming(0, { duration: SLIDE_DURATION, easing: slideEasingOut }));
  }, [carouselOpacity, carouselSlideY, modeCardsOpacity, modeCardsSlideY]);

  const handleHideModeCards = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // 1) Mode cards slide down and fade out
    modeCardsOpacity.value = withTiming(0, { duration: SLIDE_DURATION, easing: slideEasingIn });
    modeCardsSlideY.value = withTiming(SLIDE_DISTANCE, { duration: SLIDE_DURATION, easing: slideEasingIn });
    // 2) After mode cards exit, carousel slides back down from above
    carouselSlideY.value = -SLIDE_DISTANCE; // reset start position
    carouselOpacity.value = 0;
    carouselOpacity.value = withDelay(SLIDE_DURATION, withTiming(1, { duration: SLIDE_DURATION, easing: slideEasingOut }));
    carouselSlideY.value = withDelay(SLIDE_DURATION, withTiming(0, { duration: SLIDE_DURATION, easing: slideEasingOut }));
    setTimeout(() => setShowModeCards(false), SLIDE_DURATION * 2 + 50);
  }, [carouselOpacity, carouselSlideY, modeCardsOpacity, modeCardsSlideY]);

  const handleModeCardSelect = useCallback((mode: StoryMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    unlockSlideY.value = withTiming(100, { duration: 300, easing: ReanimatedEasing.in(ReanimatedEasing.ease) });
    onNavigate(`stories-${mode}`);
    // Reset mode cards state after navigating so they're hidden when coming back
    setTimeout(() => {
      setShowModeCards(false);
      carouselOpacity.value = 1;
      carouselSlideY.value = 0;
      modeCardsOpacity.value = 0;
      modeCardsSlideY.value = SLIDE_DISTANCE;
    }, 500);
  }, [onNavigate, unlockSlideY, carouselOpacity, carouselSlideY, modeCardsOpacity, modeCardsSlideY]);

  // Block navigation while the main menu tutorial is pending (first-time sign-in).
  // This prevents the user tapping a button before the tutorial overlay mounts.
  const { shouldShowTutorial, isLoaded: tutorialLoaded } = useTutorial();
  const [tutorialFinished, setTutorialFinished] = useState(false);
  const isTutorialPending = !disableTutorial && tutorialLoaded && shouldShowTutorial('main_menu_tour') && !tutorialFinished;

  // Use a ref so guardedOnNavigate keeps a stable reference -avoids re-rendering
  // MenuCarousel (React.memo) when isTutorialPending changes, which would cause a flicker.
  const isTutorialPendingRef = useRef(isTutorialPending);
  isTutorialPendingRef.current = isTutorialPending;

  const guardedOnNavigate = useCallback((destination: string) => {
    if (isTutorialPendingRef.current) return; // Block navigation until tutorial completes/skips
    // Intercept Stories button - show mode cards instead of navigating
    if (destination === 'stories') {
      handleShowModeCards();
      return;
    }
    // Slide unlock button off-screen before page transition
    unlockSlideY.value = withTiming(100, { duration: 300, easing: ReanimatedEasing.in(ReanimatedEasing.ease) });
    onNavigate(destination);
  }, [onNavigate, unlockSlideY, handleShowModeCards]);

  const handleTutorialEnd = useCallback(() => {
    setTutorialFinished(true);
  }, []);

  // Parents Only modal - using shared hook
  const parentsOnly = useParentsOnlyChallenge();

  // Get current screen dimensions (updates with orientation changes)
  const { height: screenHeight } = getScreenDimensions();

  // Get store action for saving animation state on unmount
  const updateBackgroundAnimationState = useAppStore((state) => state.updateBackgroundAnimationState);

  // Animation values with cleanup - always start clouds from off-screen positions
  const starRotation = useSharedValue(0);
  const cloudFloat1 = useSharedValue(LAYOUT.OFF_SCREEN_LEFT as number); // Always start from off-screen left (-200)
  const cloudFloat2 = useSharedValue(-400 as number); // Always start from off-screen left (-400)
  // Skip fade-in when behind loading overlay OR when remounting after loading→app transition
  const skipFadeIn = useMemo(() => {
    if (entranceDelay > 0) return true;
    if (_skipNextFadeIn) {
      _skipNextFadeIn = false; // consume the flag
      return true;
    }
    return false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const containerOpacity = useSharedValue(skipFadeIn ? 1 : 0);

  // Fade in the container on mount (smooth transition from splash -skipped when behind loading overlay)
  useEffect(() => {
    if (skipFadeIn) return; // Already visible -no fade needed
    containerOpacity.value = withTiming(1, { duration: 300, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });
  }, [containerOpacity, skipFadeIn]);

  // Star twinkle rotation (matches story selection / practise screens)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      starRotation.value = withRepeat(
        withTiming(360, { duration: 20000, easing: ReanimatedEasing.linear }),
        -1,
        false,
      );
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  // Animation cancellation flag
  const animationsCancelled = useRef(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tutorial target refs - using refs that get populated when buttons render
  const storiesButtonRef = useRef<View>(null);
  const practiseButtonRef = useRef<View>(null);
  const freeplayButtonRef = useRef<View>(null);
  const musicControlRef = useRef<View>(null);
  const settingsButtonRef = useRef<View>(null);

  // Per-button refs for the carousel strip buttons (keyed by menu item id)
  const carouselButtonRefs = useMemo(() => ({
    stories: storiesButtonRef,
    practise: practiseButtonRef,
    freeplay: freeplayButtonRef,
  }), []);

  // Build tutorial target refs map - maps step IDs to refs
  const tutorialTargetRefs = useMemo(() => ({
    'stories_button': storiesButtonRef,
    'practise_button': practiseButtonRef,
    'freeplay_button': freeplayButtonRef,
    'settings_button': settingsButtonRef,
    'sound_control': musicControlRef,
  }), []);

  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      // PERFORMANCE CRITICAL: Cancel all animations immediately to prevent memory leaks
      animationsCancelled.current = true;

      // Clear all timeouts to prevent memory leaks
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Reset animation limiter to prevent memory buildup
      animationLimiter.reset();

      // Cancel all infinite background animations (safe for test environment)
      try {
        cancelAnimation(starRotation);
        cancelAnimation(cloudFloat1);
        cancelAnimation(cloudFloat2);
      } catch (error) {

        console.warn('Could not cancel background animations:', error);
      }

      // Save animation state immediately and reliably
      try {
        const currentCloud1 = cloudFloat1.value;
        const currentCloud2 = cloudFloat2.value;

        // Only save if positions are valid
        if (isFinite(currentCloud1) && !isNaN(currentCloud1) &&
            isFinite(currentCloud2) && !isNaN(currentCloud2)) {
          updateBackgroundAnimationState({
            cloudFloat1: currentCloud1,
            cloudFloat2: currentCloud2,
            rocketFloat1: 1000, // Static value - rockets removed
            rocketFloat2: -200, // Static value - rockets removed
          });

        }
      } catch (error) {
        console.warn('Failed to save animation state on unmount:', error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // PERFORMANCE: Empty dependency array to prevent re-renders

  // Start cloud animations once on mount - they run continuously
  // PERFORMANCE: Use InteractionManager to defer animations until after scroll transitions complete
  useEffect(() => {
    // Defer cloud animation startup to prevent jitter during page transitions
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      // Start cloud animations with staggered delays for visual variety
      // Cloud 1 starts immediately from -200, Cloud 2 starts after a delay from -400
      cloudFloat1.value = createCloudAnimationNew(cloudFloat1, 0, -200);
      cloudFloat2.value = createCloudAnimationNew(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400);
    });

    // Cleanup on unmount only
    return () => {
      interactionHandle.cancel();
      cancelAnimation(cloudFloat1);
      cancelAnimation(cloudFloat2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount



  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const cloudAnimatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudFloat1.value }],
  }));

  const cloudAnimatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudFloat2.value }],
  }));

  // Rocket animations removed entirely

  // PERFORMANCE: Use module-level memoized star positions to prevent recalculation
  const stars = MEMOIZED_STAR_POSITIONS;

  // PERFORMANCE: Memoize mode card strip dimensions so they aren't recalculated per-button per-render
  const { width: sw } = getScreenDimensions();
  const tablet = sw >= 768;
  const modeStripW = Math.min(sw * 0.88, tablet ? 520 : 400);
  const modeStripH = tablet ? 168 : 136;

  // PERFORMANCE: Memoize cloud container styles to prevent re-creating objects on every render
  const cloud1ContainerStyle = useMemo(() => ({
    top: screenHeight * LAYOUT.CLOUD_TOP_POSITION_1,
    zIndex: LAYOUT.Z_INDEX.CLOUDS_BEHIND
  }), [screenHeight]);

  const cloud2ContainerStyle = useMemo(() => ({
    top: screenHeight * LAYOUT.CLOUD_TOP_POSITION_2,
    zIndex: LAYOUT.Z_INDEX.CLOUDS_FRONT
  }), [screenHeight]);



  return (
    <Animated.View style={[{ flex: 1 }, containerAnimatedStyle]}>
      <LinearGradient
        colors={VISUAL_EFFECTS.GRADIENT_COLORS}
        style={mainMenuStyles.container}
        testID="main-menu-container"
      >

        <View style={mainMenuStyles.backgroundGradient}>

        {stars.map((star) => (
          <Animated.View
            key={`star-${star.id}`}
            style={[
              mainMenuStyles.star,
              starAnimatedStyle,
              {
                left: star.left,
                top: star.top,
                opacity: star.opacity,
              }
            ]}
          />
        ))}

        <Animated.View
          style={[mainMenuStyles.cloudContainer, cloudAnimatedStyle1, cloud1ContainerStyle]}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
          <Cloud1 width={ASSET_DIMENSIONS.cloud1.width} height={ASSET_DIMENSIONS.cloud1.height} />
        </Animated.View>
        <Animated.View
          style={[mainMenuStyles.cloudContainerFront, cloudAnimatedStyle2, cloud2ContainerStyle]}
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
          <Cloud2 width={ASSET_DIMENSIONS.cloud2.width} height={ASSET_DIMENSIONS.cloud2.height} />
        </Animated.View>


        {/* Rockets removed entirely */}
      </View>

      <View style={mainMenuStyles.bearContainer} pointerEvents="none">
        <BearImage />
      </View>

      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <MoonImage />
      </View>

      <View style={[legacyStyles.topButtons, { paddingTop: insets.top + getResponsiveSize(20) }]}>
        {/* Account/Settings Button */}
        <View ref={settingsButtonRef} style={legacyStyles.accountButtonContainer}>
          <Pressable
            style={legacyStyles.accountButton}
            onPress={() => parentsOnly.showChallenge(() => guardedOnNavigate('account'))}
          >
            <View style={[
              legacyStyles.accountIconBackground,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                width: scaledButtonSize(48),
                height: scaledButtonSize(48),
                borderRadius: scaledButtonSize(48) / 2,
              }
            ]}>
              <Ionicons name="person-outline" size={scaledButtonSize(24)} color="white" />
            </View>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        {/* Music Control */}
        <View ref={musicControlRef} style={legacyStyles.musicControlContainer}>
          <MusicControl size={24} color="#FFFFFF" />
        </View>
      </View>


      <View style={legacyStyles.menuContainer}>
        {/* Menu carousel (fades out when mode cards shown) */}
        <Animated.View style={[{ width: '100%', alignItems: 'center' }, carouselFadeStyle]} pointerEvents={showModeCards ? 'none' : 'auto'}>
          <MenuCarousel
            onNavigate={guardedOnNavigate}
            buttonRefs={carouselButtonRefs}
            onLoadComplete={handleCarouselLoadComplete}
            entranceDelay={entranceDelay}
          />
        </Animated.View>

        {/* Story mode cards -always mounted so images stay decoded in cache;
             visibility controlled purely by the animated opacity + translateY. */}
        <Animated.View
          style={[legacyStyles.modeCardsOverlay, modeCardsFadeStyle]}
          pointerEvents={showModeCards ? 'auto' : 'none'}
        >
          {STORY_MODES.map((mode) => {
            const modeImage = MODE_CARD_IMAGES[mode.id as keyof typeof MODE_CARD_IMAGES];
            return (
              <Pressable
                key={mode.id}
                onPress={() => handleModeCardSelect(mode.id)}
                testID={`main-mode-card-${mode.id}`}
                style={({ pressed }) => [
                  legacyStyles.modeStrip,
                  { width: modeStripW, height: modeStripH, borderRadius: modeStripH * 0.2 },
                  pressed && legacyStyles.modeStripPressed,
                ]}
              >
                <Image
                  source={modeImage}
                  style={[legacyStyles.modeStripImage, { borderRadius: modeStripH * 0.2 }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={`mode-${mode.id}`}
                />
                <View style={legacyStyles.modeStripTextOverlay}>
                  <Text style={[legacyStyles.modeStripLabel, { fontSize: scaledFontSize(32) }]}>
                    {t(mode.labelKey)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {/* Plain back arrow below the buttons */}
          <Pressable style={legacyStyles.modeBackArrow} onPress={handleHideModeCards} testID="mode-back-arrow">
            <Ionicons name="arrow-back" size={scaledButtonSize(44)} color="#FFFFFF" style={{ textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }} />
          </Pressable>
        </Animated.View>
      </View>

      {/* Unlock a Plan tab -fixed to very bottom (hidden for premium subscribers) */}
      {!isPremium && (
        <View style={[legacyStyles.unlockBtnContainer, { bottom: 0 }]}>
          <Animated.View style={unlockBtnAnimStyle}>
            <Pressable onPress={() => setShowSubscription(true)} style={legacyStyles.unlockBtn}>
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={legacyStyles.unlockBtnGradient}
              >
                <Text style={[legacyStyles.unlockBtnText, { fontSize: scaledFontSize(15) }]}>Unlock a Plan</Text>
                {/* Shimmer overlay */}
                <Animated.View style={[legacyStyles.unlockShimmer, unlockShimmerStyle]} />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Subscription Overlay */}
      <SubscriptionOverlay
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
      />

      {/* Parents Only Challenge Modal */}
      <ParentsOnlyModal
        visible={parentsOnly.isVisible}
        challenge={parentsOnly.challenge}
        inputValue={parentsOnly.inputValue}
        onInputChange={parentsOnly.setInputValue}
        onSubmit={parentsOnly.handleSubmit}
        onClose={parentsOnly.handleClose}
        isInputValid={parentsOnly.isInputValid}
        scaledFontSize={scaledFontSize}
      />

        {/* Main Menu Tutorial - shown after carousel slide-in completes, not during login transition */}
        {!disableTutorial && carouselReady && (
          <TutorialOverlay
            tutorialId="main_menu_tour"
            targetRefs={tutorialTargetRefs}
            onEnd={handleTutorialEnd}
          />
        )}

        {/* Story Modes Tutorial - explains Interactive, Musical & Jigsaw on first view */}
        {!disableTutorial && (
          <StoryModeTipsOverlay isActive={showModeCards} />
        )}
      </LinearGradient>
    </Animated.View>
  );
}

// Helper function to get responsive size for iPad (20% bigger)
const getResponsiveSize = (baseSize: number): number => {
  const { width: screenWidth } = getScreenDimensions();
  const isTablet = screenWidth >= 768;
  return isTablet ? Math.round(baseSize * 1.2) : baseSize;
};

const legacyStyles = StyleSheet.create({
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(20),
    zIndex: LAYOUT.Z_INDEX.UI + 1,
  },
  musicControlContainer: {
    marginRight: getResponsiveSize(12),
  },
  accountButtonContainer: {
    marginLeft: getResponsiveSize(12),
  },
  accountButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: getResponsiveSize(14),
    borderRadius: getResponsiveSize(22),
    borderWidth: 2,
    borderColor: 'rgba(46, 139, 139, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: getResponsiveSize(6),
    elevation: 6,
  },
  menuContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden' as const,
    zIndex: LAYOUT.Z_INDEX.UI,
  },
  unlockBtnContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.UI + 2,
  },
  unlockBtn: {
    borderTopLeftRadius: getResponsiveSize(18),
    borderTopRightRadius: getResponsiveSize(18),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden' as const,
  },
  unlockBtnGradient: {
    paddingHorizontal: getResponsiveSize(36),
    paddingVertical: getResponsiveSize(14),
    borderTopLeftRadius: getResponsiveSize(18),
    borderTopRightRadius: getResponsiveSize(18),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  unlockBtnText: {
    color: '#fff',
    fontWeight: '800' as const,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  unlockShimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,1)',
    borderTopLeftRadius: getResponsiveSize(18),
    borderTopRightRadius: getResponsiveSize(18),
  },
  // Story mode cards (strip-button style, same art as carousel)
  modeCardsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  modeStrip: {
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  modeStripPressed: {
    opacity: 0.85,
  },
  modeStripImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%' as const,
    height: '100%' as const,
  },
  modeStripTextOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modeStripLabel: {
    color: '#FFFFFF',
    fontWeight: '900' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1.5,
  },
  modeBackArrow: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'center' as const,
  },
});



// Wrap with error boundary for crash protection
const MainMenuWithErrorBoundary = React.memo(function MainMenuWithErrorBoundary(props: MainMenuProps) {
  // Temporarily disable error boundary for debugging in tests
  if (process.env.NODE_ENV === 'test') {
    return <MainMenuComponent {...props} />;
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('MainMenu crashed:', error, errorInfo);
        // In production, send to crash reporting service
      }}
    >
      <MainMenuComponent {...props} />
    </ErrorBoundary>
  );
});

export const MainMenu = MainMenuWithErrorBoundary;
