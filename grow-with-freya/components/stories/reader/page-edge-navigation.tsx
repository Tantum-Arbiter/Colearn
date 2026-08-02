import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH_TARGET } from '@/constants/story-garden-motion';

export const EDGE_ZONE_WIDTH = 64;
export const PAGE_CORNER_SIZE = 64;

export interface PageEdgeNavigationProps {
  canGoNext: boolean;
  canGoPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  /** Off on pages with interactive objects, so the edges cannot swallow a hotspot. */
  edgesEnabled?: boolean;
}

export const PageEdgeNavigation = memo(function PageEdgeNavigation({
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
  edgesEnabled = true,
}: PageEdgeNavigationProps) {
  const { t } = useTranslation();

  const handleNext = useCallback(() => {
    if (!canGoNext) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  }, [canGoNext, onNext]);

  const handlePrevious = useCallback(() => {
    if (!canGoPrevious) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrevious();
  }, [canGoPrevious, onPrevious]);

  return (
    <View style={styles.container} pointerEvents="box-none" testID="page-edge-navigation">
      {edgesEnabled && (
        <Pressable
          onPress={handlePrevious}
          disabled={!canGoPrevious}
          accessibilityRole="button"
          accessibilityLabel={t('storyGarden.previousPage')}
          style={styles.leftEdge}
          testID="page-edge-previous"
        />
      )}

      {edgesEnabled && (
        <Pressable
          onPress={handleNext}
          disabled={!canGoNext}
          accessibilityRole="button"
          accessibilityLabel={t('storyGarden.nextPage')}
          style={styles.rightEdge}
          testID="page-edge-next"
        />
      )}

      {canGoNext && (
        <Pressable
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={t('storyGarden.nextPage')}
          style={styles.cornerTouchArea}
          testID="page-corner"
        >
          <View style={styles.cornerMark} pointerEvents="none" testID="page-corner-mark" />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  leftEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_ZONE_WIDTH,
    minWidth: MIN_TOUCH_TARGET,
  },
  rightEdge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: EDGE_ZONE_WIDTH,
    minWidth: MIN_TOUCH_TARGET,
  },
  cornerTouchArea: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: PAGE_CORNER_SIZE,
    height: PAGE_CORNER_SIZE,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  cornerMark: {
    width: 26,
    height: 26,
    borderBottomRightRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
});
