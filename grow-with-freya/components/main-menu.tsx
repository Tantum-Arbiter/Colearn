import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { useAppStore } from '@/store/app-store';
import { DefaultPage } from './default-page';
import { ErrorBoundary } from './error-boundary';
import {
  useMemoryMonitor,
  performanceLogger,
  useSafeState
} from './main-menu/performance-utils';

import {
  MenuIcon,
  Cloud1,
  Cloud2,
  FreyaRocket,
  FreyaRocketRight,
  BearImage,
  ANIMATION_TIMINGS,
  LAYOUT,
  VISUAL_EFFECTS,
  DEFAULT_MENU_ITEMS,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  ASSET_DIMENSIONS,
  createCloudAnimation,
  createRocketAnimation,
  generateStarPositions,
  swapArrayItems,
  findMenuItemIndex,
  debounce,
  mainMenuStyles,
} from './main-menu/index';
import type { MenuItemData, IconStatus } from './main-menu/index';

interface MainMenuProps {
  onNavigate: (destination: string) => void;
}

function MainMenuComponent({ onNavigate }: MainMenuProps) {
  const insets = useSafeAreaInsets();

  // Performance monitoring
  useMemoryMonitor('MainMenu');

  // Get persistent animation state from store
  const { backgroundAnimationState, updateBackgroundAnimationState } = useAppStore();

  // Safe state management to prevent updates on unmounted components
  const [selectedIcon, setSelectedIcon] = useSafeState('stories-icon');
  const [menuItems, setMenuItems] = useSafeState(DEFAULT_MENU_ITEMS);
  const [triggerSelectionAnimation, setTriggerSelectionAnimation] = useSafeState(false);

  // Animation values with cleanup - initialize from persistent state
  const starRotation = useSharedValue(0);
  const balloonFloat1 = useSharedValue(backgroundAnimationState.balloonFloat1);
  const balloonFloat2 = useSharedValue(backgroundAnimationState.balloonFloat2);
  const rocketFloat1 = useSharedValue(backgroundAnimationState.rocketFloat1);
  const rocketFloat2 = useSharedValue(backgroundAnimationState.rocketFloat2);

  // Animation cancellation flag
  const animationsCancelled = useRef(false);

  // Safe menu state management
  const [menuOrder, setMenuOrder] = useSafeState<MenuItemData[]>(menuItems);
  const [currentPage, setCurrentPage] = useSafeState<MenuItemData | null>(null);
  const [lastSwapTime, setLastSwapTime] = useSafeState<number>(0);
  const [newlySelectedItem, setNewlySelectedItem] = useSafeState<string | null>(null);

  // Removed useSafeAnimation - was blocking core functionality

  // Timeout cleanup ref
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      // Save current animation state before unmounting
      updateBackgroundAnimationState({
        balloonFloat1: balloonFloat1.value,
        balloonFloat2: balloonFloat2.value,
        rocketFloat1: rocketFloat1.value,
        rocketFloat2: rocketFloat2.value,
      });

      // Cancel all animations to prevent memory leaks
      animationsCancelled.current = true;
      // Removed cancelMenuAnimation - was blocking functionality

      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Animation limiter removed - no longer needed

      // Cancel all infinite background animations (safe for test environment)
      try {
        cancelAnimation(starRotation);
        cancelAnimation(balloonFloat1);
        cancelAnimation(balloonFloat2);
        cancelAnimation(rocketFloat1);
        cancelAnimation(rocketFloat2);
      } catch (error) {
        // cancelAnimation might not be available in test environment
        console.warn('Could not cancel background animations:', error);
      }

      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
      if (isDev) {
        console.log('MainMenu component unmounted - saved animation state and cleaned up');
      }
    };
  }, [updateBackgroundAnimationState]); // Removed useSharedValue objects from deps to prevent infinite re-renders

  // Performance-optimized icon press handler with debouncing and error handling
  const handleIconPressInternal = useCallback((selectedItem: MenuItemData) => {
    const endTimer = performanceLogger.startTimer('icon-press');

    try {
      // Removed startMenuAnimation check - was blocking core functionality

      const centerItem = menuOrder[0];
      const currentTime = Date.now();

      // Remove debug logging in production
      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
      if (isDev) {
        console.log('Icon press:', selectedItem.label);
      }

      if (selectedItem.destination === centerItem.destination) {
        // For stories, use external navigation to prevent state conflicts
        if (selectedItem.destination === 'stories') {
          // Navigate directly - removed animation cleanup that was blocking
          onNavigate(selectedItem.destination);
        } else {
          // For other pages, use internal navigation
          setCurrentPage(selectedItem);
        }
      } else {
        // Prevent rapid swapping that could cause crashes
        if (currentTime - lastSwapTime < 100) {
          return; // Ignore rapid taps
        }

        const clickedIndex = menuOrder.findIndex(item => item.destination === selectedItem.destination);

        if (clickedIndex > 0) {
          setLastSwapTime(currentTime);

          // Perform swap with error boundary
          const newOrder = [...menuOrder];
          [newOrder[0], newOrder[clickedIndex]] = [newOrder[clickedIndex], newOrder[0]];

          setMenuOrder(newOrder);
          setNewlySelectedItem(selectedItem.destination);

          // Clear animation trigger safely (with cleanup)
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
      // Removed endMenuAnimation - was blocking functionality
    } finally {
      endTimer();
    }
  }, [menuOrder, lastSwapTime, onNavigate]);

  // Direct call - no debouncing to ensure pages open immediately
  const handleIconPress = handleIconPressInternal;

  const handleBackToMenu = () => {
    setCurrentPage(null);
  };



  // Start background animations on mount - always resume from persistent state
  useEffect(() => {
    if (!animationsCancelled.current) {
      // Always resume from persistent state (works for both fresh start and returning from Stories)
      balloonFloat1.value = createCloudAnimation(balloonFloat1, 0, -200, true); // Resume from current
      balloonFloat2.value = createCloudAnimation(balloonFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, true); // Resume from current

      // Check if rockets are at initial positions (fresh start) or mid-animation (resume)
      const rocket1AtStart = Math.abs(rocketFloat1.value - (SCREEN_WIDTH + 100)) < 50; // Within 50px of start
      const rocket2AtStart = Math.abs(rocketFloat2.value - (-200)) < 50; // Within 50px of start

      if (rocket1AtStart && rocket2AtStart) {
        // Fresh start - use original staggered timing
        rocketFloat1.value = createRocketAnimation(rocketFloat1, 'right-to-left', 0, false); // Start fresh
        rocketFloat2.value = createRocketAnimation(rocketFloat2, 'left-to-right',
          ANIMATION_TIMINGS.ROCKET_DURATION + ANIMATION_TIMINGS.ROCKET_WAIT_TIME, false); // Start fresh with delay
      } else {
        // Resume from current positions
        rocketFloat1.value = createRocketAnimation(rocketFloat1, 'right-to-left', 0, true); // Resume from current
        rocketFloat2.value = createRocketAnimation(rocketFloat2, 'left-to-right',
          ANIMATION_TIMINGS.ROCKET_DURATION + ANIMATION_TIMINGS.ROCKET_WAIT_TIME, true); // Resume from current
      }
    }
  }, []); // Run once on mount

  // Pause/Resume background animations for internal pages (Sensory, etc.)
  useEffect(() => {
    if (!animationsCancelled.current) {
      if (currentPage !== null) {
        // Save current positions before pausing
        updateBackgroundAnimationState({
          balloonFloat1: balloonFloat1.value,
          balloonFloat2: balloonFloat2.value,
          rocketFloat1: rocketFloat1.value,
          rocketFloat2: rocketFloat2.value,
        });

        // Pause animations when navigating to internal pages by cancelling them
        try {
          cancelAnimation(balloonFloat1);
          cancelAnimation(balloonFloat2);
          cancelAnimation(rocketFloat1);
          cancelAnimation(rocketFloat2);
        } catch (error) {
          console.warn('Could not pause background animations:', error);
        }
      } else {
        // Resume animations when returning from internal pages - get fresh state
        const currentState = useAppStore.getState().backgroundAnimationState;
        balloonFloat1.value = createCloudAnimation(balloonFloat1, 0, currentState.balloonFloat1, true);
        balloonFloat2.value = createCloudAnimation(balloonFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, currentState.balloonFloat2, true);
        rocketFloat1.value = createRocketAnimation(rocketFloat1, 'right-to-left', 0, true);
        rocketFloat2.value = createRocketAnimation(rocketFloat2, 'left-to-right', ANIMATION_TIMINGS.ROCKET_DURATION + ANIMATION_TIMINGS.ROCKET_WAIT_TIME, true);
      }
    }
  }, [currentPage, updateBackgroundAnimationState]); // Pause/Resume when navigating to/from internal pages

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const balloonAnimatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: balloonFloat1.value }],
  }));

  const balloonAnimatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: balloonFloat2.value }],
  }));

  const rocketAnimatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: rocketFloat1.value }],
  }));

  const rocketAnimatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: rocketFloat2.value }],
  }));

  if (currentPage) {
    return (
      <DefaultPage
        icon={currentPage.icon}
        title={currentPage.label}
        onBack={handleBackToMenu}
      />
    );
  }

  const stars = generateStarPositions();

  return (
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

        <Animated.View style={[mainMenuStyles.balloonContainer, balloonAnimatedStyle1, {
          top: SCREEN_HEIGHT * LAYOUT.CLOUD_TOP_POSITION_1,
          zIndex: LAYOUT.Z_INDEX.CLOUDS_BEHIND
        }]}>
          <Cloud1 width={ASSET_DIMENSIONS.cloud1.width} height={ASSET_DIMENSIONS.cloud1.height} />
        </Animated.View>
        <Animated.View style={[mainMenuStyles.balloonContainerFront, balloonAnimatedStyle2, {
          top: SCREEN_HEIGHT * LAYOUT.CLOUD_TOP_POSITION_2,
          zIndex: LAYOUT.Z_INDEX.CLOUDS_FRONT
        }]}>
          <Cloud2 width={ASSET_DIMENSIONS.cloud2.width} height={ASSET_DIMENSIONS.cloud2.height} />
        </Animated.View>


        <Animated.View style={[mainMenuStyles.rocketContainer, rocketAnimatedStyle1, {
          top: SCREEN_HEIGHT * LAYOUT.ROCKET_TOP_POSITION,
          zIndex: LAYOUT.Z_INDEX.ROCKETS
        }]}>
          <FreyaRocket width={ASSET_DIMENSIONS.rocket.width} height={ASSET_DIMENSIONS.rocket.height} />
        </Animated.View>

        <Animated.View style={[mainMenuStyles.rocketContainer, rocketAnimatedStyle2, {
          top: SCREEN_HEIGHT * LAYOUT.ROCKET_RIGHT_TOP_POSITION,
          zIndex: LAYOUT.Z_INDEX.ROCKETS
        }]}>
          <FreyaRocketRight width={ASSET_DIMENSIONS.rocket.width} height={ASSET_DIMENSIONS.rocket.height} />
        </Animated.View>
      </View>

      <View style={mainMenuStyles.bearContainer} pointerEvents="none">
        <BearImage />
      </View>


      <View style={[legacyStyles.topButtons, { paddingTop: insets.top + 20 }]}>
        <View style={{ flex: 1 }} />

        <Pressable
          style={legacyStyles.settingsButton}
          onPress={() => setCurrentPage({ icon: 'gear', label: 'Settings', destination: 'settings' })}
        >
          <ThemedText style={mainMenuStyles.settingsEmoji}>⚙️</ThemedText>
        </Pressable>
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
            testID="menu-icon-0"
          />
        </View>

        <View style={mainMenuStyles.menuContainer}>

          <View style={mainMenuStyles.topRow}>
            <MenuIcon
              key={`top-left-${menuOrder[1].destination}`}
              icon={menuOrder[1].icon}
              label={menuOrder[1].label}
              status="inactive"
              onPress={() => handleIconPress(menuOrder[1])}
              testID="menu-icon-1"
            />
            <MenuIcon
              key={`top-right-${menuOrder[2].destination}`}
              icon={menuOrder[2].icon}
              label={menuOrder[2].label}
              status="inactive"
              onPress={() => handleIconPress(menuOrder[2])}
              testID="menu-icon-2"
            />
          </View>

          {/* Bottom row */}
          <View style={mainMenuStyles.bottomRow}>
            <MenuIcon
              key={`bottom-left-${menuOrder[3].destination}`}
              icon={menuOrder[3].icon}
              label={menuOrder[3].label}
              status="inactive"
              onPress={() => handleIconPress(menuOrder[3])}
              testID="menu-icon-3"
            />
            <MenuIcon
              key={`bottom-right-${menuOrder[4].destination}`}
              icon={menuOrder[4].icon}
              label={menuOrder[4].label}
              status="inactive"
              onPress={() => handleIconPress(menuOrder[4])}
              testID="menu-icon-4"
            />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const legacyStyles = StyleSheet.create({
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 14,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(46, 139, 139, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});

// Wrap with error boundary for crash protection
const MainMenuWithErrorBoundary = React.memo(function MainMenuWithErrorBoundary(props: MainMenuProps) {
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
