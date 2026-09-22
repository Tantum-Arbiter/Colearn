import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useCoversJourneyBar } from '@/components/child-ui/journey-bar-cover';
import { SUPPORTED_LANGUAGES, baseLanguage, setStoredLanguage, type SupportedLanguage } from '@/services/i18n';

export const LANGUAGE_PICKER = {
  panelTop: '#1F2B78',
  panelBottom: '#121A4A',
  panelRim: 'rgba(150, 182, 255, 0.45)',
  panelGlow: '#3D5BFF',
  rowFill: 'rgba(255, 255, 255, 0.06)',
  rowRim: 'rgba(190, 215, 255, 0.16)',
  selectedTop: '#3558E8',
  selectedBottom: '#2742C4',
  selectedRim: 'rgba(170, 200, 255, 0.95)',
  selectedGlow: '#5C7CFF',
  check: '#3558E8',
  subtitle: '#9FB4FF',
  chevron: 'rgba(255, 255, 255, 0.55)',
  closeFill: 'rgba(255, 255, 255, 0.12)',
  closeRim: 'rgba(255, 255, 255, 0.28)',
  rowHeight: 52,
  radius: 28,
  rowRadius: 16,
  closeSize: 36,
  checkSize: 28,
} as const;

interface LanguagePickerProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

export function LanguagePicker({ visible, onClose, testID = 'language-picker' }: LanguagePickerProps) {
  const { t, i18n } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const current = baseLanguage(i18n.language);
  useCoversJourneyBar(visible);

  const choose = useCallback(async (language: SupportedLanguage) => {
    await setStoredLanguage(language);
    onClose();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onClose]);

  if (!visible) return null;

  return (
    <Pressable testID={testID} accessible={false} style={styles.overlay} onPress={onClose}>
      <Pressable testID={`${testID}-card`} accessible={false} style={styles.card} onPress={(event) => event.stopPropagation()}>
        <LinearGradient
          colors={[LANGUAGE_PICKER.panelTop, LANGUAGE_PICKER.panelBottom]}
          style={[StyleSheet.absoluteFill, styles.panel]}
          pointerEvents="none"
        />

        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: scaledFontSize(22) }]}>{t('account.selectLanguage')}</Text>
          <Text style={[styles.subtitle, { fontSize: scaledFontSize(13) }]}>{t('account.chooseLanguage')}</Text>
          <Pressable
            testID={`${testID}-close`}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {SUPPORTED_LANGUAGES.map((language) => {
            const selected = current === language.code;

            return (
              <Pressable
                key={language.code}
                testID={`language-option-${language.code}`}
                accessibilityRole="button"
                accessibilityLabel={language.nativeName}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
                onPress={() => { void choose(language.code); }}
              >
                {selected ? (
                  <LinearGradient
                    colors={[LANGUAGE_PICKER.selectedTop, LANGUAGE_PICKER.selectedBottom]}
                    style={[StyleSheet.absoluteFill, styles.optionFill]}
                    pointerEvents="none"
                  />
                ) : null}
                <Text style={[styles.flag, { fontSize: scaledFontSize(26) }]}>{language.flag}</Text>
                <Text style={[styles.name, selected && styles.nameSelected, { fontSize: scaledFontSize(16) }]} numberOfLines={1}>
                  {language.nativeName}
                </Text>
                {selected ? (
                  <View testID={`language-option-${language.code}-check`} style={styles.check}>
                    <Ionicons name="checkmark" size={18} color={LANGUAGE_PICKER.check} />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={LANGUAGE_PICKER.chevron} />
                )}
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
    backgroundColor: 'rgba(2, 6, 24, 0.66)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    width: '88%',
    maxWidth: 380,
    maxHeight: '74%',
    borderRadius: LANGUAGE_PICKER.radius,
    borderWidth: 1.5,
    borderColor: LANGUAGE_PICKER.panelRim,
    paddingTop: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: LANGUAGE_PICKER.panelGlow,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  panel: {
    borderRadius: LANGUAGE_PICKER.radius,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: LANGUAGE_PICKER.closeSize + 8,
    marginBottom: 18,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    color: LANGUAGE_PICKER.subtitle,
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    textAlign: 'center',
  },
  close: {
    position: 'absolute',
    top: -6,
    right: -2,
    width: LANGUAGE_PICKER.closeSize,
    height: LANGUAGE_PICKER.closeSize,
    borderRadius: LANGUAGE_PICKER.closeSize / 2,
    borderWidth: 1,
    borderColor: LANGUAGE_PICKER.closeRim,
    backgroundColor: LANGUAGE_PICKER.closeFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: LANGUAGE_PICKER.rowHeight,
    paddingHorizontal: 16,
    borderRadius: LANGUAGE_PICKER.rowRadius,
    borderWidth: 1,
    borderColor: LANGUAGE_PICKER.rowRim,
    backgroundColor: LANGUAGE_PICKER.rowFill,
  },
  optionSelected: {
    borderWidth: 1.5,
    borderColor: LANGUAGE_PICKER.selectedRim,
    backgroundColor: LANGUAGE_PICKER.selectedBottom,
    shadowColor: LANGUAGE_PICKER.selectedGlow,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  optionFill: {
    borderRadius: LANGUAGE_PICKER.rowRadius - 1,
  },
  flag: {
    marginRight: 14,
  },
  name: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
  nameSelected: {
    fontWeight: '800',
  },
  check: {
    width: LANGUAGE_PICKER.checkSize,
    height: LANGUAGE_PICKER.checkSize,
    borderRadius: LANGUAGE_PICKER.checkSize / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
