/**
 * JigsawPuzzleUI - Renders the page's background image as a scrambled
 * grid of tiles that the user must swap back into order.
 *
 * Each tile shows a cropped portion of the original image using overflow
 * clipping and offset positioning so it works on both iOS and Android
 * without any native image-cropping dependency.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import type { JigsawChallengeHookResult } from '@/hooks/use-jigsaw-challenge';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JigsawPuzzleUIProps {
  challenge: JigsawChallengeHookResult;
  /** URI or require() source for the page background image */
  imageSource: { uri: string } | number;
  promptText: string;
  allowSkip?: boolean;
  onSkip?: () => void;
  onContinue?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const JigsawPuzzleUI: React.FC<JigsawPuzzleUIProps> = ({
  challenge,
  imageSource,
  promptText,
  allowSkip = false,
  onSkip,
  onContinue,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { scaledFontSize, isTablet } = useAccessibility();

  const { tiles, gridSize, selectedTile, validSwapTargets, isComplete, moveCount } = challenge;
  const n = gridSize;
  const total = n * n;

  // Celebration animation
  const celebrationScale = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (isComplete) {
      celebrationScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.08, { damping: 12, stiffness: 180 }),
        withSpring(1, { damping: 20, stiffness: 200 })
      );
      celebrationOpacity.value = withTiming(1, { duration: 400 });
    } else {
      celebrationScale.value = 0;
      celebrationOpacity.value = 0;
    }
  }, [isComplete]);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  // Calculate puzzle dimensions - fit within the visible area with padding
  const puzzleSize = useMemo(() => {
    const maxW = screenWidth - insets.left - insets.right - 40;
    const maxH = screenHeight - insets.top - insets.bottom - 160; // room for prompt + buttons
    return Math.min(maxW, maxH);
  }, [screenWidth, screenHeight, insets]);

  const tileSize = puzzleSize / n;

  const handleTileTap = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    challenge.tapTile(index);
  }, [challenge]);

  const handleStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    challenge.start();
  }, [challenge]);

  // -----------------------------------------------------------------------
  // Idle state - show "Begin Puzzle" button
  // -----------------------------------------------------------------------
  if (challenge.state === 'idle') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={[styles.promptText, { fontSize: scaledFontSize(18) }]}>{promptText}</Text>
        <Pressable style={styles.beginButton} onPress={handleStart}>
          <Text style={[styles.beginButtonText, { fontSize: scaledFontSize(18) }]}>
            {t('jigsaw.beginPuzzle')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Playing / Completed state - show puzzle grid
  // -----------------------------------------------------------------------
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      {/* Prompt / Celebration */}
      {isComplete ? (
        <Animated.View style={[styles.celebrationContainer, celebrationStyle]}>
          <Text style={[styles.celebrationText, { fontSize: scaledFontSize(36) }]}>
            {t('jigsaw.amazing')}
          </Text>
          <Text style={[styles.celebrationSubtext, { fontSize: scaledFontSize(14) }]}>
            {t('jigsaw.completedMoves', { count: moveCount })}
          </Text>
        </Animated.View>
      ) : (
        <Text style={[styles.promptText, { fontSize: scaledFontSize(14) }]}>{promptText}</Text>
      )}

      {/* Puzzle Grid */}
      <View style={[styles.puzzleContainer, { width: puzzleSize, height: puzzleSize }]}>
        {tiles.map((originalIndex, visualIndex) => {
          const row = Math.floor(visualIndex / n);
          const col = visualIndex % n;
          const origRow = Math.floor(originalIndex / n);
          const origCol = originalIndex % n;
          const isSelected = visualIndex === selectedTile;
          const isSwapTarget = validSwapTargets.includes(visualIndex);
          const isCorrect = originalIndex === visualIndex;

          return (
            <Pressable
              key={`tile-${visualIndex}`}
              onPress={() => handleTileTap(visualIndex)}
              style={[
                styles.tile,
                {
                  width: tileSize,
                  height: tileSize,
                  left: col * tileSize,
                  top: row * tileSize,
                },
                isSelected && styles.tileSelected,
                isSwapTarget && styles.tileSwapTarget,
                isComplete && isCorrect && styles.tileCompleted,
              ]}
            >
              {/* Clipped image tile - shows the portion of the original image
                   that belongs to this tile's *original* position */}
              <View style={[styles.tileImageClip, { width: tileSize - 2, height: tileSize - 2 }]}>
                <Image
                  source={imageSource}
                  style={{
                    width: puzzleSize,
                    height: puzzleSize,
                    position: 'absolute',
                    left: -(origCol * tileSize),
                    top: -(origRow * tileSize),
                  }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Bottom buttons */}
      <View style={styles.buttonRow}>
        {isComplete ? (
          <Pressable style={styles.actionButton} onPress={onContinue}>
            <Text style={[styles.actionButtonText, { fontSize: scaledFontSize(16) }]}>
              {t('jigsaw.continueStory')}
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={styles.actionButtonSecondary} onPress={challenge.retry}>
              <Text style={[styles.actionButtonSecondaryText, { fontSize: scaledFontSize(14) }]}>
                {t('jigsaw.shuffle')}
              </Text>
            </Pressable>
            {allowSkip && (
              <Pressable style={styles.actionButtonSecondary} onPress={onSkip}>
                <Text style={[styles.actionButtonSecondaryText, { fontSize: scaledFontSize(14) }]}>
                  {t('jigsaw.skip')}
                </Text>
              </Pressable>
            )}
          </>
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  promptText: {
    color: '#FFFFFF',
    fontFamily: Fonts.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationText: {
    color: '#FFD700',
    fontFamily: Fonts.primary,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  celebrationSubtext: {
    color: '#FFFFFF',
    fontFamily: Fonts.primary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
  puzzleContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  tile: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: '#FFD700',
    zIndex: 5,
  },
  tileSwapTarget: {
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.8)',
  },
  tileCompleted: {
    borderColor: 'rgba(129, 199, 132, 0.5)',
  },
  tileImageClip: {
    overflow: 'hidden',
    borderRadius: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  beginButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 20,
  },
  beginButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.primary,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonSecondaryText: {
    color: '#FFFFFF',
    fontFamily: Fonts.primary,
    fontWeight: '600',
  },
});