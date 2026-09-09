/**
 * InstrumentPickerOverlay
 *
 * Full-screen instrument picker: a night-sky panel holding a 3D coverflow
 * carousel of medallions, with the back button and the left/right arrows sitting
 * outside the panel against the screen edges.
 *
 * Visual design:
 * - Backdrop: a blurred night scene, a plain blur over whatever is behind, or nothing
 * - Panel: deep indigo card, soft border, drop shadow, capped at PANEL_MAX_WIDTH
 * - Carousel: centred medallion at full scale, neighbours recede with perspective
 * - Gold focus ring around the centred medallion, page dots below, gold CTA
 *
 * Carousel maths is shared with MenuCarousel (menu-carousel.tsx): a pan gesture
 * with a spring snap, and 3D transforms of translateX, translateY and scale.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import {
  getAvailableInstrumentIds,
  getInstrument,
  InstrumentDefinition,
} from '@/services/music-asset-registry';
import { StoryAccessService } from '@/services/story-access-service';
import { InstrumentMedallion } from '@/components/stories/instrument-medallion';
import { ContentSwap } from '@/components/child-ui/content-swap';
import { SceneBackground } from '@/components/ui/scene-background';
import {
  ArcText,
  arcPointAt,
  arcRadiusForText,
  DEFAULT_ARC_CURVE,
  estimateArcTextWidth,
} from '@/components/ui/arc-text';
import { BlobPanel } from '@/components/ui/blob-panel';
import { Fonts } from '@/constants/theme';

// ============================================================================
// Layout -all sizes derive from the viewport so phone, landscape phone and
// tablet share one set of proportions.
// ============================================================================
const PANEL_MAX_WIDTH = 540;
const PANEL_PADDING = 20;
/** Clearance between the outermost medallion and the panel's inner edge. */
const EDGE_CLEARANCE = 4;
/** Carousel radius as a multiple of the medallion diameter. */
const RADIUS_RATIO = 1.12;
const ARROW_SIZE = 48;
const ARROW_EDGE_GAP = 12;
const MEDALLION_MAX_SIZE = 224;
const MEDALLION_COMPACT_MAX_SIZE = 172;
const CENTER_SCALE = 1.0;
const SIDE_SCALE = 0.78;
/**
 * Only the centred item and its two neighbours are drawn. With six instruments the
 * ones behind them project to the same x as the neighbours, so leaving them faintly
 * visible reads as a smudge behind each side medallion.
 */
const VISIBLE_DEPTH = 0.5;
/** Viewport height under which the panel switches to its tight vertical rhythm. */
const COMPACT_VIEWPORT_HEIGHT = 430;
/** Stand-in for a viewport that has not been measured yet (0 x 0 on the first frame). */
const UNMEASURED_VIEWPORT = { width: 390, height: 844 };

const COLORS = {
  panel: 'rgba(49, 58, 112, 0.62)',
  panelBorder: 'rgba(255, 255, 255, 0.12)',
  title: '#FFF8EB',
  subtitle: '#CCD3FB',
  centerName: '#FBF4DD',
  sideName: '#AAB0FD',
  description: '#BFC5E7',
  ctaFrom: '#FFEFAE',
  ctaTo: '#FBC55F',
  ctaLabel: '#4A3410',
  ctaSparkle: '#FFF6D5',
  ctaGlow: '#FBC55F',
  glassFill: 'rgba(30, 45, 110, 0.55)',
  glassBorder: 'rgba(200, 212, 255, 0.55)',
  dotActive: '#FCE680',
  dotIdle: '#5D51A7',
  star: '#FFD470',
};

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Safe-area insets expressed in the picker's own frame.
 *
 * The rotated presentation draws its content turned -90 degrees inside a window
 * that is still portrait, so the window's insets arrive in the wrong basis: the
 * notch sits along what the rotated content calls its left edge, not its top.
 * Turning the content anticlockwise cycles the edges one step, so each edge takes
 * the inset of the window edge it now lies against.
 */
export function rotateInsets(insets: EdgeInsets, isRotated: boolean): EdgeInsets {
  if (!isRotated) return insets;
  return {
    top: insets.right,
    right: insets.bottom,
    bottom: insets.left,
    left: insets.top,
  };
}

