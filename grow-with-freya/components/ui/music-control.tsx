import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBackgroundMusic } from '@/hooks/use-background-music';

interface MusicControlProps {
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Music control component that allows users to toggle background music
 */
export const MusicControl: React.FC<MusicControlProps> = ({
  size = 32,
  color = '#4A90E2',
  style
}) => {
  const { isPlaying, toggle, isLoaded } = useBackgroundMusic();

  if (!isLoaded) {
    return null; // Don't show control until music is loaded
  }

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={toggle}
      activeOpacity={0.7}
      accessibilityLabel={isPlaying ? 'Pause background music' : 'Play background music'}
      accessibilityRole="button"
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons
          name={isPlaying ? 'volume-high' : 'volume-mute'}
          size={size}
          color={color}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
