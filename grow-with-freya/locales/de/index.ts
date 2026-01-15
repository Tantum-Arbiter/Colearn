export default {
  // Common UI elements
  common: {
    back: 'Zurück',
    backArrow: '← Zurück',
    next: 'Weiter',
    done: 'Fertig',
    cancel: 'Abbrechen',
    save: 'Speichern',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    close: 'Schließen',
    ok: 'OK',
    yes: 'Ja',
    no: 'Nein',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    retry: 'Erneut versuchen',
    version: 'Version',
    login: 'Anmelden',
    logout: 'Abmelden',
    notSet: 'Nicht festgelegt',
  },

  // Main menu
  menu: {
    stories: 'Geschichten',
    emotions: 'Gefühle',
    calming: 'Beruhigung',
  },

  // Story selection
  stories: {
    title: 'Geschichten',
    genreStories: '{{genre}} Geschichten',
    genres: {
      bedtime: 'Gute Nacht',
      adventure: 'Abenteuer',
      nature: 'Natur',
      friendship: 'Freundschaft',
      learning: 'Lernen',
      fantasy: 'Fantasie',
      personalized: 'Dein Avatar, deine Geschichte',
      music: 'Musik lernen',
      activities: 'Spontane Aktivitäten',
      growing: 'Gemeinsam wachsen',
    },
    filterTags: {
      personalized: 'Deine Geschichte',
      calming: 'Beruhigend',
      bedtime: 'Gute Nacht',
      adventure: 'Abenteuer',
      learning: 'Lernen',
      music: 'Musik',
      family: 'Familie',
      imagination: 'Fantasie',
      animals: 'Tiere',
      friendship: 'Freundschaft',
      nature: 'Natur',
      fantasy: 'Fantasie',
      counting: 'Zählen',
      emotions: 'Gefühle',
      silly: 'Lustig',
      rhymes: 'Reime',
    },
  },

  // Story reader
  reader: {
    tapToContinue: 'Tippen zum Fortfahren',
    tapToBegin: 'Tippen zum Starten',
    selectVoiceProfile: 'Stimmprofil auswählen',
    recordingAs: 'Aufnahme als: {{name}}',
    listeningTo: 'Hört zu: {{name}}',
    selectRecording: 'Aufnahme auswählen',
    storyPagesNotAvailable: 'Geschichtenseiten nicht verfügbar',
    recordingComplete: 'Aufnahme abgeschlossen',
    recordingCompleteMessage: 'Deine Sprachaufnahme für "{{name}}" wurde gespeichert.',
    page: 'Seite {{current}} von {{total}}',
  },

  // Story completion
  completion: {
    theEnd: 'Ende',
    wellDone: 'Gut gemacht!',
    readAnother: 'Eine andere Geschichte lesen',
    rereadStory: 'Nochmal lesen',
    bedtimeMusic: 'Gute-Nacht-Musik',
    backToMenu: 'Zurück zum Menü',
  },

  // Emotions screen
  emotions: {
    title: 'Drück dich aus!',
    subtitle: 'Wähle deinen Stil und lerne Gefühle kennen',
    pickYourStyle: 'Wähle deinen Stil',
    howToPlay: 'Spielanleitung',
    howToPlayExpanded: 'Spielanleitung ▼',
    howToPlayCollapsed: 'Spielanleitung ▶',
    expressWithTheme: 'Drück dich mit {{theme}} aus!',
    instructions: {
      step1: 'Schau dir das Bild an',
      step2: 'Mach das gleiche Gesicht!',
      step3: 'Zeig mir fröhlich, traurig oder albern',
      step4: 'Lass uns gemeinsam Gefühle lernen!',
    },
  },

  // Music/Calming screen
  music: {
    title: 'Beruhigung',
    subtitle: 'Wähle deine Musikart',
    tantrums: 'Wutanfälle',
    tantrumsDescription: 'Beruhigende Musik für schwierige Momente',
    sleep: 'Schlafen',
    sleepDescription: 'Sanfte Klänge für einen friedlichen Schlaf',
    unknownArtist: 'Unbekannter Künstler',
  },

  // Account screen
  account: {
    title: 'Konto',
    profile: 'Profil',
    nickname: 'Spitzname',
    avatarType: 'Avatar-Typ',
    boy: '👦 Junge',
    girl: '👧 Mädchen',
    settings: 'Einstellungen',
    language: 'Sprache',
    textSize: 'Textgröße',
    notifications: 'Benachrichtigungen',
    screenTime: 'Bildschirmzeit',
    customReminders: 'Eigene Erinnerungen',
    legal: 'Rechtliches',
    termsAndConditions: 'Nutzungsbedingungen',
    privacyPolicy: 'Datenschutz',
    selectLanguage: 'Sprache auswählen',
    guestMode: 'Gastmodus',
    createAccount: 'Erstelle ein Konto um deinen Fortschritt zu speichern',
  },

  // Onboarding
  onboarding: {
    welcome: 'Willkommen!',
    letsGetStarted: 'Los geht\'s',
    whatsYourName: 'Wie heißt du?',
    enterNickname: 'Gib einen Spitznamen ein',
    chooseAvatar: 'Wähle deinen Avatar',
    allSet: 'Alles bereit!',
    startExploring: 'Entdecken starten',
    screens: {
      welcome: {
        title: 'Willkommen!',
        body: 'Unterstütze die frühe Entwicklung deines Kindes mit unseren Geschichten und Aktivitäten',
        button: 'Weiter',
      },
      screenTime: {
        title: 'Warum wir Bildschirmzeit begrenzen',
        body: 'Wir ermutigen Eltern, diese App gemeinsam mit ihrem Kind zu nutzen.',
        button: 'Weiter',
      },
      personalize: {
        title: 'Machen wir es persönlich!',
        body: 'Wie heißt du? Personalisiere das Erlebnis indem du deinen Namen eingibst und einen Avatar erstellst!',
        button: 'Weiter',
      },
      voiceRecording: {
        title: 'Nimm deine Stimme auf!',
        body: 'Erzähle Geschichten mit deiner Stimme. Tröste dein Kind auch wenn du nicht da bist.',
        button: 'Weiter',
      },
      research: {
        title: 'Forschungsgestützt!',
        body: 'Diese App wurde im Rahmen einer Masterarbeit über Kindesentwicklung entwickelt und untersucht, wie digitale Übungen eine gesunde Eltern-Kind-Beziehung unterstützen können. Forschung zeigt, dass gemeinsames Engagement und kurze Sitzungen die größten Vorteile bieten.',
        button: 'Weiter',
      },
      disclaimer: {
        title: 'Bitte beachten',
        body: 'Diese App befindet sich in aktiver Entwicklung. Einige Funktionen funktionieren möglicherweise nicht - bitte machen Sie Screenshots von Problemen.\n\nDas Backend schläft wenn unbenutzt. Bei Anmeldefehlern warten Sie 30 Sekunden. Das Laden von Geschichten variiert je nach Netzwerk.\n\nInhalte umfassen Originalwerke, KI-generierte Geschichten und Kinderbücher für Bildungsforschung.',
        button: 'Weiter',
      },
      privacy: {
        title: 'Deine Privatsphäre',
        body: 'Deine Daten sind sicher. Es werden keine persönlichen Informationen gesammelt oder gespeichert.\n\nDie Anmeldung über Google oder Apple ist sicher und pseudonymisiert - wir erhalten nur eine anonyme Kennung, nicht deine E-Mail.\n\nDie Sitzungssynchronisierung zwischen Geräten ist vollständig anonymisiert. Alle Daten folgen besten Sicherheitspraktiken mit Verschlüsselung.\n\nDiese App ist mit Privacy-First-Prinzipien für dich und deine Familie gestaltet.',
        button: 'Weiter',
      },
      crashReporting: {
        title: 'Hilf uns zu verbessern',
        body: 'Möchtest du uns helfen, die App zu verbessern, indem du anonyme Absturzberichte teilst?\n\nAbsturzberichte helfen uns, Probleme schnell zu identifizieren und zu beheben. Sie enthalten nur technische Informationen darüber, was schief gelaufen ist - keine persönlichen Daten, Fotos oder Inhalte.\n\nDu kannst diese Einstellung jederzeit in den Einstellungen ändern.',
        button: 'Los geht\'s…',
      },
    },
    taglines: {
      welcome: '✨ Geschichten die mit deinem Kind wachsen',
      screenTime: '👨‍👩‍👧‍👦 Qualitätszeit zusammen',
      personalize: '🎭 Mach es einzigartig',
      voiceRecording: '🎙️ Deine Stimme, ihr Trost',
      research: '🔬 Psychologie mit Technologie verbinden',
    },
    benefits: {
      welcome: 'Personalisierte Lernerfahrungen',
      screenTime: 'Von Kindesentwicklungsexperten empfohlen',
      personalize: 'Benutzerdefinierte Avatare und personalisierte Geschichten',
      voiceRecording: 'Einmal aufnehmen, immer trösten',
      research: 'Gemeinsam wachsen, für immer',
      disclaimer: 'Danke dass du uns hilfst zu verbessern!',
    },
  },

  // Tutorial
  tutorial: {
    welcomeTitle: 'Willkommen bei Grow with\nFreya! 🎉',
    welcomeDescription: 'Lass uns eine kurze Tour machen, um dir und deinem Kind zu helfen, das Beste aus der Geschichtenzeit zu machen.',
    storiesTitle: 'Geschichtenbibliothek 📚',
    storiesDescription: 'Tippe hier, um unsere Sammlung interaktiver Geschichten mit schönen Illustrationen zu entdecken.',
    emotionsTitle: 'Gefühle-Entdecker 😊',
    emotionsDescription: 'Hilf deinem Kind, Gefühle durch lustige Spiele mit Emojis und Charakteren zu lernen.',
    calmingTitle: 'Ruhe-Ecke 🎵',
    calmingDescription: 'Zugang zu beruhigender Musik und Klängen für schwierige Momente oder die Schlafenszeit.',
    skip: 'Überspringen',
    gotIt: 'Verstanden!',
  },
};

