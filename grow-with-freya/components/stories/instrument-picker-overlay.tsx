/**
 * InstrumentPickerOverlay
 *
 * Full-screen overlay with blurred background showing a 3D coverflow carousel
 * of instruments. Appears when entering a story that has music challenge pages.
 * The user swipes to pick an instrument, then taps confirm to begin.
 *
 * Visual design:
 * - BlurView backdrop (intensity 40, dark tint)
 * - 3D carousel: centered item at full scale, side items recede with perspective
 * - Pulsing ring around the currently centered instrument
 * - Instrument image + display name + description
 * - Confirm button at the bottom
 *
 * Reuses the same carousel math as MenuCarousel (menu-carousel.tsx):
 * - Pan gesture for swiping, spring snap to nearest item
 * - 3D transforms: translateX, translateY, scale, perspective, rotateY
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  getAvailableInstrumentIds,
  getInstrument,
  InstrumentDefinition,
} from '@/services/music-asset-registry';

// ============================================================================
// Carousel configuration — tuned for 6 instruments
// ============================================================================
const RADIUS = 180;
const CENTER_SCALE = 1.0;
const SIDE_SCALE = 0.5;
const SIDE_OPACITY = 0.3;
const INSTRUMENT_IMAGE_SIZE = 120;

interface InstrumentPickerOverlayProps {
  visible: boolean;
  onSelect: (instrumentId: string) => void;
  onClose?: () => void;
  /** Optional: pre-select a specific instrument (e.g., from CMS default) */
  defaultInstrumentId?: string;
  /** Whether the picker should rotate into portrait orientation */
  isRotated?: boolean;
}

