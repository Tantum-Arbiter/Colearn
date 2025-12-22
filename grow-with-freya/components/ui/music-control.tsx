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
}

export const MusicControl: React.FC<MusicControlProps> = ({
  size = 32,
  color = '#4A90E2',
  style,
  showBackground = true
}) => {
  const { isMuted, toggleMute } = useGlobalSound();
  const { scaledButtonSize } = useAccessibility();

  const handlePress = () => {
    toggleMute();
  };

  const scaledIconSize = scaledButtonSize(size);
  const backgroundSize = scaledButtonSize(48);

  // For white color, use a more visible semi-transparent background
  const getBackgroundColor = () => {
    if (!showBackground) return 'transparent';
    if (color === '#FFFFFF' || color === 'white' || color === '#FFF') {
      return 'rgba(255, 255, 255, 0.2)';
    }
    return `${color}20`;
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
          }
        ]}>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={scaledIconSize}
            color={color}
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
  },
});
