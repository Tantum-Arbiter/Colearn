import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Pressable, StyleSheet, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  cancelAnimation,
  withTiming,
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
import { useTutorial } from '@/contexts/tutorial-context';

import { ErrorBoundary } from './error-boundary';
import {
  performanceLogger,
  useSafeState,
  animationLimiter
} from './main-menu/performance-utils';

import {
  MenuIcon,
  Cloud1,
  Cloud2,

  BearImage,
  MoonImage,
  ANIMATION_TIMINGS,
  LAYOUT,
  VISUAL_EFFECTS,
  DEFAULT_MENU_ITEMS,
  getScreenDimensions,
  ASSET_DIMENSIONS,

  generateStarPositions,
  mainMenuStyles,
} from './main-menu/index';

import { createCloudAnimationNew } from './main-menu/cloud-animations';
import type { MenuItemData } from './main-menu/index';

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



  // Parents Only modal - using shared hook
  const parentsOnly = useParentsOnlyChallenge();

  // Get current screen dimensions (updates with orientation changes)
  const { height: screenHeight } = getScreenDimensions();

  // Get persistent animation state from store - using selectors to prevent unnecessary re-renders
  const backgroundAnimationState = useAppStore((state) => state.backgroundAnimationState);
  const updateBackgroundAnimationState = useAppStore((state) => state.updateBackgroundAnimationState);

  // Safe state management to prevent updates on unmounted components
  const [menuItems] = useSafeState(DEFAULT_MENU_ITEMS);

  // Animation values with cleanup - always start clouds from off-screen positions
  const starRotation = useSharedValue(0);
  const cloudFloat1 = useSharedValue(LAYOUT.OFF_SCREEN_LEFT as number); // Always start from off-screen left (-200)
  const cloudFloat2 = useSharedValue(-400 as number); // Always start from off-screen left (-400)
  const containerOpacity = useSharedValue(0); // For fade-in from splash screen

  // Fade in the container on mount (smooth transition from splash)
  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 500, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });
  }, [containerOpacity]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  // Debug logging for position restoration
  useEffect(() => {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('MainMenu mounted - restoring cloud positions:', {
        cloud1: backgroundAnimationState?.cloudFloat1 || -200,
        cloud2: backgroundAnimationState?.cloudFloat2 || -400,
        hasPersistedState: !!backgroundAnimationState
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Animation cancellation flag
  const animationsCancelled = useRef(false);

  // Safe menu state management
  const [menuOrder, setMenuOrder] = useSafeState<MenuItemData[]>(menuItems);
  const [lastSwapTime, setLastSwapTime] = useSafeState<number>(0);
  const [newlySelectedItem, setNewlySelectedItem] = useSafeState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tutorial target refs - using refs that get populated when buttons render
  const storiesButtonRef = useRef<View>(null);
  const emotionsButtonRef = useRef<View>(null);
  const bedtimeButtonRef = useRef<View>(null);
  const musicControlRef = useRef<View>(null);
  const settingsButtonRef = useRef<View>(null);

  // Helper to get the correct ref for a menu item destination
  const getRefForDestination = (destination: string): React.RefObject<View | null> | undefined => {
    switch (destination) {
      case 'stories': return storiesButtonRef;
      case 'emotions': return emotionsButtonRef;
      case 'bedtime': return bedtimeButtonRef;
      default: return undefined;
    }
  };

  // Build tutorial target refs map - maps step IDs to refs
  const tutorialTargetRefs = useMemo(() => ({
    'stories_button': storiesButtonRef,
    'emotions_button': emotionsButtonRef,
    'bedtime_button': bedtimeButtonRef,
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

  // Performance-optimized icon press handler with debouncing and error handling
  const handleIconPressInternal = useCallback((selectedItem: MenuItemData) => {
    const endTimer = performanceLogger.startTimer('icon-press');

    try {
      const centerItem = menuOrder[0];
      const currentTime = Date.now();

      if (selectedItem.destination === centerItem.destination) {
        // Use external navigation for all center items to get scroll transition
        onNavigate(selectedItem.destination);
      } else {
        if (currentTime - lastSwapTime < 100) {
          return; // Ignore rapid taps
        }

        const clickedIndex = menuOrder.findIndex(item => item.destination === selectedItem.destination);

        if (clickedIndex > 0) {
          setLastSwapTime(currentTime);

          const newOrder = [...menuOrder];
          [newOrder[0], newOrder[clickedIndex]] = [newOrder[clickedIndex], newOrder[0]];

          setMenuOrder(newOrder);
          setNewlySelectedItem(selectedItem.destination);

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            setNewlySelectedItem(null);
            // Removed endMenuAnimation - was blocking functionality
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error in handleIconPress:', error);
    } finally {
      endTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOrder, lastSwapTime, onNavigate]);

  const handleIconPress = handleIconPressInternal;




  // Start cloud animations once on mount - they run continuously
  // PERFORMANCE: Use InteractionManager to defer animations until after scroll transitions complete
  useEffect(() => {
    // Defer cloud animation startup to prevent jitter during page transitions
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      // Check if we can resume from persisted state
      const cloud1CanResume = backgroundAnimationState?.cloudFloat1 !== undefined &&
                              isFinite(backgroundAnimationState.cloudFloat1) &&
                              !isNaN(backgroundAnimationState.cloudFloat1);
      const cloud2CanResume = backgroundAnimationState?.cloudFloat2 !== undefined &&
                              isFinite(backgroundAnimationState.cloudFloat2) &&
                              !isNaN(backgroundAnimationState.cloudFloat2);

      // If we can resume, set the cloud to the persisted position first
      if (cloud1CanResume) {
        cloudFloat1.value = backgroundAnimationState.cloudFloat1;
      }
      if (cloud2CanResume) {
        cloudFloat2.value = backgroundAnimationState.cloudFloat2;
      }

      // Start cloud animations - they will run continuously
      cloudFloat1.value = createCloudAnimationNew(cloudFloat1, 0, -200, cloud1CanResume);
      cloudFloat2.value = createCloudAnimationNew(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, cloud2CanResume);
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
        <View style={mainMenuStyles.centerIcon}>
          <MenuIcon
            key={`center-${menuOrder[0].destination}`}
            icon={menuOrder[0].icon}
            label={menuOrder[0].label}
            status="animated_interactive"
            onPress={() => handleIconPress(menuOrder[0])}
            isLarge={true}
            triggerSelectionAnimation={newlySelectedItem === menuOrder[0].destination}
            testID={`menu-icon-${menuOrder[0].destination}`}
            iconRef={getRefForDestination(menuOrder[0].destination)}
          />
        </View>

        <View style={mainMenuStyles.menuContainer}>

          <View style={mainMenuStyles.topRow}>
            {menuOrder[1] && (
              <MenuIcon
                key={`top-left-${menuOrder[1].destination}`}
                icon={menuOrder[1].icon}
                label={menuOrder[1].label}
                status="inactive"
                onPress={() => handleIconPress(menuOrder[1])}
                testID={`menu-icon-${menuOrder[1].destination}`}
                iconRef={getRefForDestination(menuOrder[1].destination)}
              />
            )}
            {menuOrder[2] && (
              <MenuIcon
                key={`top-right-${menuOrder[2].destination}`}
                icon={menuOrder[2].icon}
                label={menuOrder[2].label}
                status="inactive"
                onPress={() => handleIconPress(menuOrder[2])}
                testID={`menu-icon-${menuOrder[2].destination}`}
                iconRef={getRefForDestination(menuOrder[2].destination)}
              />
            )}
          </View>

          {/* Bottom row - only show if we have more than 3 items */}
          {menuOrder.length > 3 && (
            <View style={mainMenuStyles.bottomRow}>
              {menuOrder[3] && (
                <MenuIcon
                  key={`bottom-left-${menuOrder[3].destination}`}
                  icon={menuOrder[3].icon}
                  label={menuOrder[3].label}
                  status="inactive"
                  onPress={() => handleIconPress(menuOrder[3])}
                  testID={`menu-icon-${menuOrder[3].destination}`}
                />
              )}
              {menuOrder[4] && (
                <MenuIcon
                  key={`bottom-right-${menuOrder[4].destination}`}
                  icon={menuOrder[4].icon}
                  label={menuOrder[4].label}
                  status="inactive"
                  onPress={() => handleIconPress(menuOrder[4])}
                  testID={`menu-icon-${menuOrder[4].destination}`}
                />
              )}
            </View>
          )}
        </View>
      </View>

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

        {/* Main Menu Tutorial - shown on first login, but not during login transition */}
        {!disableTutorial && (
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(20),
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