export const InstrumentPickerOverlay = React.memo(function InstrumentPickerOverlay({
  visible,
  onSelect,
  onClose,
  defaultInstrumentId,
  isRotated = false,
}: InstrumentPickerOverlayProps) {
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Resolve all available instruments
  const instrumentIds = getAvailableInstrumentIds();
  const instruments: InstrumentDefinition[] = instrumentIds
    .map(id => getInstrument(id))
    .filter((i): i is InstrumentDefinition => i !== undefined);

  const itemCount = instruments.length;
  const anglePerItem = itemCount > 0 ? 360 / itemCount : 360;

  // Find default index
  const defaultIndex = defaultInstrumentId
    ? instruments.findIndex(i => i.id === defaultInstrumentId)
    : 0;
  const normalizedDefaultIndex = Math.max(0, defaultIndex);
  const initialRotation = -(normalizedDefaultIndex * anglePerItem);

  const rotation = useSharedValue(initialRotation);
  const gestureStartRotation = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  const viewportWidth = isRotated ? screenHeight : screenWidth;
  const viewportHeight = isRotated ? screenWidth : screenHeight;
  const carouselWidth = Math.min(viewportWidth * 0.92, RADIUS * 2 + INSTRUMENT_IMAGE_SIZE + 40);
  const carouselHeight = Math.min(Math.max(viewportHeight * 0.38, 220), INSTRUMENT_IMAGE_SIZE + 140);
  const compactLayout = viewportHeight < 430;

  const getCenteredIndexFromRotation = useCallback((rotationValue: number): number => {
    if (itemCount === 0) return 0;
    const normalizedRotation = ((rotationValue % 360) + 360) % 360;
    const centeredIndex = Math.round(normalizedRotation / anglePerItem) % itemCount;
    return (itemCount - centeredIndex) % itemCount;
  }, [anglePerItem, itemCount]);

  // Fade in on mount
  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 400 });
      rotation.value = initialRotation;
    }
  }, [visible, initialRotation, overlayOpacity, rotation]);

  const handleConfirmSelection = useCallback(() => {
    const centeredIndex = getCenteredIndexFromRotation(rotation.value);
    const instrument = instruments[centeredIndex] ?? instruments[normalizedDefaultIndex] ?? instruments[0];
    if (!instrument) return;
    onSelect(instrument.id);
  }, [getCenteredIndexFromRotation, instruments, normalizedDefaultIndex, onSelect, rotation]);

  const handleItemPress = useCallback((index: number) => {
    const centeredIdx = getCenteredIndexFromRotation(rotation.value);
    if (index === centeredIdx) {
      handleConfirmSelection();
    } else {
      // Tapping a side instrument → rotate it to center
      const targetRotation = -index * anglePerItem;
      rotation.value = withSpring(targetRotation, { damping: 15, stiffness: 100 });
    }
  }, [anglePerItem, getCenteredIndexFromRotation, handleConfirmSelection, rotation]);

  // Pan gesture for swiping
  const panGesture = useMemo(() => Gesture.Pan()
    .onStart(() => {
      gestureStartRotation.value = rotation.value;
    })
    .onUpdate((event) => {
      rotation.value = gestureStartRotation.value + event.translationX * 0.3;
    })
    .onEnd((event) => {
      const velocity = event.velocityX * 0.001;
      const projected = rotation.value + velocity * 50;
      const snapped = Math.round(projected / anglePerItem) * anglePerItem;
      rotation.value = withSpring(snapped, {
        damping: 15,
        stiffness: 100,
        velocity,
      });
    }), [anglePerItem, gestureStartRotation, rotation]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible || instruments.length === 0) return null;

  return (
    <Animated.View
      style={[styles.overlay, overlayAnimatedStyle]}
      testID="instrument-picker-overlay"
    >
      <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={[
        styles.content,
        {
          paddingTop: Math.max(viewportHeight * 0.08, 56),
          paddingBottom: Math.max(viewportHeight * 0.05, 28),
        },
        isRotated && {
          transform: [{ rotate: '-90deg' }],
          width: screenHeight,
          height: screenWidth,
        },
      ]}>
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          testID="instrument-picker-close-button"
          accessibilityLabel={t('music.closeInstrumentPicker')}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>

        <View style={[styles.headerSection, compactLayout && styles.headerSectionCompact]}>
          <Text style={styles.title}>{t('music.chooseInstrument')}</Text>
          <Text style={styles.subtitle}>{t('music.swipeToExplore')}</Text>
        </View>

        <GestureHandlerRootView style={styles.gestureRoot}>
          <GestureDetector gesture={panGesture}>
            <View
              style={[
                styles.carouselContainer,
                compactLayout && styles.carouselContainerCompact,
                { width: carouselWidth, height: carouselHeight },
              ]}
              testID="instrument-picker-carousel"
            >
              <Animated.View style={styles.carousel}>
                {instruments.map((instrument, index) => (
                  <CarouselItem
                    key={instrument.id}
                    instrument={instrument}
                    index={index}
                    anglePerItem={anglePerItem}
                    rotation={rotation}
                    onPress={() => handleItemPress(index)}
                  />
                ))}
              </Animated.View>
            </View>
          </GestureDetector>
        </GestureHandlerRootView>

        <View style={[styles.footerSection, compactLayout && styles.footerSectionCompact]}>
          <Pressable
            style={styles.confirmButton}
            onPress={handleConfirmSelection}
            testID="confirm-instrument-selection-button"
            accessibilityLabel={t('music.useThisInstrument')}
          >
            <Text style={styles.confirmButtonText}>{t('music.useThisInstrument')}</Text>
          </Pressable>
        </View>

      </View>
    </Animated.View>
  );
});

// ============================================================================
// CarouselItem — individual instrument card with 3D positioning + pulsing ring
// ============================================================================

interface CarouselItemProps {
  instrument: InstrumentDefinition;
  index: number;
  anglePerItem: number;
  rotation: SharedValue<number>;
  onPress: () => void;
}

