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
  /** When true, shows a home icon instead of the text back button */
  useHomeIcon?: boolean;
  /** When true, shows a left arrow icon instead of the text back button */
  useBackArrow?: boolean;
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
  useHomeIcon = false,
  useBackArrow = false,
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

  // Dynamic title container position - aligned with header row
  const titleContainerTop = insets.top + 20;
  // Dynamic subtitle margin - more space when text is larger
  const subtitleMarginTop = 8 + (textSizeScale - 1) * 8;

  // Calculate matching height for back button based on music control background
  const musicBackgroundSize = scaledButtonSize(48);
  const backButtonHeight = musicBackgroundSize;

  // Calculate the full header height (from top to where content starts)
  const headerHeight = insets.top + 80 + (textSizeScale - 1) * 40;

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
              (useHomeIcon || useBackArrow) ? styles.homeButton : styles.backButton,
              (useHomeIcon || useBackArrow)
                ? { width: scaledButtonSize(48), height: scaledButtonSize(48) }
                : { paddingHorizontal: backButtonPaddingH, height: backButtonHeight, justifyContent: 'center' },
            ]}
            onPress={onBack}
          >
            {useHomeIcon ? (
              <Ionicons name="home" size={scaledButtonSize(22)} color="#FFFFFF" />
            ) : useBackArrow ? (
              <Ionicons name="arrow-back" size={scaledButtonSize(22)} color="#FFFFFF" />
            ) : (
              <Text style={[styles.backButtonText, { fontSize: backFontSize }]} numberOfLines={1}>{backButtonText}</Text>
            )}
          </Pressable>
        </Animated.View>

        <Animated.View style={[isTablet ? styles.rightControls : styles.rightControlsPhone, rightControlsAnimatedStyle]}>
          {showMusicControl && (
            <MusicControl
              size={musicIconSize}
              color="#FFFFFF"
            />
          )}
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
        </Animated.View>
      </View>

      {/* Title - aligned with header row */}
      <View style={[styles.titleContainer, { top: titleContainerTop, minHeight: musicBackgroundSize, paddingBottom: 12 }]}>
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
    overflow: 'visible',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  homeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  rightControlsPhone: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  rightActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 25,
    elevation: 25, // Android requires elevation for proper z-ordering
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible', // Prevent text shadow clipping
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