export interface PickerLayoutInput {
  viewportWidth: number;
  viewportHeight: number;
  itemCount: number;
}

export interface PickerLayout {
  compactLayout: boolean;
  panelWidth: number;
  medallionSize: number;
  radius: number;
  /** Horizontal distance from the centred medallion to either neighbour. */
  neighbourPitch: number;
  labelWidth: number;
  carouselHeight: number;
}

/**
 * Panel and carousel geometry for one viewport. Pure so the invariant that matters --
 * neighbouring medallions and their labels stay inside the panel -- can be checked
 * across every device without rendering.
 *
 * A zero viewport means the window has not been measured yet (the first frame, and
 * every test under react-native-web), so a typical phone stands in for it.
 */
export function computePickerLayout({
  viewportWidth: measuredWidth,
  viewportHeight: measuredHeight,
  itemCount,
}: PickerLayoutInput): PickerLayout {
  const viewportWidth = measuredWidth > 0 ? measuredWidth : UNMEASURED_VIEWPORT.width;
  const viewportHeight = measuredHeight > 0 ? measuredHeight : UNMEASURED_VIEWPORT.height;
  const compactLayout = viewportHeight < COMPACT_VIEWPORT_HEIGHT;

  // A narrow card with the arrows outside it, widening towards full bleed only on a
  // viewport too narrow to spare the gutters.
  const panelWidth = Math.min(
    Math.max(viewportWidth * 0.68, Math.min(viewportWidth - 24, 330)),
    PANEL_MAX_WIDTH,
  );
  const panelInnerHalf = panelWidth / 2 - PANEL_PADDING;

  // A neighbour's centre sits at sin(anglePerItem) * radius and it is SIDE_SCALE of the
  // centred medallion, so panelInnerHalf divided by that sum is the largest medallion
  // whose neighbours still fit. Without it a narrow viewport pushes them past the edge.
  const anglePerItem = itemCount > 0 ? 360 / itemCount : 360;
  const neighbourSpread = Math.max(Math.abs(Math.sin((anglePerItem * Math.PI) / 180)), 0.5);
  const medallionSize = Math.min(
    panelWidth * 0.38,
    compactLayout ? MEDALLION_COMPACT_MAX_SIZE : MEDALLION_MAX_SIZE,
    (panelInnerHalf - EDGE_CLEARANCE) / (neighbourSpread * RADIUS_RATIO + SIDE_SCALE / 2),
  );

  const radius = medallionSize * RADIUS_RATIO;
  const neighbourPitch = neighbourSpread * radius;

  // Only the two neighbours are named, and they sit either side of centre, so a label
  // may run most of the way towards the opposite one -- but never past the panel edge.
  const labelWidth = Math.max(
    Math.min(medallionSize + 70, neighbourPitch * 1.55, (panelInnerHalf - neighbourPitch) * 2),
    64,
  );

  return {
    compactLayout,
    panelWidth,
    medallionSize,
    radius,
    neighbourPitch,
    labelWidth,
    carouselHeight: medallionSize + (compactLayout ? 22 : 34),
  };
}

export type InstrumentPickerBackdrop = 'scene' | 'blur' | 'none';

interface InstrumentPickerOverlayProps {
  visible: boolean;
  onSelect: (instrumentId: string) => void;
  onClose?: () => void;
  /** Optional: pre-select a specific instrument (e.g., from CMS default) */
  defaultInstrumentId?: string;
  /** Whether the picker should rotate into portrait orientation */
  isRotated?: boolean;
  /** Optional: restrict to specific instrument IDs (e.g., only those that can play a song) */
  filterInstrumentIds?: string[];
  /** What sits behind the panel. Defaults to a blur over whatever is already there. */
  backdrop?: InstrumentPickerBackdrop;
  /** @deprecated pass backdrop="none" instead */
  hideBackdrop?: boolean;
  /** Called when user tries to select a locked (subscription-gated) instrument */
  onLockedPress?: () => void;
  /** If true, the left/right arrow buttons are hidden (swipe/tap only) */
  hideArrows?: boolean;
}

