import { Language } from '../store/app-store';

export interface Translations {
  // Account Screen
  account: string;
  back: string;
  appSettings: string;
  version: string;
  language: string;
  textSize: string;
  iconSize: string;
  blackWhiteMode: string;
  screenTimeControls: string;
  character: string;
  characterName: string;
  editCharacter: string;
  privacyLegal: string;
  termsConditions: string;
  privacyPolicy: string;
  developerOptions: string;
  notificationDebug: string;
  audioDebug: string;
  resetApp: string;
  
  // Language options
  english: string;
  polish: string;
  french: string;
  
  // Text size options
  small: string;
  normal: string;
  large: string;
  
  // Common
  disabled: string;
  enabled: string;
  comingSoon: string;
  yourChildsName: string;
  medium: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Account Screen
    account: 'Account',
    back: '← Back',
    appSettings: 'App Settings',
    version: 'Version',
    language: 'Language',
    textSize: 'Text Size',
    iconSize: 'Icon Size',
    blackWhiteMode: 'Black & White Mode',
    screenTimeControls: 'Screen Time Controls',
    character: 'Character',
    characterName: 'Character Name',
    editCharacter: 'Edit Character (Coming Soon)',
    privacyLegal: 'Privacy & Legal',
    termsConditions: 'Terms & Conditions',
    privacyPolicy: 'Privacy Policy',
    developerOptions: 'Developer Options',
    notificationDebug: 'Notification Debug',
    audioDebug: 'Audio Debug',
    resetApp: 'Reset App',
    
    // Language options
    english: 'English',
    polish: 'Polish',
    french: 'French',
    
    // Text size options
    small: 'Small',
    normal: 'Normal',
    large: 'Large',
    
    // Common
    disabled: 'Disabled',
    enabled: 'Enabled',
    comingSoon: 'Coming Soon',
    yourChildsName: 'Your Child\'s Name',
    medium: 'Medium',
  },
  
  pl: {
    // Account Screen
    account: 'Konto',
    back: '← Wstecz',
    appSettings: 'Ustawienia Aplikacji',
    version: 'Wersja',
    language: 'Język',
    textSize: 'Rozmiar Tekstu',
    iconSize: 'Rozmiar Ikon',
    blackWhiteMode: 'Tryb Czarno-Biały',
    screenTimeControls: 'Kontrola Czasu Ekranu',
    character: 'Postać',
    characterName: 'Imię Postaci',
    editCharacter: 'Edytuj Postać (Wkrótce)',
    privacyLegal: 'Prywatność i Prawo',
    termsConditions: 'Regulamin',
    privacyPolicy: 'Polityka Prywatności',
    developerOptions: 'Opcje Deweloperskie',
    notificationDebug: 'Debug Powiadomień',
    audioDebug: 'Debug Audio',
    resetApp: 'Resetuj Aplikację',
    
    // Language options
    english: 'Angielski',
    polish: 'Polski',
    french: 'Francuski',
    
    // Text size options
    small: 'Mały',
    normal: 'Normalny',
    large: 'Duży',
    
    // Common
    disabled: 'Wyłączony',
    enabled: 'Włączony',
    comingSoon: 'Wkrótce',
    yourChildsName: 'Imię Twojego Dziecka',
    medium: 'Średni',
  },
  
  fr: {
    // Account Screen
    account: 'Compte',
    back: '← Retour',
    appSettings: 'Paramètres de l\'App',
    version: 'Version',
    language: 'Langue',
    textSize: 'Taille du Texte',
    iconSize: 'Taille des Icônes',
    blackWhiteMode: 'Mode Noir et Blanc',
    screenTimeControls: 'Contrôles du Temps d\'Écran',
    character: 'Personnage',
    characterName: 'Nom du Personnage',
    editCharacter: 'Modifier le Personnage (Bientôt)',
    privacyLegal: 'Confidentialité et Légal',
    termsConditions: 'Conditions d\'Utilisation',
    privacyPolicy: 'Politique de Confidentialité',
    developerOptions: 'Options Développeur',
    notificationDebug: 'Debug Notifications',
    audioDebug: 'Debug Audio',
    resetApp: 'Réinitialiser l\'App',
    
    // Language options
    english: 'Anglais',
    polish: 'Polonais',
    french: 'Français',
    
    // Text size options
    small: 'Petit',
    normal: 'Normal',
    large: 'Grand',
    
    // Common
    disabled: 'Désactivé',
    enabled: 'Activé',
    comingSoon: 'Bientôt Disponible',
    yourChildsName: 'Nom de Votre Enfant',
    medium: 'Moyen',
  },
};

export function useTranslation(language: Language) {
  return translations[language];
}
