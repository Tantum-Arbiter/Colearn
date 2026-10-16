export default {
  // Common UI elements
  common: {
    home: 'Home',
    back: 'Back',
    backArrow: 'Back',
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
    on: 'ON',
    off: 'OFF',
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
      message: 'This will clear ALL app data including your login, character, and settings. Are you sure? ',
    },
    deleteAccount: {
      title: 'Delete Account',
      message: 'This will permanently delete your account and all associated data. This action cannot be undone.',
      confirm: 'Type DELETE to confirm',
      success: 'Your account has been deleted.',
      error: 'Failed to delete account. Please try again.',
      sessionExpired: 'Your session has expired. Please sign in again to delete your account.',
      deleting: 'Deleting account...',
    },
    deleteReminder: {
      title: 'Delete Reminder',
      message: 'Are you sure you want to delete "{{title}}"? ',
    },
    unsavedChanges: {
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave without saving? ',
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
    welcomeTitle: 'Welcome!',
    welcomeTitleNamed: 'Welcome, {{name}}!',
    subtitle: "Let's begin your story time",
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    guestNote: 'Includes two free stories. Cloud sync is unavailable in guest mode.',
    safePrivateTitle: 'Safe and private',
    noAdverts: 'No adverts',
    noTracking: 'No behavioural tracking',
    signingIn: 'Signing in...',
    continueAsGuest: 'Continue as Guest',
    footerPrefix: 'By continuing, you agree to our',
    termsAndConditions: 'Terms & Conditions',
    and: ' and',
    privacyPolicy: 'Privacy Policy',
    signInFailed: 'Sign-In Failed',
    signInFailedMessage: 'Unable to sign in with Google. Please try again.',
    connectionTimeout: 'Connection Timed Out',
    connectionTimeoutMessage: 'Login timed out. Please check your connection and try again.',
    ok: 'OK',
  },

  // Guest mode info
  guestInfo: {
    title: 'Browsing as a Guest',
    description: 'You can explore Earlyroots Stories without an account, but some features will be limited.',
    missingOutTitle: 'What you\'ll miss without signing in',
    missing: {
      syncProgress: 'Save and sync your child\'s reading progress',
      multiDevice: 'Access your library across multiple devices',
      cloudBackup: 'Cloud backup of favourites and preferences',
      personalised: 'Personalised story recommendations',
    },
    subscriptionTitle: 'Unlock the full experience',
    subscriptionDescription: 'Earlyroots offers subscription plans that unlock our complete library of interactive stories, music activities, and learning content. Sign in anytime from settings to upgrade and access everything.',
    continueButton: 'Continue as Guest',
  },

  // Main menu
  menu: {
    stories: 'Stories',
    practise: 'Practise',
    freeplay: 'Freeplay',
    instruments: 'Instruments',
  },

  // Accessibility settings
  accessibility: {
    title: 'Accessibility',
    textSizeHint: 'Adjust text and button sizes for better visibility',
    grayscale: 'Grayscale / High Contrast',
    grayscaleHint: 'For black & white mode, use your device\'s built-in accessibility settings: ',
    grayscaleIos: 'Settings → Accessibility → Display & Text Size → Color Filters → Grayscale',
    grayscaleAndroid: 'Settings → Accessibility → Color adjustment → Grayscale',
    blueLight: 'Blue Light Filter (Night Mode)',
    blueLightHint: 'Reduce blue light to help your child sleep better. Enable your device\'s night mode: ',
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
      calming: 'Calming',
      bedtime: 'Bedtime',
      adventure: 'Adventure',
      learning: 'Learning',
      music: 'Music',
      family: 'Family',
      creativity: 'Creativity',
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

  home: {
    welcome: {
      normal: { title: 'Welcome back, {{name}}!', titleAnonymous: 'Welcome back!', subtitle: 'Your next adventure is waiting.' },
      firstToday: { title: 'Welcome back, {{name}}!', titleAnonymous: 'Welcome back!', subtitle: 'A brand new day of stories begins.' },
      newAchievement: { title: 'Hooray, {{name}}!', titleAnonymous: 'Hooray!', subtitle: 'You earned {{achievement}}. Look below!' },
      storyCompleted: { title: 'Well done, {{name}}!', titleAnonymous: 'Well done!', subtitle: 'You finished a whole story together.' },
      streak: { title: 'Welcome back, {{name}}!', titleAnonymous: 'Welcome back!', subtitle: '{{count}} days of stories in a row. Wonderful!' },
      longAbsence: { title: 'Lovely to see you, {{name}}!', titleAnonymous: 'Lovely to see you!', subtitle: 'Your stories are right where you left them.' },
    },
    continueBody: 'Pick up where you left off.',
    continueLearning: {
      title: 'Continue learning',
      body: 'Stories, music and games await',
      hint: 'Open the library',
    },
    continueStart: { eyebrow: 'Start a story', title: 'Pick your first adventure', body: 'A new world is waiting', hint: 'Choose a story to read together' },
    streak: {
      days: '{{count}} day streak!',
      days_one: '{{count}} day streak!',
      days_other: '{{count}} day streak!',
      start: 'Start a streak today',
      unit: 'day streak',
      unit_one: 'day streak',
      unit_other: 'day streak',
    },
    weeklyReading: {
      minutes: '{{count}} min this week',
      none: 'No reading yet this week',
    },
    achievementTally: {
      label: '{{unlocked}} unlocked, {{remaining}} to go',
    },
    achievements: { title: 'Look what you achieved!', cta: 'Explore', ctaJourney: 'Explore journey', emptyTitle: 'Your first badge is waiting', emptyBody: 'Read a story together to earn it', hint: 'Fly down to your island' },
    milestone: {
      eyebrow: 'Your Learning Journey',
      remaining: {
        stories: '{{count}} more stories to unlock',
        stories_one: '{{count}} more story to unlock',
        stories_other: '{{count}} more stories to unlock',
        storyTimes: '{{count}} more story times to unlock',
        storyTimes_one: '{{count}} more story time to unlock',
        storyTimes_other: '{{count}} more story times to unlock',
        calmMoments: '{{count}} more calm moments to unlock',
        calmMoments_one: '{{count}} more calm moment to unlock',
        calmMoments_other: '{{count}} more calm moments to unlock',
        tunes: '{{count}} more tunes to unlock',
        tunes_one: '{{count}} more tune to unlock',
        tunes_other: '{{count}} more tunes to unlock',
        adventures: '{{count}} more adventures to unlock',
        adventures_one: '{{count}} more adventure to unlock',
        adventures_other: '{{count}} more adventures to unlock',
      },
      allDone: 'Every badge is yours. Amazing!',
    },
    greeting: 'What shall we do together?',
    grownUps: 'Grown-ups',
    continueTogether: 'Continue together',
    continueReading: 'Continue reading',
    continueMore: 'Show more',
    statOrb: {
      continue: 'Continue',
      readToBookmark: 'Read to bookmark',
      achieved: 'Achieved',
      personalBest: 'Personal best: {{count}} days',
      personalBest_one: 'Personal best: {{count}} day',
      personalBest_other: 'Personal best: {{count}} days',
    },
    statPill: {
      streak: 'Daily streak',
      days: '{{count}} day streak',
      days_one: '{{count}} day streak',
      days_other: '{{count}} day streak',
      best: 'Best {{count}}',
      pages: '{{page}} of {{total}}',
      achievements: 'Achievements',
      next: 'Next: {{title}}',
      toBadge: 'Opens the badge to earn next',
      openBook: 'Open {{title}}',
    },
    pagePosition: 'Page {{page}} of {{total}}',
    resumeStory: 'Continue reading {{title}}',
    storybooks: 'Storybooks',
    storybooksDescription: 'Read, listen and explore',
    music: 'Instruments',
    musicDescription: 'Play, listen and learn',
    screenTimeRemaining: 'Screen time used',
    screenTimeExceeded: 'Screen time is up',
    screenTimeOpen: 'Open screen time',
    sun: 'The sun',
    moon: 'The moon',
  },

  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    morningNamed: 'Good morning, {{name}}',
    afternoonNamed: 'Good afternoon, {{name}}',
    eveningNamed: 'Good evening, {{name}}',
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
    changeLanguage: 'Change Language',
    compareLanguage: 'Compare Languages',
    compareLanguageOn: 'Compare Languages: On',
    compareLanguageOff: 'Compare Languages: Off',
    selectCompareLanguage: 'Choose languages to read, compare or record.',
    selectFirstLanguage: 'First language (white box): ',
    selectSecondLanguage: 'Second language (blue box): ',
    done: 'Done',
    autoPlayOn: 'Auto-Play: On',
    autoPlayOff: 'Auto-Play: Off',
    readingTips: 'Reading Tips',
    recordingTips: 'Recording Tips',
    narrationTips: 'Narration Tips',
    musicTips: 'Music Tips',
    // Alerts
    permissionRequired: 'Permission Required',
    permissionMessage: 'Microphone access is needed to record your voice.',
    recordingError: 'Recording Error',
    recordingErrorMessage: 'Failed to start recording. Please try again.',
    overwriteRecording: 'Overwrite Recording? ',
    overwriteRecordingMessage: 'This page already has a recording. Are you sure you want to overwrite it with a new recording? ',
    nameAlreadyExists: 'Name Already Exists',
    nameAlreadyExistsMessage: 'A voice over named "{{name}}" already exists. Please choose a different name.',
    error: 'Error',
    createVoiceOverError: 'Failed to create voice over. Please try again.',
    overwriteVoiceOver: 'Overwrite Voice Over? ',
    overwriteVoiceOverMessage: '"{{name}}" already has {{count}} page(s) recorded. Do you want to overwrite with new recordings? ',
    deleteVoiceOver: 'Delete Voice Over',
    deleteVoiceOverMessage: 'Are you sure you want to delete "{{name}}"? ',
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
    tapToBegin: 'Tap to begin',
    recordAs: 'Record as: {{name}}',
    narrateAs: 'Narrate as: {{name}}',
    recordVoiceOver: 'Record Voice Over',
    selectVoiceOver: 'Select Voice Over',
    selectExisting: 'Select existing to overwrite: ',
    orCreateNew: 'Or create new: ',
    enterName: 'Enter name...',
    create: 'Create',
    chooseRecording: 'Choose a recording to play',
    noVoiceOvers: 'No voice overs recorded yet',
    pagesRecorded: '{{count}} pages recorded',
    nameAlreadyExists: 'Name Already Exists',
    nameAlreadyExistsMessage: 'A voice over named "{{name}}" already exists. Please choose a different name.',
  },

  // Story detail view (shown after tapping a book)
  storyDetail: {
    readTogether: 'Read Together',
    pickPage: 'Start from a page',
    readFromPage: 'Read from page {{page}}',
    continueReading: 'Continue reading',
    record: 'Record',
    playAlong: 'Play Along',
    readNow: 'Read Now',
    savedOffline: 'Saved for offline',
    pages_one: '{{count}} page',
    pages_other: '{{count}} pages',
    ages: 'Ages {{range}}',
    interactive: 'Interactive',
    favourite: 'Favourite',
  },

  // Rotate-to-landscape prompt (shown before the book opens)
  rotatePrompt: {
    ready: 'Ready for our story time?',
    turnTogether: 'Turn the screen together',
    openWhenSideways: "We'll open the book when your device is sideways.",
    openForMe: 'Open the book for me',
  },

  // Story preview modal
  storyPreview: {
    removeFromDevice: 'Remove',
    removeConfirm: 'Remove "{{title}}" from this device? You can download it again anytime.',
  },

  // Story completion
  completion: {
    theEnd: 'The End',
    wellDone: 'Well Done!',
    readAnother: 'Read Another Story',
    rereadStory: 'Read Again',
    backToMenu: 'Back to Menu',
  },

  // Screen time
  screenTime: {
    alert: {
      title: 'Screen time alert!',
      usage: "You've reached {{used}} of your daily limit.",
      break: "Let's take a mindful break.",
      showTips: 'Show Tips',
    },
    tips: {
      title: 'Bring the story to life',
      intro: 'The story does not have to end when the screen does. Here are three ways to carry it into the rest of the day.',
      closing: 'A story your child retells is a story they keep.',
      done: 'Done',
      atHome: {
        title: 'Retell it with toys',
        body: 'Gather a few toys and let your child cast them as the characters. Ask “what happened next?” and let them tell it their way — the bits they change are the bits that mattered most to them.',
      },
      outdoors: {
        title: 'Take the story outside',
        body: 'On your next walk, look for something from the story — a moon, a puddle, a friendly dog. Ask what that character would do here. It turns an ordinary walk into a place the story lives.',
      },
      creative: {
        title: 'Draw the best bit',
        body: 'Paper and crayons, and one question: which part did you like best? Draw it together, then let your child tell you about their picture. What they choose says more than any quiz would.',
      },
      bathTime: {
        title: 'Float the story at bath time',
        body: 'Cups and bottles make boats; a sponge makes an island. Ask which character would sail where. Bath time is already play — the story just gives it a plot.',
      },
      inTheDark: {
        title: 'Tell it back in the dark',
        body: 'Lights off, and take turns adding one line each. It does not have to match the book. A story told in the dark is half yours and half theirs, and that is the best kind.',
      },
      onAPlate: {
        title: 'Cook a page of it',
        body: 'Toast, fruit, anything on a plate: name it after a character and let your child arrange the scene. Talking about what goes where is the story, told with food.',
      },
      listen: {
        title: 'Listen for the story',
        body: 'Stand still together somewhere outside and listen. What might a character hear here? A bird, a bus, the wind — every sound is a place the story could go next.',
      },
      sockShow: {
        title: 'Put on a sock show',
        body: 'Two socks, two voices. Let your child choose which character each one is and play the scene they remember best. What they pick is what they are still thinking about.',
      },
      singIt: {
        title: 'Sing the story',
        body: 'Make up a song about what happened, to any tune you both know. It can be silly — silly is the point. A song is a story that comes back on its own.',
      },
      whatIf: {
        title: 'Ask what if',
        body: 'What if the ending had been different? What if you were in the story? One question, then let them run. There are no wrong answers, only their answers.',
      },
    },
    helpingStayBalanced: "You're helping {{name}} stay safe and balanced.",
    helpingStayBalancedGeneric: "You're helping your child stay safe and balanced.",
    yourChild: 'Your child',
    activeNow: 'Active now',
    todaysScreenTime: "Today's Screen Time",
    ofLimit: 'of {{limit}} limit',
    used: 'Used',
    remaining: 'Remaining',
    dailyLimitLabel: 'Daily Limit',
    screenTimeTrend: 'Screen Time Trend',
    today: 'Today',
    trendDayUsage: '{{day}} · {{duration}}',
    sevenDay: '7-day',
    fourteenDay: '14-day',
    thirtyDay: '30-day',
    withinLimitTitle: "Great job! You're within today's limit.",
    withinLimitBody: 'Keep encouraging balanced screen time.',
    overLimitTitle: "Today's limit has been reached.",
    overLimitBody: 'Time for a break - maybe a story off-screen?',
    title: 'Screen Time',
    todayUsage: "Today's Usage",
    todaysUsage: "Today's Usage",
    dailyLimit: 'Daily Limit',
    weeklyAverage: 'Weekly Average',
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
    weeklyActivityHeatmap: 'Weekly Activity Heatmap',
    screenTimePatterns: "Your child's screen time patterns by day",
    screenTimeLevel: 'Screen Time Level',
    noScreenTime: 'No Screen Time',
    recommended: 'Recommended',
    excessive: 'Excessive',
    overLimit: 'Over Limit',
    createMySchedule: 'Create My Schedule',
    scheduleEmptyTitle: 'A gentle rhythm for the day',
    scheduleEmptyBody: "Choose the moments that suit your family and we'll do the remembering — a quiet nudge when it's time for stories, feelings or music.",
    scheduleActiveTitle: 'Your rhythm is set',
    scheduleActiveSummary: '{{count}} set · next {{next}}',
    scheduleNothingToday: 'nothing more today',
    scheduleManage: 'Manage my schedule',
    scheduleBenefitCalm: 'Calm hand-overs',
    scheduleBenefitGentle: 'A nudge, never a nag',
    scheduleBenefitBedtime: 'Wound down by bedtime',
    recommendedTimes: 'Recommended Times',
    recommendedTimesIntro: 'Based on child development research, the best times for screen activities are: ',
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
    sleepingSun: 'The sleeping sun',
    sleepingMoon: 'The sleeping moon',
    title: 'Settings',
    profile: 'Profile',
    nickname: 'Nickname',
    avatarType: 'Avatar Type',
    boy: '👦 Boy',
    girl: '👧 Girl',
    settings: 'Settings',
    language: 'Language',
    textSize: 'Text Size',
    notifications: 'Notifications',
    legal: 'Legal',
    termsAndConditions: 'Terms & Conditions',
    privacyPolicy: 'Privacy Policy',
    selectLanguage: 'Select Language',
    chooseLanguage: 'Choose your preferred language',
    guestMode: 'Guest Mode',
    createAccount: 'Create an account to save your progress',
    crashReports: 'Crash Reports',
    crashReportsHint: 'Help us fix bugs by sending anonymous crash data',
    deleteAccount: 'Delete Account',
    deleteAccountHint: 'Permanently delete your account and all data',
  },

  // The child's own page in the journey, plus profile validation and editing
  profile: {
    signedIn: 'Signed in',
    settings: 'Settings',
    noName: 'Little explorer',
    tabs: {
      saved: 'Saved',
      badges: 'Badges',
      manage: 'Manage',
    },
    downloadsUsed: '{{used}} of {{limit}} books on this device',
    downloadsCount: '{{count}} books on this device',
    downloadsEmpty: 'Nothing saved to this device yet — download a book to read it anywhere',
    enterNickname: 'Please enter a nickname',
    nicknameTooLong: 'Nickname must be 20 characters or less',
    editTitle: 'Edit Profile',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Enter your nickname...',
    nicknameCharacters: '{{count}}/{{max}} characters',
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
    // Screen content -4 focused screens
    screens: {
      welcome: {
        title: 'Stories That Grow\nWith Your Child',
        body: 'Interactive stories with music, instruments and narration -designed to spark imagination and support early development.',
        button: 'Next',
      },
      howItWorks: {
        title: 'How It Works',
        body: 'Everything your child needs for creative, screen-smart play.',
        button: 'Next',
        features: {
          scaffold: 'Built for Parents',
          scaffoldDesc: 'Designed to support healthy relationships between children and technology',
          stories: 'Interactive Stories',
          storiesDesc: 'Beautifully illustrated tales with page-by-page narration',
          music: 'Music & Instruments',
          musicDesc: 'Learn rhythm and melody with real instrument sounds',
          voice: 'Your Voice',
          voiceDesc: 'Record narrations so your child hears you -even apart',
        },
      },
      family: {
        title: 'Made for Families',
        body: 'Screen time protection, guided sessions and co-play tools -designed for short, meaningful moments together. Research shows co-engagement gives the greatest benefits for early development.',
        button: 'Next',
      },
      consent: {
        title: 'Before We Begin',
        body: 'As a parent or guardian, please review and agree to the following: ',
        button: "I Agree",
        closeLabel: 'Close',
        dataSummary: {
          title: 'What we collect & why',
          profile: "Display name & avatar - to personalise your child's experience",
          reading: 'Reading history, favourites & progress - to track stories and streaks',
          screenTime: 'Screen time sessions - to help manage healthy usage',
          device: 'Device type & app version - to keep the app working properly',
          noSell: 'We never sell data or show ads. You can delete everything at any time.',
        },
        checkboxes: {
          privacy: "I have read and accept the Privacy Policy",
          terms: "I have read and accept the Terms & Conditions",
          data: "I consent to the data collection described above to provide and improve the app for my child",
        },
        links: {
          privacyPolicy: 'View Privacy Policy',
          termsConditions: 'View Terms & Conditions',
        },
        policyVersion: '1.0',
      },
    },
    // Crash reporting dialog
    crashReportingDialog: {
      title: 'Enable Crash Reports? ',
      body: 'Anonymous crash reports help us fix bugs and improve the app. No personal data is collected.\n\nYou can change this anytime in Settings.',
      noThanks: 'No Thanks',
      enable: 'Enable',
    },
    // Taglines for each screen
    taglines: {
      welcome: 'Spark imagination through play',
      howItWorks: '',
      family: 'Quality time, real benefits',
      consent: 'One last step',
    },
    benefits: {
      welcome: 'Backed by child development research',
      howItWorks: 'Family · Stories · Music · Voice -all in one app',
      family: 'Recommended by child development experts',
      consent: 'Your consent keeps your family safe',
    },
  },

  // Tutorial
  island: {
    scene: 'An island seen from the sky, with snowy mountains, forests, a river and a lighthouse',
  },
  roadmap: {
    title: 'The adventure continues',
    playAgain: 'Play again',
    scene: 'A little bear with a backpack sits before a glowing portal to a spring valley, with a road map of the adventures to come',
    stop: '{{quarter}}: {{place}}',
    stops: {
      japanNewZealand: 'Japan and New\u00A0Zealand',
      franceItaly: 'France and Italy',
      lapland: 'Lapland',
    },
  },
  plan: {
    places: {
      storyTime: 'Story Time',
      echoGlade: 'Echo Glade',
      storyNook: 'Story Nook',
      rockPool: 'Rock Pool',
      musicGrove: 'Music Grove',
      storyCorner: 'Story Corner',
      storyBridge: 'Story Bridge',
    },
    domains: {
      language: 'Language',
      feelings: 'Feelings',
      music: 'Music',
    },
    skills: {
      listening: 'Listening',
      vocabulary: 'Vocabulary',
      feelings: 'Feelings',
      confidence: 'Confidence',
      rhythm: 'Rhythm',
      patience: 'Patience',
    },
    islandWeek: {
      'day-1': { aim: 'Build listening, vocabulary and calm through a cosy bedtime story.' },
      'day-2': { aim: 'Record the wombat’s story in a grown-up’s voice, then listen back together.' },
      'day-3': { aim: 'Listen to the story in your own voice and join in with the words you know.' },
      'day-4': { aim: 'Record Juni’s story in a grown-up’s voice, ready for a bedtime listen.' },
      'day-5': { aim: 'Find the beat and play a short song, one note at a time.' },
      'day-6': { aim: 'Build listening and talk about big feelings through a story of growing up.' },
      'day-7': { aim: 'Practise waiting and taking turns through a story about a bus ride.' },
    },
    stepOf: 'Step {{day}} of {{total}}',
    focus: '{{domain}} & {{skill}}',
    minutes: '{{from}}–{{to}} min',
    start: 'Start activity',
    preview: 'Preview',
    opensTomorrow: 'Well done today. The next step opens tomorrow.',
    weekDone: 'The whole island, explored',
    weekDoneBody: '{{done}} of {{total}} steps done. Tap any day to play it again, or the last one to see what comes next.',
    a11y: {
      checkpoint: 'Day {{day}}, {{place}}, {{state}}',
    },
    states: {
      done: 'done',
      open: 'ready to start',
      tomorrow: 'opens tomorrow',
      locked: 'not yet',
    },
  },
  tutorial: {
    // Button translations for tutorial overlays
    buttons: {
      next: 'Next',
      skip: 'Skip',
      letsGo: "Let's Go!",
    },
    // Main Menu Tour - shown on first login
    mainMenu: {
      navLearn: {
        title: 'Learn',
        description: 'Every story, song and learning game lives in the library. Tap here to open it.',
      },
      welcome: {
        title: 'Welcome to\nEarly Roots!',
        description: "Let's take a quick tour to help you and your child get the most out of storytime together.",
      },
      language: {
        title: 'Your language',
        description: 'Tap the flag to change the language the app reads and speaks in.',
      },
      sound: {
        title: 'Sound Control',
        description: 'Tap here to control background music and sound effects.',
      },
      achievement: {
        title: 'Your Learning Journey',
        description: 'This week\'s steps on your island, and the badge you\'re closest to. Tap it to fly down to the island.',
      },
      screenTime: {
        title: 'The Screensafe ring',
        description: 'This ring fills as today\'s screen time is used. Tap it any time to see the day. Once the time is up it becomes a red orb.',
        remainingCaption: 'Time left',
        spentCaption: 'Time is up',
      },
      streakOrb: {
        title: 'Daily streak',
        description: 'Each day you share a story adds one more. Tap it to see your best run.',
      },
      continueOrb: {
        title: 'Continue',
        description: 'It says “Read to bookmark” until you start a book. Then it says “Continue” and shows that book\'s cover. Tap it to open the book\'s card and choose a page.',
      },
      badgesOrb: {
        title: 'Achievements',
        description: 'How many badges you\'ve earned so far. Tap it to see the next one to earn.',
      },
    },
    catalogue: {
      welcome: {
        title: 'Your story shelf',
        description: 'Every book, song and game lives here. Let\'s have a look around together.',
      },
      themes: {
        title: 'Choose a theme',
        description: 'Stories, Learning or Music. Tap one and the shelf sorts itself to match.',
      },
      filter: {
        title: 'Finer filters',
        description: 'Bedtime, animals, calming and more. Pick a few and the shelf narrows to just those.',
      },
      featured: {
        title: 'Your next book',
        description: 'The book you\'re part-way through, or a fresh pick each day. Tap Read Now to open its card.',
      },
      shelves: {
        title: 'Shelves to swipe',
        description: 'Swipe along any shelf, or tap See all for the whole theme. Tap a book to open its card.',
      },
      navProgress: {
        title: 'Progress',
        description: 'Badges, milestones and this week\'s adventures, all in one place.',
      },
      navSearch: {
        title: 'Search',
        description: 'Looking for one book in particular? Type a title or a character and it will find it.',
      },
      navProfile: {
        title: 'Profile',
        description: 'Saved favourites, the badge wall, and the books kept on this device. Now and then it turns into a gold sign-in symbol: that means nobody is signed in yet, and a tap here takes you to sign in.',
        profileCaption: 'Your profile',
        loginCaption: 'Time to sign in',
      },
    },
    progress: {
      welcome: {
        title: 'Little steps, big progress',
        description: 'Everything your child has read, played and earned, gathered here.',
      },
      hero: {
        title: 'This week',
        description: 'Minutes together, stories read and sessions played since Monday.',
      },
      challenges: {
        title: 'Adventures',
        description: 'Small weekly and monthly challenges to work towards together. Tap one to see how far along it is.',
      },
      milestones: {
        title: 'Milestones',
        description: 'The big firsts, marked as they happen.',
      },
      badges: {
        title: 'Badges',
        description: 'Earned ones glow gold; the rest wait to be discovered. Tap any badge to see what it takes.',
      },
    },
    search: {
      welcome: {
        title: 'Find a story',
        description: 'Type a title, a character or a theme and the shelf finds it for you.',
      },
      field: {
        title: 'Search here',
        description: 'Results appear as you type, from the books on this device and the catalogue alike.',
      },
      recent: {
        title: 'Recent searches',
        description: 'The last few things you looked for wait here for a quick tap back.',
      },
    },
    profile: {
      welcome: {
        title: 'Your own corner',
        description: 'Everything that is yours alone lives on this page.',
      },
      hero: {
        title: 'Change the profile',
        description: 'Tap the picture or the name to change the avatar, name or age. A grown-up answers a quick question first.',
      },
      login: {
        title: 'Sign in',
        description: 'Signing in saves the badges, the streak and where each story left off - and carries them to every device you use together.',
      },
      home: {
        title: 'Back home',
        description: 'Home takes you back to the night sky whenever you are done here.',
      },
      tabs: {
        title: 'Saved, Badges, Manage',
        description: 'Favourites you have hearted, the badge wall, and the books on this device, with room to remove any.',
      },
      settings: {
        title: 'Grown-ups\' settings',
        description: 'Text size, screen time, reminders and your account, behind the grown-ups\' gate.',
      },
    },
    // Story Reader Tips - keys match tutorial.storyReader.* in tutorial-content.ts
    storyReader: {
      welcome: {
        title: 'Story Time Tips',
        description: 'Here are some tips to make storytime magical for you and your child!',
      },
      interactive: {
        title: 'Look for Interactions',
        description: 'Some pages have hidden surprises! Encourage your child to tap on objects that sparkle or glow.',
      },
      point: {
        title: 'Point and Discuss',
        description: 'Ask questions about the pictures. "What do you see?" "What colour is the butterfly?"',
      },
      pause: {
        title: 'Pause and Predict',
        description: 'Before turning the page, ask "What do you think will happen next?" to boost engagement.',
      },
      voices: {
        title: 'Use Different Voices',
        description: 'Make characters come alive with silly voices! Your child will love the performance.',
      },
      navigate: {
        title: 'Easy Navigation',
        description: 'Swipe left or right to turn pages. Tap the menu button for more options.',
      },
      tapWords: {
        title: 'Tap Words to Focus',
        description: 'Tap any word in the story to highlight it! This helps focus attention and makes reading more interactive and engaging.',
      },
      compareLanguages: {
        title: 'Compare Languages',
        description: 'Use the menu to enable "Compare Languages" and view the story in two languages side-by-side. Perfect for multilingual families learning together!',
      },
    },
    // Book Mode Tips - keys match tutorial.bookMode.* in tutorial-content.ts
    bookMode: {
      read: {
        title: 'Read Together',
        description: 'Read the story aloud together and turn the pages at your own pace. Part-way through, it carries on where you left off.',
      },
      record: {
        title: 'Record',
        description: 'Record your own voice reading the story, for your child to hear when you\'re away. A grown-up answers a quick question first.',
      },
      narrate: {
        title: 'Play Along',
        description: 'The story is read aloud with a recorded voice and the pages turn on their own. Lovely at bedtime.',
      },
      pages: {
        title: 'Start from a page',
        description: 'Every page of the book, with your place ringed in gold. Tap one to start reading from there.',
      },
    },
    island: {
      welcome: {
        title: 'Your learning island',
        description: 'One small step a day this week: a story, a game or a song to share. The trail lights up as you go.',
      },
      checkpoint: {
        title: 'Today\'s step',
        description: 'The glowing checkpoint is today\'s. Tap it to begin. The rest open one day at a time.',
      },
      plan: {
        title: 'Today\'s plan',
        description: 'What today\'s step is, how long it takes and what it builds. Start activity begins it; Preview lets you look first.',
      },
      home: {
        title: 'Back home',
        description: 'Fly back up to your home sky whenever you\'re done.',
      },
    },
    // Record Mode Tips - keys match tutorial.recordMode.* in tutorial-content.ts
    recordMode: {
      intro: {
        title: 'Record Your Voice',
        description: 'Create a personal narration of this story that your child can listen to anytime - even when you\'re not there!',
      },
      button: {
        title: 'Recording Controls',
        description: 'Tap the microphone to start recording. Read the page text aloud, then tap again to stop.',
      },
      playback: {
        title: 'Review Your Recording',
        description: 'Listen back to your recording and re-record if needed. Your child will love hearing your voice!',
      },
      sound: {
        title: 'Sound Tip',
        description: 'Find a quiet space for the best recording quality. Background noise can be distracting.',
      },
      limit: {
        title: 'Family Voices',
        description: 'Multiple family members can record! Grandparents, aunts, uncles - let everyone join in.',
      },
      benefit: {
        title: 'Why Record? ',
        description: 'Research shows hearing a familiar voice helps children feel secure and connected, especially during separation.',
      },
      navigation: {
        title: 'Navigate Pages',
        description: 'Use the arrows to move between pages. Record each page to create a complete narrated story!',
      },
    },
    // Narrate Mode Tips - keys match tutorial.narrateMode.* in tutorial-content.ts
    narrateMode: {
      intro: {
        title: 'Listen Mode',
        description: 'Sit back and enjoy! The story will be read aloud using a recorded voice.',
      },
      autoPlayback: {
        title: 'Auto-Play',
        description: 'Pages turn automatically after the narration finishes. Perfect for bedtime!',
      },
      controls: {
        title: 'Playback Controls',
        description: 'Pause, replay, or skip ahead using the controls. You\'re in charge of the pace.',
      },
      sound: {
        title: 'Sound Tip',
        description: 'Make sure your device volume is up! Use headphones for a more immersive experience.',
      },
      benefit: {
        title: 'Bonding Time',
        description: 'Even in listen mode, stay engaged! Point to pictures, ask questions, and enjoy the story together.',
      },
    },
    // Settings Walkthrough - keys match tutorial.settings.* in tutorial-content.ts
    settings: {
      intro: {
        title: 'Grown-ups\' settings',
        description: 'A few choices that shape the app for your family. Change any of them whenever you like.',
      },
      textSize: {
        title: 'Text size',
        description: 'Make the words bigger or smaller all through the app, to suit whoever is reading.',
      },
      screenTime: {
        title: 'Screen time',
        description: 'Turn this on for a gentle daily limit that suits your child\'s age. The Screensafe ring shows how the day is going. Turn it off at any time.',
      },
      reminders: {
        title: 'Smart reminders',
        description: 'A quiet nudge at the times you choose, for stories, feelings or music.',
      },
      crashReports: {
        title: 'Crash reports',
        description: 'If something goes wrong, an anonymous report helps us fix it. Switch it off here if you\'d rather.',
      },
    },
    // Music Mode Tips - keys match tutorial.musicMode.* in tutorial-content.ts
    musicMode: {
      welcome: {
        title: 'Music Mode',
        description: 'Some pages in this story have music challenges! Play notes on a virtual instrument to complete them.',
      },
      instrument: {
        title: 'Choose Your Story Instrument',
        description: 'When a book with music opens, swipe through the carousel to pick your favourite instrument. Each one has unique sounds!',
      },
      playing: {
        title: 'Playing Notes',
        description: 'Press the coloured buttons to play notes. Match the sequence shown at the top to complete the challenge!',
      },
      sheet: {
        title: 'Music Sheet',
        description: 'Tap the music note button (bottom left) to see all the notes you need to play. You can even preview the melody!',
      },
      begin: {
        title: 'Begin Playing',
        description: "When you arrive on a music page, tap the'Begin Playing' button at the top to start the challenge. It opens the music sheet first so you can see what to play!",
      },
      change: {
        title: 'Change Instrument',
        description: "Want to try a different sound? Open the menu and tap'Change Instrument' to switch anytime.",
      },
    },
    // Emotion Cards Tips
    // Practise Mode Tips
    practise: {
      welcome: {
        title: 'Practise Mode',
        description: 'Learn to play real songs on different instruments! Follow the notes and build your musical skills step by step.',
      },
      instrument: {
        title: 'Choose Your Instrument',
        description: 'Swipe through the carousel to pick your favourite instrument. Each one has its own unique sound!',
      },
      songs: {
        title: 'Pick a Song',
        description: 'Browse the song library and choose a song to learn. Songs are sorted by difficulty — start easy and work your way up!',
      },
      benefit: {
        title: 'Musical Development',
        description: 'Learning to play songs develops rhythm, coordination, memory and concentration — all through the joy of music.',
      },
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
  screenTimeOwl: {
    owlLabel: 'A friendly owl with a message',
    showIdeas: 'Show me ideas',
    okay: 'Okay',
  },

  screenTimeWarning: {
    approachingLimit: 'Screen Time Warning',
    limitReached: 'Daily Limit Reached',
    dailyComplete: 'Great Job Today!',
    notice: 'Screen Time Notice',
    guidelines: 'Following WHO & AAP recommendations for healthy screen time',
    trySomethingNew: 'Try something together!',
    approachingMessage: 'Only {{minutes}} minutes of screen time left today. Would you like to continue or close the app? ',
    limitReachedMessage: "Daily screen time limit reached. It's time to close the app and try other activities!",
    suggestions: {
      spelling: {
        1: 'Practice writing letters you learned with a pencil and paper together',
        2: 'Point to and name objects around the house — how many can you spell?',
        3: 'Read a favourite book together and spot letters you practised',
      },
      counting: {
        1: 'Count steps as you walk together around the house or garden',
        2: 'Sort toys by colour, size, or shape — how many groups can you make?',
        3: 'Bake something simple together and count the ingredients',
      },
      instruments: {
        1: 'Sing your favourite song together or make up a silly new one',
        2: 'Make rhythm with pots, pans, and wooden spoons — a kitchen band!',
        3: 'Go on a sound walk outside — how many different sounds can you hear?',
      },
      feelings: {
        1: 'Draw faces showing different emotions together — happy, sad, surprised!',
        2: 'Talk about how characters in your favourite book might be feeling',
        3: 'Play a feelings guessing game — act out an emotion for each other',
      },
      stories: {
        1: 'Retell the story you just read using toys or puppets',
        2: 'Draw your favourite character or scene from the story',
        3: 'Act out the story together — take turns being different characters',
      },
      general: {
        1: 'Read a book together and talk about the pictures',
        2: 'Go outside and explore nature — look for leaves, bugs, or clouds',
        3: 'Do some creative play — drawing, building, or pretend play',
      },
    },
  },

  // Relaxing music screen

  // Emotion cards

  // Music challenge UI strings
  music: {
    saveSong: 'Save this song',
    // Celebration
    amazing: 'Amazing!',
    levelComplete: 'Level {{level}} complete!',
    playingYourSong: 'Playing your song...',
    listeningToMelody: 'Listen to your melody...',
    // Buttons
    retry: 'Retry',
    goHarder: 'Increase Difficulty',
    goHarderLevel: 'Increase Difficulty (Lv {{level}})',
    continueStory: 'Continue Story',
    skip: 'Skip',
    // Play modes
    blowMode: 'Blow',
    pressMode: 'Press',
    blowing: 'Blowing!',
    blowWhileHolding: 'Blow while holding notes',
    tryAgain: 'Try again!',
    // Accessibility
    openMusicSheet: 'Open music sheet',
    showControls: 'Show controls',
    hideControls: 'Hide controls',
    // Music sheet overlay
    musicSheet: 'Music Sheet',
    notesToPlay: 'Notes to Play ({{completed}}/{{total}})',
    pause: 'Pause',
    preview: 'Preview',
    tapAndHoldNotes: 'Tap and hold notes to hear them',
    playingPreview: 'Playing preview… tap Pause to stop',
    successSong: '♫ Success Song',
    readyToPlay: '♫ Ready to Play',
    // Instrument picker
    chooseInstrument: 'Choose your instrument',
    swipeToExplore: 'Swipe to explore, tap to select',
    useThisInstrument: 'Use this instrument',
    closeInstrumentPicker: 'Close instrument picker',
    // Burger menu
    changeInstrument: 'Change Instrument',
    // Practise mode
    songLibrary: 'Song Library',
    backToLibrary: 'Back to Library',
    backToMenu: 'Back',
    noSongsAvailable: 'No songs available for this instrument',
    // Freeplay mode
    freeplayPrompt: 'Free Play -tap any note!',
    // Difficulty labels
    difficulty: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
    },
    // Song names
    songs: {
      // Nursery rhymes (IP-free, public domain)
      hotCrossBuns: 'Hot Cross Buns',
      rainRain: 'Rain Rain Go Away',
      auClairLune: 'Au Clair de la Lune',
      maryLamb: 'Mary Had a Little Lamb',
      itsyBitsySpider: 'Itsy Bitsy Spider',
      rowRowBoat: 'Row Row Row Your Boat',
      twinkleStar: 'Twinkle Twinkle Little Star',
      odeToJoy: 'Ode to Joy',
      londonBridge: 'London Bridge',
      threeBlindMice: 'Three Blind Mice',
      humptyDumpty: 'Humpty Dumpty',
      jackAndJill: 'Jack and Jill',
      oldMacdonald: 'Old MacDonald',
      jingleBells: 'Jingle Bells',
      frereJacques: 'Frère Jacques',
      happyBirthday: 'Happy Birthday',
      hickoryDickory: 'Hickory Dickory Dock',
      // Storybook songs (original compositions)
      raindropSong: 'Raindrop Song',
      dreamtimeLullaby: 'Dreamtime Lullaby',
      oceanWaves: 'Ocean Waves',
      forestWander: 'Forest Wander',
      starlightDance: 'Starlight Dance',
      mountainEcho: 'Mountain Echo',
      butterflyFlight: 'Butterfly Flight',
      moonbeamWaltz: 'Moonbeam Waltz',
      sunriseMarch: 'Sunrise March',
      riverJourney: 'River Journey',
      // Forces songs
      songOfPush: 'Song of Push',
      songOfPull: 'Song of Pull',
      songOfLift: 'Song of Lift',
      songOfLower: 'Song of Lower',
      songOfBreak: 'Song of Break',
      songOfFix: 'Song of Fix',
    },
    // Binaural / relaxation track titles and descriptions
  },

  // Jigsaw puzzle UI strings

  // Story mode selection
  storyModes: {
    interactive: 'Interactive',
    interactiveDesc: 'Touch, puzzle, and learning adventures',
    music: 'Musical',
    musicDesc: 'Stories with musical challenges',
    filterTouch: 'Touch',
    filterJigsaw: 'Jigsaw',
    filterLearning: 'Learning',
  },

  // Audio settings modal
  audioSettings: {
    title: 'Audio Settings',
    masterVolume: 'Master Volume',
    music: 'Music',
    voiceOver: 'Voice Over',
  },

  // Learning activities

  // Subscription overlay
  subscription: {
    trialEnd: {
      titleDays: 'Your free trial ends in {{count}} days',
      titleTomorrow: 'Your free trial ends tomorrow',
      titleToday: 'Your free trial ends today',
      titleUpgrade: 'Upgrade to Premium',
      subtitle: 'On {{date}} you move to Basic at {{price}} a month.',
      subtitleUpgrade: 'Unlock every book, song and instrument for your family.',
      stayingLabel: 'Staying on Basic',
      stayingPrice: 'Billed {{price}} per month. Cancel anytime.',
      upgradeHeading: 'What Premium adds',
      addsAll: 'All stories, songs and learning activities unlocked',
      addsPractice: 'Unlocks all songs in practice mode',
      cta: 'Upgrade to Premium',
      keepBasic: 'No thanks, continue with Basic',
    },
    startFreeTrial: 'Start my free trial',
    trial: {
      title: 'How your free trial works',
      subtitle: 'Free for 5 days, then {{price}} a month. Cancel anytime.',
      todayLabel: 'Today',
      todayBody: 'Unlock learning like never before',
      notifyLabel: 'Day 3',
      notifyBody: 'We remind you before the trial ends',
      chargeLabel: 'Day 5',
      chargeBody: 'Subscribe for {{price}} or cancel',
      mostRecommended: 'MOST RECOMMENDED',
      planName: 'Basic',
      planTrial: '5-day free trial',
      benefitLearn: 'Learn to read, play instruments and a lot more!',
      benefitMusic: 'Interactive music & games',
      benefitNoAds: 'Ad-free experience',
      upgrade: 'Premium unlocks every story, instrument and learning activity',
      benefitDevices: 'Share progress across devices',
      cta: 'Start 5-Day Free Trial',
      includesTrial: 'Includes a 5-day free trial',
    },
    unlockPlan: 'Unlock a Plan',
    subscribe: 'Subscribe',
    privacyPolicy: 'Privacy Policy',
    termsAndConditions: 'Terms & Conditions',
    // Plan names
    planBasic: 'Basic',
    planPremium: 'Premium',
    planAnnual: 'Annual',
    // Periods
    perMonth: '/month',
    perYear: '/year',
    // Badges
    mostPopular: 'Most Popular',
    percentOff: '25% Off',
    // USP points
    uspStories: 'Stories crafted to support child development',
    uspEducators: 'Age-appropriate content reviewed by educators',
    uspMusic: 'Interactive music & instrument practice',
    uspNoAds: 'No ads, ever -safe for little ones',
    uspLanguages: 'Available in 14 languages',
    // Plan details -Basic
    detailAllStories: 'All books unlocked',
    detail50Stories: '50 stories unlocked',
    detailAllLearning: 'All learning activities unlocked',
    detailDownload50: 'Download up to 50 books',
    detailLimitedSongs: 'Limited songs access',
    detailSyncDevices: 'Sync across various devices',
    // Plan details -Premium
    detailDownload100: 'Download up to 100 books',
    detailAllSongs: 'All songs in practice mode',
    detailAllInstruments: 'All instruments unlocked',
    // Plan details -Annual
    detailEverythingPremium: 'Everything in Premium',
    detailSave25: 'Save 25% vs monthly',
    // Guest mode -sign-in required
    signInToSubscribe: 'Sign In to Subscribe',
    signInRequiredTitle: 'Sign In Required',
    signInRequiredMessage: 'You need to sign in before you can subscribe. Your subscription will be linked to your account so you can access it on all your devices.',
    signInRequiredConfirm: 'Sign In',
    signInRequiredCancel: 'Not Now',
    // Purchase flow
    errorTitle: 'Subscription Error',
    errorUnavailable: 'This plan is not available right now. Please try again later.',
    errorGeneric: 'Something went wrong. Please try again.',
    // Restore purchases
    restorePurchases: 'Restore Purchases',
    restoreSuccessTitle: 'Purchases Restored',
    restoreSuccessMessage: 'Your subscription has been restored successfully.',
    restoreNoneTitle: 'No Purchases Found',
    restoreNoneMessage: 'We couldn\'t find any previous purchases to restore.',
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
    screenTime: {
      message: 'Time to Play!',
      subtitle: 'Balance your screen time with fun activities and healthy habits.',
    },
  },
  bridge: {
    atHome: 'At Home',
    outdoors: 'Outdoors',
    creative: 'Creative',
  },

  // Game screens

  // ── Spelling Stories ─────────────────────────────────────────────────

  // ── Numbers Stories ─────────────────────────────────────────────────
  numbers: {
    stories: {
      // counting-fun
      cf1: { title: 'Starry Count', page1: 'Look up! The sky has a bright light. Can you spell how many?', page2: 'Now ___ more appear, and it\'s ___!', page3: 'A whole hand\'s worth of fingers. That many stars!', page4: '___ more twinkle. Time to ___!', page5: 'Four bright lights form a diamond shape!' },
      cf2: { title: 'Sunny Count', page1: 'The sun is up! Count the clouds.', page2: 'Just ___ cloud and the ___!', page3: 'So many clouds! Use all your fingers.', page4: 'Now ___ and ___ clouds float by!', page5: 'Half a dozen clouds dance in a row!' },
      cf3: { title: 'Rainbow Count', page1: 'A rainbow appears! Let\'s add up the colours.', page2: '___ stripes and ___ more!', page3: 'All the colours together make a sum!', page4: '___ bands of colour, then ___!', page5: 'Five beautiful colours shine brightest!' },
      cf4: { title: 'Garden Count', page1: 'In the garden, half a dozen butterflies dance!', page2: '___ flutter past, time to ___!', page3: 'Just one lonely caterpillar on the leaf.', page4: '___ more join, the ___ grows!', page5: 'All ten fingers can count the flowers!' },
      cf5: { title: 'Ocean Count', page1: 'Four fish swim in the coral reef!', page2: '___ more swim up, that\'s ___!', page3: 'A pair of seahorses bob past.', page4: 'Just ___, then time to ___!', page5: 'The total is in! Count them all up!' },
      // number-friends
      nf1: { title: 'Bear Friends', page1: 'One bear cub sits by the river.', page2: '___ more arrive for a ___!', page3: 'What a big group of friends!', page4: 'So much ___! Now there are ___!', page5: 'Half a dozen friends splash and play!' },
      nf2: { title: 'Puppy Pals', page1: 'A puppy gives everyone a warm welcome!', page2: 'Just ___ pup, but so ___!', page3: 'Playtime! Everyone has a wonderful time.', page4: 'Count to ___. That\'s ___ puppies!', page5: 'Five wagging tails in a row!' },
      nf3: { title: 'Kitten Club', page1: 'Two little kittens chase a ball of yarn.', page2: 'Such ___! Plus ___ makes a party!', page3: 'All ten kittens are in the basket!', page4: 'A warm ___. So many ___ friends!', page5: 'Just one kitten left on the mat.' },
      nf4: { title: 'Bunny Band', page1: 'Five bunnies hop into the meadow!', page2: '___ jump high. Just ___ more!', page3: 'Everyone gets a big cuddle!', page4: 'So many ___ friends having ___!', page5: 'Ten bunny ears pop up from the grass!' },
      nf5: { title: 'Duck Pals', page1: 'Six little ducks waddle to the pond.', page2: 'A ___ pair having ___!', page3: 'One big duck leads the way!', page4: 'Just ___ and a big ___!', page5: 'Five ducks swim in a perfect line!' },
      // colour-counting
      cc1: { title: 'Paint Pots', page1: 'A warm colour fills the first pot.', page2: '___ pots and one ___ pot!', page3: 'Five pots all in a row!', page4: 'A pretty ___ pot, just ___!', page5: 'Ten colours fill the shelf!' },
      cc2: { title: 'Crayon Box', page1: 'A cool sky colour rolls out of the box.', page2: 'A warm ___ next, then ___!', page3: 'One crayon draws a big circle.', page4: 'Count ___! A pretty ___ joins!', page5: 'Five crayons colour the page!' },
      cc3: { title: 'Rainbow Train', page1: 'The train\'s first carriage is a pretty, soft colour!', page2: '___ carriages! A warm ___ one!', page3: 'Four carriages chug along!', page4: 'A cool ___ carriage, then ___!', page5: 'One engine pulls them all!' },
      cc4: { title: 'Colour Kites', page1: 'Four kites fly high in the sky!', page2: 'Just ___ kite. A pretty ___ one!', page3: 'A bright warm kite joins the sky!', page4: '___ kites dancing, one ___ one!', page5: 'Two kites do a loop-the-loop!' },
      cc5: { title: 'Chalk Garden', page1: 'Ten chalk marks colour the pavement!', page2: '___ marks, a warm ___ one!', page3: 'Cool sky-colour chalk draws a river.', page4: '___ circles, a pretty ___ heart!', page5: 'Five beautiful chalk flowers!' },
      // shape-counting
      sc1: { title: 'Shape Train', page1: 'The train is made of four-sided shapes!', page2: 'Count the ___ and the ___!', page3: 'Round sparkly shapes decorate the carriage.', page4: 'Pointy ___ on the roof, ___!', page5: 'Just one engine at the front!' },
      sc2: { title: 'Shape Boat', page1: 'A five-pointed shape guides the boat!', page2: 'Cargo ___ below, just ___!', page3: 'A pointy shape steers through the waves.', page4: 'Round ___! Count to ___!', page5: 'Two sails catch the wind!' },
      sc3: { title: 'Shape Kite', page1: 'Five shapes decorate the kite!', page2: 'A pointy ___ and a ___!', page3: 'The tail is made of four-sided shapes.', page4: 'A pair of ___ shapes. ___ more!', page5: 'Ten shapes dance in the sky!' },
      sc4: { title: 'Shape Castle', page1: 'Pointy towers top the castle!', page2: '___ towers, a ___ treasure!', page3: 'All ten windows are round!', page4: 'A ___ flag, just ___!', page5: 'Round gems sparkle on the crown!' },
      sc5: { title: 'Shape Rocket', page1: 'Round portholes line the rocket.', page2: 'Count ___, a pointy ___!', page3: 'A pair of boosters fire!', page4: '___ controls and ___!', page5: 'A five-pointed badge marks the pilot!' },
      // one-two-three
      ot1: { title: 'Step Count', page1: 'One step forward on the path.', page2: '___ steps more! Big ___!', page3: 'Six stepping stones cross the stream.', page4: 'Count to ___! Time to ___!', page5: 'Five jumps to the finish!' },
      ot2: { title: 'Cloud Hop', page1: 'Two fluffy clouds to hop across!', page2: 'Just ___ cloud. ___ more ahead!', page3: 'Time to add up the clouds!', page4: '___ clouds in all. So ___!', page5: 'Ten clouds in a row!' },
      ot3: { title: 'Bee Trail', page1: 'Ten flowers on the bee\'s trail!', page2: '___ flowers and ___ bees!', page3: 'A big buzzy bee lands!', page4: '___ petals, just ___!', page5: 'Four flower beds to visit!' },
      ot4: { title: 'Leaf Jump', page1: 'Five leaves fall from the tree!', page2: 'Time to ___! Count to ___!', page3: 'Four leaves spin in the wind!', page4: '___ more land, so ___!', page5: 'Just one golden leaf left!' },
      ot5: { title: 'Puddle Splash', page1: 'Time to add up the puddles!', page2: '___ puddles and ___!', page3: 'Six big splashes!', page4: '___ ripples, then ___!', page5: 'A big duck splashes in the biggest one!' },
      // medium numbers
      wp1: { title: 'Forest Count', page1: 'How many trees? Let\'s count them up!', page2: '___ trees. The ___ is ___.', page3: 'Eight mushrooms grow in a circle.', page4: 'A ___ of acorns! ___ the nuts!', page5: 'The total is in. Well done!' },
      wp2: { title: 'Star Math', page1: 'Seven stars twinkle in a line.', page2: '___ more appear. ___ to the ___!', page3: 'Double the stars! Count them twice.', page4: '___ and ___ make ___.', page5: 'A whole dozen stars fill the sky!' },
      wp3: { title: 'River Sum', page1: 'The fish are equal on each side of the river!', page2: '___ fish, a ___ of them. ___!', page3: 'Take some away — time to subtract!', page4: '___ remain. ___ fish. The ___ is clear!', page5: 'Count them all up one more time!' },
      wp4: { title: 'Cloud Tally', page1: 'A whole dozen clouds roll in!', page2: '___ the clouds. They\'re all ___. ___ to go!', page3: 'The total keeps growing!', page4: '___ all the clouds! ___ appear. ___!', page5: 'Everything is equal and balanced in the sky.' },
      wp5: { title: 'Moon Math', page1: 'Count the moonbeams — two times as many tonight!', page2: '___ some away. ___ beams. A ___ shines!', page3: 'Count everything together.', page4: 'The ___ is ___! ___ moonbeams!', page5: 'Seven moonbeams light the way home.' },
      ac1: { title: 'Safari Sum', page1: 'A black and white friend munches bamboo!', page2: '___ animals. ___ stripes. The ___ prowls!', page3: 'Three baby animals play together.', page4: '___ in total. All ___. The ___ watches!', page5: 'The total count is done!' },
      ac2: { title: 'Jungle Tally', page1: 'A striped cat lounges in the shade.', page2: 'The ___ rests. ___ animals. ___ them all!', page3: 'Everything is balanced in the jungle.', page4: '___ friends. The ___ is clear. ___ rest!', page5: 'Seven animals call the jungle home.' },
      ac3: { title: 'Pond Count', page1: 'Count the lily pads!', page2: 'The ___ prowls. ___ frogs. ___ lily pads!', page3: 'Seven dragonflies zip past!', page4: 'The ___ watches. The ___ grows. ___!', page5: 'Eight creatures live by the pond!' },
      ac4: { title: 'Farm Math', page1: 'Eight chicks hatch in the barn!', page2: '___ in the field. The ___ grazes. ___!', page3: 'A striped visitor watches from outside.', page4: '___ the animals. ___ chicks. ___ friends!', page5: 'The black and white friend waves from the bamboo.' },
      ac5: { title: 'Zoo Count', page1: 'Three tickets to the zoo!', page2: '___ animals. ___ them all. ___!', page3: 'The final total is on the board.', page4: 'The ___ and ___ play. ___ cheer!', page5: 'Count them one more time!' },
      fc1: { title: 'Orchard Sum', page1: 'Pick the round red fruit from the tree!', page2: 'Purple ___, all ___, ___!', page3: 'Three baskets fill up quickly.', page4: 'Sweet ___ fruit. The ___ grows. ___!', page5: 'The total harvest is in!' },
      fc2: { title: 'Market Math', page1: 'Purple clusters of fruit fill the stall.', page2: 'Round red ___, eight more ___! The ___ grows.', page3: 'Seven crates stacked up high!', page4: '___ fruit, a big ___, ___!', page5: 'A big sweet green fruit for dessert!' },
      fc3: { title: 'Picnic Count', page1: 'A big green fruit is the centrepiece!', page2: '___ fruit, round ___, ___!', page3: 'Count up the snacks!', page4: 'Purple ___, the ___ grows, ___!', page5: 'The round red fruit finishes the picnic!' },
      fc4: { title: 'Garden Fruit', page1: 'Count the fruit in the garden!', page2: 'A sweet ___, purple ___, ___!', page3: 'Eight pieces of fruit on the ground!', page4: 'Round ___, seven more! ___!', page5: 'Three perfect picks to take home.' },
      fc5: { title: 'Smoothie Sum', page1: 'Seven ingredients for the smoothie!', page2: 'The ___ grows! ___, a round ___!', page3: 'Purple fruit blends in!', page4: '___ left, a sweet ___, ___!', page5: 'The total smoothie is blended!' },
      tc1: { title: 'Toy Shelf', page1: 'Building blocks stack up on the shelf!', page2: 'A ___ rolls by. ___ blocks. ___!', page3: 'A big vehicle rumbles across the carpet.', page4: 'A ___ dances. The ___ grows. ___!', page5: 'The total count of toys!' },
      tc2: { title: 'Playroom Sum', page1: 'Choo choo! The toy train circles the track.', page2: '___ stacked up. ___ toys. A ___ joins!', page3: 'Seven toys line up!', page4: 'A big ___, ___. The ___ grows!', page5: 'A little figure pirouettes at the end!' },
      tc3: { title: 'Toy Parade', page1: 'The little figure leads the parade!', page2: 'A big ___, the ___ grows, a ___!', page3: 'Count all the toys marching!', page4: '___ stack high. ___ toys. ___!', page5: 'The train choo-choos to the finish!' },
      tc4: { title: 'Box Tidy', page1: 'Eight toys to put away!', page2: 'The ___ goes in. ___ more. ___!', page3: 'A big vehicle parks in the corner.', page4: 'The ___, the ___, ___!', page5: 'All the blocks are stacked neatly!' },
      tc5: { title: 'Toy Race', page1: 'Count the racers!', page2: '___ toys racing. A big ___. A ___!', page3: 'The total is counted!', page4: 'A ___, blocks everywhere, ___!', page5: 'Seven toys cross the finish line!' },
      gc1: { title: 'Flower Sum', page1: 'Beautiful flowers bloom in the garden!', page2: 'A ___, seven more. ___!', page3: 'A whole bunch of flowers together!', page4: 'The ___ grows. ___ flowers. ___!', page5: 'Three perfect bouquets!' },
      gc2: { title: 'Seed Tally', page1: 'A delicate flower part catches the breeze.', page2: '___ open wide. ___ petals. A ___!', page3: 'Count the seedlings!', page4: '___ grow. ___ flowers. ___!', page5: 'The total garden count!' },
      gc3: { title: 'Pot Count', page1: 'Seven plant pots on the windowsill!', page2: '___ pots. A ___ blooms. ___!', page3: 'A delicate part floats down.', page4: '___ open. ___ and ___!', page5: 'Count them all one more time!' },
      gc4: { title: 'Rain Bloom', page1: 'Three seedlings pop up after the rain!', page2: 'The ___ grows. A ___ unfurls. ___!', page3: 'Eight drops water the garden.', page4: 'A ___ of flowers! ___ bloom. ___!', page5: 'Seven buds are ready to open!' },
      gc5: { title: 'Garden Math', page1: 'Eight rows of flowers!', page2: '___ and ___ bloom. ___!', page3: 'The total tally board fills up.', page4: 'A ___, seven more, a ___!', page5: 'A whole bunch of flowers to take inside!' },
      // hard numbers
      np1: { title: 'Riddle Room', page1: 'A tricky puzzle waits on the door!', page2: '___ clues! ___ the code, ___ the lock!', page3: 'Twenty keys hang on the wall.', page4: '___ and ___ match! Time to ___!', page5: 'Everything equals the right answer!' },
      np2: { title: 'Maze Math', page1: 'Twelve paths twist and turn!', page2: '___ ahead! The ___! A ___ forms!', page3: 'Split the path — time to divide!', page4: '___ the score, ___ more! ___!', page5: 'The puzzle is solved!' },
      np3: { title: 'Key Quest', page1: 'Double the keys to unlock the door!', page2: '___ the code! ___ keys. ___!', page3: 'Eleven gems light up the lock.', page4: 'The ___ fits! ___ more! ___!', page5: 'Triple the treasure inside!' },
      np4: { title: 'Clock Puzzle', page1: 'Triple the hands on the magic clock!', page2: '___ match! ___ spin. The ___!', page3: 'Twelve numbers glow on the face.', page4: '___ more! ___ the hours! ___!', page5: 'Eleven chimes ring out!' },
      np5: { title: 'Treasure Lock', page1: 'Everything must be balanced to open the lock!', page2: '___ the numbers! ___ spins. ___!', page3: 'Double the gems to unlock it.', page4: '___ and ___ glow! ___!', page5: 'Twenty gold coins spill out!' },
      af1: { title: 'Sum Quest', page1: 'Time to start adding things up!', page2: '___ and ___ make a ___!', page3: 'How many in total?', page4: '___ more! ___ in all. ___!', page5: 'Everything is balanced!' },
      af2: { title: 'Cloud Sum', page1: 'Twelve clouds drift by.', page2: '___ up! ___ the score. ___!', page3: 'Double the clouds appear!', page4: '___ and ___ more! ___!', page5: 'The total fills the sky!' },
      af3: { title: 'River Add', page1: 'Twenty pebbles in the river!', page2: 'The ___ is big! ___ and ___!', page3: 'Eleven fish swim past.', page4: 'The ___ adds up! ___ and ___!', page5: 'Time to add it all together!' },
      af4: { title: 'Star Add', page1: 'The total number of stars tonight?', page2: '___ shine! ___ more and ___!', page3: 'Count them all up!', page4: '___ up! ___ and ___!', page5: 'Twenty stars fill the sky!' },
      af5: { title: 'Moon Add', page1: 'Eleven moonbeams light the path.', page2: '___ and ___, ___!', page3: 'Everything equals the total!', page4: '___ beams! ___ and ___!', page5: 'Double the glow tonight!' },
      ns1: { title: 'Dragon Count', page1: 'Once upon a time, in a land of numbers...', page2: '___ knights! A ___ appears! ___!', page3: 'Twenty gold coins in the dragon\'s lair.', page4: '___ gems! ___ them! ___!', page5: 'The puzzle unlocks the ending!' },
      ns2: { title: 'Fairy Math', page1: 'Twelve fairies dance in a ring.', page2: 'The ___ unfolds! ___ and ___!', page3: 'Everything is balanced in fairy land.', page4: '___ wishes! The ___ glows! ___!', page5: 'How many fairies are left?' },
      ns3: { title: 'Pirate Sum', page1: 'Count the treasure chests!', page2: '___ coins! ___ and ___!', page3: 'The total treasure!', page4: 'The ___ sparkles! ___ and ___!', page5: 'Eleven doubloons in the last chest!' },
      ns4: { title: 'Robot Tale', page1: 'Eleven robots power up!', page2: '___ beep! ___ and ___!', page3: 'The puzzle circuit connects!', page4: 'The ___ counts! ___ and ___!', page5: 'Twelve robots march in formation!' },
      ns5: { title: 'Wizard Count', page1: 'How many spells in the wizard\'s book?', page2: 'The ___ glows! A ___ and ___!', page3: 'Twenty pages turn by magic!', page4: '___ spells! ___ and ___!', page5: 'The story ends happily!' },
      npa1: { title: 'Stripe Code', page1: 'A pattern of stripes appears!', page2: '___ and ___ follow the ___!', page3: 'Twenty shapes in a row.', page4: '___ and ___ create ___!', page5: 'The pattern repeats perfectly!' },
      npa2: { title: 'Bead Chain', page1: 'Double the beads on the chain!', page2: 'The ___ grows. ___ and ___!', page3: 'Triple the pattern!', page4: 'It ___! ___ and ___!', page5: 'Eleven beads complete the chain.' },
      npa3: { title: 'Tile Floor', page1: 'Twelve tiles make the first row.', page2: 'The pattern ___! ___ and ___!', page3: 'Everything balances!', page4: '___ tiles! ___ and ___!', page5: 'A beautiful pattern series!' },
      npa4: { title: 'Star Spiral', page1: 'The pattern repeats in a spiral!', page2: '___ and ___ follow! ___!', page3: 'Double the spiral arms!', page4: 'The ___ grows! ___ and ___!', page5: 'Twelve points complete the star.' },
      npa5: { title: 'Wave Rhythm', page1: 'Eleven waves in a rhythm.', page2: '___ the ___! ___ and ___!', page3: 'The pattern repeats!', page4: '___ and ___ create ___!', page5: 'Twenty waves crash on the shore.' },
      sf1: { title: 'Cookie Share', page1: 'Take some cookies away — how many are left?', page2: '___ and ___ fewer! ___!', page3: 'Twenty cookies to start with.', page4: '___ go! ___ stay! ___!', page5: 'Everything balances at the end.' },
      sf2: { title: 'Balloon Pop', page1: 'Twelve balloons float in the sky.', page2: '___ them away! ___ left! ___!', page3: 'How many fewer now?', page4: '___ and ___ remain! ___!', page5: 'The rest stay floating happily.' },
      sf3: { title: 'Apple Take', page1: 'Take some away! How many are left to leave?', page2: 'The ___ stay! ___ and ___!', page3: 'Eleven apples on the tree.', page4: '___ fall! ___ and ___!', page5: 'Only a few fewer left.' },
      sf4: { title: 'Star Fall', page1: 'Some stars remain while others fall.', page2: '___ and ___. Some ___!', page3: 'Take some away from the sky!', page4: '___ of them! ___ and ___!', page5: 'A few are left behind.' },
      sf5: { title: 'Sand Scoop', page1: 'Eleven scoops in the bucket!', page2: '___ away! ___ and ___!', page3: 'Everything balances!', page4: '___ scoops! ___ and ___!', page5: 'Take the last ones away.' },
    },
  },

  splash: {
    tagline: 'A gentle place to grow together.',
  },

  onboardingV2: {
    stepCounter: '{{current}} of {{total}}',
    skip: 'Skip',
    worlds: {
      storiesDesc: 'Gentle illustrated tales to share at bedtime, with narration you can record in your own voice.',
      musicDesc: 'Real instrument sounds, simple songs and rhythm games to play together.',
      learningDesc: 'Counting, letters and first words through calm, playful activities.',
      feelingsDesc: 'Stories and cards that help little ones name and share how they feel.',
      close: 'Close',
      title: 'Little moments.\nBig growing.',
      footer: 'Made to enjoy together.',
      stories: 'Stories',
      music: 'Music',
      learning: 'Learning',
      feelings: 'Feelings',
    },
    together: {
      title: 'Better when\nwe play together.',
      body: 'Early Roots is designed for children and grown-ups to explore side by side.',
      read: 'Read together',
      play: 'Play together',
      talk: 'Talk together',
    },
    safe: {
      title: 'A calm and safer\nkind of screen time.',
      noAds: 'No adverts',
      noTracking: 'No behavioural tracking',
      noPressure: 'No pressure, ever',
      gentle: 'Gentle sounds and movement',
      body: 'Quiet activities, soft learning and forgiving interactions whilst being stimulant-safe.',
    },
    ready: {
      title: 'Stories ready\nwhen you need them.',
      offlineTitle: 'Works offline',
      offlineDesc: 'Downloaded stories are available without a connection.',
      routinesTitle: 'Made for routines',
      routinesDesc: 'Perfect for bedtime, travel and quiet time.',
      parentTitle: 'Parent managed',
      parentDesc: 'Control downloads, profiles and screen time.',
    },
    profile: {
      title: 'Who is exploring today?',
      nicknameLabel: 'Nickname',
      nicknamePlaceholder: 'Enter a nickname',
      ageLabel: 'Age range',
      languageLabel: 'Language',
      setUpLater: 'Set up later',
      continue: 'Continue',
      helper: 'This helps us suggest suitable stories and activities.',
    },
  },
  childUi: {
    nav: {
      home: 'Learn',
      progress: 'Progress',
      screensafe: 'Screensafe',
      search: 'Search',
      profile: 'Profile',
    },
  },

  catalogue: {
    moreStories: 'More Stories',
    read: 'Read',
    sound: 'Sound',
    noResults: 'No stories found with these filters',
    clearFilters: 'Clear filters',
    filter: 'Filter',
    chooseTheme: 'Choose a theme',
    tagline: {
      one: 'A brighter world',
      two: 'in every story',
    },
    featuredStory: 'Featured Story',
    todaysPick: 'Today\'s pick',
    seeAll: 'See all',
    themes: {
      stories: 'Stories',
      music: 'Music',
    },
    profile: {
      tagline: {
        one: 'Everything that is',
        two: 'yours alone',
      },
    },
    saved: {
      songs: 'Saved songs',
      empty: 'Tap the heart on anything you love, and it will wait for you here',
    },
  },

  search: {
    placeholder: 'Search for a story',
    recent: 'Your Recent Searches',
    clearRecent: 'Clear',
    clear: 'Clear search',
    noResults: 'No stories found',
    tagline: {
      one: 'Find the story',
      two: 'you are looking for',
    },
  },

  progress: {
    title: 'Progress',
    tagline: {
      one: 'Little steps,',
      two: 'big progress',
    },
    weeklyHeading: 'Weekly Progress',
    timeTogether: 'Time together',
    minsSuffix: 'mins this week',
    ringCaption: 'mins together',
    ringThisWeek: 'this week',
    storiesRead: 'Stories read',
    musicSessions: 'Music sessions',
    calmMoments: 'Calm moments',
    milestonesHeading: 'Little Milestones',
    badgesHeading: 'Badges to crack',
    count: '{{current}} / {{target}}',
    soFar: 'You\'ve enjoyed {{count}} so far.',
    close: 'Close',
    adventuresHeading: 'Little adventures',
    thisWeek: 'This week',
    thisMonth: 'This month',
    badgesSummary: '{{earned}} of {{total}} discovered',
    categories: {
      all: 'All',
      stories: 'Stories',
      music: 'Music',
      calm: 'Calm',
      kindness: 'Kindness',
      exploration: 'Exploring',
    },
    challenges: {
      threeStoryTimes: { title: 'Three story times', description: 'Share three story times together this week' },
      calmMoment: { title: 'A calm moment', description: 'Enjoy one calm activity together this week' },
      makeMusic: { title: 'Make some music', description: 'Play music together twice this week' },
      morningStory: { title: 'A morning story', description: 'Read or listen together one morning this week' },
      bedtimeStory: { title: 'Bedtime stories', description: 'Share two evening story times this week' },
      tenStoryTimes: { title: 'Ten story times', description: 'Share ten story times together this month' },
      musicMonth: { title: 'A musical month', description: 'Enjoy five music sessions this month' },
      calmCollector: { title: 'Calm collector', description: 'Enjoy four calm moments this month' },
      brightMornings: { title: 'Bright mornings', description: 'Read or listen together on three mornings this month' },
    },
    milestones: {
      firstFiveStories: { title: 'First 5 stories', description: 'You\'re off to a wonderful start!' },
      bedtimeListener: { title: 'Bedtime listener', description: 'You love quiet, cosy story times.' },
      kindMoments: { title: 'Kind moments', description: 'You\'re learning to be kind.' },
    },
    badges: {
      firstStory: { title: 'First Story', description: 'Finish your very first story' },
      readingTogether: { title: 'Reading Together', description: 'Share 3 story times this week' },
      newWorlds: { title: 'New Worlds', description: 'Explore 3 different kinds of story' },
      favouriteFinder: { title: 'Favourite Finder', description: 'Choose a favourite story' },
      firstNotes: { title: 'First Notes', description: 'Play some music together' },
      musicExplorer: { title: 'Music Explorer', description: 'Enjoy 5 music sessions this month' },
      calmMoment: { title: 'Calm Moment', description: 'Try your first calm activity' },
      gentleEvening: { title: 'Gentle Evening', description: 'Share 3 evening story times' },
      bedtimeListener: { title: 'Bedtime Listener', description: 'Share 3 bedtime stories' },
      kindMoments: { title: 'Kind Moments', description: 'Read a story about kindness' },
      curiousMind: { title: 'Curious Mind', description: 'Explore 5 kinds of story' },
      adventureExplorer: { title: 'Adventure Explorer', description: 'Read 3 adventure stories' },
      morningExplorer: { title: 'Morning Explorer', description: 'Read or listen in the morning' },
      storyAdventurer: { title: 'Story Adventurer', description: 'Listen to 10 different stories' },
      calmChampion: { title: 'Calm Champion', description: 'Enjoy 5 calm moments' },
      kindHeart: { title: 'Kind Heart', description: 'Complete 5 kind activities' },
    },
    recommendations: {
      bedtime: 'Listen to a bedtime story',
      adventure: 'Pick an adventure story',
      together: 'Read something together',
      discover: 'Discover a new story',
      calming: 'Try a calming story',
      kindness: 'Choose a kindness story',
    },
  },
};