export const InstrumentPickerOverlay = React.memo(function InstrumentPickerOverlay({
  visible,
  onSelect,
  onClose,
  defaultInstrumentId,
  isRotated = false,
  filterInstrumentIds,
  backdrop,
  hideBackdrop = false,
  onLockedPress,
  hideArrows = false,
}: InstrumentPickerOverlayProps) {
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const windowInsets = useSafeAreaInsets();
  const insets = rotateInsets(windowInsets, isRotated);
  const [panelTop, setPanelTop] = useState(0);

  const instrumentIds = filterInstrumentIds ?? getAvailableInstrumentIds();
  const instruments: InstrumentDefinition[] = instrumentIds
    .map(id => getInstrument(id))
    .filter((i): i is InstrumentDefinition => i !== undefined);

  const itemCount = instruments.length;
  const anglePerItem = itemCount > 0 ? 360 / itemCount : 360;

  const defaultIndex = defaultInstrumentId
    ? instruments.findIndex(i => i.id === defaultInstrumentId)
    : 0;
  const normalizedDefaultIndex = Math.max(0, defaultIndex);
  const initialRotation = -(normalizedDefaultIndex * anglePerItem);

  const rotation = useSharedValue(initialRotation);
  const gestureStartRotation = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const [centeredIndex, setCenteredIndex] = useState(normalizedDefaultIndex);

  const { compactLayout, panelWidth, medallionSize, radius, labelWidth, carouselHeight } =
    computePickerLayout({
      viewportWidth: isRotated ? screenHeight : screenWidth,
      viewportHeight: isRotated ? screenWidth : screenHeight,
      itemCount,
    });

  // The arc is laid out across the panel minus its padding and the two stars.
  const titleWidth = Math.max(panelWidth - PANEL_PADDING * 2, 200);
  const titleFontSize = compactLayout ? 22 : 24;
  // The arc centres the line in its box, so the stars are placed from the estimated
  // line width rather than pinned to the panel edge.
  const titleLength = Math.min(
    estimateArcTextWidth(t('music.chooseInstrument'), titleFontSize), titleWidth);
  const titleStarInset = Math.max((titleWidth - titleLength) / 2 - 44, 0);
  // The stars ride the same curve as the line, so they drop and tilt with its ends.
  const titleStarPoint = arcPointAt(
    titleWidth / 2 - titleStarInset - 18,
    arcRadiusForText(titleLength, DEFAULT_ARC_CURVE),
  );

  // Level with the title rather than jammed into the frame's corner, so the two read
  // as one row. Falls back to the corner until the panel has been measured.
  const titleBandCentre = (compactLayout ? 10 : 14) + titleFontSize * 0.75;
  const closeButtonTop = panelTop > 0
    ? Math.max(panelTop + titleBandCentre - ARROW_SIZE / 2, insets.top + 8)
    : Math.max(insets.top + 16, 16);

  const resolvedBackdrop: InstrumentPickerBackdrop =
    backdrop ?? (hideBackdrop ? 'none' : 'blur');

  const getCenteredIndexFromRotation = useCallback((rotationValue: number): number => {
    if (itemCount === 0) return 0;
    const normalizedRotation = ((rotationValue % 360) + 360) % 360;
    const index = Math.round(normalizedRotation / anglePerItem) % itemCount;
    return (itemCount - index) % itemCount;
  }, [anglePerItem, itemCount]);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 400 });
      rotation.value = initialRotation;
      setCenteredIndex(normalizedDefaultIndex);
    }
  }, [visible, initialRotation, normalizedDefaultIndex, overlayOpacity, rotation]);

  const handleConfirmSelection = useCallback(() => {
    const index = getCenteredIndexFromRotation(rotation.value);
    const instrument = instruments[index] ?? instruments[normalizedDefaultIndex] ?? instruments[0];
    if (!instrument) return;
    if (!StoryAccessService.isInstrumentUnlocked(instrument.id)) {
      onLockedPress?.();
      return;
    }
    onSelect(instrument.id);
  }, [getCenteredIndexFromRotation, instruments, normalizedDefaultIndex, onSelect, onLockedPress, rotation]);

  const settleOn = useCallback((target: number) => {
    setCenteredIndex(getCenteredIndexFromRotation(target));
  }, [getCenteredIndexFromRotation]);

  const goToNeighbor = useCallback((direction: -1 | 1) => {
    const currentSnapped = Math.round(rotation.value / anglePerItem) * anglePerItem;
    const target = currentSnapped + direction * anglePerItem;
    rotation.value = withSpring(target, { damping: 28, stiffness: 150 });
    settleOn(target);
  }, [anglePerItem, rotation, settleOn]);

  // Tap gesture -tapping the centred instrument confirms the selection
  const tapGesture = useMemo(() => Gesture.Tap()
    .onEnd(() => {
      runOnJS(handleConfirmSelection)();
    }), [handleConfirmSelection]);

  // Pan gesture for swiping -clamped to move at most one item per swipe.
  const panGesture = useMemo(() => Gesture.Pan()
    .onStart(() => {
      gestureStartRotation.value = rotation.value;
    })
    .onUpdate((event) => {
      const drag = event.translationX * 0.15;
      const maxDrag = anglePerItem * 0.6;
      rotation.value = gestureStartRotation.value + Math.max(-maxDrag, Math.min(maxDrag, drag));
    })
    .onEnd((event) => {
      const startSnapped = Math.round(gestureStartRotation.value / anglePerItem) * anglePerItem;
      const delta = rotation.value - gestureStartRotation.value;
      let step = 0;
      if (delta > anglePerItem * 0.15 || event.velocityX > 200) {
        step = 1;
      } else if (delta < -anglePerItem * 0.15 || event.velocityX < -200) {
        step = -1;
      }
      const target = startSnapped + step * anglePerItem;
      rotation.value = withSpring(target, { damping: 28, stiffness: 150 });
      runOnJS(settleOn)(target);
    }), [anglePerItem, gestureStartRotation, rotation, settleOn]);

  const composedGesture = useMemo(
    () => Gesture.Race(tapGesture, panGesture),
    [tapGesture, panGesture],
  );

  const centeredInstrument = instruments[centeredIndex] ?? instruments[0];

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible || instruments.length === 0) return null;

  return (
    <Animated.View
      style={[styles.overlay, overlayAnimatedStyle]}
      testID="instrument-picker-overlay"
    >
      {resolvedBackdrop === 'scene' && <SceneBackground blurIntensity={26} scrimOpacity={0.42} />}
      {resolvedBackdrop === 'blur' && (
        <>
          <View style={styles.blurScrim} />
          <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        </>
      )}

      <View style={[
        styles.content,
        isRotated && {
          transform: [{ rotate: '-90deg' }],
          width: screenHeight,
          height: screenWidth,
        },
      ]}>
        <Pressable
          style={[styles.glassCircle, styles.closeButton, {
            top: closeButtonTop,
            left: Math.max(insets.left + ARROW_EDGE_GAP, ARROW_EDGE_GAP),
          }]}
          onPress={onClose}
          testID="instrument-picker-close-button"
          accessibilityLabel={t('music.closeInstrumentPicker')}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        {!hideArrows && (
          <>
            <Pressable
              style={[styles.glassCircle, styles.arrowButton, {
                left: Math.max(insets.left + ARROW_EDGE_GAP, ARROW_EDGE_GAP),
              }]}
              onPress={() => goToNeighbor(1)}
              testID="instrument-picker-previous-button"
              accessibilityLabel={t('music.previousInstrument', { defaultValue: 'Previous instrument' })}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[styles.glassCircle, styles.arrowButton, {
                right: Math.max(insets.right + ARROW_EDGE_GAP, ARROW_EDGE_GAP),
              }]}
              onPress={() => goToNeighbor(-1)}
              testID="instrument-picker-next-button"
              accessibilityLabel={t('music.nextInstrument', { defaultValue: 'Next instrument' })}
            >
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </Pressable>
          </>
        )}

        <BlobPanel
          fill={COLORS.panel}
          stroke={COLORS.panelBorder}
          onLayout={event => setPanelTop(event.nativeEvent.layout.y)}
          style={[
            styles.panel,
            compactLayout && styles.panelCompact,
            { width: panelWidth },
          ]}
          testID="instrument-picker-panel"
        >
          <View style={[styles.titleRow, { width: titleWidth }]}>
            <TitleSparkle side="left" inset={titleStarInset} point={titleStarPoint} />
            <ArcText
              width={titleWidth}
              fontSize={titleFontSize}
              color={COLORS.title}
              testID="instrument-picker-title"
            >
              {t('music.chooseInstrument')}
            </ArcText>
            <TitleSparkle side="right" inset={titleStarInset} point={titleStarPoint} />
          </View>
          <ArcText
            width={titleWidth}
            fontSize={14}
            fontWeight="400"
            color={COLORS.subtitle}
            testID="instrument-picker-subtitle"
          >
            {t('music.swipeToExplore')}
          </ArcText>

          <GestureHandlerRootView style={styles.gestureRoot}>
            <GestureDetector gesture={composedGesture}>
              <View
                style={[styles.carouselContainer, { height: carouselHeight }]}
                testID="instrument-picker-carousel"
              >
                {instruments.map((instrument, index) => (
                  <CarouselItem
                    key={instrument.id}
                    instrument={instrument}
                    index={index}
                    anglePerItem={anglePerItem}
                    rotation={rotation}
                    radius={radius}
                    medallionSize={medallionSize}
                    labelWidth={labelWidth}
                    compact={compactLayout}
                    isLocked={!StoryAccessService.isInstrumentUnlocked(instrument.id)}
                    onLockedPress={onLockedPress}
                  />
                ))}
              </View>
            </GestureDetector>
          </GestureHandlerRootView>

          {/* the medallion takes a spring to settle on its new instrument, so
              the name underneath it changes over rather than snapping ahead */}
          <ContentSwap contentKey={String(centeredIndex)} testID="instrument-picker-label">
            <View style={[styles.centerLabel, { width: panelWidth - 40 }]}>
              <Text style={[styles.centerName, compactLayout && styles.centerNameCompact]} numberOfLines={1}>
                {centeredInstrument?.displayName}
              </Text>
              <Text style={styles.centerDescription} numberOfLines={2}>
                {centeredInstrument?.description}
              </Text>
            </View>
          </ContentSwap>

          {itemCount > 1 && (
            <View style={styles.dotRow}>
              {instruments.map((instrument, index) => {
                const isActive = index === centeredIndex;
                return (
                  <View
                    key={instrument.id}
                    style={[styles.dot, isActive && styles.dotActive]}
                    accessibilityLabel={instrument.displayName}
                    testID={isActive ? 'instrument-picker-dot-active' : 'instrument-picker-dot'}
                  />
                );
              })}
            </View>
          )}

          <Pressable
            style={styles.confirmButton}
            onPress={handleConfirmSelection}
            testID="confirm-instrument-selection-button"
            accessibilityLabel={t('music.useThisInstrument')}
          >
            <LinearGradient
              colors={[COLORS.ctaFrom, COLORS.ctaTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.confirmGradient, compactLayout && styles.confirmGradientCompact]}
            >
              <Ionicons name="sparkles" size={16} color={COLORS.ctaSparkle} />
              <Text style={styles.confirmButtonText}>{t('music.useThisInstrument')}</Text>
              <Ionicons name="sparkles" size={16} color={COLORS.ctaSparkle} />
            </LinearGradient>
          </Pressable>
        </BlobPanel>
      </View>
    </Animated.View>
  );
});

