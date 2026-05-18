import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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
  /**
   * When true, uses absolute positioning instead of native Modal.
   * Required when rendered inside complex view hierarchies (e.g., story-book-reader)
   * where native Modal causes iOS crashes.
   */
  useAbsolutePositioning?: boolean;
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
  useAbsolutePositioning = false,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledPadding } = useAccessibility();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;

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

  const sliders = (
    <>
      {/* Volume Sliders */}
      <VolumeSlider
        label={t('audioSettings.masterVolume')}
        icon="volume-high"
        value={masterVolume}
        onChange={onMasterVolumeChange}
      />
      <VolumeSlider
        label={t('audioSettings.music')}
        icon="musical-notes"
        value={musicVolume}
        onChange={onMusicVolumeChange}
      />
      <VolumeSlider
        label={t('audioSettings.voiceOver')}
        icon="mic"
        value={voiceOverVolume}
        onChange={onVoiceOverVolumeChange}
      />
    </>
  );

  const content = (
    <Pressable
      style={[
        styles.modalContent,
        isLandscape && styles.modalContentLandscape,
        {
          paddingTop: scaledPadding(isLandscape ? 14 : 20),
          paddingBottom: scaledPadding(isLandscape ? 14 : 20) + (isLandscape ? 0 : insets.bottom),
          paddingHorizontal: scaledPadding(isLandscape ? 16 : 20),
        }
      ]}
      onPress={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <Ionicons name="settings-outline" size={scaledFontSize(isLandscape ? 20 : 24)} color="#FFFFFF" />
        <Text style={[styles.title, { fontSize: scaledFontSize(isLandscape ? 16 : 20) }]}>{t('audioSettings.title')}</Text>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={scaledFontSize(isLandscape ? 20 : 24)} color="#FFFFFF" />
        </Pressable>
      </View>

      {isLandscape ? (
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {sliders}
        </ScrollView>
      ) : (
        sliders
      )}
    </Pressable>
  );

  // Absolute positioning mode -used inside complex view hierarchies
  // (e.g., story-book-reader) where native Modal causes iOS crashes.
  if (useAbsolutePositioning) {
    if (!visible) return null;
    return (
      <View style={styles.absoluteContainer}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.overlay} pointerEvents="box-none">
          {content}
        </View>
      </View>
    );
  }

  // Default: native Modal -works in all normal view hierarchies.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        {content}
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
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
  modalContentLandscape: {
    width: '50%',
    maxWidth: 360,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  headerLandscape: {
    marginBottom: 10,
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

