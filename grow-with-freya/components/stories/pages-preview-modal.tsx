import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Story, StoryPage, STORY_TAGS } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
// All story images are loaded from local cache after batch sync - no authenticated fetching needed
import { useTranslation } from 'react-i18next';
import { MENU_INK } from './reader-menu';

const ANIMATION_DURATION = 300;
export const PREVIEW_FACE = '#FDE9C9';
export const PREVIEW_RIM = '#FBBA08';
const PREVIEW_RIM_WIDTH = 4;

interface PagePreviewModalProps {
  story: Story;
  currentPageIndex: number;
  visible: boolean;
  onClose: () => void;
  onSelectPage: (pageIndex: number) => void;
}

export function PagePreviewModal({
  story,
  currentPageIndex,
  visible,
  onClose,
  onSelectPage,
}: PagePreviewModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { scaledFontSize } = useAccessibility();
  const { t } = useTranslation();

  const isTablet = Math.max(screenWidth, screenHeight) >= 1024;
  const isLandscape = screenWidth > screenHeight;

  // Phone: 2 columns (larger tiles, easier to tap)
  // Tablet: 4 columns for more content
  const numColumns = isTablet ? 4 : 2;

  // Padding must match ScrollView's paddingHorizontal (20 each side = 40 total)
  // Add extra padding on phone to shrink tiles
  const horizontalPadding = isTablet ? 40 : 60;
  const gap = isTablet ? 12 : 16;
  const availableWidth = screenWidth - horizontalPadding - (gap * (numColumns - 1));
  const thumbnailWidth = availableWidth / numColumns;
  // Phone landscape: shorter tiles, Phone portrait: taller tiles
  const thumbnailHeight = thumbnailWidth * (isLandscape && !isTablet ? 0.55 : 0.65);
  // Row height: thumbnail + container extra height (30) + gap between rows
  const containerHeight = thumbnailHeight + 30;
  const rowHeight = containerHeight + gap;

  // Calculate initial scroll position to show current page
  // Since we skip cover (index 0), adjust the index for scroll calculation
  const adjustedPageIndex = Math.max(0, currentPageIndex - 1);
  // Which row the current page is in (for scrolling)
  const currentRow = Math.floor(adjustedPageIndex / numColumns);

  const flatListRef = useRef<FlatList>(null);
  const hasScrolledRef = useRef(false);
  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const isAnimatingOut = useSharedValue(false);

  // Reset scroll flag when modal closes
  useEffect(() => {
    if (!visible) {
      hasScrolledRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });

      // Scroll to the row containing current page after animation
      hasScrolledRef.current = false;
    }
  }, [visible]);

  // Get item layout for FlatList scrollToIndex
  const getItemLayout = useCallback((_data: any, index: number) => ({
    length: rowHeight,
    offset: rowHeight * index,
    index,
  }), [rowHeight]);

  // Scroll to current row when list is ready
  const handleLayout = useCallback(() => {
    if (visible && !hasScrolledRef.current && currentRow > 0) {
      hasScrolledRef.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: currentRow,
          animated: true,
          viewPosition: 0.3, // Position current row 30% from top
        });
      }, 100);
    }
  }, [visible, currentRow]);

  const handleClose = useCallback(() => {
    if (isAnimatingOut.value) return;
    isAnimatingOut.value = true;
    translateY.value = withTiming(screenHeight, {
      duration: ANIMATION_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION }, () => {
      isAnimatingOut.value = false;
      runOnJS(onClose)();
    });
  }, [onClose, screenHeight]);

  const handlePageSelect = useCallback((pageIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectPage(pageIndex);
    handleClose();
  }, [onSelectPage, handleClose]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Skip cover page (index 0), only show actual story pages
  const pages = (story.pages || []).slice(1);

  // Render a page thumbnail for FlatList - must be before any early return
  const renderItem = useCallback(({ item: page, index }: { item: StoryPage; index: number }) => {
    const actualIndex = index + 1; // +1 because we skipped cover
    const isCurrentPage = actualIndex === currentPageIndex;
    // All images are loaded from local cache after batch sync
    const imageSource = page.backgroundImage || page.characterImage;

    return (
      <Pressable
        style={[styles.thumbnailContainer, { width: thumbnailWidth, height: containerHeight }]}
        onPress={() => handlePageSelect(actualIndex)}
      >
        <View testID={isCurrentPage ? 'page-preview-current' : undefined} style={[
          styles.thumbnail,
          { width: thumbnailWidth - gap, height: thumbnailHeight },
          isCurrentPage && styles.thumbnailCurrent,
        ]}>
          {imageSource ? (
            <Image source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource} style={styles.thumbnailImage} contentFit="cover" transition={150} />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <Text style={styles.placeholderEmoji}>{STORY_TAGS[story.category].emoji}</Text>
            </View>
          )}
          {isCurrentPage && (
            <View style={styles.currentPageIndicator}>
              <Text style={styles.currentPageText}>{t('reader.current')}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.pageNumber, { fontSize: scaledFontSize(12) }]}>
          {t('reader.pageNumber', { number: actualIndex })}
        </Text>
      </Pressable>
    );
  }, [currentPageIndex, thumbnailWidth, thumbnailHeight, containerHeight, gap, handlePageSelect, scaledFontSize, t]);

  // Early return after all hooks
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        </Pressable>
      </Animated.View>

      <Animated.View testID="page-preview-sheet" style={[styles.modalContainer, modalAnimatedStyle, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: scaledFontSize(18) }]}>{t('reader.pagePreview')}</Text>
        </View>
        <FlatList
          ref={flatListRef}
          data={pages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          style={styles.scrollView}
          contentContainerStyle={[styles.gridContainer, { paddingHorizontal: horizontalPadding / 2 }]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          onLayout={handleLayout}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000, // Above all story content including interactive elements
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PREVIEW_FACE,
    borderColor: PREVIEW_RIM,
    borderWidth: PREVIEW_RIM_WIDTH,
    borderBottomWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: PREVIEW_RIM,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: MENU_INK,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'center',
  },
  thumbnailContainer: {
    alignItems: 'center',
  },
  thumbnail: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(90, 31, 74, 0.08)',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  thumbnailCurrent: {
    borderColor: PREVIEW_RIM,
    shadowColor: PREVIEW_RIM,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(90, 31, 74, 0.12)',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  currentPageIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: PREVIEW_RIM,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentPageText: {
    fontSize: 10,
    fontWeight: '700',
    color: MENU_INK,
  },
  pageNumber: {
    marginTop: 6,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: MENU_INK,
    textAlign: 'center',
  },
});

