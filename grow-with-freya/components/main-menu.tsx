import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  cancelAnimation,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/app-store';
import { MusicControl } from '@/components/ui/music-control';
import { ParentsOnlyModal } from '@/components/ui/parents-only-modal';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useParentsOnlyChallenge } from '@/hooks/use-parents-only-challenge';
import { TutorialOverlay } from '@/components/tutorial';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';

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

interface MainMenuProps {
  onNavigate: (destination: string) => void;
  isActive?: boolean; // Kept for API compatibility with EnhancedPageTransition
  disableTutorial?: boolean; // When true, don't show the tutorial (used during login transition)
}

function MainMenuComponent({ onNavigate, disableTutorial = false }: MainMenuProps) {
  const insets = useSafeAreaInsets();
  const { scaledButtonSize, scaledFontSize } = useAccessibility();

  // Subscription overlay state
  const [showSubscription, setShowSubscription] = useState(false);

  // Unlock button animations — gentle pulse + shimmer
  const unlockPulse = useSharedValue(1);
  const unlockShimmer = useSharedValue(0);

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
    transform: [{ scale: unlockPulse.value }],
  }));

  const unlockShimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(unlockShimmer.value, [0, 0.3, 0.5, 0.7, 1], [0, 0, 0.35, 0, 0]),
  }));

  // Track when the menu carousel slide-in animation has finished
  const [carouselReady, setCarouselReady] = useState(false);
  const handleCarouselLoadComplete = useCallback(() => {
    setCarouselReady(true);
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
  const containerOpacity = useSharedValue(0); // For fade-in from splash screen

  // Fade in the container on mount (smooth transition from splash)
  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 500, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });
  }, [containerOpacity]);

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
            onPress={() => parentsOnly.showChallenge(() => onNavigate('account'))}
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
        <MenuCarousel
          onNavigate={onNavigate}
          buttonRefs={carouselButtonRefs}
          onLoadComplete={handleCarouselLoadComplete}
        />
      </View>

      {/* Unlock a Plan tab — fixed to very bottom */}
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
          />
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
