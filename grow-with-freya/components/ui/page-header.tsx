import React from 'react';
import { View, Pressable, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MusicControl } from './music-control';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  showMusicControl?: boolean;
  subtitle?: string;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  onRightAction?: () => void;
}

export function PageHeader({
  title,
  onBack,
  showMusicControl = true,
  subtitle,
  rightActionIcon,
  onRightAction,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledPadding, scaledButtonSize, textSizeScale } = useAccessibility();

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

  return (
    <>
      {/* Header with back button and music control - absolute positioned */}
      <View style={[styles.headerContainer, { top: insets.top + 20 }]}>
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
          <Text style={[styles.backButtonText, { fontSize: backFontSize }]} numberOfLines={1}>← Back</Text>
        </Pressable>

        <View style={styles.rightControls}>
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
        </View>
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
  headerContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 30,
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

