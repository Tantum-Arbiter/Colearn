import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { useAccessibility } from '@/hooks/use-accessibility';
import { AudioControlModal } from './audio-control-modal';
import * as Haptics from 'expo-haptics';

interface MusicControlProps {
  size?: number;
  color?: string;
  style?: any;
  showBackground?: boolean;
  /** Use story page styling (white bg, dark icon) vs menu styling (grey bg, white icon) */
  variant?: 'story' | 'menu';
  /**
   * If provided, the AudioControlModal will NOT be rendered inside MusicControl.
   * Instead, the parent is responsible for rendering it (useful inside complex
   * view hierarchies like story-book-reader where absolute positioning is
   * constrained by parent containers).
   */
  onAudioModalChange?: (visible: boolean) => void;
}

export const MusicControl: React.FC<MusicControlProps> = ({
  size = 32,
  color,
  style,
  showBackground = true,
  variant = 'menu', // Default to menu styling for backwards compatibility
  onAudioModalChange,
}) => {
  const {
    isMuted,
    toggleMute,
    masterVolume,
    musicVolume,
    voiceOverVolume,
    setMasterVolume,
    setMusicVolume,
    setVoiceOverVolume,
  } = useGlobalSound();
  const { scaledButtonSize } = useAccessibility();

  const [showAudioModal, setShowAudioModal] = useState(false);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void toggleMute();
  }, [toggleMute]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onAudioModalChange) {
      onAudioModalChange(true);
    } else {
      setShowAudioModal(true);
    }
  }, [onAudioModalChange]);

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
    // Story pages: subtle dark border; Menu: subtle white border
    return isStoryVariant ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.3)';
  };

  return (
    <>
      <View style={[styles.container, style]}>
        <Pressable
          style={styles.iconContainer}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          accessibilityLabel={isMuted ? 'Unmute background music. Long press for audio settings.' : 'Mute background music. Long press for audio settings.'}
          accessibilityRole="button"
          accessibilityHint="Long press to open audio volume controls"
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
        </Pressable>
      </View>

      {/* Only render the modal internally when the parent doesn't handle it */}
      {!onAudioModalChange && (
        <AudioControlModal
          visible={showAudioModal}
          onClose={() => setShowAudioModal(false)}
          masterVolume={masterVolume}
          musicVolume={musicVolume}
          voiceOverVolume={voiceOverVolume}
          onMasterVolumeChange={setMasterVolume}
          onMusicVolumeChange={setMusicVolume}
          onVoiceOverVolumeChange={setVoiceOverVolume}
        />
      )}
    </>
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
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
