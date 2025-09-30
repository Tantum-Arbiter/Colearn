import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { DefaultPage } from './default-page';
import { useAppStore } from '../store/app-store';

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

// Legacy code removed - now using refactored modules

// Old component definitions removed - now using refactored modules

// Interfaces moved to refactored modules

interface MainMenuProps {
  onNavigate: (destination: string) => void;
}

// Old MenuIcon component removed - now using refactored module

function MainMenuComponent({}: MainMenuProps) {
  const insets = useSafeAreaInsets();
  const [selectedIcon, setSelectedIcon] = useState('stories-icon');
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);
  const [triggerSelectionAnimation, setTriggerSelectionAnimation] = useState(false);

  // Animation values using refactored constants
  const starRotation = useSharedValue(0);
  const balloonFloat1 = useSharedValue(-200);
  const balloonFloat2 = useSharedValue(-400);
  const rocketFloat1 = useSharedValue(SCREEN_WIDTH + 100);
  const rocketFloat2 = useSharedValue(-200);







  // State for tracking current arrangement and page
  const [menuOrder, setMenuOrder] = useState<MenuItemData[]>(menuItems);
  const [currentPage, setCurrentPage] = useState<MenuItemData | null>(null);
  const [lastSwapTime, setLastSwapTime] = useState<number>(0);
  const [newlySelectedItem, setNewlySelectedItem] = useState<string | null>(null);



  // Handle icon selection with smooth swapping animation
  const handleIconPress = (selectedItem: MenuItemData) => {
    const centerItem = menuOrder[0]; // First item is always center
    const currentTime = Date.now();

    console.log('=== ICON PRESS DEBUG ===');
    console.log('Selected item:', selectedItem.label, selectedItem.destination);
    console.log('Center item:', centerItem.label, centerItem.destination);
    console.log('Are destinations equal?', selectedItem.destination === centerItem.destination);
    console.log('Current menu order:', menuOrder.map(item => `${item.label}(${item.destination})`));
    console.log('Time since last swap:', currentTime - lastSwapTime);

    if (selectedItem.destination === centerItem.destination) {
      // If clicking the center item, navigate to its page
      console.log('Navigating to page:', selectedItem.label);
      setCurrentPage(selectedItem);
    } else {
      // Allow rapid swapping - no delay restrictions
      const clickedIndex = menuOrder.findIndex(item => item.destination === selectedItem.destination);

      console.log('Clicked index:', clickedIndex);

      if (clickedIndex > 0) {
        console.log('Performing swap...');
        setLastSwapTime(currentTime);

        // Perform the swap immediately for instant visual feedback
        const newOrder = [...menuOrder];

        // Swap the clicked item with the center item
        [newOrder[0], newOrder[clickedIndex]] = [newOrder[clickedIndex], newOrder[0]];

        console.log('New menu order:', newOrder.map(item => `${item.label}(${item.destination})`));
        setMenuOrder(newOrder);

        // Trigger selection animation for the newly selected item
        setNewlySelectedItem(selectedItem.destination);

        // Clear the animation trigger after a short delay
        setTimeout(() => setNewlySelectedItem(null), 1000);
      } else {
        console.log('Clicked index not found or is 0');
      }
    }
  };

  // Handle back navigation from page
  const handleBackToMenu = () => {
    setCurrentPage(null);
  };



  useEffect(() => {
    balloonFloat1.value = createCloudAnimation(balloonFloat1, 0, -200);
    balloonFloat2.value = createCloudAnimation(balloonFloat2, ANIMATION_TIMINGS.CLOUD_STAGGER_DELAY, -400);
  }, [balloonFloat1, balloonFloat2]);

  // Initialize rocket animations using refactored functions
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

  // Rocket animated styles
  const rocketAnimatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: rocketFloat1.value }],
  }));

  const rocketAnimatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: rocketFloat2.value }],
  }));





  // Skip loading screen - render immediately with hidden image caching

  // Show default page if one is selected
  if (currentPage) {
    return (
      <DefaultPage
        icon={currentPage.icon}
        title={currentPage.label}
        onBack={handleBackToMenu}
      />
    );
  }

  // Generate stars using utility function
  const stars = generateStarPositions();

  return (
    <LinearGradient
      colors={VISUAL_EFFECTS.GRADIENT_COLORS}
      style={mainMenuStyles.container}
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
            />
            <MenuIcon
              key={`top-right-${menuOrder[2].destination}`}
              icon={menuOrder[2].icon}
              label={menuOrder[2].label}
              status="inactive"
              onPress={() => handleIconPress(menuOrder[2])}
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
            />
            <MenuIcon
              key={`bottom-right-${menuOrder[4].destination}`}
              icon={menuOrder[4].icon}
              label={menuOrder[4].label}
              status="inactive"
              onPress={() => handleIconPress(menuOrder[4])}
            />
          </View>
        </View>
      </View>



    </LinearGradient>
  );
}

// Old styles removed - now using refactored mainMenuStyles
const legacyStyles = StyleSheet.create({
  // Temporary styles for elements not yet refactored
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

// Export memoized component for performance
export const MainMenu = React.memo(MainMenuComponent);
