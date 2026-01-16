import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Modal, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, Mask, Rect, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface SpotlightTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: SpotlightTarget; // Optional - if not provided, shows centered modal
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
  tipPosition?: 'above' | 'below' | 'left' | 'right' | 'center';
  /** Shape of the spotlight cutout - 'circle' (default) or 'rounded-rect' */
  spotlightShape?: 'circle' | 'rounded-rect';
  /** Border radius for rounded-rect spotlight shape (default: 20) */
  spotlightBorderRadius?: number;
  /** Optional image to display in the tip */
  image?: number;
}

interface SpotlightOverlayProps {
  visible: boolean;
  step: TutorialStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  /** If true, skip the fade-in animation (used when step changes) */
  skipAnimation?: boolean;
}

const TIP_WIDTH = 280; // Smaller width for less intrusive tips
const PULSE_RING_SIZE = 20; // Extra size for pulsing ring

// Pulsing ring component for focus indication
function PulsingRing({
  target,
  useRoundedRect = false,
  borderRadius = 20,
}: {
  target: SpotlightTarget;
  useRoundedRect?: boolean;
  borderRadius?: number;
}) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Continuous pulsing animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1.15, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(0.2, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulseScale, pulseOpacity]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const padding = PULSE_RING_SIZE / 2;

  if (useRoundedRect) {
    // Rounded rectangle ring matching button shape
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: target.x - padding,
            top: target.y - padding,
            width: target.width + padding * 2,
            height: target.height + padding * 2,
            borderRadius: borderRadius,
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.7)',
          },
          animatedRingStyle,
        ]}
        pointerEvents="none"
      />
    );
  }

  // Default: circular ring based on the smaller dimension
  const diameter = Math.min(target.width, target.height) + padding * 2;
  const radius = diameter / 2;
  // Center the circle on the target
  const centerX = target.x + target.width / 2;
  const centerY = target.y + target.height / 2;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: centerX - radius,
          top: centerY - radius,
          width: diameter,
          height: diameter,
          borderRadius: radius,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.7)',
        },
        animatedRingStyle,
      ]}
      pointerEvents="none"
    />
  );
}

/**
 * Sketch-style hand-drawn arrow that draws from tip card to target
 */
function SketchArrow({
  fromX,
  fromY,
  toX,
  toY,
  ctrlX,
  ctrlY,
  visible,
  screenWidth,
  screenHeight,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  ctrlX: number;
  ctrlY: number;
  visible: boolean;
  screenWidth: number;
  screenHeight: number;
}) {
  const drawProgress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      drawProgress.value = 0;
      drawProgress.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }));
    }
  }, [visible, drawProgress, fromX, fromY, toX, toY]);

  // Calculate dx/dy for path length estimation
  const dx = toX - fromX;
  const dy = toY - fromY;

  // Main arrow path with 90-degree curve (control point creates the L-shape bend)
  const arrowPath = `M ${fromX} ${fromY} Q ${ctrlX} ${ctrlY} ${toX} ${toY}`;

  // Arrowhead - larger to match bolder stroke
  const angle = Math.atan2(toY - ctrlY, toX - ctrlX);
  const arrowSize = 18;
  const arrowAngle = Math.PI / 6; // 30 degrees

  const arrow1X = toX - arrowSize * Math.cos(angle - arrowAngle);
  const arrow1Y = toY - arrowSize * Math.sin(angle - arrowAngle);
  const arrow2X = toX - arrowSize * Math.cos(angle + arrowAngle);
  const arrow2Y = toY - arrowSize * Math.sin(angle + arrowAngle);

  const arrowHeadPath = `M ${arrow1X} ${arrow1Y} L ${toX} ${toY} L ${arrow2X} ${arrow2Y}`;

  // Approximate path length for stroke-dasharray animation
  const pathLength = Math.sqrt(dx * dx + dy * dy) * 1.5; // Increased for curved path

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(drawProgress.value, [0, 1], [pathLength, 0]),
  }));

  const animatedHeadProps = useAnimatedProps(() => ({
    opacity: interpolate(drawProgress.value, [0.7, 1], [0, 1]),
  }));

  return (
    <Svg
      width={screenWidth}
      height={screenHeight}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Main curved line */}
      <AnimatedPath
        d={arrowPath}
        stroke="#4ECDC4"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeDasharray={pathLength}
        fill="none"
        animatedProps={animatedPathProps}
      />
      {/* Arrowhead */}
      <AnimatedPath
        d={arrowHeadPath}
        stroke="#4ECDC4"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animatedProps={animatedHeadProps}
      />
    </Svg>
  );
}

