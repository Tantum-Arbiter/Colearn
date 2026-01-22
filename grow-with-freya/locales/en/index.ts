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
    default: 'Default',
    editProfile: 'Edit Profile',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    extraLarge: 'Extra Large',
    openSettings: 'Open Settings',
  },

  // Alerts
  alerts: {
    logout: {
      title: 'Logout',
      message: 'Are you sure you want to logout? You will need to sign in again.',
      error: 'Failed to logout. Please try again.',
    },
    resetApp: {
      title: 'Reset App',
      message: 'This will clear ALL app data including your login, character, and settings. Are you sure?',
    },
    deleteReminder: {
      title: 'Delete Reminder',
      message: 'Are you sure you want to delete "{{title}}"?',
    },
    unsavedChanges: {
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave without saving?',
    },
    missingTitle: {
      title: 'Missing Title',
      message: 'Please enter a title for your reminder.',
    },
    missingMessage: {
      title: 'Missing Message',
      message: 'Please enter a message for your reminder.',
    },
    missingDay: {
      title: 'Missing Day',
      message: 'Please select a day of the week for your reminder.',
    },
    timeConflict: {
      title: 'Time Slot Conflict',
      message: 'You already have a reminder set for {{day}} at {{time}}. Please choose a different time.',
    },
    createFailed: {
      message: 'Failed to create reminder. Please try again.',
    },
  },

  // Login screen
  login: {
    welcomeTitle: 'Welcome to\nGrow with Freya',
    subtitle: "Sign in to save your child's progress and sync across devices",
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    signingIn: 'Signing in...',
    continueWithoutSignIn: 'Continue without signing in',
    footerPrefix: 'By continuing, you agree to our ',
    termsAndConditions: 'Terms & Conditions',
    and: ' and ',
    privacyPolicy: 'Privacy Policy',
    signInFailed: 'Sign-In Failed',
    signInFailedMessage: 'Unable to sign in with Google. Please try again.',
    connectionTimeout: 'Connection Timed Out',
    connectionTimeoutMessage: 'Login timed out. Please check your connection and try again.',
    ok: 'OK',
  },

  // Main menu
  menu: {
    stories: 'Stories',
    emotions: 'Emotions',
    calming: 'Calming',
  },

  // Accessibility settings
  accessibility: {
    title: 'Accessibility',
    textSizeHint: 'Adjust text and button sizes for better visibility',
    grayscale: 'Grayscale / High Contrast',
    grayscaleHint: 'For black & white mode, use your device\'s built-in accessibility settings:',
    grayscaleIos: 'Settings → Accessibility → Display & Text Size → Color Filters → Grayscale',
    grayscaleAndroid: 'Settings → Accessibility → Color adjustment → Grayscale',
    blueLight: 'Blue Light Filter (Night Mode)',
    blueLightHint: 'Reduce blue light to help your child sleep better. Enable your device\'s night mode:',
    blueLightIos: 'Settings → Display & Brightness → Night Shift → Turn on',
    blueLightAndroid: 'Settings → Display → Night Light (or Eye Comfort) → Turn on',
    blueLightBenefit: 'Blue light from screens can affect sleep. Turning on night mode in the evening helps your child\'s brain prepare for bedtime by reducing stimulating blue wavelengths.',
  },

  // Story selection
  stories: {
    title: 'Stories',
    genreStories: '{{genre}} Stories',
    yourFavorites: 'Your Favorites',
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
    // Reading modes
    readMode: 'Read Mode',
    recordMode: 'Record Mode',
    listenMode: 'Listen Mode',
    // Menu items
    pagePreview: 'Page Preview',
    pageNumber: 'Page {{number}}',
    current: 'Current',
    fontButtonSize: 'Font / Button Size',
    compareLanguage: 'Compare Languages',
    compareLanguageOn: 'Compare Languages: On',
    compareLanguageOff: 'Compare Languages: Off',
    selectCompareLanguage: 'Choose languages to read, compare or record.',
    selectFirstLanguage: 'First language (white box):',
    selectSecondLanguage: 'Second language (blue box):',
    done: 'Done',
    autoPlayOn: 'Auto-Play: On',
    autoPlayOff: 'Auto-Play: Off',
    readingTips: 'Reading Tips',
    recordingTips: 'Recording Tips',
    narrationTips: 'Narration Tips',
    // Alerts
    permissionRequired: 'Permission Required',
    permissionMessage: 'Microphone access is needed to record your voice.',
    recordingError: 'Recording Error',
    recordingErrorMessage: 'Failed to start recording. Please try again.',
    overwriteRecording: 'Overwrite Recording?',
    overwriteRecordingMessage: 'This page already has a recording. Are you sure you want to overwrite it with a new recording?',
    nameAlreadyExists: 'Name Already Exists',
    nameAlreadyExistsMessage: 'A voice over named "{{name}}" already exists. Please choose a different name.',
    error: 'Error',
    createVoiceOverError: 'Failed to create voice over. Please try again.',
    overwriteVoiceOver: 'Overwrite Voice Over?',
    overwriteVoiceOverMessage: '"{{name}}" already has {{count}} page(s) recorded. Do you want to overwrite with new recordings?',
    deleteVoiceOver: 'Delete Voice Over',
    deleteVoiceOverMessage: 'Are you sure you want to delete "{{name}}"?',
    deleteVoiceOverMessageWithUndo: 'Are you sure you want to delete "{{name}}"? This cannot be undone.',
    overwrite: 'Overwrite',
    delete: 'Delete',
    cancel: 'Cancel',
  },

  // Story mode selection (book preview overlay)
  storyMode: {
    read: 'Read',
    record: 'Record',
    narrate: 'Narrate',
    preview: 'Preview',
    tapToBegin: 'Tap to begin',
    recordAs: 'Record as: {{name}}',
    narrateAs: 'Narrate as: {{name}}',
    recordVoiceOver: 'Record Voice Over',
    selectVoiceOver: 'Select Voice Over',
    selectExisting: 'Select existing to overwrite:',
    orCreateNew: 'Or create new:',
    enterName: 'Enter name...',
    create: 'Create',
    chooseRecording: 'Choose a recording to play',
    noVoiceOvers: 'No voice overs recorded yet',
    pagesRecorded: '{{count}} pages recorded',
    nameAlreadyExists: 'Name Already Exists',
    nameAlreadyExistsMessage: 'A voice over named "{{name}}" already exists. Please choose a different name.',
  },

  // Story preview modal
  storyPreview: {
    audience: 'Audience',
    ages: 'Ages {{range}}',
    duration: 'Duration',
    durationMinutes: '{{count}} min',
    tags: 'Tags',
    readStory: 'Read Story',
    aboutThisStory: 'About this story',
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
    expressing: "I'm expressing {{emotion}}!",
    loading: 'Loading...',
    progress: 'Progress: {{completed}} / {{total}}',
    instructions: {
      step1: '👀 Look and react to the emotion together',
      step2: '🤪 Make the face - exaggerate and be silly!',
      step3: '🔄 Take turns copying each other',
      step4: "🎭 Celebrate every attempt - it's about connection, not perfection",
    },
    // Theme names and descriptions
    themes: {
      emoji: {
        name: 'Emoji',
        description: 'Express emotions with fun emoji faces',
      },
      animals: {
        name: 'Animals',
        description: 'Learn emotions through cute animal friends',
      },
      bear: {
        name: 'Bear',
        description: 'Learn emotions with our friendly bear',
      },
    },
    // Emoji theme emotion names
    emoji: {
      happy: 'Happy',
      sad: 'Sad',
      angry: 'Angry',
      surprised: 'Surprised',
      scared: 'Scared',
      excited: 'Excited',
      confused: 'Confused',
      proud: 'Proud',
      shy: 'Shy',
      loving: 'Loving',
    },
    // Animals theme emotion names
    animals: {
      happy: 'Happy Bunny',
      sad: 'Sad Kitty',
      angry: 'Angry Dog',
      surprised: 'Surprised Chick',
      scared: 'Scared Raccoon',
      excited: 'Excited Fox',
      confused: 'Confused Elephant',
      proud: 'Proud Bear',
      shy: 'Shy Sloth',
      loving: 'Loving Panda',
    },
    // Bear theme emotion names
    bear: {
      happy: 'Happy Bear',
      sad: 'Sad Bear',
      angry: 'Angry Bear',
      surprised: 'Surprised Bear',
      scared: 'Scared Bear',
      excited: 'Excited Bear',
      confused: 'Confused Bear',
      proud: 'Proud Bear',
      shy: 'Shy Bear',
      loving: 'Loving Bear',
    },
    // Expression prompts for each emotion
    prompts: {
      happy: [
        'Show me your biggest smile!',
        'Can you laugh like you heard something funny?',
        'Make a happy face and clap your hands!',
        'Show me how you look when you get a present!',
      ],
      sad: [
        'Show me a sad face',
        'Can you make your face look like you lost your toy?',
        'Show me how you feel when you have to say goodbye',
        "Make a pouty face like when you're disappointed",
      ],
      angry: [
        'Show me an angry face',
        "Can you scrunch up your face like you're mad?",
        "Show me how you look when someone mean throws your favourite toy",
        'Make a grumpy face with crossed arms!',
      ],
      surprised: [
        'Show me a surprised face!',
        'Can you open your eyes and mouth really wide?',
        'Show me how you look when you see something amazing!',
        'Make a face like you just saw magic!',
      ],
      scared: [
        'Show me a scared face',
        "Can you hide behind your hands like you're scared?",
        'Show me how you look during a thunderstorm',
        'Make a face like you saw something spooky!',
      ],
      excited: [
        'Show me how excited you get!',
        'Can you jump up and down with a big smile?',
        "Show me your face when you're going somewhere fun!",
        'Make an excited face and wave your hands!',
      ],
      confused: [
        'Show me a confused face',
        "Can you scrunch your eyebrows like you're thinking hard?",
        "Show me how you look when you don't understand something",
        "Make a face like you're trying to solve a puzzle!",
      ],
      proud: [
        'Show me how proud you are!',
        'Can you stand tall and smile like you did something great?',
        'Show me your proud face when you finish a puzzle!',
        'Make a face like you just helped someone!',
      ],
      shy: [
        'Show me a shy face',
        'Can you hide your face a little bit?',
        'Show me how you look when meeting someone new',
        'Make a shy smile and look down!',
      ],
      loving: [
        'Show me your loving face!',
        'Can you give yourself a big hug?',
        'Show me how you look at someone you love!',
        "Make a face like you're giving kisses!",
      ],
    },
  },

  // Music/Calming screen
  music: {
    title: 'Calming',
    subtitle: 'Choose a track to play',
    tantrums: 'Tantrums',
    tantrumsDescription: 'Calming music to help during difficult moments',
    sleep: 'Sleep',
    sleepDescription: 'Gentle sounds for peaceful sleep',
    unknownArtist: 'Unknown Artist',
    playAll: 'Play All',
    calmingSession: 'Calming session in progress',
    playerError: 'Music Player Error',
    noTrackSelected: 'No track selected',
    chooseASong: 'Choose a song to start playing',
    fromPlaylist: 'from {{playlist}}',
    repeatCount: 'Repeat {{current}}/{{total}}',
    phase: 'Phase {{current}} of {{total}}',
    play: 'Play',
    pause: 'Pause',
    loading: 'Loading...',
    error: 'Error',
    playing: 'Playing',
    paused: 'Paused',
    idle: 'Idle',
    deepSleepPhase: 'Deep Sleep Phase',
    relaxationPhase: 'Relaxation Phase',
    comingSoon: 'Coming Soon',
    looping: 'Looping',
    // Tag labels
    tags: {
      calming: 'Calming',
      bedtime: 'Bedtime',
      stories: 'Stories',
    },
    // Track titles and descriptions
    tracks: {
      tantrumAlpha: {
        title: 'Tantrum Calming (10Hz)',
        artist: 'Binaural Beats',
        description: 'Alpha waves for calming during tantrums. Use with headphones for best effect.',
      },
      sleepAlpha: {
        title: 'Getting to Sleep (10Hz)',
        artist: 'Binaural Beats',
        description: 'Alpha waves to help transition from awake to drowsy. First phase of sleep sequence.',
      },
      sleepTheta: {
        title: 'Getting into Deep Sleep (6Hz)',
        artist: 'Binaural Beats',
        description: 'Theta waves to deepen sleep. Second phase of sleep sequence.',
      },
      sleepSequence: {
        title: 'Full Sleep Sequence',
        artist: 'Binaural Beats',
        description: 'Complete sleep progression: Getting to Sleep → Getting into Deep Sleep.',
      },
      // Audiobooks
      bearsBirthdayParty: {
        title: "Bear's Birthday Party",
        artist: 'Bedtime Story',
        description: 'A heartwarming tale about a bear celebrating a special birthday.',
      },
      damselElephant: {
        title: 'Damsel the Elephant',
        artist: 'Bedtime Story',
        description: 'Join Damsel the elephant on a gentle adventure.',
      },
      jimmyMouse: {
        title: 'Jimmy Mouse and the City Slickers',
        artist: 'Bedtime Story',
        description: 'A little mouse discovers the big city.',
      },
      newYearJungle: {
        title: 'New Year in the Jungle',
        artist: 'Bedtime Story',
        description: 'The jungle animals celebrate a new year together.',
      },
      snowWhite: {
        title: 'Snow White',
        artist: 'Bedtime Story',
        description: 'The classic fairy tale of Snow White, perfect for bedtime.',
      },
    },
  },

  // Screen time
  screenTime: {
    title: 'Screen Time',
    todayUsage: "Today's Usage",
    todaysUsage: "Today's Usage",
    dailyLimit: 'Daily Limit',
    weeklyAverage: 'Weekly Average',
    childAge: 'Child Age',
    ageMonths: '{{age}} months',
    ageYears: '{{years}} years {{months}} months',
    screenTimeLimit: 'Screen Time Limit',
    notifications: 'Notifications',
    customReminders: 'Custom Reminders',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    noLimit: 'No Limit',
    minutes: '{{count}} min',
    enabled: 'Enabled',
    disabled: 'Disabled',
    of: 'of',
    ofDailyLimit: '{{percentage}}% of daily limit',
    noScreenTimeRecommended: 'No screen time recommended',
    childsAge: "Child's Age",
    current: 'Current: {{age}}',
    age18to24months: '18-24 months',
    age2to6years: '2-6 years old',
    age6plus: '6+ years',
    age18to24m: '18-24m',
    age2to6yrs: '2-6 yrs',
    age6plusYrs: '6+ yrs',
    guidelines18to24: 'WHO/AAP Guidelines: Up to 15 minutes of high-quality content with parent co-engagement.',
    guidelines2to6: 'WHO/AAP Guidelines: Up to 1 hour of high-quality programming with parent involvement.',
    guidelines6plus: 'For children 6+ years, establish consistent limits on screen time.',
    weeklyActivityHeatmap: 'Weekly Activity Heatmap',
    screenTimePatterns: "Your child's screen time patterns by day",
    screenTimeLevel: 'Screen Time Level',
    noScreenTime: 'No Screen Time',
    recommended: 'Recommended',
    excessive: 'Excessive',
    overLimit: 'Over Limit',
    createMySchedule: 'Create My Schedule',
    scheduleIntro: "Set up personalized notification times for your child's screen time activities. You'll receive gentle reminders when it's time for stories, emotions, or music activities.",
    scheduleIntroShort: "Set up personalized notification times for your child's screen time activities.",
    createCustomReminders: '+ Create Custom Reminders',
    recommendedTimes: 'Recommended Times',
    recommendedTimesIntro: 'Based on child development research, the best times for screen activities are:',
    morningStoriesEmotions: 'Morning stories & emotions',
    afternoonLearning: 'Afternoon learning activities',
    preDinnerMusic: 'Pre-dinner wind down music',
    bedtimeGuidelines: 'Bedtime Guidelines',
    bedtimeWarning: 'Screen time after 7 PM can interfere with sleep quality. For best results, finish screen activities at least 1 hour before bedtime to help your child wind down naturally.',
    bedtimeWarningShort: 'Screen time after 7 PM can interfere with sleep quality. For best results, finish screen activities at least 1 hour before bedtime.',
    settings: 'Settings',
    screenTimeControls: 'Screen Time Controls',
    screenTimeControlsDesc: 'Monitor and limit daily screen time based on WHO/AAP guidelines',
    screenTimeControlsDescShort: 'Monitor and limit daily screen time',
    smartReminders: 'Smart Reminders',
    smartRemindersDesc: 'Receive gentle notifications for recommended activity times',
    smartRemindersDescShort: 'Receive gentle notifications',
    monitorAndLimit: 'Monitor and limit daily screen time',
    receiveGentleNotifications: 'Receive gentle notifications',
    saveSettings: 'Save Settings',
    settingsSyncNote: 'Your settings will be synced across all your devices',
    notificationsEnabled: 'Notifications Enabled!',
    dontForgetToSave: "Don't forget to save your changes!",
    permissionRequired: 'Permission Required',
    enableNotificationsInSettings: 'Please enable notifications in your device settings.',
    sun: 'Sun',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
  },

  // Reminders
  reminders: {
    title: 'Custom Reminders',
    createTitle: 'Create Reminder',
    createNew: 'Create First Reminder',
    createButton: 'Create Reminder',
    creating: 'Creating...',
    noReminders: 'No Custom Reminders',
    noRemindersHint: 'Create your first reminder to get started with personalized exercise notifications.',
    permissionRequired: {
      title: 'Notifications Required',
      message: 'To receive reminders, please enable notifications for this app in your device settings.',
    },
    total: 'Total',
    today: 'Today',
    loading: 'Loading reminders...',
    quickTemplates: 'Quick Templates',
    reminderDetails: 'Reminder Details',
    titleLabel: 'Title',
    titlePlaceholder: 'Enter reminder title...',
    messageLabel: 'Message',
    messagePlaceholder: 'Enter reminder message...',
    dayOfWeek: 'Day of Week',
    timeLabel: 'Time',
    timeSlotTaken: '⚠️ This time slot is already taken for this day',
    conflictHint: 'Red (!) shows conflicts for selected day. All times are available.',
    selectDayHint: 'Select a day to see time availability',
    active: 'Active',
    inactive: 'Inactive',
    days: {
      sunday: 'Sunday',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
    },
    daysShort: {
      sunday: 'Sun',
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
    },
    templates: {
      readBook: {
        title: 'Read Interactive Book',
        message: 'Time to explore a wonderful story together! Pick a favorite book and dive in.',
      },
      emotionCards: {
        title: 'Do Emotion Cards',
        message: "Let's practice identifying feelings! Time for some emotion card activities.",
      },
      park: {
        title: 'Going Out to the Park',
        message: "Time for some fresh air and outdoor fun! Let's head to the park.",
      },
      buggyStroll: {
        title: '15 Minute Buggy Stroll',
        message: 'Perfect time for a gentle stroll! Get some fresh air and explore the neighborhood.',
      },
      schoolRun: {
        title: 'School Run',
        message: 'Time to get ready for the school run! Gather bags, coats, and head out.',
      },
      nurseryDropoff: {
        title: 'Nursery Drop-off',
        message: 'Time for nursery drop-off! Get little one ready and head out.',
      },
      toddlerGroup: {
        title: 'Toddler Group',
        message: 'Time for toddler group! Pack snacks and toys for a fun social session.',
      },
      softPlay: {
        title: 'Soft Play Visit',
        message: 'Time for soft play! Let the children burn off some energy indoors.',
      },
      foodShop: {
        title: 'Weekly Food Shop',
        message: "Time for the weekly shop! Don't forget the shopping list and bags for life.",
      },
      swimming: {
        title: 'Swimming Lessons',
        message: 'Time for swimming! Pack towels, goggles, and swimming kit.',
      },
      libraryStoryTime: {
        title: 'Library Story Time',
        message: 'Time for library story time! A lovely quiet activity with books and songs.',
      },
      coffeeWithFriends: {
        title: 'Coffee with Friends',
        message: 'Time to meet friends for coffee! A well-deserved break and catch-up.',
      },
      bedtimeRoutine: {
        title: 'Bedtime Routine',
        message: 'Time to start the bedtime routine! Bath, stories, and settling down.',
      },
      morningStretch: {
        title: 'Morning Stretch',
        message: 'Time for your morning stretching routine! Start your day with gentle movements.',
      },
    },
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
    crashReports: 'Crash Reports',
    crashReportsHint: 'Help us fix bugs by sending anonymous crash data',
  },

  // Profile validation and edit profile screen
  profile: {
    enterNickname: 'Please enter a nickname',
    nicknameTooLong: 'Nickname must be 20 characters or less',
    editTitle: 'Edit Profile',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Enter your nickname...',
    nicknameCharacters: '{{count}}/20 characters',
    avatarType: 'Avatar Type',
    boy: '👦 Boy',
    girl: '👧 Girl',
    saveChanges: 'Save Changes',
    comingSoon: '✨ More profile customization options coming soon - still in development!',
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
    swipeOrTap: 'Swipe or tap to continue',
    readyToStart: 'Ready to start your journey!',
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
    // Crash reporting dialog
    crashReportingDialog: {
      title: 'Enable Crash Reports?',
      body: 'Anonymous crash reports help us fix bugs and improve the app. No personal data is collected.\n\nYou can change this anytime in Settings.',
      noThanks: 'No Thanks',
      enable: 'Enable',
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
      privacy: 'Your data stays yours',
      crashReporting: 'Anonymous crash reports help fix bugs faster',
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
    // Button translations for tutorial overlays
    buttons: {
      next: 'Next',
      skip: 'Skip',
      skipAll: 'Skip All',
      skipTour: 'Skip tour',
      gotIt: 'Got it!',
      go: 'Go!',
      letsGo: "Let's Go!",
      done: 'Done',
      startReading: 'Start Reading',
    },
    // Main Menu Tour - shown on first login
    mainMenu: {
      welcome: {
        title: 'Welcome to Grow with\nFreya! 🎉',
        description: "Let's take a quick tour to help you and your child get the most out of storytime together.",
      },
      stories: {
        title: 'Story Library 📚',
        description: 'Tap here to explore our collection of interactive stories with beautiful illustrations and fun interactions.',
      },
      emotions: {
        title: 'Emotion Explorer 😊',
        description: 'Help your child learn about emotions through fun matching games with emojis and characters.',
      },
      bedtime: {
        title: 'Calming Corner 🎵',
        description: 'Access soothing music and sounds designed to help during difficult moments or bedtime.',
      },
      settings: {
        title: 'Settings ⚙️',
        description: 'Customise the app to work best for your family.',
      },
      sound: {
        title: 'Sound Control 🔊',
        description: 'Tap here to control background music and sound effects.',
      },
    },
    // Emotion Cards Tips
    emotionCards: {
      welcome: {
        title: 'Welcome to Emotion Cards! 🎭',
        description: 'Help your child learn to recognise and express emotions through fun, interactive cards.',
      },
      together: {
        title: 'Play Together 👨‍👩‍👧',
        description: 'Sit with your child and take turns flipping cards. Make the emotions together - it\'s more fun!',
      },
      connect: {
        title: 'Make Connections 💬',
        description: 'Ask questions like "When did you feel this way?" to help your child understand their emotions.',
      },
      scenarios: {
        title: 'Create Scenarios 🎭',
        description: 'Act out situations that might cause each emotion. "How would you feel if your toy broke?"',
      },
      themes: {
        title: 'Try Different Themes 🎨',
        description: 'Switch between emoji, animal, and bear themes to keep it fresh and engaging!',
      },
    },
    // Screen Time Tips - keys match tutorial.screenTime.* in tutorial-content.ts
    screenTime: {
      intro: {
        title: 'Screen Time Dashboard ⏱️',
        description: 'Track and manage your child\'s daily screen time with age-appropriate limits.',
      },
      ageBased: {
        title: 'Age-Based Limits 👶',
        description: 'Set your child\'s age to get WHO/AAP recommended screen time limits automatically.',
      },
      heatmap: {
        title: 'Weekly Activity 📊',
        description: 'See patterns in screen time usage throughout the week to help establish healthy routines.',
      },
      reminders: {
        title: 'Set Reminders ⏰',
        description: 'Create custom reminders for activities, breaks, or bedtime routines.',
      },
      routine: {
        title: 'Build Healthy Routines 🌟',
        description: 'Use screen time data to establish consistent daily routines that work for your family.',
      },
    },
    // Story Reader Tips - keys match tutorial.storyReader.* in tutorial-content.ts
    storyReader: {
      welcome: {
        title: 'Story Time Tips 📖',
        description: 'Here are some tips to make storytime magical for you and your child!',
      },
      interactive: {
        title: 'Look for Interactions ✨',
        description: 'Some pages have hidden surprises! Encourage your child to tap on objects that sparkle or glow.',
      },
      point: {
        title: 'Point and Discuss 👆',
        description: 'Ask questions about the pictures. "What do you see?" "What colour is the butterfly?"',
      },
      pause: {
        title: 'Pause and Predict 🤔',
        description: 'Before turning the page, ask "What do you think will happen next?" to boost engagement.',
      },
      voices: {
        title: 'Use Different Voices 🎭',
        description: 'Make characters come alive with silly voices! Your child will love the performance.',
      },
      navigate: {
        title: 'Easy Navigation 📚',
        description: 'Swipe left or right to turn pages. Tap the menu button for more options.',
      },
      tapWords: {
        title: 'Tap Words to Focus 👆',
        description: 'Tap any word in the story to highlight it! This helps focus attention and makes reading more interactive and engaging.',
      },
      compareLanguages: {
        title: 'Compare Languages 🌍',
        description: 'Use the menu to enable "Compare Languages" and view the story in two languages side-by-side. Perfect for multilingual families learning together!',
      },
    },
    // Book Mode Tips - keys match tutorial.bookMode.* in tutorial-content.ts
    bookMode: {
      read: {
        title: 'Read Mode 📖',
        description: 'Tap here to read the story yourself with your child. Turn pages at your own pace.',
      },
      record: {
        title: 'Record Mode 🎙️',
        description: 'Record your own voice reading the story. Perfect for when you\'re away!',
      },
      narrate: {
        title: 'Listen Mode 🎧',
        description: 'Listen to a pre-recorded narration of the story. Great for bedtime!',
      },
      preview: {
        title: 'Preview 👁️',
        description: 'See story details, duration, and themes before you start reading.',
      },
    },
    // Record Mode Tips - keys match tutorial.recordMode.* in tutorial-content.ts
    recordMode: {
      intro: {
        title: 'Record Your Voice 🎙️',
        description: 'Create a personal narration of this story that your child can listen to anytime - even when you\'re not there!',
      },
      button: {
        title: 'Recording Controls 🔴',
        description: 'Tap the microphone to start recording. Read the page text aloud, then tap again to stop.',
      },
      playback: {
        title: 'Review Your Recording ↺',
        description: 'Listen back to your recording and re-record if needed. Your child will love hearing your voice!',
      },
      sound: {
        title: 'Sound Tip 🔊',
        description: 'Find a quiet space for the best recording quality. Background noise can be distracting.',
      },
      limit: {
        title: 'Family Voices 👨‍👩‍👧',
        description: 'Multiple family members can record! Grandparents, aunts, uncles - let everyone join in.',
      },
      benefit: {
        title: 'Why Record? 💜',
        description: 'Research shows hearing a familiar voice helps children feel secure and connected, especially during separation.',
      },
      navigation: {
        title: 'Navigate Pages 📖',
        description: 'Use the arrows to move between pages. Record each page to create a complete narrated story!',
      },
    },
    // Narrate Mode Tips - keys match tutorial.narrateMode.* in tutorial-content.ts
    narrateMode: {
      intro: {
        title: 'Listen Mode 🎧',
        description: 'Sit back and enjoy! The story will be read aloud using a recorded voice.',
      },
      autoPlayback: {
        title: 'Auto-Play 📖',
        description: 'Pages turn automatically after the narration finishes. Perfect for bedtime!',
      },
      controls: {
        title: 'Playback Controls ▶️',
        description: 'Pause, replay, or skip ahead using the controls. You\'re in charge of the pace.',
      },
      sound: {
        title: 'Sound Tip 🔊',
        description: 'Make sure your device volume is up! Use headphones for a more immersive experience.',
      },
      benefit: {
        title: 'Bonding Time 💜',
        description: 'Even in listen mode, stay engaged! Point to pictures, ask questions, and enjoy the story together.',
      },
    },
    // Settings Walkthrough - keys match tutorial.settings.* in tutorial-content.ts
    settings: {
      intro: {
        title: 'Settings ⚙️',
        description: 'Customise the app to work best for your family.',
      },
      login: {
        title: 'Account & Sync 🔐',
        description: 'Sign in to save your progress and sync across devices.',
      },
      language: {
        title: 'Language 🌍',
        description: 'Choose your preferred language for the app interface.',
      },
      avatar: {
        title: 'Your Avatar 🎭',
        description: 'Personalise your child\'s experience with a custom avatar.',
      },
      accessibility: {
        title: 'Accessibility ♿',
        description: 'Adjust text size and other settings for easier use.',
      },
      screenTime: {
        title: 'Screen Time ⏱️',
        description: 'Set healthy limits and track daily usage.',
      },
    },
    // Gesture Hints - keys match tutorial.gestures.* in tutorial-content.ts
    gestures: {
      speakerLongPress: {
        title: 'Long Press Tip 👆',
        description: 'Long press the speaker button for more audio options.',
      },
      storySwipe: {
        title: 'Swipe Navigation 👆',
        description: 'Swipe left or right to turn pages quickly.',
      },
    },
    // Music Tips - keys match tutorial.music.* in tutorial-content.ts
    music: {
      welcome: {
        title: 'Welcome to Calming Sounds 🎵',
        description: 'This section uses specially designed audio to help your child relax, sleep, or calm down during challenging moments.',
      },
      binaural: {
        title: 'The Science of Sound 🧠',
        description: 'Our tracks use binaural beats - subtle sound frequencies that can help guide the brain into calmer states.',
      },
      headphones: {
        title: 'Use Headphones 🎧',
        description: 'For binaural beats to work effectively, headphones are recommended. Different frequencies in each ear create the calming effect.',
      },
      tantrum: {
        title: 'During Meltdowns 😢',
        description: 'These sounds can help during difficult moments. Stay calm yourself, and let the music work its magic.',
      },
      sleep: {
        title: 'Sleep Science 💤',
        description: 'Our sleep tracks gradually slow brainwave patterns, helping your child drift off naturally.',
      },
      routine: {
        title: 'Build a Routine 🌙',
        description: 'Playing the same calming sounds each night can signal to your child that it\'s time for sleep.',
      },
      stories: {
        title: 'Stories Too! 📖',
        description: 'Don\'t forget to check out our story section for bedtime reading!',
      },
    },
  },

  // Music Tips Overlay
  musicTips: {
    next: 'Next',
    go: 'Go!',
    letsGo: "Let's Go!",
    skip: 'Skip',
    skipAll: 'Skip All',
    music_welcome: {
      title: 'Welcome to Calming Sounds 🎵',
      description: 'This section uses specially designed audio to help your child relax, sleep, or calm down during challenging moments.',
    },
    binaural_science: {
      title: 'The Science of Sound 🧠',
      description: 'Our tracks use binaural beats - subtle sound frequencies that can help guide the brain into calmer states. Research shows these can reduce anxiety and promote relaxation in both children and adults.',
    },
    headphones_tip: {
      title: 'Use Headphones 🎧',
      description: 'For binaural beats to work effectively, headphones are recommended. The different frequencies in each ear create the calming effect. Without headphones, your child still benefits from the soothing music!',
    },
    tantrum_tip: {
      title: 'During Tantrums 😤',
      description: "When emotions run high, try playing our tantrum-calming tracks. The gentle frequencies can help regulate your child's nervous system and bring them back to a calmer state more quickly.",
    },
    sleep_science: {
      title: 'Better Sleep 🌙',
      description: 'Our sleep tracks use delta wave frequencies (0.5-4 Hz) that naturally occur during deep sleep. Playing these as your child falls asleep can help them drift off faster and sleep more soundly.',
    },
    sleep_routine: {
      title: 'Build a Routine 💤',
      description: "Try playing the same calming track each night as part of your bedtime routine. Over time, your child's brain will associate the sounds with sleep, making bedtime easier.",
    },
    music_stories: {
      title: 'Stories Too! 📖',
      description: "Don't forget our story section! Reading together builds vocabulary, imagination, and that precious parent-child bond. Record your voice so your child can hear YOU even when you're apart.",
    },
  },

  // Parents only modal
  parentsOnly: {
    title: 'Parents Only',
    typeAnimalName: 'Type the animal name',
    subtitle: 'Type the animal name to continue',
    solveMath: 'Solve the math problem',
    mathSubtitle: 'Enter the answer to continue',
    placeholder: 'Type here...',
    go: 'Go',
    continue: 'Continue',
    // Animal names for the challenge - validation accepts any of these
    animals: {
      cat: 'cat',
      duck: 'duck',
      dog: 'dog',
      camel: 'camel',
    },
  },

  // Screen time warning modal
  screenTimeWarning: {
    approachingLimit: 'Screen Time Warning',
    limitReached: 'Daily Limit Reached',
    dailyComplete: 'Great Job Today!',
    notice: 'Screen Time Notice',
    guidelines: 'Following WHO & AAP recommendations for healthy screen time',
    closeNotification: 'Close Notification',
    educationalMessage: 'Try other activities: reading books, playing outside, or creative play!',
    approachingMessage: 'Only {{minutes}} minutes of screen time left today. Would you like to continue or close the app?',
    limitReachedMessage: "Daily screen time limit reached. It's time to close the app and try other activities!",
  },

  // Audio settings modal
  audioSettings: {
    title: 'Audio Settings',
    masterVolume: 'Master Volume',
    music: 'Music',
    voiceOver: 'Voice Over',
  },

  // Default page content
  defaultPage: {
    comingSoon: 'Coming Soon!',
    stories: {
      message: 'Story Time!',
      subtitle: 'Magical tales and adventures await you here. Let your imagination soar!',
    },
    sensory: {
      message: 'Feel & Explore!',
      subtitle: 'Touch, see, hear, and discover the world around you through your senses.',
    },
    emotions: {
      message: 'Happy Feelings!',
      subtitle: 'Learn about emotions and how to express your feelings in healthy ways.',
    },
    bedtime: {
      message: 'Sweet Dreams!',
      subtitle: 'Gentle melodies and soothing sounds to help you drift off to sleep.',
    },
    screenTime: {
      message: 'Time to Play!',
      subtitle: 'Balance your screen time with fun activities and healthy habits.',
    },
  },
};

