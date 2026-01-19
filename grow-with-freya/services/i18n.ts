import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe import of Localization with fallback
let Localization: { getLocales: () => Array<{ languageCode?: string }> } | null = null;
try {
  Localization = require('expo-localization');
} catch (e) {
  console.warn('expo-localization not available, using fallback');
}

// Import translation files
import en from '../locales/en';
import pl from '../locales/pl';
import es from '../locales/es';
import de from '../locales/de';
import fr from '../locales/fr';
import it from '../locales/it';
import pt from '../locales/pt';
import ja from '../locales/ja';
import ar from '../locales/ar';
import tr from '../locales/tr';
import nl from '../locales/nl';
import da from '../locales/da';
import la from '../locales/la';
import zh from '../locales/zh';

const LANGUAGE_STORAGE_KEY = '@app_language';

export type SupportedLanguage = 'en' | 'pl' | 'es' | 'de' | 'fr' | 'it' | 'pt' | 'ja' | 'ar' | 'tr' | 'nl' | 'da' | 'la' | 'zh';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string; flag: string; nativeName: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', nativeName: 'Polski' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', nativeName: 'Türkçe' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'da', name: 'Danish', flag: '🇩🇰', nativeName: 'Dansk' },
  { code: 'la', name: 'Latin', flag: '🏛️', nativeName: 'Latīna' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '简体中文' },
];

const resources = {
  en: { translation: en },
  pl: { translation: pl },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  it: { translation: it },
  pt: { translation: pt },
  ja: { translation: ja },
  ar: { translation: ar },
  tr: { translation: tr },
  nl: { translation: nl },
  da: { translation: da },
  la: { translation: la },
  zh: { translation: zh },
};

/**
 * Get the stored language preference or detect from device
 */
export async function getStoredLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && isValidLanguage(stored)) {
      return stored as SupportedLanguage;
    }
  } catch (error) {
    console.warn('Failed to get stored language:', error);
  }
  
  // Detect from device locale
  const deviceLocale = Localization?.getLocales()[0]?.languageCode || 'en';
  return isValidLanguage(deviceLocale) ? deviceLocale as SupportedLanguage : 'en';
}

/**
 * Save language preference
 */
export async function setStoredLanguage(language: SupportedLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
}

function isValidLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
}

/**
 * Initialize i18n with stored/detected language
 */
export async function initializeI18n(): Promise<void> {
  const language = await getStoredLanguage();
  
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: false, // Disable suspense for React Native
      },
    });
}

// Initialize synchronously with English as default, then update
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

// Load stored language preference async
getStoredLanguage().then(language => {
  if (language !== 'en') {
    i18n.changeLanguage(language);
  }
});

export default i18n;

