import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Language } from '../../store/app-store';
import { useTranslation } from '../../localization/translations';
import { scaleText } from '../../utils/text-scaling';

interface LanguageSelectionModalProps {
  visible: boolean;
  currentLanguage: Language;
  currentTextSize: 'small' | 'normal' | 'large';
  onSelect: (language: Language) => void;
  onClose: () => void;
}

const LANGUAGES: { code: Language; flag: string }[] = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'pl', flag: '🇵🇱' },
  { code: 'fr', flag: '🇫🇷' },
];

export function LanguageSelectionModal({
  visible,
  currentLanguage,
  currentTextSize,
  onSelect,
  onClose,
}: LanguageSelectionModalProps) {
  const t = useTranslation(currentLanguage);

  const handleSelect = (language: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(language);
    onClose();
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
              {t.language}
            </Text>
            
            <View style={styles.optionsContainer}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.option,
                    currentLanguage === lang.code && styles.selectedOption,
                  ]}
                  onPress={() => handleSelect(lang.code)}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <Text style={[
                    styles.optionText,
                    { fontSize: scaleText(18, currentTextSize) },
                    currentLanguage === lang.code && styles.selectedOptionText,
                  ]}>
                    {lang.code === 'en' && t.english}
                    {lang.code === 'pl' && t.polish}
                    {lang.code === 'fr' && t.french}
                  </Text>
                  {currentLanguage === lang.code && (
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
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  selectedOptionText: {
    fontWeight: 'bold',
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