export function SpotlightOverlay({
  visible,
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  skipAnimation = false,
}: SpotlightOverlayProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const tipOpacity = useSharedValue(skipAnimation ? 1 : 0);
  const tipScale = useSharedValue(skipAnimation ? 1 : 0.9);
  const overlayOpacity = useSharedValue(skipAnimation ? 1 : 0);

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  const hasTarget = !!step.target;

  // On Android, the Modal with statusBarTranslucent renders from y=0 (top of status bar),
  // but measureInWindow returns coordinates relative to the content area (below status bar).
  // We need to add the status bar height (insets.top) to align the spotlight correctly.
  const adjustedTarget = step.target && Platform.OS === 'android' ? {
    ...step.target,
    y: step.target.y + insets.top,
  } : step.target;

  // Check if we're on a phone in landscape mode (shorter dimension < 600 and width > height)
  const isPhoneLandscape = Math.min(screenWidth, screenHeight) < 600 && screenWidth > screenHeight;

  // Dynamic tip width based on orientation
  const dynamicTipWidth = isPhoneLandscape ? Math.min(screenWidth - 80, 420) : TIP_WIDTH;

  // Track if we've done the initial animation to prevent flicker on re-renders
  const hasAnimatedIn = useRef(skipAnimation);

  useEffect(() => {
    if (visible && !hasAnimatedIn.current) {
      // Only animate in once per mount
      hasAnimatedIn.current = true;
      overlayOpacity.value = withTiming(1, { duration: 250 });
      tipOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      tipScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    } else if (!visible) {
      hasAnimatedIn.current = false;
      overlayOpacity.value = withTiming(0, { duration: 200 });
      tipOpacity.value = withTiming(0, { duration: 150 });
      tipScale.value = withTiming(0.9, { duration: 150 });
    }
  }, [visible, tipOpacity, tipScale, overlayOpacity]);

  const animatedTipStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
    transform: [{ scale: tipScale.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  // Dynamic tip positioning based on step.tipPosition property
  const tipHeight = 160; // Smaller height

  const getTipPosition = () => {
    const centerLeft = (screenWidth - TIP_WIDTH) / 2;
    const centerTop = (screenHeight - tipHeight) / 2;
    // Use the Android-adjusted target for positioning
    const target = adjustedTarget;

    // Check if we're on a small mobile screen (phone) - use shorter dimension to detect phone
    const isSmallScreen = Math.min(screenWidth, screenHeight) < 600;
    // Check if portrait orientation
    const isPortrait = screenHeight > screenWidth;
    const isPhonePortrait = isSmallScreen && isPortrait;

    // Use tipPosition from step configuration if available
    if (step.tipPosition === 'center') {
      return { left: centerLeft, top: centerTop };
    }

    // Handle 'below' tipPosition - position tip below the target button
    if (step.tipPosition === 'below' && target) {
      // Book mode buttons on iPad/tablet: position tip to the right of the button
      const bookModeButtons = ['read_button', 'record_button', 'narrate_button', 'preview_button'];
      if (!isPhonePortrait && bookModeButtons.includes(step.id)) {
        const margin = 20;
        const tipLeft = target.x + target.width + margin;
        // Center tip vertically with the button
        const tipTop = target.y + (target.height / 2) - (tipHeight / 2);
        // Make sure tip doesn't go off screen
        const maxLeft = screenWidth - TIP_WIDTH - 20;
        const minTop = insets.top + 20;
        const maxTop = screenHeight - tipHeight - insets.bottom - 20;
        return {
          left: Math.min(tipLeft, maxLeft),
          top: Math.max(minTop, Math.min(tipTop, maxTop))
        };
      }
      // For phones or other cases: position tip below the target
      const margin = 30;
      const tipTop = target.y + target.height + margin;
      // Make sure tip doesn't go off screen
      const maxTop = screenHeight - tipHeight - insets.bottom - 20;
      return { left: centerLeft, top: Math.min(tipTop, maxTop) };
    }

    // Handle 'above' tipPosition - position tip above the target button
    // For emotions and bedtime buttons, use fixed percentage positioning since they're
    // in the lower portion of the screen and we want tip clearly above them
    if (step.tipPosition === 'above') {
      // Emotions and bedtime buttons are in lower half - position tip at ~30% from top
      // This ensures tip is visible above the buttons without overlapping
      if (step.id === 'emotions_button' || step.id === 'bedtime_button') {
        return { left: centerLeft, top: screenHeight * 0.30 };
      }
      // For other 'above' positioned tips, use target-relative positioning
      if (target) {
        const margin = isPhonePortrait ? 40 : 30;
        const tipTop = target.y - tipHeight - margin;
        const minTop = insets.top + 20;
        return { left: centerLeft, top: Math.max(tipTop, minTop) };
      }
      // Fallback
      return { left: centerLeft, top: screenHeight * 0.35 };
    }

    // Legacy per-step-id positioning for backwards compatibility
    switch (step.id) {
      case 'stories_button':
        // Position below center menu button, lower on phones to avoid overlap
        if (isPhonePortrait) {
          return { left: centerLeft, top: screenHeight * 0.62 };
        }
        return { left: centerLeft, top: screenHeight * 0.55 };
      case 'settings_button':
      case 'sound_control':
      case 'welcome':
      default:
        // Default to middle area
        return { left: centerLeft, top: screenHeight * 0.50 };
    }
  };

  const tipPosition = getTipPosition();

  // Check if we're on a small mobile screen (phone) - use shorter dimension to detect phone
  const isSmallScreen = Math.min(screenWidth, screenHeight) < 600;
  // Check if portrait orientation
  const isPortrait = screenHeight > screenWidth;
  const isPhoneDevice = isSmallScreen;

  // Calculate sketch arrow coordinates (from center of tip card to target button)
  const getSketchArrowCoords = () => {
    if (!hasTarget || !adjustedTarget) return null;

    // No arrows for main menu buttons (stories, emotions, bedtime) - on all devices
    if (step.id === 'stories_button' || step.id === 'emotions_button' || step.id === 'bedtime_button') {
      return null;
    }

    // No arrows for book mode buttons - on all devices (tip is positioned next to button)
    const bookModeButtons = ['read_button', 'record_button', 'narrate_button', 'preview_button'];
    if (bookModeButtons.includes(step.id)) {
      return null;
    }

    // Use the Android-adjusted target for arrow positioning
    const target = adjustedTarget;
    const buttonCenterX = target.x + target.width / 2;
    const buttonCenterY = target.y + target.height / 2;

    // Arrow starts from the left edge of the tip card (for left-pointing arrows)
    // or center for other directions
    const tipCardHeight = 160;
    const tipCenterX = tipPosition.left + TIP_WIDTH / 2;
    const tipCenterY = tipPosition.top + tipCardHeight / 2;

    // Stop arrow at a fixed distance from the button edge
    const distanceFromButton = 25;
    const buttonRadiusX = target.width / 2;
    const buttonRadiusY = target.height / 2;

    // Inset from edge of tip card so arrow appears to start from within the card
    const arrowInset = 20;

    // Use arrowDirection from step configuration if available
    if (step.arrowDirection === 'left') {
      // Arrow starts from inside left edge of tip, goes to right edge of button
      const fromX = tipPosition.left + arrowInset;
      const fromY = tipCenterY;
      const toX = target.x + target.width + distanceFromButton;
      const toY = buttonCenterY;
      // Control point creates an L-shaped curve
      return { fromX, fromY, toX, toY, ctrlX: fromX, ctrlY: toY };
    } else if (step.arrowDirection === 'right') {
      // Arrow starts from inside right edge of tip, goes to left edge of button
      const fromX = tipPosition.left + TIP_WIDTH - arrowInset;
      const fromY = tipCenterY;
      const toX = target.x - distanceFromButton;
      const toY = buttonCenterY;
      return { fromX, fromY, toX, toY, ctrlX: fromX, ctrlY: toY };
    } else if (step.arrowDirection === 'up') {
      // Arrow starts from inside top edge of tip, goes to bottom edge of button
      const fromX = tipCenterX;
      const fromY = tipPosition.top + arrowInset;
      const toX = buttonCenterX;
      const toY = target.y + target.height + distanceFromButton;
      // Control point creates a smooth curve
      return { fromX, fromY, toX, toY, ctrlX: toX, ctrlY: fromY };
    } else if (step.arrowDirection === 'down') {
      // Arrow starts from inside bottom edge of tip, goes to top edge of button
      const fromX = tipCenterX;
      const fromY = tipPosition.top + tipCardHeight - arrowInset;
      const toX = buttonCenterX;
      const toY = target.y - distanceFromButton;
      // Control point creates a smooth curve
      return { fromX, fromY, toX, toY, ctrlX: toX, ctrlY: fromY };
    }

    // Default: vertical approach
    const fromX = tipCenterX;
    const fromY = tipCenterY;
    const isAbove = buttonCenterY < fromY;
    const toX = buttonCenterX;
    const toY = isAbove
      ? buttonCenterY + buttonRadiusY + distanceFromButton
      : buttonCenterY - buttonRadiusY - distanceFromButton;

    const ctrlX = toX;
    const ctrlY = fromY;

    return { fromX, fromY, toX, toY, ctrlX, ctrlY };
  };

  const sketchArrowCoords = getSketchArrowCoords();

  // Calculate spotlight cutout sized to the actual button dimensions
  // Use adjustedTarget which already accounts for Android navigation bar offset
  const target = adjustedTarget;

  const spotlightPadding = 8; // Padding around the button
  const useRoundedRect = step.spotlightShape === 'rounded-rect';
  const spotlightBorderRadius = step.spotlightBorderRadius ?? 20;

  // Unique mask ID per step to prevent conflicts when switching steps
  const maskId = `spotlight-mask-${step.id}-${currentStepIndex}`;

  // Render the appropriate spotlight shape for the mask
  const renderSpotlightShape = () => {
    if (!target) return null;

    if (useRoundedRect) {
      // Rounded rectangle spotlight matching button shape
      return (
        <Rect
          x={target.x - spotlightPadding}
          y={target.y - spotlightPadding}
          width={target.width + spotlightPadding * 2}
          height={target.height + spotlightPadding * 2}
          rx={spotlightBorderRadius}
          ry={spotlightBorderRadius}
          fill="black"
        />
      );
    }

    // Default: circular spotlight
    return (
      <Circle
        cx={target.x + target.width / 2}
        cy={target.y + target.height / 2}
        r={Math.min(target.width, target.height) / 2 + spotlightPadding}
        fill="black"
      />
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      {/* Main container */}
      <View style={styles.overlay}>
        {/* Invisible touch-blocking layer - blocks ALL touches immediately on mount */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {}}
          onPressIn={() => {}}
          onPressOut={() => {}}
        />
        {/* Semi-transparent overlay with spotlight cutout for target */}
        <Animated.View style={[StyleSheet.absoluteFill, animatedOverlayStyle]} pointerEvents="none">
          <Svg
            key={`svg-${step.id}-${currentStepIndex}`}
            width={screenWidth}
            height={screenHeight}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <Mask id={maskId}>
                {/* White = visible (dim overlay), Black = transparent (spotlight) */}
                <Rect x="0" y="0" width={screenWidth} height={screenHeight} fill="white" />
                {renderSpotlightShape()}
              </Mask>
            </Defs>
            {/* Semi-transparent overlay with spotlight hole */}
            <Rect
              x="0"
              y="0"
              width={screenWidth}
              height={screenHeight}
              fill="rgba(0, 0, 0, 0.75)"
              mask={`url(#${maskId})`}
            />
          </Svg>
        </Animated.View>

        {/* Pulsing ring for focus indication */}
        {hasTarget && adjustedTarget && (
          <PulsingRing
            target={adjustedTarget}
            useRoundedRect={useRoundedRect}
            borderRadius={spotlightBorderRadius}
          />
        )}

        {/* Sketch-style curved arrow from center to target */}
        {sketchArrowCoords && (
          <SketchArrow
            key={`arrow-${step.id}-${currentStepIndex}`}
            fromX={sketchArrowCoords.fromX}
            fromY={sketchArrowCoords.fromY}
            toX={sketchArrowCoords.toX}
            toY={sketchArrowCoords.toY}
            ctrlX={sketchArrowCoords.ctrlX}
            ctrlY={sketchArrowCoords.ctrlY}
            visible={visible}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
          />
        )}

        {/* Tip card - landscape uses compact horizontal layout */}
        <Animated.View
          style={[
            styles.tipCard,
            tipPosition,
            animatedTipStyle,
            isPhoneLandscape && {
              width: dynamicTipWidth,
              flexDirection: 'row',
              padding: 12,
              paddingTop: 12,
              alignItems: 'center',
            }
          ]}
        >
          {isPhoneLandscape ? (
            // Landscape layout: horizontal arrangement
            <>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.tipTitle, { marginBottom: 0, marginRight: 8, fontSize: 14 }]}>{step.title}</Text>
                  <View style={[styles.stepBadge, { position: 'relative', top: 0, right: 0 }]}>
                    <Text style={[styles.stepBadgeText, { fontSize: 10 }]}>
                      {currentStepIndex + 1}/{totalSteps}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tipDescription, { fontSize: 12, marginBottom: 6 }]}>{step.description}</Text>
                <View style={[styles.progressBar, { height: 3 }]}>
                  <View style={[styles.progressFill, { width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }]} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {!isFirstStep && (
                  <Pressable onPress={onPrevious} style={[styles.navButton, { padding: 6 }]}>
                    <Ionicons name="arrow-back" size={16} color="#666" />
                  </Pressable>
                )}
                <Pressable
                  onPress={isLastStep ? onComplete : onNext}
                  style={[styles.navButton, styles.nextButton, { paddingHorizontal: 12, paddingVertical: 6, maxWidth: 120 }]}
                >
                  <Text style={[styles.nextText, { fontSize: 12 }]} numberOfLines={1} adjustsFontSizeToFit>{isLastStep ? t('tutorial.buttons.done') : t('tutorial.buttons.next')}</Text>
                </Pressable>
                <Pressable onPress={onSkip} style={[styles.skipButton, { marginLeft: 4 }]}>
                  <Text style={[styles.skipText, { fontSize: 11 }]} numberOfLines={1} adjustsFontSizeToFit>{t('tutorial.buttons.skip')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            // Portrait layout: vertical arrangement
            <>
              {/* Step indicator badge */}
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  {currentStepIndex + 1} / {totalSteps}
                </Text>
              </View>

              <Text style={styles.tipTitle}>{step.title}</Text>
              <Text style={styles.tipDescription}>{step.description}</Text>

              {/* Progress bar instead of dots for cleaner look */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }
                  ]}
                />
              </View>

              {/* Navigation buttons */}
              <View style={styles.buttonRow}>
                <Pressable onPress={onSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>{t('tutorial.buttons.skipTour')}</Text>
                </Pressable>

                <View style={styles.navButtons}>
                  {!isFirstStep && (
                    <Pressable onPress={onPrevious} style={styles.navButton}>
                      <Ionicons name="arrow-back" size={18} color="#666" />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={isLastStep ? onComplete : onNext}
                    style={[styles.navButton, styles.nextButton]}
                  >
                    <Text style={styles.nextText} numberOfLines={1} adjustsFontSizeToFit>{isLastStep ? t('tutorial.buttons.gotIt') : t('tutorial.buttons.next')}</Text>
                    {!isLastStep && <Ionicons name="arrow-forward" size={16} color="#fff" />}
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // Background color ensures touch blocking works immediately, even during animations
    // Using fully transparent so the animated SVG overlay provides the visual effect
    backgroundColor: 'transparent',
  },
  tipCard: {
    position: 'absolute',
    width: TIP_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    paddingTop: 28, // Extra padding for step badge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },
  stepBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600' as const,
    color: '#4ECDC4',
  },
  tipTitle: {
    fontSize: 17,
    fontFamily: Fonts.primary,
    fontWeight: '700' as const,
    color: '#1a1a2e',
    marginBottom: 6,
    marginTop: 2,
  },
  tipDescription: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#5a5a6a',
    lineHeight: 20,
    marginBottom: 14,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e8e8e8',
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '500' as const,
    color: '#999',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
  },
  nextButton: {
    backgroundColor: '#4ECDC4',
    minWidth: 90,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  nextText: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    fontWeight: '600' as const,
    color: '#fff',
    marginRight: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