function CarouselItem({
  instrument,
  index,
  anglePerItem,
  rotation,
  onPress,
}: CarouselItemProps) {
  // Pulsing ring animation — always running, only visible when centered
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1.2, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(0.15, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulseScale, pulseOpacity]);

  const animatedItemStyle = useAnimatedStyle(() => {
    const itemAngle = index * anglePerItem;
    const currentRotation = rotation.value;
    const theta = ((currentRotation + itemAngle) * Math.PI) / 180;

    const x = Math.sin(theta) * RADIUS;
    const z = Math.cos(theta) * RADIUS;

    // Normalize z from [-RADIUS, RADIUS] to [0, 1] where 1 = front
    const normalizedZ = (z + RADIUS) / (2 * RADIUS);

    const scale = interpolate(normalizedZ, [0, 1], [SIDE_SCALE, CENTER_SCALE], Extrapolation.CLAMP);
    const opacity = interpolate(normalizedZ, [0, 0.4, 0.85, 1], [0.1, SIDE_OPACITY, 0.7, 1], Extrapolation.CLAMP);
    const translateY = interpolate(normalizedZ, [0, 1], [30, 0], Extrapolation.CLAMP);

    return {
      transform: [
        { translateX: x },
        { translateY },
        { scale },
      ],
      opacity,
      zIndex: Math.round(normalizedZ * 100),
    };
  });

  // Pulsing ring — visible only when this item is at front (centered)
  const animatedRingStyle = useAnimatedStyle(() => {
    const itemAngle = index * anglePerItem;
    const currentRotation = rotation.value;
    const theta = ((currentRotation + itemAngle) * Math.PI) / 180;
    const z = Math.cos(theta) * RADIUS;
    const normalizedZ = (z + RADIUS) / (2 * RADIUS);

    // Only show ring when item is at front (normalizedZ > 0.85)
    const ringVisible = normalizedZ > 0.85 ? 1 : 0;

    return {
      transform: [{ scale: pulseScale.value }],
      opacity: pulseOpacity.value * ringVisible,
    };
  });

  // Label text — visible only when centered
  const animatedLabelStyle = useAnimatedStyle(() => {
    const itemAngle = index * anglePerItem;
    const currentRotation = rotation.value;
    const theta = ((currentRotation + itemAngle) * Math.PI) / 180;
    const z = Math.cos(theta) * RADIUS;
    const normalizedZ = (z + RADIUS) / (2 * RADIUS);

    return {
      opacity: interpolate(normalizedZ, [0.7, 0.9], [0, 1], Extrapolation.CLAMP),
    };
  });

  const hasImage = instrument.image !== 0;

  return (
    <Animated.View style={[styles.itemContainer, animatedItemStyle]}>
      {/* Pulsing ring behind the image */}
      <Animated.View style={[styles.pulsingRing, animatedRingStyle]} />

      {/* Instrument image or placeholder */}
      <Pressable onPress={onPress} style={styles.itemPressable} testID={`instrument-${instrument.id}`}>
        {hasImage ? (
          <Image source={instrument.image} style={styles.instrumentImage} resizeMode="contain" />
        ) : (
          <View style={[styles.instrumentPlaceholder, { backgroundColor: instrument.noteLayout[0]?.color || '#666' }]}>
            <Text style={styles.placeholderEmoji}>{instrument.noteLayout[0]?.label || '🎵'}</Text>
          </View>
        )}
      </Pressable>

      {/* Name + description — visible when centered */}
      <Animated.View style={[styles.itemLabel, animatedLabelStyle]}>
        <Text style={styles.instrumentName}>{instrument.displayName}</Text>
        <Text style={styles.instrumentDescription}>{instrument.description}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  headerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  headerSectionCompact: {
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 28,
    right: 28,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  gestureRoot: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  carouselContainerCompact: {
    marginVertical: 12,
  },
  footerSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  footerSectionCompact: {
    marginTop: 14,
  },
  confirmButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  carousel: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: INSTRUMENT_IMAGE_SIZE + 40,
  },
  itemPressable: {
    width: INSTRUMENT_IMAGE_SIZE,
    height: INSTRUMENT_IMAGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instrumentImage: {
    width: INSTRUMENT_IMAGE_SIZE,
    height: INSTRUMENT_IMAGE_SIZE,
    borderRadius: INSTRUMENT_IMAGE_SIZE / 2,
  },
  instrumentPlaceholder: {
    width: INSTRUMENT_IMAGE_SIZE,
    height: INSTRUMENT_IMAGE_SIZE,
    borderRadius: INSTRUMENT_IMAGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  placeholderEmoji: {
    fontSize: 50,
  },
  pulsingRing: {
    position: 'absolute',
    width: INSTRUMENT_IMAGE_SIZE + 24,
    height: INSTRUMENT_IMAGE_SIZE + 24,
    borderRadius: (INSTRUMENT_IMAGE_SIZE + 24) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    top: -12,
  },
  itemLabel: {
    alignItems: 'center',
    marginTop: 12,
  },
  instrumentName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  instrumentDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 200,
  },
});
