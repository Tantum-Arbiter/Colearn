/**
 * JigsawPuzzleUI - Renders the page's background image as a full-screen
 * jigsaw puzzle with properly shaped interlocking pieces.
 *
 * Three visual states:
 *   idle      → Full image shown with jigsaw boundary lines drawn on top.
 *               A "Scramble" button invites the user to start.
 *   playing   → Tiles scrambled, user swaps them back. Action bar at bottom.
 *   completed → Celebration overlay if completed without resetting.
 *
 * Each tile is clipped with an SVG path that includes tabs (convex) and
 * blanks (concave) so the pieces look like real jigsaw pieces.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Defs, ClipPath, Image as SvgImage } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import type { JigsawChallengeHookResult } from '@/hooks/use-jigsaw-challenge';
import { getTileEdges, buildTileClipPath, buildBoundaryLines } from './jigsaw-shapes';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JigsawPuzzleUIProps {
  challenge: JigsawChallengeHookResult;
  /** URI or require() source for the page background image */
  imageSource: { uri: string } | number;
  /** Called when the user presses Reset (give up) */
  onReset?: () => void;
  /** Called when the user taps Continue after completion */
  onContinue?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const JigsawPuzzleUI: React.FC<JigsawPuzzleUIProps> = ({
  challenge,
  imageSource,
  onReset,
  onContinue,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { scaledFontSize } = useAccessibility();

  const { tiles, gridSize, selectedTile, validSwapTargets, moveCount, completedCleanly } = challenge;
  const isComplete = challenge.isComplete;
  const n = gridSize;

  // Preview overlay state
  const [showPreview, setShowPreview] = useState(false);
  const previewOpacity = useSharedValue(0);

  const openPreview = useCallback(() => {
    setShowPreview(true);
    previewOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const closePreview = useCallback(() => {
    previewOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(setShowPreview)(false);
    });
  }, []);

  const previewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: previewOpacity.value,
  }));

  // ── Scramble transition animation ──
  // When idle→playing: background-home.webp scrolls in rotated landscape,
  // then folds back up before jigsaw tiles fade in.
  const [isScrambling, setIsScrambling] = useState(false);
  const scrambleY = useSharedValue(0);              // vertical pan
  const scrambleRotation = useSharedValue(0);       // rotation degrees
  const scrambleScale = useSharedValue(1);
  const scrambleOpacity = useSharedValue(0);
  const tilesOpacity = useSharedValue(1);
  const prevStateRef = useRef(challenge.state);

  React.useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = challenge.state;

    // Trigger scramble animation on idle → playing
    if (prev === 'idle' && challenge.state === 'playing') {
      setIsScrambling(true);
      tilesOpacity.value = 0; // hide tiles initially

      // Phase 1: Image appears below screen, rotated 90° (landscape), scaled up
      scrambleOpacity.value = withTiming(1, { duration: 200 });
      scrambleY.value = screenHeight;      // start off-screen below
      scrambleRotation.value = 90;         // landscape
      scrambleScale.value = 1.4;

      // Slide up to center
      scrambleY.value = withTiming(0, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });

      // Phase 2: Fold back -rotate to 0° and scale to 1×, slide up further
      scrambleRotation.value = withDelay(900,
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.cubic) })
      );
      scrambleScale.value = withDelay(900,
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) })
      );
      scrambleY.value = withDelay(900,
        withTiming(-screenHeight, { duration: 700, easing: Easing.in(Easing.cubic) })
      );

      // Phase 3: Fade out image, fade in tiles
      scrambleOpacity.value = withDelay(1500,
        withTiming(0, { duration: 300 })
      );
      tilesOpacity.value = withDelay(1600,
        withTiming(1, { duration: 400 }, () => {
          runOnJS(setIsScrambling)(false);
        })
      );
    }

    // Reset on playing → idle
    if (prev === 'playing' && challenge.state === 'idle') {
      scrambleOpacity.value = 0;
      tilesOpacity.value = 1;
      setIsScrambling(false);
    }
  }, [challenge.state]);

  const scrambleImageStyle = useAnimatedStyle(() => ({
    opacity: scrambleOpacity.value,
    transform: [
      { translateY: scrambleY.value },
      { rotate: `${scrambleRotation.value}deg` },
      { scale: scrambleScale.value },
    ],
  }));

  const tilesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tilesOpacity.value,
  }));

  // Celebration animation (only for clean completion)
  const celebrationScale = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (completedCleanly) {
      celebrationScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.08, { damping: 12, stiffness: 180 }),
        withSpring(1, { damping: 20, stiffness: 200 })
      );
      celebrationOpacity.value = withTiming(1, { duration: 400 });

      // Auto-continue after 4 seconds so the user returns to the story
      const timer = setTimeout(() => {
        onContinue?.();
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      celebrationScale.value = 0;
      celebrationOpacity.value = 0;
    }
  }, [completedCleanly]);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  const isPlaying = challenge.state === 'playing';
  const isIdle = challenge.state === 'idle';

  // ── Resolve actual image dimensions for correct aspect-ratio rendering ──
  const [imgNatural, setImgNatural] = useState({ w: screenWidth, h: screenHeight });

  useEffect(() => {
    if (typeof imageSource === 'number') {
      // Local require() -resolve synchronously
      const asset = RNImage.resolveAssetSource(imageSource);
      if (asset) setImgNatural({ w: asset.width, h: asset.height });
    } else if (imageSource?.uri) {
      RNImage.getSize(
        imageSource.uri,
        (w, h) => setImgNatural({ w, h }),
        () => { /* keep defaults on error */ },
      );
    }
  }, [imageSource]);

  // Puzzle sizing -full screen in idle, scaled-down with preserved aspect ratio when playing
  const puzzlePadding = 32;
  const topReserved = 70 + insets.top; // space for buttons at top
  const availableWidth = screenWidth - puzzlePadding * 2;
  const availableHeight = screenHeight - topReserved - puzzlePadding;
  // Scale the image aspect ratio to fit within available space (not screen aspect)
  const imgAspect = imgNatural.w / imgNatural.h;
  let fittedWidth: number, fittedHeight: number;
  if (imgAspect > availableWidth / availableHeight) {
    // Image is wider than available -fit to width, height follows
    fittedWidth = availableWidth;
    fittedHeight = availableWidth / imgAspect;
  } else {
    // Image is taller -fit to height, width follows
    fittedHeight = availableHeight;
    fittedWidth = availableHeight * imgAspect;
  }
  const puzzleWidth = isIdle ? screenWidth : fittedWidth;
  const puzzleHeight = isIdle ? screenHeight : fittedHeight;
  const puzzleLeft = isIdle ? 0 : (screenWidth - fittedWidth) / 2;
  const puzzleTop = isIdle ? 0 : topReserved + (availableHeight - fittedHeight) / 2;
  const tileWidth = puzzleWidth / n;
  const tileHeight = puzzleHeight / n;

  // ── Cover-crop calculation for SVG image ──
  // The source images often have a white/transparent border baked in.
  // We inset by a percentage of the image dimensions to exclude that border,
  // then scale the remaining "content area" to fill the puzzle viewport.
  // Larger grids need a heavier crop so white borders don't end up as
  // confusing tile content.  2×2 is fine with a light inset; 4×4 needs more.
  const borderInsetPct = n >= 4 ? 0.12 : 0.04; // 12% for 4×4+, 4% for 2×2
  const safeW = imgNatural.w * (1 - borderInsetPct * 2); // content width after inset
  const safeH = imgNatural.h * (1 - borderInsetPct * 2); // content height after inset

  // Scale the safe content area to cover the puzzle viewport (preserving aspect ratio)
  const coverScale = Math.max(puzzleWidth / safeW, puzzleHeight / safeH);
  const coveredW = imgNatural.w * coverScale;   // full image rendered width
  const coveredH = imgNatural.h * coverScale;   // full image rendered height
  // Centre-crop: offset includes both the border inset and any aspect-ratio overflow
  const cropOffsetX = (coveredW - puzzleWidth) / 2;  // trim from left
  const cropOffsetY = (coveredH - puzzleHeight) / 2; // trim from top

  // Extra margin around each tile to accommodate protruding nubs
  const nubMarginX = tileWidth * 0.18;
  const nubMarginY = tileHeight * 0.18;
  // Expanded bounding box for each tile (includes nub overflow)
  const expandedW = tileWidth + nubMarginX * 2;
  const expandedH = tileHeight + nubMarginY * 2;

  // Pre-compute jigsaw boundary SVG path for idle overlay
  const boundaryPath = useMemo(
    () => buildBoundaryLines(puzzleWidth, puzzleHeight, n),
    [puzzleWidth, puzzleHeight, n],
  );

  const handleTileTap = useCallback((index: number) => {
    if (isComplete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    challenge.tapTile(index);
  }, [challenge, isComplete]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    challenge.reset();
    onReset?.();
  }, [challenge, onReset]);

  // -----------------------------------------------------------------------
  // Full-screen puzzle grid (playing / completed states)
  // -----------------------------------------------------------------------
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* ── Idle state: full image + jigsaw boundary lines ── */}
      {isIdle && (
        <View style={[styles.puzzleContainer, { width: puzzleWidth, height: puzzleHeight }]}>
          <Image
            source={imageSource}
            style={{ width: puzzleWidth, height: puzzleHeight }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {/* SVG jigsaw boundary overlay */}
          <Svg
            width={puzzleWidth}
            height={puzzleHeight}
            style={StyleSheet.absoluteFill}
          >
            <Path
              d={boundaryPath}
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth={2.5}
              fill="none"
            />
          </Svg>
        </View>
      )}

      {/* ── Scramble transition: background-home scrolls landscape, folds back ── */}
      {isScrambling && (
        <Animated.View
          style={[
            styles.scrambleOverlay,
            { width: screenWidth, height: screenHeight },
            scrambleImageStyle,
          ]}
          pointerEvents="none"
        >
          <Image
            source={require('@/assets/images/ui-elements/background-home.webp')}
            style={{ width: screenWidth, height: screenHeight }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      )}

      {/* ── Playing / Completed state: scrambled jigsaw tiles ── */}
      {!isIdle && (
      <Animated.View style={[styles.puzzleContainer, { width: puzzleWidth, height: puzzleHeight, left: puzzleLeft, top: puzzleTop }, tilesAnimatedStyle]}>
        {tiles.map((originalIndex, visualIndex) => {
          const row = Math.floor(visualIndex / n);
          const col = visualIndex % n;
          const origRow = Math.floor(originalIndex / n);
          const origCol = originalIndex % n;
          const isSelected = visualIndex === selectedTile;
          const isSwapTarget = validSwapTargets.includes(visualIndex);

          // Edges for the ORIGINAL piece shape (based on where the piece belongs)
          const edges = getTileEdges(origRow, origCol, n);
          const clipD = buildTileClipPath(tileWidth, tileHeight, edges);

          // Tile visual position with nub overflow offset
          const tileLeft = col * tileWidth - nubMarginX;
          const tileTop = row * tileHeight - nubMarginY;

          // Resolve the image href for SVG <Image>
          const imgHref = typeof imageSource === 'number' ? imageSource : imageSource.uri;

          // Image offset -position the cover-cropped image so the correct
          // slice is visible through this tile's clip path.
          // cropOffset accounts for the centre-crop; coveredW/H is the
          // rendered image size that fills the puzzle without distortion.
          const imgX = -cropOffsetX - (origCol * tileWidth) + nubMarginX;
          const imgY = -cropOffsetY - (origRow * tileHeight) + nubMarginY;

          return (
            <Pressable
              key={`tile-${visualIndex}`}
              onPress={() => handleTileTap(visualIndex)}
              style={[
                styles.tile,
                {
                  width: expandedW,
                  height: expandedH,
                  left: tileLeft,
                  top: tileTop,
                },
              ]}
            >
              <Svg width={expandedW} height={expandedH}>
                <Defs>
                  <ClipPath id={`clip-${visualIndex}`}>
                    <Path d={clipD} transform={`translate(${nubMarginX}, ${nubMarginY})`} />
                  </ClipPath>
                </Defs>
                {/* Clipped image -cover-fitted to avoid warping */}
                <SvgImage
                  href={imgHref}
                  x={imgX}
                  y={imgY}
                  width={coveredW}
                  height={coveredH}
                  clipPath={`url(#clip-${visualIndex})`}
                  preserveAspectRatio="none"
                />
                {/* Piece outline */}
                <Path
                  d={clipD}
                  transform={`translate(${nubMarginX}, ${nubMarginY})`}
                  stroke={isSelected ? '#FFD700' : isSwapTarget && selectedTile >= 0 ? 'rgba(78, 205, 196, 0.8)' : 'rgba(255, 255, 255, 0.35)'}
                  strokeWidth={isSelected ? 3 : isSwapTarget && selectedTile >= 0 ? 2.5 : 1.5}
                  fill="none"
                />
              </Svg>
            </Pressable>
          );
        })}
      </Animated.View>
      )}

      {/* ── UI overlay layer: sits ABOVE the puzzle tiles ── */}
      <View style={styles.uiOverlayLayer} pointerEvents="box-none">

        {/* Celebration overlay (only on clean completion) */}
        {completedCleanly && (
          <View style={styles.celebrationOverlay}>
            <Animated.View style={[styles.celebrationContainer, celebrationStyle]}>
              <Ionicons name="trophy-outline" size={scaledFontSize(60)} color="#FFD700" />
              <Text style={[styles.celebrationText, { fontSize: scaledFontSize(42) }]}>
                {t('jigsaw.amazing')}
              </Text>
              <Text style={[styles.celebrationSubtext, { fontSize: scaledFontSize(16) }]}>
                {t('jigsaw.completedMoves', { count: moveCount })}
              </Text>
              <Pressable style={styles.continueButton} onPress={onContinue}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.continueButtonText, { fontSize: scaledFontSize(16) }]}>
                    {t('jigsaw.continueStory')}
                  </Text>
                  <Ionicons name="chevron-forward" size={scaledFontSize(14)} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </View>
              </Pressable>
            </Animated.View>
          </View>
        )}

        {/* Top action buttons -Preview + move count + Reset */}
        {isPlaying && !isScrambling && !isComplete && (
          <View style={[styles.centerActionBar, { top: insets.top + 10 }]}>
            <Pressable style={styles.centerActionButton} onPress={openPreview} testID="jigsaw-preview-button">
              <Ionicons name="eye-outline" size={scaledFontSize(18)} color="#333333" />
            </Pressable>

            {moveCount > 0 && (
              <View style={styles.moveCountInline}>
                <Text style={[styles.moveCountInlineText, { fontSize: scaledFontSize(13) }]}>
                  {moveCount}
                </Text>
              </View>
            )}

            <Pressable style={styles.centerActionButton} onPress={handleReset} testID="jigsaw-reset-button">
              <Ionicons name="refresh-outline" size={scaledFontSize(18)} color="#333333" />
            </Pressable>
          </View>
        )}

        {/* Preview overlay - shows completed image, sized to match puzzle */}
        {showPreview && (
          <Animated.View style={[styles.previewOverlay, previewAnimatedStyle]}>
            <Pressable style={styles.previewBackdrop} onPress={closePreview}>
              <View style={[styles.previewImageContainer, { width: fittedWidth, height: fittedHeight }]}>
                <Image
                  source={imageSource}
                  style={styles.previewImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
              <Text style={[styles.previewHint, { fontSize: scaledFontSize(14) }]}>
                {t('jigsaw.tapToClose')}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  puzzleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Overlay layer that sits above all puzzle tiles for buttons / celebration
  uiOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
  },
  tile: {
    position: 'absolute',
  },

  // Celebration overlay
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  celebrationContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    overflow: 'visible',
  },
  celebrationEmoji: {
    marginBottom: 8,
  },
  celebrationText: {
    color: '#FFD700',
    fontFamily: Fonts.primary,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  celebrationSubtext: {
    color: '#FFFFFF',
    fontFamily: Fonts.primary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  continueButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  // Scramble transition overlay (image slides in landscape)
  scrambleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 60,
  },
  // Top-center action bar (Preview + move count + Reset)
  centerActionBar: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  // Matches navButton style from story-book-reader
  centerActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  moveCountInline: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    minWidth: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  moveCountInlineText: {
    color: '#333333',
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  // Preview overlay
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Fonts.primary,
    fontWeight: '500',
    marginTop: 20,
  },
});