import React, { useEffect, useCallback, useRef, useMemo } from 'react';
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
import { MusicControl } from './ui/music-control';
import { Ionicons } from '@expo/vector-icons';

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
  swapArrayItems,
  findMenuItemIndex,
  debounce,
  mainMenuStyles,
} from './main-menu/index';

import { createCloudAnimationNew } from './main-menu/cloud-animations';
import type { MenuItemData, IconStatus } from './main-menu/index';

interface MainMenuProps {
  onNavigate: (destination: string) => void;
  isActive?: boolean; // Add isActive prop to control animations
}

function MainMenuComponent({ onNavigate, isActive = true }: MainMenuProps) {
  const insets = useSafeAreaInsets();

  // Get current screen dimensions (updates with orientation changes)
  const { width: screenWidth, height: screenHeight } = getScreenDimensions();

  // Get persistent animation state from store
  const { backgroundAnimationState, updateBackgroundAnimationState } = useAppStore();

  // Safe state management to prevent updates on unmounted components
  const [selectedIcon, setSelectedIcon] = useSafeState('stories-icon');
  const [menuItems, setMenuItems] = useSafeState(DEFAULT_MENU_ITEMS);
  const [triggerSelectionAnimation, setTriggerSelectionAnimation] = useSafeState(false);

  // Animation values with cleanup - always start clouds from off-screen positions
  const starRotation = useSharedValue(0);
  const cloudFloat1 = useSharedValue(LAYOUT.OFF_SCREEN_LEFT as number); // Always start from off-screen left (-200)
  const cloudFloat2 = useSharedValue(-400 as number); // Always start from off-screen left (-400)

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
  }, []);


  // Animation cancellation flag
  const animationsCancelled = useRef(false);

  // Safe menu state management
  const [menuOrder, setMenuOrder] = useSafeState<MenuItemData[]>(menuItems);
  const [lastSwapTime, setLastSwapTime] = useSafeState<number>(0);
  const [newlySelectedItem, setNewlySelectedItem] = useSafeState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRestartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      // PERFORMANCE CRITICAL: Cancel all animations immediately to prevent memory leaks
      animationsCancelled.current = true;

      // Clear all timeouts to prevent memory leaks - CRITICAL for performance
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (animationWatchdogRef.current) {
        clearTimeout(animationWatchdogRef.current);
        animationWatchdogRef.current = null;
      }
      if (animationRestartRef.current) {
        clearTimeout(animationRestartRef.current);
        animationRestartRef.current = null;
      }
      if (periodicSaveRef.current) {
        clearTimeout(periodicSaveRef.current);
        periodicSaveRef.current = null;
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

          const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
          if (isDev) {
            console.log('MainMenu unmounted - saved cloud positions:', {
              cloud1: currentCloud1,
              cloud2: currentCloud2
            });
          }
        }
      } catch (error) {
        console.warn('Failed to save animation state on unmount:', error);
      }

      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
      if (isDev) {
        console.log('MainMenu component unmounted - cleaned up animations and timers');
      }
    };
  }, []); // PERFORMANCE: Empty dependency array to prevent re-renders

  // Pause/resume animations based on isActive state
  useEffect(() => {
    if (!isActive) {
      // Pause animations when not active
      animationsCancelled.current = true;

      // Clear all timers
      if (animationWatchdogRef.current) {
        clearTimeout(animationWatchdogRef.current);
        animationWatchdogRef.current = null;
      }
      if (animationRestartRef.current) {
        clearTimeout(animationRestartRef.current);
        animationRestartRef.current = null;
      }
      if (periodicSaveRef.current) {
        clearTimeout(periodicSaveRef.current);
        periodicSaveRef.current = null;
      }

      // Cancel animations
      try {
        cancelAnimation(cloudFloat1);
        cancelAnimation(cloudFloat2);
        cancelAnimation(starRotation);
      } catch (error) {
        console.warn('Could not cancel animations when pausing:', error);
      }

      // Save current positions
      try {
        const currentCloud1 = cloudFloat1.value;
        const currentCloud2 = cloudFloat2.value;

        if (isFinite(currentCloud1) && isFinite(currentCloud2)) {
          updateBackgroundAnimationState({
            cloudFloat1: currentCloud1,
            cloudFloat2: currentCloud2,
            rocketFloat1: backgroundAnimationState?.rocketFloat1 || 0,
            rocketFloat2: backgroundAnimationState?.rocketFloat2 || 0,
          });
        }
      } catch (error) {
        console.warn('Failed to save animation state when pausing:', error);
      }
    } else {
      // Resume animations when becoming active
      animationsCancelled.current = false;

      // Restart animations after a short delay
      setTimeout(() => {
        if (isActive && !animationsCancelled.current) {
          // Restart cloud animations
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

          cloudFloat1.value = createCloudAnimationNew(cloudFloat1, 0, -200, cloud1CanResume);
          cloudFloat2.value = createCloudAnimationNew(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, cloud2CanResume);
        }
      }, 100);
    }
  }, [isActive]);

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
  }, [menuOrder, lastSwapTime, onNavigate]);

  const handleIconPress = handleIconPressInternal;




  useEffect(() => {
    // PERFORMANCE OPTIMIZED: Reduced animation initialization overhead
    const startAnimations = () => {
      if (!animationsCancelled.current && isActive) {
        // Check if we can resume from persisted state
        const cloud1CanResume = backgroundAnimationState?.cloudFloat1 !== undefined &&
                                isFinite(backgroundAnimationState.cloudFloat1) &&
                                !isNaN(backgroundAnimationState.cloudFloat1);
        const cloud2CanResume = backgroundAnimationState?.cloudFloat2 !== undefined &&
                                isFinite(backgroundAnimationState.cloudFloat2) &&
                                !isNaN(backgroundAnimationState.cloudFloat2);

        // Start animations with minimal overhead
        // If we can resume, set the cloud to the persisted position first, then start animation
        if (cloud1CanResume) {
          cloudFloat1.value = backgroundAnimationState.cloudFloat1;
        }
        if (cloud2CanResume) {
          cloudFloat2.value = backgroundAnimationState.cloudFloat2;
        }

        cloudFloat1.value = createCloudAnimationNew(cloudFloat1, 0, -200, cloud1CanResume);
        cloudFloat2.value = createCloudAnimationNew(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, cloud2CanResume);

        // Rockets removed entirely

        // IMPROVED: Enhanced animation watchdog with position tracking (reduced frequency)
        if (animationWatchdogRef.current) {
          clearTimeout(animationWatchdogRef.current);
        }

        // Store initial positions for movement detection
        let lastCloud1Pos = cloudFloat1.value;
        let lastCloud2Pos = cloudFloat2.value;

        animationWatchdogRef.current = setTimeout(() => {
          if (!animationsCancelled.current) {
            const cloud1Pos = cloudFloat1.value;
            const cloud2Pos = cloudFloat2.value;

            // Check for invalid values
            const cloud1Invalid = !isFinite(cloud1Pos) || isNaN(cloud1Pos);
            const cloud2Invalid = !isFinite(cloud2Pos) || isNaN(cloud2Pos);

            // Check for stuck animations (no movement) - more lenient threshold
            const cloud1Stuck = Math.abs(cloud1Pos - lastCloud1Pos) < 10;
            const cloud2Stuck = Math.abs(cloud2Pos - lastCloud2Pos) < 10;

            // Only restart if there are serious issues
            if (cloud1Invalid || cloud2Invalid) {
              console.log('Animation watchdog: Restarting animations due to invalid positions');
              // Force restart with fresh positions
              cloudFloat1.value = createCloudAnimationNew(cloudFloat1, 0, -200, false);
              cloudFloat2.value = createCloudAnimationNew(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, false);
            } else if (cloud1Stuck && cloud2Stuck) {
              console.log('Animation watchdog: Both clouds stuck, fresh restart to prevent issues');
              // Use fresh restart instead of resume to prevent position issues
              cloudFloat1.value = createCloudAnimationNew(cloudFloat1, 0, -200, false);
              cloudFloat2.value = createCloudAnimationNew(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, false);
            }
          }
        }, 45000); // Check every 45 seconds (reduced frequency)

        // PREVENTIVE: Periodic animation restart to prevent long-term drift (less frequent)
        animationRestartRef.current = setTimeout(() => {
          if (!animationsCancelled.current) {
            console.log('Periodic animation restart: Refreshing cloud animations with fresh start');
            // Use fresh restart to prevent any position-related issues
            cloudFloat1.value = createCloudAnimationNew(cloudFloat1, 0, -200, false);
            cloudFloat2.value = createCloudAnimationNew(cloudFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400, false);
          }
        }, 600000); // Restart every 10 minutes (much less frequent)

        // RELIABILITY: Periodic position save to prevent data loss
        const savePositions = () => {
          if (!animationsCancelled.current) {
            try {
              const currentCloud1 = cloudFloat1.value;
              const currentCloud2 = cloudFloat2.value;

              // Only save if positions are valid
              if (isFinite(currentCloud1) && !isNaN(currentCloud1) &&
                  isFinite(currentCloud2) && !isNaN(currentCloud2)) {
                updateBackgroundAnimationState({
                  cloudFloat1: currentCloud1,
                  cloudFloat2: currentCloud2,
                  rocketFloat1: 1000,
                  rocketFloat2: -200,
                });
              }
            } catch (error) {
              console.warn('Failed to save animation positions periodically:', error);
            }

            // Schedule next save
            periodicSaveRef.current = setTimeout(savePositions, 30000); // Save every 30 seconds
          }
        };

        // Start periodic saving
        periodicSaveRef.current = setTimeout(savePositions, 30000);
      }
    };

    // Start animations immediately, but allow for component mounting
    const timeoutId = setTimeout(startAnimations, 50);

    return () => {
      clearTimeout(timeoutId);
      if (animationWatchdogRef.current) {
        clearTimeout(animationWatchdogRef.current);
      }
      if (animationRestartRef.current) {
        clearTimeout(animationRestartRef.current);
      }
      if (periodicSaveRef.current) {
        clearTimeout(periodicSaveRef.current);
      }
    };
  }, [isActive]); // Re-run when isActive changes



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

  // Generate star positions based on current screen dimensions
  // IMPORTANT: This must be called before any conditional returns to follow Rules of Hooks
  const stars = useMemo(() => generateStarPositions(), [screenWidth, screenHeight]);



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
          top: screenHeight * LAYOUT.CLOUD_TOP_POSITION_1,
          zIndex: LAYOUT.Z_INDEX.CLOUDS_BEHIND
        }]}>
          <Cloud1 width={ASSET_DIMENSIONS.cloud1.width} height={ASSET_DIMENSIONS.cloud1.height} />
        </Animated.View>
        <Animated.View style={[mainMenuStyles.cloudContainerFront, cloudAnimatedStyle2, {
          top: screenHeight * LAYOUT.CLOUD_TOP_POSITION_2,
          zIndex: LAYOUT.Z_INDEX.CLOUDS_FRONT
        }]}>
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
        {/* Account Button */}
        <View style={legacyStyles.accountButtonContainer}>
          <Pressable
            style={legacyStyles.accountButton}
            onPress={() => onNavigate('account')}
            activeOpacity={0.7}
          >
            <View style={[legacyStyles.accountIconBackground, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="person-outline" size={24} color="white" />
            </View>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        {/* Music Control */}
        <View style={legacyStyles.musicControlContainer}>
          <MusicControl size={24} color="#4A90E2" />
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
              testID={`menu-icon-${menuOrder[1].destination}`}
            />
            <MenuIcon
              key={`top-right-${menuOrder[2].destination}`}
              icon={menuOrder[2].icon}
              label={menuOrder[2].label}
              status="inactive"
              onPress={() => handleIconPress(menuOrder[2])}
              testID={`menu-icon-${menuOrder[2].destination}`}
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
              testID={`menu-icon-${menuOrder[3].destination}`}
            />
            <MenuIcon
              key={`bottom-right-${menuOrder[4].destination}`}
              icon={menuOrder[4].icon}
              label={menuOrder[4].label}
              status="inactive"
              onPress={() => handleIconPress(menuOrder[4])}
              testID={`menu-icon-${menuOrder[4].destination}`}
            />
          </View>
        </View>
      </View>
    </LinearGradient>
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
