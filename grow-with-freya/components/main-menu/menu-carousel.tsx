import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MenuIcon } from './menu-icon';
import { getScreenDimensions } from './constants';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

export interface CarouselMenuItem {
  id: string;
  icon: string;
  labelKey: string;
  destination: string;
  emoji?: string;
}

const CAROUSEL_ITEMS: CarouselMenuItem[] = [
  { id: 'stories', icon: 'stories-icon', labelKey: 'menu.stories', destination: 'stories', emoji: '📚' },
  { id: 'music-stories', icon: 'stories-icon', labelKey: 'menu.musicStories', destination: 'music-stories', emoji: '🎵' },
  { id: 'animated-stories', icon: 'stories-icon', labelKey: 'menu.animatedStories', destination: 'animated-stories', emoji: '🎬' },
];

// Coverflow configuration
const ITEM_COUNT = CAROUSEL_ITEMS.length;
const ANGLE_PER_ITEM = 360 / ITEM_COUNT; // 120 degrees between items
const RADIUS = 160; // Distance from center for side items
const CENTER_SCALE = 1.0; // No scaling = crisp rendering
const SIDE_SCALE = 0.52; // Smaller side items (relative to center)
const SIDE_OPACITY = 0.7;

interface MenuCarouselProps {
  onNavigate: (destination: string) => void;
  storiesButtonRef?: React.RefObject<View | null>;
}

export const MenuCarousel = React.memo(function MenuCarousel({
  onNavigate,
  storiesButtonRef,
}: MenuCarouselProps) {
  const { t } = useTranslation();
  const { width: screenWidth } = getScreenDimensions();

  // Current rotation angle (0 = first item centered)
  const rotation = useSharedValue(0);
  const gestureStartRotation = useSharedValue(0);

  const handlePress = useCallback((index: number) => {
    // Rotate to center the pressed item
    const targetRotation = -index * ANGLE_PER_ITEM;
    rotation.value = withSpring(targetRotation, {
      damping: 15,
      stiffness: 100,
    });
  }, [rotation]);

  const handleNavigate = useCallback((destination: string, index: number) => {
    // Calculate which item is currently centered
    const normalizedRotation = ((rotation.value % 360) + 360) % 360;
    const centeredIndex = Math.round(normalizedRotation / ANGLE_PER_ITEM) % ITEM_COUNT;
    const actualCenteredIndex = (ITEM_COUNT - centeredIndex) % ITEM_COUNT;

    if (index === actualCenteredIndex) {
      // Item is centered, navigate
      onNavigate(destination);
    } else {
      // Rotate to center this item first
      handlePress(index);
    }
  }, [rotation.value, onNavigate, handlePress]);

  // Gesture for swiping
  const panGesture = Gesture.Pan()
    .onStart(() => {
      gestureStartRotation.value = rotation.value;
    })
    .onUpdate((event) => {
      // Swipe sensitivity - convert horizontal movement to rotation
      const swipeSensitivity = 0.3;
      rotation.value = gestureStartRotation.value + event.translationX * swipeSensitivity;
    })
    .onEnd((event) => {
      // Snap to nearest item
      const velocity = event.velocityX * 0.001;
      const projectedRotation = rotation.value + velocity * 50;
      const snappedRotation = Math.round(projectedRotation / ANGLE_PER_ITEM) * ANGLE_PER_ITEM;

      rotation.value = withSpring(snappedRotation, {
        damping: 15,
        stiffness: 100,
        velocity: velocity,
      });
    });

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.container} testID="menu-carousel">
          <View style={[styles.carouselContainer, { width: screenWidth * 0.9 }]}>
            {CAROUSEL_ITEMS.map((item, index) => (
              <CarouselItem
                key={item.id}
                item={item}
                index={index}
                rotation={rotation}
                onPress={() => handleNavigate(item.destination, index)}
                storiesButtonRef={index === 0 ? storiesButtonRef : undefined}
                t={t}
              />
            ))}
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
});



// Individual carousel item with 3D transforms
interface CarouselItemProps {
  item: CarouselMenuItem;
  index: number;
  rotation: SharedValue<number>;
  onPress: () => void;
  storiesButtonRef?: React.RefObject<View | null>;
  t: (key: string) => string;
}

const CarouselItem = React.memo(function CarouselItem({
  item,
  index,
  rotation,
  onPress,
  storiesButtonRef,
  t,
}: CarouselItemProps) {
  const itemAngle = index * ANGLE_PER_ITEM;

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate the item's current angle relative to center (0 degrees = front)
    const currentAngle = (rotation.value + itemAngle + 360) % 360;

    // Normalize to -180 to 180 range
    const normalizedAngle = currentAngle > 180 ? currentAngle - 360 : currentAngle;

    // Calculate position on the circular path
    // Items at 0 degrees are in front, items at +/-120 are on the sides
    const angleRad = (normalizedAngle * Math.PI) / 180;

    // X position: items move left/right based on their angle
    const translateX = Math.sin(angleRad) * RADIUS;

    // Z depth simulation using scale and translateY
    // Items in front (0 deg) are larger, items on sides are smaller and slightly back
    const depth = Math.cos(angleRad);
    const scale = interpolate(
      depth,
      [-1, 0, 1],
      [SIDE_SCALE * 0.5, SIDE_SCALE, CENTER_SCALE],
      Extrapolation.CLAMP
    );

    // Y position: slight arc effect - side items move up slightly
    const translateY = interpolate(
      depth,
      [-1, 0, 1],
      [30, 15, 0],
      Extrapolation.CLAMP
    );

    // Opacity: front items are fully visible, side items are dimmer
    const opacity = interpolate(
      depth,
      [-1, 0, 1],
      [0, SIDE_OPACITY, 1],
      Extrapolation.CLAMP
    );

    // Z-index simulation: items in front should be on top
    // Using translateY as a proxy since React Native doesn't support zIndex in transforms
    const zIndex = Math.round(depth * 100) + 100;

    // Slight rotation for 3D effect - items rotate away from center
    const rotateY = interpolate(
      normalizedAngle,
      [-180, -90, 0, 90, 180],
      [90, 45, 0, -45, -90],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX },
        { translateY },
        { scale },
        { perspective: 800 },
        { rotateY: `${rotateY}deg` },
      ],
      opacity,
      zIndex,
    };
  });

  return (
    <Animated.View style={[styles.itemWrapper, animatedStyle]}>
      <View ref={storiesButtonRef}>
        <Pressable onPress={onPress} style={styles.pressable}>
          <MenuIcon
            icon={item.icon}
            label={`${item.emoji || ''} ${t(item.labelKey)}`}
            status="animated_interactive"
            onPress={onPress}
            isLarge={true}
            testID={`menu-icon-${item.id}`}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  gestureRoot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselContainer: {
    width: '100%',
    aspectRatio: 1.5, // Maintains consistent proportions across screen sizes
    maxHeight: 350,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
