import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TextSize, Language } from '../../store/app-store';
import { useTranslation } from '../../localization/translations';
import { scaleText } from '../../utils/text-scaling';

interface TextSizeSelectionModalProps {
  visible: boolean;
  currentTextSize: TextSize;
  currentLanguage: Language;
  onSelect: (textSize: TextSize) => void;
  onClose: () => void;
}

const TEXT_SIZES: { size: TextSize; icon: string; previewSize: number }[] = [
  { size: 'small', icon: '🔤', previewSize: 14 },
  { size: 'normal', icon: '🔤', previewSize: 18 },
  { size: 'large', icon: '🔤', previewSize: 22 },
];

export function TextSizeSelectionModal({
  visible,
  currentTextSize,
  currentLanguage,
  onSelect,
  onClose,
}: TextSizeSelectionModalProps) {
  const t = useTranslation(currentLanguage);

  const handleSelect = (textSize: TextSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(textSize);
    onClose();
  };

  const getTextSizeLabel = (size: TextSize) => {
    switch (size) {
      case 'small':
        return t.small;
      case 'normal':
        return t.normal;
      case 'large':
        return t.large;
      default:
        return t.normal;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1E3A8A', '#2563EB', '#3B82F6']}
            style={styles.modalContent}
          >
            <Text style={[styles.title, { fontSize: scaleText(24, currentTextSize) }]}>
              {t.textSize}
            </Text>
            
            <View style={styles.optionsContainer}>
              {TEXT_SIZES.map((textSizeOption) => (
                <Pressable
                  key={textSizeOption.size}
                  style={[
                    styles.option,
                    currentTextSize === textSizeOption.size && styles.selectedOption,
                  ]}
                  onPress={() => handleSelect(textSizeOption.size)}
                >
                  <Text style={styles.icon}>{textSizeOption.icon}</Text>
                  <View style={styles.textContainer}>
                    <Text style={[
                      styles.optionText,
                      { fontSize: scaleText(18, currentTextSize) },
                      currentTextSize === textSizeOption.size && styles.selectedOptionText,
                    ]}>
                      {getTextSizeLabel(textSizeOption.size)}
                    </Text>
                    <Text style={[
                      styles.previewText,
                      { fontSize: textSizeOption.previewSize },
                    ]}>
                      Sample text preview
                    </Text>
                  </View>
                  {currentTextSize === textSizeOption.size && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
            
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { fontSize: scaleText(16, currentTextSize) }]}>
                {t.back}
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  optionText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedOptionText: {
    fontWeight: 'bold',
  },
  previewText: {
    color: '#E0E0E0',
    fontStyle: 'italic',
  },
  checkmark: {
    fontSize: 20,
    color: '#4ADE80',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
