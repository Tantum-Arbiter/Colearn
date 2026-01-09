import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
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
  const numColumns = isTablet ? 3 : 2;

  const horizontalPadding = 40;
  const gap = 12;
  const availableWidth = screenWidth - horizontalPadding - (gap * (numColumns - 1));
  const thumbnailWidth = availableWidth / numColumns;
  const thumbnailHeight = thumbnailWidth * 0.65;
  const rowHeight = thumbnailHeight + 30 + gap; // thumbnail + label + gap

  // Calculate initial scroll position to show current page
  const currentRow = Math.floor(currentPageIndex / numColumns);
  const initialScrollY = Math.max(0, currentRow * rowHeight - rowHeight * 0.5);

  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useSharedValue(0);
  const isAnimatingOut = useSharedValue(false);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    }
  }, [visible]);

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

  if (!visible && translateY.value === screenHeight) return null;

  const pages = story.pages || [];

  const renderPageThumbnail = (page: StoryPage, index: number) => {
    const isCurrentPage = index === currentPageIndex;
    const imageSource = page.backgroundImage || page.characterImage;
    const isCmsImage = typeof imageSource === 'string' &&
      imageSource.includes('api.colearnwithfreya.co.uk');

    return (
      <Pressable
        key={page.id}
        style={[styles.thumbnailContainer, { width: thumbnailWidth, height: thumbnailHeight + 30 }]}
        onPress={() => handlePageSelect(index)}
      >
        <View style={[
          styles.thumbnail,
          { width: thumbnailWidth, height: thumbnailHeight },
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
          {index === 0 ? 'Cover' : `Page ${index}`}
        </Text>
      </Pressable>
    );
  };

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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.gridContainer, { gap, paddingHorizontal: 20 }]}
          showsVerticalScrollIndicator={false}
          contentOffset={{ x: 0, y: initialScrollY }}
        >
          <View style={[styles.grid, { gap }]}>
            {pages.map((page, index) => renderPageThumbnail(page, index))}
          </View>
        </ScrollView>
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
    fontFamily: Fonts.display,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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