// ============================================================================
// TitleSparkle -- the star and its two attendant specks beside the title
// ============================================================================

interface TitleSparkleProps {
  side: 'left' | 'right';
  inset: number;
  point: { drop: number; angle: number };
}

function TitleSparkle({ side, inset, point }: TitleSparkleProps) {
  const specks = (
    <View style={styles.sparkleSpecks}>
      <View style={[styles.speck, styles.speckSmall]} />
      <View style={styles.speck} />
    </View>
  );

  // The specks always sit on the outside, so the star is the part nearest the title.
  return (
    <View
      style={[
        styles.titleSparkle,
        { marginTop: point.drop },
        side === 'left'
          ? { left: inset, transform: [{ rotate: `-${point.angle}deg` }] }
          : { right: inset, flexDirection: 'row-reverse', transform: [{ rotate: `${point.angle}deg` }] },
      ]}
      pointerEvents="none"
    >
      {specks}
      <Ionicons name="star" size={18} color={COLORS.star} />
    </View>
  );
}

// ============================================================================
// CarouselItem -3D positioned medallion with its label
// ============================================================================

interface CarouselItemProps {
  instrument: InstrumentDefinition;
  index: number;
  anglePerItem: number;
  rotation: SharedValue<number>;
  radius: number;
  medallionSize: number;
  labelWidth: number;
  compact: boolean;
  isLocked?: boolean;
  onLockedPress?: () => void;
}

