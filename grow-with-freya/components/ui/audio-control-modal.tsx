import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccessibility } from '@/hooks/use-accessibility';
import * as Haptics from 'expo-haptics';

interface AudioControlModalProps {
  visible: boolean;
  onClose: () => void;
  masterVolume: number;
  musicVolume: number;
  voiceOverVolume: number;
  onMasterVolumeChange: (value: number) => void;
  onMusicVolumeChange: (value: number) => void;
  onVoiceOverVolumeChange: (value: number) => void;
}

export const AudioControlModal: React.FC<AudioControlModalProps> = ({
  visible,
  onClose,
  masterVolume,
  musicVolume,
  voiceOverVolume,
  onMasterVolumeChange,
  onMusicVolumeChange,
  onVoiceOverVolumeChange,
}) => {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledPadding } = useAccessibility();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const VolumeSlider = ({
    label,
    icon,
    value,
    onChange,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    value: number;
    onChange: (value: number) => void;
  }) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Ionicons name={icon} size={scaledFontSize(20)} color="#FFFFFF" />
        <Text style={[styles.sliderLabel, { fontSize: scaledFontSize(16) }]}>{label}</Text>
        <Text style={[styles.sliderValue, { fontSize: scaledFontSize(14) }]}>
          {Math.round(value * 100)}%
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#4FC3F7"
        maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
        thumbTintColor="#FFFFFF"
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <Pressable 
          style={[
            styles.modalContent,
            { 
              paddingTop: scaledPadding(20),
              paddingBottom: scaledPadding(20) + insets.bottom,
              paddingHorizontal: scaledPadding(20),
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="settings-outline" size={scaledFontSize(24)} color="#FFFFFF" />
            <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>Audio Settings</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={scaledFontSize(24)} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Volume Sliders */}
          <VolumeSlider
            label="Master Volume"
            icon="volume-high"
            value={masterVolume}
            onChange={onMasterVolumeChange}
          />
          <VolumeSlider
            label="Music"
            icon="musical-notes"
            value={musicVolume}
            onChange={onMusicVolumeChange}
          />
          <VolumeSlider
            label="Voice Over"
            icon="mic"
            value={voiceOverVolume}
            onChange={onVoiceOverVolumeChange}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(30, 58, 138, 0.95)',
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Quicksand-Bold',
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sliderLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Quicksand-Medium',
  },
  sliderValue: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Quicksand-Medium',
    minWidth: 45,
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

