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

const LANGUAGE_STORAGE_KEY = '@app_language';

export type SupportedLanguage = 'en' | 'pl' | 'es' | 'de';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string; flag: string; nativeName: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', nativeName: 'Polski' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
];

const resources = {
  en: { translation: en },
  pl: { translation: pl },
  es: { translation: es },
  de: { translation: de },
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