function CarouselItem({
  instrument,
  index,
  anglePerItem,
  rotation,
  radius,
  medallionSize,
  labelWidth,
  compact,
  isLocked = false,
  onLockedPress,
}: CarouselItemProps) {
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0.6, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulseOpacity]);

  const normalizedZOf = (rotationValue: number) => {
    'worklet';
    const theta = ((rotationValue + index * anglePerItem) * Math.PI) / 180;
    return (Math.cos(theta) * radius + radius) / (2 * radius);
  };

  const animatedItemStyle = useAnimatedStyle(() => {
    const theta = ((rotation.value + index * anglePerItem) * Math.PI) / 180;
    const x = Math.sin(theta) * radius;
    const normalizedZ = normalizedZOf(rotation.value);

    // The neighbours sit at normalizedZ 0.75, so the scale ramp starts there rather
    // than at 0 -otherwise they render almost as large as the centred medallion.
    const scale = interpolate(normalizedZ, [0.75, 1], [SIDE_SCALE, CENTER_SCALE], Extrapolation.CLAMP);
    const opacity = interpolate(
      normalizedZ, [VISIBLE_DEPTH, 0.62, 0.75, 1], [0, 0.5, 0.85, 1], Extrapolation.CLAMP);
    const translateY = interpolate(normalizedZ, [0.75, 1], [16, 0], Extrapolation.CLAMP);

    return {
      transform: [{ translateX: x }, { translateY }, { scale }],
      opacity,
      zIndex: Math.round(normalizedZ * 100),
    };
  });

  const animatedRingStyle = useAnimatedStyle(() => {
    const normalizedZ = normalizedZOf(rotation.value);
    return { opacity: pulseOpacity.value * (normalizedZ > 0.85 ? 1 : 0) };
  });

  // Only the two immediate neighbours are named: the centred item is named by the
  // panel's label slot, and the items behind them share their x position, so
  // naming those too would stack two labels on top of each other.
  const animatedNameStyle = useAnimatedStyle(() => {
    const normalizedZ = normalizedZOf(rotation.value);
    return {
      opacity: interpolate(
        normalizedZ, [0.55, 0.72, 0.86, 0.96], [0, 0.8, 0.8, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View
      style={[styles.itemContainer, { width: labelWidth }, animatedItemStyle]}
    >
      <InstrumentMedallion
        instrument={instrument}
        size={medallionSize}
        ringStyle={animatedRingStyle}
        isLocked={isLocked}
        onLockedPress={onLockedPress}
      />

      <Animated.Text
        style={[
          styles.instrumentName,
          compact && styles.instrumentNameCompact,
          { width: labelWidth },
          animatedNameStyle,
        ]}
        numberOfLines={1}
      >
        {instrument.displayName}
      </Animated.Text>
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
  },
  blurScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 10, 34, 0.72)',
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  panelCompact: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSparkle: {
    position: 'absolute',
    top: '26%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sparkleSpecks: {
    gap: 5,
  },
  speck: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.star,
  },
  speckSmall: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginLeft: 3,
  },
  gestureRoot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  itemContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  instrumentName: {
    color: COLORS.sideName,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    marginTop: 8,
  },
  instrumentNameCompact: {
    fontSize: 13,
    marginTop: 6,
  },
  centerLabel: {
    alignItems: 'center',
    marginTop: 2,
  },
  centerName: {
    color: COLORS.centerName,
    fontSize: 19,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  centerNameCompact: {
    fontSize: 18,
  },
  centerDescription: {
    color: COLORS.description,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    marginBottom: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.dotIdle,
  },
  dotActive: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.dotActive,
  },
  confirmButton: {
    alignSelf: 'center',
    shadowColor: COLORS.ctaGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 26,
  },
  confirmGradientCompact: {
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  confirmButtonText: {
    color: COLORS.ctaLabel,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.rounded,
    textAlign: 'center',
  },
  glassCircle: {
    position: 'absolute',
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    borderRadius: ARROW_SIZE / 2,
    backgroundColor: COLORS.glassFill,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {},
  arrowButton: {
    top: '50%',
    marginTop: -ARROW_SIZE / 2,
  },
});
