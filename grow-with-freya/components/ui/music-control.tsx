import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { useAccessibility } from '@/hooks/use-accessibility';

interface MusicControlProps {
  size?: number;
  color?: string;
  style?: any;
  showBackground?: boolean;
  /** Use story page styling (white bg, dark icon) vs menu styling (grey bg, white icon) */
  variant?: 'story' | 'menu';
}

export const MusicControl: React.FC<MusicControlProps> = ({
  size = 32,
  color,
  style,
  showBackground = true,
  variant = 'menu', // Default to menu styling for backwards compatibility
}) => {
  const { isMuted, toggleMute } = useGlobalSound();
  const { scaledButtonSize } = useAccessibility();

  const handlePress = () => {
    toggleMute();
  };

  const scaledIconSize = scaledButtonSize(size);
  const backgroundSize = scaledButtonSize(48);

  // Determine colors based on variant
  const isStoryVariant = variant === 'story';
  const iconColor = color ?? (isStoryVariant ? '#333333' : '#FFFFFF');
  const strokeColor = isStoryVariant ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)';

  const getBackgroundColor = () => {
    if (!showBackground) return 'transparent';
    // Story pages: white with 90% opacity; Menu: transparent white to match back button
    return isStoryVariant ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.2)';
  };

  const getBorderColor = () => {
    // No border for menu variant to match back button styling
    return isStoryVariant ? 'rgba(0, 0, 0, 0.1)' : 'transparent';
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel={isMuted ? 'Unmute background music' : 'Mute background music'}
        accessibilityRole="button"
        testID="music-control-button"
      >
        <View style={[
          styles.iconBackground,
          {
            backgroundColor: getBackgroundColor(),
            width: backgroundSize,
            height: backgroundSize,
            borderRadius: backgroundSize / 2,
            borderColor: getBorderColor(),
          }
        ]}>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={scaledIconSize}
            color={iconColor}
            style={{
              textShadowColor: strokeColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 1,
            }}
            testID={`music-icon-${isMuted ? 'muted' : 'playing'}`}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});
