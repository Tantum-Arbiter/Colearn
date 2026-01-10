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
import { Story, StoryPage } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

const ANIMATION_DURATION = 300;

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
  const { scaledFontSize, scaledButtonSize } = useAccessibility();

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
    const imageSource = page.backgroundImage || page.characterImage;
    const isCmsImage = typeof imageSource === 'string' &&
      imageSource.includes('api.colearnwithfreya.co.uk');

    return (
      <Pressable
        style={[styles.thumbnailContainer, { width: thumbnailWidth, height: containerHeight }]}
        onPress={() => handlePageSelect(actualIndex)}
      >
        <View style={[
          styles.thumbnail,
          { width: thumbnailWidth - gap, height: thumbnailHeight },
          isCurrentPage && styles.thumbnailCurrent,
        ]}>
          {imageSource ? (
            isCmsImage ? (
              <AuthenticatedImage uri={imageSource as string} style={styles.thumbnailImage} resizeMode="cover" transition={150} />
            ) : (
              <Image source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource} style={styles.thumbnailImage} contentFit="cover" transition={150} />
            )
          ) : (
            <View style={styles.placeholderThumbnail}>
              <Text style={styles.placeholderEmoji}>{story.emoji}</Text>
            </View>
          )}
          {isCurrentPage && (
            <View style={styles.currentPageIndicator}>
              <Text style={styles.currentPageText}>Current</Text>
            </View>
          )}
        </View>
        <Text style={[styles.pageNumber, { fontSize: scaledFontSize(12) }]}>
          Page {actualIndex}
        </Text>
      </Pressable>
    );
  }, [currentPageIndex, thumbnailWidth, thumbnailHeight, containerHeight, gap, handlePageSelect, scaledFontSize]);

  // Early return after all hooks
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.modalContainer, modalAnimatedStyle, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: scaledFontSize(18) }]}>Page Preview</Text>
          <Pressable
            style={[styles.closeButton, { width: scaledButtonSize(36), height: scaledButtonSize(36), borderRadius: scaledButtonSize(18) }]}
            onPress={handleClose}
          >
            <Text style={[styles.closeButtonText, { fontSize: scaledFontSize(18) }]}>×</Text>
          </Pressable>
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
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000, // Above all story content including interactive elements
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(40, 40, 50, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailCurrent: {
    borderColor: '#4ECDC4',
    shadowColor: '#4ECDC4',
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
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  currentPageIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentPageText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pageNumber: {
    marginTop: 6,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});

