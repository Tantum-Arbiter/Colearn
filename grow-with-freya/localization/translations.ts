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

  // Main Menu
  stories: string;
  emotions: string;
  bedtimeMusic: string;

  // Stories
  chooseYourAdventure: string;
  bedtimeStories: string;
  adventureStories: string;
  natureStories: string;
  friendshipStories: string;
  learningStories: string;
  fantasyStories: string;
  storyPagesNotAvailable: string;

  // Story Book Reader
  storyTime: string;
  sweetDreams: string;
  readAnother: string;
  rereadCurrent: string;

  // Emotions
  expressYourself: string;
  happyFeelings: string;
  feelAndExplore: string;

  // Music
  chooseYourMusicType: string;
  tantrums: string;
  tantrumsDescription: string;
  sleep: string;
  sleepDescription: string;

  // Default Page Messages
  storyTimeMessage: string;
  storyTimeSubtitle: string;
  sensoryMessage: string;
  sensorySubtitle: string;
  emotionsMessage: string;
  emotionsSubtitle: string;
  bedtimeMessage: string;
  bedtimeSubtitle: string;

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

    // Main Menu
    stories: 'Stories',
    emotions: 'Emotions',
    bedtimeMusic: 'Bedtime Music',

    // Stories
    chooseYourAdventure: 'Choose Your Adventure',
    bedtimeStories: 'Bedtime Stories',
    adventureStories: 'Adventure Stories',
    natureStories: 'Nature Stories',
    friendshipStories: 'Friendship Stories',
    learningStories: 'Learning Stories',
    fantasyStories: 'Fantasy Stories',
    storyPagesNotAvailable: 'Story pages not available',

    // Story Book Reader
    storyTime: 'Story Time!',
    sweetDreams: 'Sweet Dreams!',
    readAnother: 'Read Another',
    rereadCurrent: 'Read Again',

    // Emotions
    expressYourself: 'Express Yourself!',
    happyFeelings: 'Happy Feelings!',
    feelAndExplore: 'Feel & Explore!',

    // Music
    chooseYourMusicType: 'Choose your music type',
    tantrums: 'Tantrums',
    tantrumsDescription: 'Calming binaural beats to help soothe during difficult moments',
    sleep: 'Sleep',
    sleepDescription: 'Gentle melodies and soothing sounds for peaceful rest',

    // Default Page Messages
    storyTimeMessage: 'Story Time!',
    storyTimeSubtitle: 'Magical tales and adventures await you here. Let your imagination soar!',
    sensoryMessage: 'Feel & Explore!',
    sensorySubtitle: 'Touch, see, hear, and discover the world around you through your senses.',
    emotionsMessage: 'Happy Feelings!',
    emotionsSubtitle: 'Learn about emotions and how to express your feelings in healthy ways.',
    bedtimeMessage: 'Sweet Dreams!',
    bedtimeSubtitle: 'Gentle melodies and soothing sounds to help you drift off to sleep.',

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

    // Main Menu
    stories: 'Opowieści',
    emotions: 'Emocje',
    bedtimeMusic: 'Muzyka na Dobranoc',

    // Stories
    chooseYourAdventure: 'Wybierz Swoją Przygodę',
    bedtimeStories: 'Opowieści na Dobranoc',
    adventureStories: 'Opowieści Przygodowe',
    natureStories: 'Opowieści o Naturze',
    friendshipStories: 'Opowieści o Przyjaźni',
    learningStories: 'Opowieści Edukacyjne',
    fantasyStories: 'Opowieści Fantasy',
    storyPagesNotAvailable: 'Strony opowieści niedostępne',

    // Story Book Reader
    storyTime: 'Czas na Opowieść!',
    sweetDreams: 'Słodkich Snów!',
    readAnother: 'Przeczytaj Inną',
    rereadCurrent: 'Przeczytaj Ponownie',

    // Emotions
    expressYourself: 'Wyrażaj Siebie!',
    happyFeelings: 'Szczęśliwe Uczucia!',
    feelAndExplore: 'Czuj i Odkrywaj!',

    // Music
    chooseYourMusicType: 'Wybierz rodzaj muzyki',
    tantrums: 'Napady Złości',
    tantrumsDescription: 'Uspokajające dźwięki binauralne pomagające w trudnych chwilach',
    sleep: 'Sen',
    sleepDescription: 'Delikatne melodie i kojące dźwięki dla spokojnego odpoczynku',

    // Default Page Messages
    storyTimeMessage: 'Czas na Opowieść!',
    storyTimeSubtitle: 'Magiczne opowieści i przygody czekają na Ciebie tutaj. Pozwól swojej wyobraźni szybować!',
    sensoryMessage: 'Czuj i Odkrywaj!',
    sensorySubtitle: 'Dotykaj, patrz, słuchaj i odkrywaj świat wokół siebie przez swoje zmysły.',
    emotionsMessage: 'Szczęśliwe Uczucia!',
    emotionsSubtitle: 'Ucz się o emocjach i jak wyrażać swoje uczucia w zdrowy sposób.',
    bedtimeMessage: 'Słodkich Snów!',
    bedtimeSubtitle: 'Delikatne melodie i kojące dźwięki pomogą Ci zasnąć.',

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

    // Main Menu
    stories: 'Histoires',
    emotions: 'Émotions',
    bedtimeMusic: 'Musique du Coucher',

    // Stories
    chooseYourAdventure: 'Choisissez Votre Aventure',
    bedtimeStories: 'Histoires du Coucher',
    adventureStories: 'Histoires d\'Aventure',
    natureStories: 'Histoires de Nature',
    friendshipStories: 'Histoires d\'Amitié',
    learningStories: 'Histoires Éducatives',
    fantasyStories: 'Histoires Fantasy',
    storyPagesNotAvailable: 'Pages d\'histoire non disponibles',

    // Story Book Reader
    storyTime: 'L\'Heure des Histoires!',
    sweetDreams: 'Beaux Rêves!',
    readAnother: 'Lire une Autre',
    rereadCurrent: 'Relire',

    // Emotions
    expressYourself: 'Exprimez-Vous!',
    happyFeelings: 'Sentiments Joyeux!',
    feelAndExplore: 'Ressentez et Explorez!',

    // Music
    chooseYourMusicType: 'Choisissez votre type de musique',
    tantrums: 'Colères',
    tantrumsDescription: 'Sons binauraux apaisants pour aider à calmer dans les moments difficiles',
    sleep: 'Sommeil',
    sleepDescription: 'Mélodies douces et sons apaisants pour un repos paisible',

    // Default Page Messages
    storyTimeMessage: 'L\'Heure des Histoires!',
    storyTimeSubtitle: 'Des contes magiques et des aventures vous attendent ici. Laissez votre imagination s\'envoler!',
    sensoryMessage: 'Ressentez et Explorez!',
    sensorySubtitle: 'Touchez, voyez, entendez et découvrez le monde qui vous entoure à travers vos sens.',
    emotionsMessage: 'Sentiments Joyeux!',
    emotionsSubtitle: 'Apprenez les émotions et comment exprimer vos sentiments de manière saine.',
    bedtimeMessage: 'Beaux Rêves!',
    bedtimeSubtitle: 'Mélodies douces et sons apaisants pour vous aider à vous endormir.',

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
