export default {
  // Common UI elements
  common: {
    back: 'Wstecz',
    backArrow: '← Wstecz',
    next: 'Dalej',
    done: 'Gotowe',
    cancel: 'Anuluj',
    save: 'Zapisz',
    delete: 'Usuń',
    edit: 'Edytuj',
    close: 'Zamknij',
    ok: 'OK',
    yes: 'Tak',
    no: 'Nie',
    loading: 'Ładowanie...',
    error: 'Błąd',
    success: 'Sukces',
    retry: 'Spróbuj ponownie',
    version: 'Wersja',
    login: 'Zaloguj',
    logout: 'Wyloguj',
    notSet: 'Nie ustawiono',
  },

  // Main menu
  menu: {
    stories: 'Bajki',
    emotions: 'Emocje',
    calming: 'Uspokajanie',
  },

  // Story selection
  stories: {
    title: 'Bajki',
    genreStories: 'Bajki: {{genre}}',
    genres: {
      bedtime: 'Na dobranoc',
      adventure: 'Przygodowe',
      nature: 'Przyroda',
      friendship: 'Przyjaźń',
      learning: 'Edukacyjne',
      fantasy: 'Fantastyczne',
      personalized: 'Twoja postać, Twoja bajka',
      music: 'Nauka muzyki',
      activities: 'Spontaniczne aktywności',
      growing: 'Razem rośniemy',
    },
    filterTags: {
      personalized: 'Twoja bajka',
      calming: 'Uspokajające',
      bedtime: 'Na dobranoc',
      adventure: 'Przygodowe',
      learning: 'Edukacyjne',
      music: 'Muzyka',
      family: 'Rodzina',
      imagination: 'Wyobraźnia',
      animals: 'Zwierzęta',
      friendship: 'Przyjaźń',
      nature: 'Przyroda',
      fantasy: 'Fantastyczne',
      counting: 'Liczenie',
      emotions: 'Emocje',
      silly: 'Zabawne',
      rhymes: 'Rymowanki',
    },
  },

  // Story reader
  reader: {
    tapToContinue: 'Dotknij aby kontynuować',
    tapToBegin: 'Dotknij aby zacząć',
    selectVoiceProfile: 'Wybierz profil głosowy',
    recordingAs: 'Nagrywasz jako: {{name}}',
    listeningTo: 'Słuchasz: {{name}}',
    selectRecording: 'Wybierz nagranie',
    storyPagesNotAvailable: 'Strony bajki niedostępne',
    recordingComplete: 'Nagranie zakończone',
    recordingCompleteMessage: 'Twoje nagranie głosowe dla "{{name}}" zostało zapisane.',
    page: 'Strona {{current}} z {{total}}',
  },

  // Story completion
  completion: {
    theEnd: 'Koniec',
    wellDone: 'Świetnie!',
    readAnother: 'Przeczytaj inną bajkę',
    rereadStory: 'Przeczytaj ponownie',
    bedtimeMusic: 'Muzyka na dobranoc',
    backToMenu: 'Wróć do menu',
  },

  // Emotions screen
  emotions: {
    title: 'Wyrażaj siebie!',
    subtitle: 'Wybierz swój styl i poznaj emocje',
    pickYourStyle: 'Wybierz swój styl',
    howToPlay: 'Jak grać',
    howToPlayExpanded: 'Jak grać ▼',
    howToPlayCollapsed: 'Jak grać ▶',
    expressWithTheme: 'Wyraź się z {{theme}}!',
    instructions: {
      step1: 'Spójrz na obrazek',
      step2: 'Zrób taką samą minę!',
      step3: 'Pokaż radość, smutek lub wygłupy',
      step4: 'Razem poznajemy uczucia!',
    },
  },

  // Music/Calming screen
  music: {
    title: 'Uspokajanie',
    subtitle: 'Wybierz rodzaj muzyki',
    tantrums: 'Napady złości',
    tantrumsDescription: 'Uspokajająca muzyka na trudne chwile',
    sleep: 'Sen',
    sleepDescription: 'Delikatne dźwięki dla spokojnego snu',
    unknownArtist: 'Nieznany artysta',
  },

  // Account screen
  account: {
    title: 'Konto',
    profile: 'Profil',
    nickname: 'Pseudonim',
    avatarType: 'Typ awatara',
    boy: '👦 Chłopiec',
    girl: '👧 Dziewczynka',
    settings: 'Ustawienia',
    language: 'Język',
    textSize: 'Rozmiar tekstu',
    notifications: 'Powiadomienia',
    screenTime: 'Czas ekranu',
    customReminders: 'Własne przypomnienia',
    legal: 'Prawne',
    termsAndConditions: 'Regulamin',
    privacyPolicy: 'Polityka prywatności',
    selectLanguage: 'Wybierz język',
    guestMode: 'Tryb gościa',
    createAccount: 'Utwórz konto aby zapisać postępy',
  },

  // Onboarding
  onboarding: {
    welcome: 'Witaj!',
    letsGetStarted: 'Zaczynamy',
    whatsYourName: 'Jak masz na imię?',
    enterNickname: 'Wpisz pseudonim',
    chooseAvatar: 'Wybierz awatara',
    allSet: 'Wszystko gotowe!',
    startExploring: 'Zacznij odkrywać',
    screens: {
      welcome: {
        title: 'Witaj!',
        body: 'Pomóż w rozwoju dziecka dzięki naszym historyjkom i aktywnościom',
        button: 'Dalej',
      },
      screenTime: {
        title: 'Dlaczego ograniczamy czas przed ekranem',
        body: 'Zachęcamy rodziców do korzystania z aplikacji razem z dzieckiem.',
        button: 'Dalej',
      },
      personalize: {
        title: 'Zróbmy to o nich!',
        body: 'Jak masz na imię? Spersonalizuj doświadczenie wpisując swoje imię i tworząc awatara!',
        button: 'Dalej',
      },
      voiceRecording: {
        title: 'Nagraj swój głos!',
        body: 'Opowiadaj historyjki swoim głosem. Pocieszaj dziecko nawet gdy Cię nie ma.',
        button: 'Dalej',
      },
      research: {
        title: 'Oparte na badaniach!',
        body: 'Ta aplikacja powstała w ramach pracy magisterskiej z rozwoju dziecka, badającej jak cyfrowe ćwiczenia mogą wspierać zdrową relację rodzic-dziecko. Badania wskazują, że wspólne zaangażowanie i krótkie sesje przynoszą największe korzyści.',
        button: 'Dalej',
      },
      disclaimer: {
        title: 'Uwaga',
        body: 'Aplikacja jest w fazie rozwoju. Niektóre funkcje mogą nie działać - prosimy o zrzuty ekranu z błędami.\n\nBackend usypia gdy nie jest używany. Jeśli logowanie nie działa, poczekaj 30 sekund. Ładowanie historii zależy od sieci.\n\nTreści obejmują oryginalne prace, historie generowane przez AI oraz książki dla dzieci używane do badań edukacyjnych.',
        button: 'Dalej',
      },
      privacy: {
        title: 'Twoja prywatność',
        body: 'Twoje dane są bezpieczne. Nie zbieramy ani nie przechowujemy danych osobowych.\n\nLogowanie przez Google lub Apple jest bezpieczne i zanonimizowane - otrzymujemy tylko anonimowy identyfikator, nie Twój email.\n\nSynchronizacja sesji między urządzeniami jest w pełni anonimowa. Wszystkie dane są szyfrowane.\n\nTa aplikacja jest zaprojektowana z myślą o prywatności Twojej i Twojej rodziny.',
        button: 'Dalej',
      },
      crashReporting: {
        title: 'Pomóż nam się rozwijać',
        body: 'Czy chcesz pomóc nam ulepszać aplikację udostępniając anonimowe raporty o awariach?\n\nRaporty o awariach pomagają nam szybko identyfikować i naprawiać problemy. Zawierają tylko informacje techniczne o tym co poszło nie tak - żadnych danych osobowych, zdjęć ani treści.\n\nMożesz zmienić to ustawienie w dowolnym momencie w Ustawieniach.',
        button: 'Zaczynamy…',
      },
    },
    taglines: {
      welcome: '✨ Historyjki, które rosną z Twoim dzieckiem',
      screenTime: '👨‍👩‍👧‍👦 Czas razem',
      personalize: '🎭 Zrób to wyjątkowo ich',
      voiceRecording: '🎙️ Twój głos, ich komfort',
      research: '🔬 Łącząc psychologię z technologią',
    },
    benefits: {
      welcome: 'Spersonalizowane doświadczenia edukacyjne',
      screenTime: 'Polecane przez ekspertów rozwoju dziecka',
      personalize: 'Niestandardowe awatary i spersonalizowane historie',
      voiceRecording: 'Nagraj raz, pocieszaj zawsze',
      research: 'Rosnąc razem, na zawsze',
      disclaimer: 'Dziękujemy za pomoc w ulepszaniu!',
    },
  },

  // Tutorial
  tutorial: {
    welcomeTitle: 'Witaj w Grow with\nFreya! 🎉',
    welcomeDescription: 'Zróbmy szybką wycieczkę, która pomoże Tobie i Twojemu dziecku w pełni korzystać z czytania bajek.',
    storiesTitle: 'Biblioteka bajek 📚',
    storiesDescription: 'Dotknij tutaj, aby odkryć naszą kolekcję interaktywnych bajek z pięknymi ilustracjami.',
    emotionsTitle: 'Odkrywanie emocji 😊',
    emotionsDescription: 'Pomóż dziecku poznawać emocje poprzez zabawne gry z emoji i postaciami.',
    calmingTitle: 'Kącik uspokajania 🎵',
    calmingDescription: 'Dostęp do kojącej muzyki i dźwięków zaprojektowanych na trudne chwile lub przed snem.',
    skip: 'Pomiń',
    gotIt: 'Rozumiem!',
  },
};

