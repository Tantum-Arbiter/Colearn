import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useCoversJourneyBar } from '@/components/child-ui/journey-bar-cover';
import { SUPPORTED_LANGUAGES, setStoredLanguage, type SupportedLanguage } from '@/services/i18n';

interface LanguagePickerProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

export function LanguagePicker({ visible, onClose, testID = 'language-picker' }: LanguagePickerProps) {
  const { t, i18n } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const current = i18n.language?.split('-')[0];
  useCoversJourneyBar(visible);

  const choose = useCallback(async (language: SupportedLanguage) => {
    await setStoredLanguage(language);
    onClose();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onClose]);

  if (!visible) return null;

  return (
    <Pressable testID={testID} style={styles.overlay} onPress={onClose}>
      <Pressable testID={`${testID}-card`} style={styles.card} onPress={(event) => event.stopPropagation()}>
        <Text style={[styles.title, { fontSize: scaledFontSize(18) }]}>{t('account.selectLanguage')}</Text>
        <ScrollView style={styles.list} showsVerticalScrollIndicator scrollIndicatorInsets={{ right: 4 }}>
          {SUPPORTED_LANGUAGES.map((language) => {
            const selected = current === language.code;

            return (
              <Pressable
                key={language.code}
                testID="language-option"
                accessibilityRole="button"
                accessibilityLabel={language.nativeName}
                accessibilityState={{ selected }}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => choose(language.code)}
              >
                <Text style={[styles.flag, { fontSize: scaledFontSize(24) }]}>{language.flag}</Text>
                <Text style={[styles.name, { fontSize: scaledFontSize(16) }]}>{language.nativeName}</Text>
                {selected && <Ionicons name="checkmark" size={scaledFontSize(18)} color="#4ECDC4" />}
              </Pressable>
            );
          })}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: 'rgba(30, 30, 60, 0.95)',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 350,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'column',
  },
  list: {
    maxHeight: 400,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionSelected: {
    backgroundColor: 'rgba(100, 150, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(100, 150, 255, 0.5)',
  },
  flag: {
    marginRight: 12,
  },
  name: {
    color: '#FFFFFF',
    flex: 1,
  },
});
