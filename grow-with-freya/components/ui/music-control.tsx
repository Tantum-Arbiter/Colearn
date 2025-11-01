import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSound } from '@/contexts/global-sound-context';

interface MusicControlProps {
  size?: number;
  color?: string;
  style?: any;
}

export const MusicControl: React.FC<MusicControlProps> = ({
  size = 32,
  color = '#4A90E2',
  style
}) => {
  const { isMuted, volume, isLoaded, toggleMute } = useGlobalSound();

  const handlePress = () => {
    toggleMute();
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
        <View style={[styles.iconBackground, { backgroundColor: `${color}20` }]}>
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={size}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
