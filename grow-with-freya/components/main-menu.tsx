import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  BearImage,
  ANIMATION_TIMINGS,
  LAYOUT,
  VISUAL_EFFECTS,
  DEFAULT_MENU_ITEMS,
  SCREEN_HEIGHT,
  ASSET_DIMENSIONS,
  createCloudAnimation,

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
  const cloudFloat1 = useSharedValue(backgroundAnimationState.cloudFloat1);
  const cloudFloat2 = useSharedValue(backgroundAnimationState.cloudFloat2);


  // Animation cancellation flag
  const animationsCancelled = useRef(false);

  // Safe menu state management
  const [menuOrder, setMenuOrder] = useSafeState<MenuItemData[]>(menuItems);
  const [currentPage, setCurrentPage] = useSafeState<MenuItemData | null>(null);
  const [lastSwapTime, setLastSwapTime] = useSafeState<number>(0);
  const [newlySelectedItem, setNewlySelectedItem] = useSafeState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationWatchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      // Save current animation state before unmounting
      updateBackgroundAnimationState({
        cloudFloat1: cloudFloat1.value,
        cloudFloat2: cloudFloat2.value,
        rocketFloat1: 1000, // Static value - rockets removed
        rocketFloat2: -200, // Static value - rockets removed
      });

      // Cancel all animations to prevent memory leaks
      animationsCancelled.current = true;
      // Removed cancelMenuAnimation - was blocking functionality

      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationWatchdogRef.current) {
        clearTimeout(animationWatchdogRef.current);
      }

      // Animation limiter removed - no longer needed

      // Cancel all infinite background animations (safe for test environment)
      try {
        cancelAnimation(starRotation);
        cancelAnimation(cloudFloat1);
        cancelAnimation(cloudFloat2);
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
          onNavigate(selectedItem.destination);
        } else {
          setCurrentPage(selectedItem);
        }
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
  }, [menuOrder, lastSwapTime, onNavigate]);

  const handleIconPress = handleIconPressInternal;

  const handleBackToMenu = () => {
    setCurrentPage(null);
  };


  useEffect(() => {
    // Small delay to ensure component is fully mounted before starting animations
    const startAnimations = () => {
      if (!animationsCancelled.current) {
        const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

        if (isDev) {
          console.log('MainMenu: Starting animations resume');
          console.log('Cloud1 current position:', cloudFloat1.value);
          console.log('Cloud2 current position:', cloudFloat2.value);
        }

        const cloud1Pos = cloudFloat1.value;
        const cloud2Pos = cloudFloat2.value;

        // Check if positions are valid for resuming
        const cloud1CanResume = isFinite(cloud1Pos) && !isNaN(cloud1Pos) && cloud1Pos > -500 && cloud1Pos < 2000;
        const cloud2CanResume = isFinite(cloud2Pos) && !isNaN(cloud2Pos) && cloud2Pos > -500 && cloud2Pos < 2000;

        if (isDev) {
          console.log('Resume check - Cloud1:', cloud1CanResume, 'Cloud2:', cloud2CanResume);
        }

        cloudFloat1.value = createCloudAnimation(cloudFloat1, 0, -200, cloud1CanResume);
        cloudFloat2.value = createCloudAnimation(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, cloud2CanResume);

        // Rockets removed entirely

        // Set up animation watchdog to detect stuck animations
        if (animationWatchdogRef.current) {
          clearTimeout(animationWatchdogRef.current);
        }

        animationWatchdogRef.current = setTimeout(() => {
          const cloud1Pos = cloudFloat1.value;
          const cloud2Pos = cloudFloat2.value;

          if (isDev) {
            console.log('Animation watchdog check - Cloud1:', cloud1Pos, 'Cloud2:', cloud2Pos);
          }

          // If either cloud hasn't moved significantly, restart animations
          const cloud1Stuck = !isFinite(cloud1Pos) || isNaN(cloud1Pos);
          const cloud2Stuck = !isFinite(cloud2Pos) || isNaN(cloud2Pos);

          if (cloud1Stuck || cloud2Stuck) {
            if (isDev) {
              console.log('Detected stuck animations, restarting...');
            }
            // Force restart with fresh positions
            cloudFloat1.value = createCloudAnimation(cloudFloat1, 0, -200, false);
            cloudFloat2.value = createCloudAnimation(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, false);
          }
        }, 10000); // Check after 10 seconds
      }
    };

    // Start animations immediately, but allow for component mounting
    const timeoutId = setTimeout(startAnimations, 50);

    return () => {
      clearTimeout(timeoutId);
      if (animationWatchdogRef.current) {
        clearTimeout(animationWatchdogRef.current);
      }
    };
  }, []); // Run once on mount



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

  // Generate star positions only once and keep them consistent
  // IMPORTANT: This must be called before any conditional returns to follow Rules of Hooks
  const stars = useMemo(() => generateStarPositions(), []);

  if (currentPage) {
    return (
      <DefaultPage
        icon={currentPage.icon}
        title={currentPage.label}
        onBack={handleBackToMenu}
      />
    );
  }

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

        <Animated.View style={[mainMenuStyles.cloudContainer, cloudAnimatedStyle1, {
          top: SCREEN_HEIGHT * LAYOUT.CLOUD_TOP_POSITION_1,
          zIndex: LAYOUT.Z_INDEX.CLOUDS_BEHIND
        }]}>
          <Cloud1 width={ASSET_DIMENSIONS.cloud1.width} height={ASSET_DIMENSIONS.cloud1.height} />
        </Animated.View>
        <Animated.View style={[mainMenuStyles.cloudContainerFront, cloudAnimatedStyle2, {
          top: SCREEN_HEIGHT * LAYOUT.CLOUD_TOP_POSITION_2,
          zIndex: LAYOUT.Z_INDEX.CLOUDS_FRONT
        }]}>
          <Cloud2 width={ASSET_DIMENSIONS.cloud2.width} height={ASSET_DIMENSIONS.cloud2.height} />
        </Animated.View>


        {/* Rockets removed entirely */}
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
