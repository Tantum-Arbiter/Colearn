export default {
  // Common UI elements
  common: {
    back: 'Back',
    backArrow: '← Back',
    next: 'Next',
    done: 'Done',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    retry: 'Retry',
    version: 'Version',
    login: 'Login',
    logout: 'Logout',
    notSet: 'Not set',
  },

  // Main menu
  menu: {
    stories: 'Stories',
    emotions: 'Emotions',
    calming: 'Calming',
  },

  // Story selection
  stories: {
    title: 'Stories',
    genreStories: '{{genre}} Stories',
    genres: {
      bedtime: 'Bedtime',
      adventure: 'Adventure',
      nature: 'Nature',
      friendship: 'Friendship',
      learning: 'Learning',
      fantasy: 'Fantasy',
      personalized: 'Your Avatar, Your Story',
      music: 'Learn Music',
      activities: 'Spontaneous Activities',
      growing: 'Growing Together',
    },
    filterTags: {
      personalized: 'Your Story',
      calming: 'Calming',
      bedtime: 'Bedtime',
      adventure: 'Adventure',
      learning: 'Learning',
      music: 'Music',
      family: 'Family',
      imagination: 'Imagination',
      animals: 'Animals',
      friendship: 'Friendship',
      nature: 'Nature',
      fantasy: 'Fantasy',
      counting: 'Counting',
      emotions: 'Emotions',
      silly: 'Silly',
      rhymes: 'Rhymes',
    },
  },

  // Story reader
  reader: {
    tapToContinue: 'Tap to continue',
    tapToBegin: 'Tap to begin',
    selectVoiceProfile: 'Select a voice profile',
    recordingAs: 'Recording as: {{name}}',
    listeningTo: 'Listening to: {{name}}',
    selectRecording: 'Select a recording',
    storyPagesNotAvailable: 'Story pages not available',
    recordingComplete: 'Recording Complete',
    recordingCompleteMessage: 'Your voice recording for "{{name}}" has been saved.',
    page: 'Page {{current}} of {{total}}',
  },

  // Story completion
  completion: {
    theEnd: 'The End',
    wellDone: 'Well Done!',
    readAnother: 'Read Another Story',
    rereadStory: 'Read Again',
    bedtimeMusic: 'Bedtime Music',
    backToMenu: 'Back to Menu',
  },

  // Emotions screen
  emotions: {
    title: 'Express Yourself!',
    subtitle: 'Choose your style and learn about emotions',
    pickYourStyle: 'Pick Your Style',
    howToPlay: 'How to Play',
    howToPlayExpanded: 'How to Play ▼',
    howToPlayCollapsed: 'How to Play ▶',
    expressWithTheme: 'Express with {{theme}}!',
    instructions: {
      step1: 'Look at the picture',
      step2: 'Make the same face!',
      step3: 'Show me happy, sad, or silly',
      step4: "Let's learn about feelings together!",
    },
  },

  // Music/Calming screen
  music: {
    title: 'Calming',
    subtitle: 'Choose your music type',
    tantrums: 'Tantrums',
    tantrumsDescription: 'Calming music to help during difficult moments',
    sleep: 'Sleep',
    sleepDescription: 'Gentle sounds for peaceful sleep',
    unknownArtist: 'Unknown Artist',
  },

  // Account screen
  account: {
    title: 'Account',
    profile: 'Profile',
    nickname: 'Nickname',
    avatarType: 'Avatar Type',
    boy: '👦 Boy',
    girl: '👧 Girl',
    settings: 'Settings',
    language: 'Language',
    textSize: 'Text Size',
    notifications: 'Notifications',
    screenTime: 'Screen Time',
    customReminders: 'Custom Reminders',
    legal: 'Legal',
    termsAndConditions: 'Terms & Conditions',
    privacyPolicy: 'Privacy Policy',
    selectLanguage: 'Select Language',
    guestMode: 'Guest Mode',
    createAccount: 'Create an account to save your progress',
  },

  // Onboarding
  onboarding: {
    welcome: 'Welcome!',
    letsGetStarted: "Let's get started",
    whatsYourName: "What's your name?",
    enterNickname: 'Enter a nickname',
    chooseAvatar: 'Choose your avatar',
    allSet: "You're all set!",
    startExploring: 'Start Exploring',
    // Screen content
    screens: {
      welcome: {
        title: 'Welcome!',
        body: "Help your child's early development with our stories and activities",
        button: 'Next',
      },
      screenTime: {
        title: 'Why we limit screen time',
        body: 'We encourage parents to use this app together with their child.',
        button: 'Next',
      },
      personalize: {
        title: 'Lets make it about them!',
        body: "What's your name? Personalize the experience by entering your name and creating an avatar!",
        button: 'Next',
      },
      voiceRecording: {
        title: 'Record your voice!',
        body: "Narrate your stories with your voice. Comfort your child whilst you're not there.",
        button: 'Next',
      },
      research: {
        title: 'Backed by Research!',
        body: 'This app is developed as part of a Masters degree study on child development, exploring how digital exercises can support a healthy parent-child relationship. Research suggests co-engagement and short usage sessions provide the greatest benefits.',
        button: 'Next',
      },
      disclaimer: {
        title: 'Please Note',
        body: "This app is in active development. Some features may not work - please screenshot issues with a timestamp.\n\nThe backend sleeps when unused. If sign-in fails, wait 30 seconds. Story loading varies by network.\n\nStory content includes original works, AI-generated stories, and children's books used for educational research.",
        button: 'Next',
      },
      privacy: {
        title: 'Your Privacy',
        body: "Your data is secure. No personal information is collected or stored.\n\nSigning in via Google or Apple is safe and pseudonymized - we only receive an anonymous identifier, not your email or personal details.\n\nSession syncing across devices is fully anonymized. All data follows best security practices with encryption in transit and at rest.\n\nThis app is designed with privacy-first principles for you and your family.",
        button: 'Next',
      },
      crashReporting: {
        title: 'Help Us Improve',
        body: "Would you like to help us improve the app by sharing anonymous crash reports?\n\nCrash reports help us identify and fix issues quickly. They contain only technical information about what went wrong - no personal data, photos, or content.\n\nYou can change this setting anytime in Settings.",
        button: "Let's begin…",
      },
    },
    // Taglines for each screen
    taglines: {
      welcome: '✨ Stories that grow with your child',
      screenTime: '👨‍👩‍👧‍👦 Quality time together',
      personalize: '🎭 Make it uniquely theirs',
      voiceRecording: '🎙️ Your voice, their comfort',
      research: '🔬 Bridging Psychology with Technology',
    },
    benefits: {
      welcome: 'Personalized learning experiences',
      screenTime: 'Recommended by child development experts',
      personalize: 'Custom avatars and personalized stories',
      voiceRecording: 'Record once, comfort them always',
      research: 'Growing together, forever',
      disclaimer: 'Thank you for helping us improve!',
    },
  },

  // Tutorial
  tutorial: {
    welcomeTitle: 'Welcome to Grow with\nFreya! 🎉',
    welcomeDescription: "Let's take a quick tour to help you and your child get the most out of storytime together.",
    storiesTitle: 'Story Library 📚',
    storiesDescription: 'Tap here to explore our collection of interactive stories with beautiful illustrations and fun interactions.',
    emotionsTitle: 'Emotion Explorer 😊',
    emotionsDescription: 'Help your child learn about emotions through fun matching games with emojis and characters.',
    calmingTitle: 'Calming Corner 🎵',
    calmingDescription: 'Access soothing music and sounds designed to help during difficult moments or bedtime.',
    skip: 'Skip',
    gotIt: 'Got it!',
  },
};

