import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { DefaultPage } from './default-page';
import { ErrorBoundary } from './error-boundary';
import {
  useDebounce,
  useThrottle,
  useSafeAnimation,
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

  // Safe state management to prevent updates on unmounted components
  const [selectedIcon, setSelectedIcon] = useSafeState('stories-icon');
  const [menuItems, setMenuItems] = useSafeState(DEFAULT_MENU_ITEMS);
  const [triggerSelectionAnimation, setTriggerSelectionAnimation] = useSafeState(false);

  // Animation values with cleanup
  const starRotation = useSharedValue(0);
  const balloonFloat1 = useSharedValue(-200);
  const balloonFloat2 = useSharedValue(-400);
  const rocketFloat1 = useSharedValue(SCREEN_WIDTH + 100);
  const rocketFloat2 = useSharedValue(-200);

  // Safe menu state management
  const [menuOrder, setMenuOrder] = useSafeState<MenuItemData[]>(menuItems);
  const [currentPage, setCurrentPage] = useSafeState<MenuItemData | null>(null);
  const [lastSwapTime, setLastSwapTime] = useSafeState<number>(0);
  const [newlySelectedItem, setNewlySelectedItem] = useSafeState<string | null>(null);

  // Performance optimizations
  const { startAnimation: startMenuAnimation, endAnimation: endMenuAnimation } = useSafeAnimation('menu-interaction');

  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all animations when component unmounts
      endMenuAnimation();

      // Reset animation values to prevent memory leaks
      starRotation.value = 0;
      balloonFloat1.value = -200;
      balloonFloat2.value = -400;
      rocketFloat1.value = SCREEN_WIDTH + 100;
      rocketFloat2.value = -200;

      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
      if (isDev) {
        console.log('MainMenu component unmounted - cleaned up animations');
      }
    };
  }, [endMenuAnimation, starRotation, balloonFloat1, balloonFloat2, rocketFloat1, rocketFloat2]);

  // Performance-optimized icon press handler with debouncing and error handling
  const handleIconPressInternal = useCallback((selectedItem: MenuItemData) => {
    const endTimer = performanceLogger.startTimer('icon-press');

    try {
      if (!startMenuAnimation()) {
        // Too many animations running, skip this interaction
        return;
      }

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
          // Clean up animations before navigation
          endMenuAnimation();
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

          // Clear animation trigger safely
          setTimeout(() => {
            setNewlySelectedItem(null);
            endMenuAnimation();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error in handleIconPress:', error);
      endMenuAnimation();
    } finally {
      endTimer();
    }
  }, [menuOrder, lastSwapTime, startMenuAnimation, endMenuAnimation, onNavigate]);

  // Debounced version to prevent rapid-fire calls
  const handleIconPress = useDebounce(handleIconPressInternal, 50);

  const handleBackToMenu = () => {
    setCurrentPage(null);
  };



  useEffect(() => {
    balloonFloat1.value = createCloudAnimation(balloonFloat1, 0, -200);
    balloonFloat2.value = createCloudAnimation(balloonFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400);
  }, [balloonFloat1, balloonFloat2]);

  useEffect(() => {
    rocketFloat1.value = createRocketAnimation(rocketFloat1, 'right-to-left', 0);
    rocketFloat2.value = createRocketAnimation(rocketFloat2, 'left-to-right',
      ANIMATION_TIMINGS.ROCKET_DURATION + ANIMATION_TIMINGS.ROCKET_WAIT_TIME);
  }, [rocketFloat1, rocketFloat2]);

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
