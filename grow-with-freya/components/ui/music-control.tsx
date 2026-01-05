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

  // Use a soft greyish background for visibility on both light and dark backgrounds
  const getBackgroundColor = () => {
    if (!showBackground) return 'transparent';
    // Use soft grey background for visibility on any background color
    return 'rgba(130, 130, 130, 0.35)';
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
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});
