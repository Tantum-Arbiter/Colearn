import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBackgroundMusic } from '@/hooks/use-background-music';

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
  const { isPlaying, toggle, isLoaded, volume, setVolume } = useBackgroundMusic();

  const handlePress = () => {
    // Handle mute/unmute toggle
    if (volume === 0) {
      // Unmute: restore to default volume (18%)
      setVolume(0.18);
    } else {
      // Mute: set volume to 0
      setVolume(0);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel={volume === 0 ? 'Unmute background music' : 'Mute background music'}
        accessibilityRole="button"
        testID="music-control-button"
      >
        <View style={[styles.iconBackground, { backgroundColor: `${color}20` }]}>
          <Ionicons
            name={volume === 0 ? 'volume-mute' : 'volume-high'}
            size={size}
            color={color}
            testID={`music-icon-${volume === 0 ? 'muted' : 'playing'}`}
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
