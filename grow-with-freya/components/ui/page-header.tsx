import React, { useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { MusicControl } from './music-control';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useBackButtonText } from '@/hooks/use-back-button-text';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  showMusicControl?: boolean;
  subtitle?: string;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  onRightAction?: () => void;
  /** Optional background color for header area to block scrolling content */
  headerBackgroundColor?: string;
  /** When true, hides the back button and music control with animations */
  hideControls?: boolean;
}

export function PageHeader({
  title,
  onBack,
  showMusicControl = true,
  subtitle,
  rightActionIcon,
  onRightAction,
  headerBackgroundColor,
  hideControls = false,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledPadding, scaledButtonSize, textSizeScale } = useAccessibility();
  const backButtonText = useBackButtonText();

  // Animation values for hiding/showing controls
  const backButtonTranslateX = useSharedValue(0);
  const rightControlsTranslateX = useSharedValue(0);

  useEffect(() => {
    if (hideControls) {
      // Slide back button to the left (off screen)
      backButtonTranslateX.value = withTiming(-150, { duration: 300, easing: Easing.out(Easing.cubic) });
      // Slide right controls to the right (off screen)
      rightControlsTranslateX.value = withTiming(150, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else {
      // Slide back to original position
      backButtonTranslateX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      rightControlsTranslateX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    }
  }, [hideControls, backButtonTranslateX, rightControlsTranslateX]);

  const backButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: backButtonTranslateX.value }],
  }));

  const rightControlsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightControlsTranslateX.value }],
  }));

  // Calculate scaled sizes
  const backButtonPaddingH = scaledPadding(isTablet ? 20 : 16);
  const backButtonPaddingV = scaledPadding(isTablet ? 10 : 8);
  const backFontSize = scaledFontSize(isTablet ? 18 : 16);
  const titleFontSize = scaledFontSize(isTablet ? 40 : 34);
  const subtitleFontSize = scaledFontSize(isTablet ? 18 : 16);
  const musicIconSize = scaledButtonSize(isTablet ? 28 : 24);

  // Dynamic title container position - accounts for scaled text
  const titleContainerTop = insets.top + 80 + (textSizeScale - 1) * 20;
  // Dynamic subtitle margin - more space when text is larger
  const subtitleMarginTop = 8 + (textSizeScale - 1) * 8;

  // Calculate matching height for back button based on music control background
  const musicBackgroundSize = scaledButtonSize(48);
  const backButtonHeight = musicBackgroundSize;

  // Calculate the full header height (from top to where content starts)
  const headerHeight = insets.top + 140 + (textSizeScale - 1) * 60;

  return (
    <>
      {/* Solid background behind header area to block scrolling content - only when color is provided */}
      {headerBackgroundColor && (
        <View style={[styles.headerBackground, { height: headerHeight, backgroundColor: headerBackgroundColor }]} />
      )}

      {/* Header with back button and music control - absolute positioned */}
      <View style={[styles.headerContainer, { top: insets.top + 20 }]}>
        <Animated.View style={backButtonAnimatedStyle}>
          <Pressable
            style={[
              styles.backButton,
              {
                paddingHorizontal: backButtonPaddingH,
                height: backButtonHeight,
                justifyContent: 'center',
              }
            ]}
            onPress={onBack}
          >
            <Text style={[styles.backButtonText, { fontSize: backFontSize }]} numberOfLines={1}>{backButtonText}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.rightControls, rightControlsAnimatedStyle]}>
          {rightActionIcon && onRightAction && (
            <Pressable
              style={[
                styles.rightActionButton,
                {
                  width: musicBackgroundSize,
                  height: musicBackgroundSize,
                }
              ]}
              onPress={onRightAction}
            >
              <Ionicons name={rightActionIcon} size={musicIconSize} color="#FFFFFF" />
            </Pressable>
          )}
          {showMusicControl && (
            <MusicControl
              size={musicIconSize}
              color="#FFFFFF"
            />
          )}
        </Animated.View>
      </View>

      {/* Title - positioned below header */}
      <View style={[styles.titleContainer, { top: titleContainerTop }]}>
        <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { fontSize: subtitleFontSize, marginTop: subtitleMarginTop }]}>{subtitle}</Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20, // Android requires elevation for proper z-ordering
  },
  headerContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 30,
    elevation: 30, // Android requires elevation for proper z-ordering
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: Fonts.primary,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 25,
    elevation: 25, // Android requires elevation for proper z-ordering
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: Fonts.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Fonts.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

