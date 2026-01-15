import { TutorialStep } from './spotlight-overlay';

/**
 * Main Menu Tour - shown on first login
 * Introduces the main navigation buttons
 */
export const MAIN_MENU_TOUR_STEPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'welcome',
    title: 'Welcome to Grow with\nFreya! 🎉',
    description: 'Let\'s take a quick tour to help you and your child get the most out of storytime together.',
    tipPosition: 'center',
  },
  {
    id: 'stories_button',
    title: 'Story Library 📚',
    description: 'Tap here to explore our collection of interactive stories with beautiful illustrations and fun interactions.',
    // No arrow needed - tip is positioned below button
    tipPosition: 'below',
  },
  {
    id: 'emotions_button',
    title: 'Emotion Check-ins 💜',
    description: 'Help your child learn about their feelings with guided emotion check-ins.',
    // Tip positioned above the button pair with no arrow
    tipPosition: 'above',
  },
  {
    id: 'bedtime_button',
    title: 'Calming Sounds 🌙',
    description: 'Relaxing sounds, audio books, and lullabies to help your little one drift off to sleep - or calm down during a meltdown or tantrum.',
    // Tip positioned above the button pair with no arrow
    tipPosition: 'above',
  },
  {
    id: 'settings_button',
    title: 'Settings & Account ⚙️',
    description: 'Your parenting control centre! Set screen time limits, create routine alerts, personalise your child\'s avatar, and manage your family\'s experience - all in one safe place.',
    // No arrowDirection - let default logic calculate correct arrow based on button position
    tipPosition: 'center',
  },
  {
    id: 'sound_control',
    title: 'Sound Controls 🔊',
    description: 'Tap to mute/unmute background music. Long-press for volume options.',
    arrowDirection: 'up',
    tipPosition: 'center',
  },
];

/**
 * Story Reader Tips - shown when opening first story
 * Parent guidance for maximising storytime
 */
export const STORY_READER_TIPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'story_welcome',
    title: 'Story Time Tips 📖',
    description: 'Here are some tips to make storytime magical for you and your child!',
    tipPosition: 'center',
  },
  {
    id: 'interactive_elements',
    title: 'Look for Interactions ✨',
    description: 'Some pages have hidden surprises! Encourage your child to tap on objects that sparkle or glow. They might reveal something fun!',
    tipPosition: 'center',
  },
  {
    id: 'point_and_discuss',
    title: 'Point Things Out 👆',
    description: 'As you read, point to objects in the pictures. Ask "Can you find the...?" or "What colour is the...?" to keep your child engaged.',
    tipPosition: 'center',
  },
  {
    id: 'pause_and_predict',
    title: 'Pause & Predict 🤔',
    description: 'Before turning the page, ask "What do you think will happen next?" This builds comprehension and imagination.',
    tipPosition: 'center',
  },
  {
    id: 'voices_and_sounds',
    title: 'Use Different Voices 🎭',
    description: 'Make characters come alive with silly voices and sound effects. Your child will love it - and so will you!',
    tipPosition: 'center',
  },
  {
    id: 'navigate_story',
    title: 'Navigation 📱',
    description: 'Swipe left/right or tap the arrows to turn pages. Take your time - there\'s no rush!',
    tipPosition: 'center',
  },
];

/**
 * Emotion Cards Tips - shown on first visit to emotion cards
 * Parent guidance for using emotion cards with young children
 */
export const EMOTION_CARDS_TIPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'emotion_cards_welcome',
    title: 'Welcome to Emotion Cards! 🎭',
    description: 'Ages 1-3 is a crucial time when children become aware of emotions but may not know how to express or understand them.',
    tipPosition: 'center',
  },
  {
    id: 'emotion_cards_together',
    title: 'Work Together 👨‍👩‍👧',
    description: 'Sit with your child and name each emotion as you see it. "Look, the bear is happy! Can you show me your happy face?"',
    tipPosition: 'center',
    image: require('@/assets/images/ui-elements/emotion-cards-tip.webp'),
  },
  {
    id: 'emotion_cards_connect',
    title: 'Connect to Life 💡',
    description: 'Link emotions to real experiences: "Remember when we went to the park? You felt excited just like this!"',
    tipPosition: 'center',
    image: require('@/assets/images/ui-elements/emotion-cards-tip.webp'),
  },
  {
    id: 'emotion_cards_scenarios',
    title: 'Mimic Scenarios 🎭',
    description: 'Ask your child "How would you feel or look if...?" to build their emotional vocabulary through playful mimicry.',
    tipPosition: 'center',
    image: require('@/assets/images/ui-elements/emotion-cards-tip.webp'),
  },
  {
    id: 'emotion_cards_themes',
    title: 'Choose a Theme 🎨',
    description: 'Pick from Emoji, Animals, or Bear themes. Your child might connect better with certain styles - try them all!',
    tipPosition: 'center',
  },
];

/**
 * Settings Walkthrough - shown on first settings visit
 */
export const SETTINGS_WALKTHROUGH_STEPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'settings_intro',
    title: 'Your Account Settings 👋',
    description: 'This is your control centre! Manage your account, personalise the app, and adjust settings for your family.',
    tipPosition: 'center',
  },
  {
    id: 'login',
    title: 'Sign In for More 🔐',
    description: 'Create an account or sign in to sync your progress across devices, save your child\'s achievements, and unlock premium features.',
    tipPosition: 'center',
  },
  {
    id: 'language',
    title: 'Change Language 🌍',
    description: 'Tap the Language option to switch between English, Polish, Spanish, and German. Stories and the interface will update to your chosen language.',
    tipPosition: 'center',
  },
  {
    id: 'avatar',
    title: 'Personalise Your Avatar 👤',
    description: 'In the Profile section, you can change your child\'s nickname and avatar. This makes stories more personal and engaging!',
    tipPosition: 'center',
  },
  {
    id: 'accessibility',
    title: 'Accessibility Options ♿',
    description: 'Need larger text or buttons? Use the size slider to make everything easier to see and tap. Great for children who need extra visibility.',
    tipPosition: 'center',
  },
  {
    id: 'screen_time',
    title: 'Screen Time Controls ⏱️',
    description: 'Set healthy limits! Configure daily allowances based on your child\'s age, create custom reminders, and build healthy routines.',
    tipPosition: 'center',
  },
];

/**
 * Screen Time Tips - shown on first visit to screen time controls
 * Guides parents through screen time management features
 */
export const SCREEN_TIME_TIPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'screen_time_intro',
    title: 'Screen Time Management ⏱️',
    description: 'Take control of your child\'s screen time with smart limits and helpful reminders.',
    tipPosition: 'center',
  },
  {
    id: 'age_based_limits',
    title: 'Age-Based Alerts 👶',
    description: 'Select your child\'s age range to get recommended screen time limits. You\'ll be alerted when they approach or reach these healthy boundaries.',
    tipPosition: 'center',
  },
  {
    id: 'weekly_heatmap',
    title: 'Weekly Activity Heatmap 📊',
    description: 'Track daily usage at a glance! The heatmap shows your child\'s screen time each day, colour-coded based on age-specific recommendations. Green means healthy, red indicates over the limit.',
    tipPosition: 'center',
  },
  {
    id: 'custom_reminders',
    title: 'Custom Reminders 🔔',
    description: 'Create personalised reminders for story time, bedtime routines, or breaks. Build healthy habits that work for your family.',
    tipPosition: 'center',
  },
  {
    id: 'routine_building',
    title: 'Build a Routine 📅',
    description: 'Set up recurring alerts to establish consistent daily routines. Regular schedules help children feel secure and develop good habits.',
    tipPosition: 'center',
  },
];

/**
 * Gesture Hints - contextual tips for specific gestures
 */
export const GESTURE_HINTS: Record<string, Omit<TutorialStep, 'target'>> = {
  speaker_long_press: {
    id: 'speaker_long_press',
    title: 'Pro Tip! 💡',
    description: 'Long-press the speaker icon to access volume controls and sound settings.',
    arrowDirection: 'down',
    tipPosition: 'above',
  },
  story_swipe: {
    id: 'story_swipe',
    title: 'Swipe to Turn Pages 👆',
    description: 'Swipe left or right to navigate between pages. You can also tap the arrows.',
    tipPosition: 'center',
  },
};

/**
 * Book Mode Selection Tour - shown when opening first book
 * Introduces the reading mode options
 */
export const BOOK_MODE_TOUR_STEPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'read_button',
    title: 'Read Mode 📖',
    description: 'Tap here to read the story yourself with your child. Turn pages at your own pace.',
    arrowDirection: 'up',  // Arrow points up to button above tip
    tipPosition: 'below',  // Tip positioned below buttons on phone
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 16,
  },
  {
    id: 'record_button',
    title: 'Record Mode 🎙️',
    description: 'Record your own voice reading the story. Perfect for when you\'re away!',
    arrowDirection: 'up',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 16,
  },
  {
    id: 'narrate_button',
    title: 'Narrate Mode 🎧',
    description: 'Listen to a previously recorded voice reading the story aloud.',
    arrowDirection: 'up',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 16,
  },
  {
    id: 'preview_button',
    title: 'Preview 👀',
    description: 'See story details before starting. Tip: You can also long-press any book tile for a quick preview!',
    arrowDirection: 'up',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 16,
  },
];

/**
 * Record Mode Tutorial - shown when entering record mode for the first time
 * Explains how to record voice overs for stories
 */
export const RECORD_MODE_TOUR_STEPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'record_intro',
    title: 'Record Your Voice 🎙️',
    description: 'You\'re about to create something magical! Record yourself reading this story so your child can hear YOUR voice anytime.',
    tipPosition: 'center',
  },
  {
    id: 'record_button_tip',
    title: 'Tap the Red Button 🔴',
    description: 'Tap the red circle button at the top to start recording. Read the text at the bottom of the screen aloud - take your time and use fun voices!',
    tipPosition: 'center',
  },
  {
    id: 'playback_controls',
    title: 'Listen & Re-record ↺',
    description: 'After recording, tap ▶ to hear yourself. Not happy? Tap the orange ↺ button to re-record that page. You can perfect each page before moving on.',
    tipPosition: 'center',
  },
  {
    id: 'record_sound_tip',
    title: 'Check Your Sound 🔊',
    description: 'Tip: Long-press the speaker icon on the main menu to lower the background music. This helps you hear your recording playback more clearly!',
    tipPosition: 'center',
  },
  {
    id: 'record_limit',
    title: 'Up to 3 Voices 👨‍👩‍👧',
    description: 'Each book can have up to 3 recorded voices - perfect for mum, dad, and a grandparent! Your child can choose whose voice to listen to at storytime.',
    tipPosition: 'center',
  },
  {
    id: 'record_benefit',
    title: 'The Power of Your Voice 💜',
    description: 'Your voice is incredibly soothing to your child. When caregivers read stories using your recording, your little one feels safe and connected to you - even when you\'re apart.',
    tipPosition: 'center',
  },
  {
    id: 'record_navigation',
    title: 'Page by Page 📖',
    description: 'Record each page, then tap the arrow to move to the next. Your recordings are saved automatically. You can always come back to re-record any page later!',
    tipPosition: 'center',
  },
];

/**
 * Narrate Mode Tutorial - shown when entering narrate mode for the first time
 * Explains how auto-playback works
 */
export const NARRATE_MODE_TOUR_STEPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'narrate_intro',
    title: 'Story Time Magic 🎧',
    description: 'Sit back and enjoy! The story will be read aloud using a recorded voice - your child can listen to a familiar, loving voice anytime.',
    tipPosition: 'center',
  },
  {
    id: 'auto_playback',
    title: 'Automatic Reading 📖',
    description: 'The recording will play automatically on each page. When it finishes, the page will turn by itself after a short pause.',
    tipPosition: 'center',
  },
  {
    id: 'narrate_controls',
    title: 'Playback Controls ▶️',
    description: 'Use the controls at the top to pause, resume, or replay the current page. You can also manually turn pages using the arrows at any time.',
    tipPosition: 'center',
  },
  {
    id: 'narrate_sound_tip',
    title: 'Balance Your Sound 🔊',
    description: 'Tip: Long-press the speaker icon on the main menu to adjust the background music volume. Lower it to hear the recorded voice more clearly!',
    tipPosition: 'center',
  },
  {
    id: 'narrate_benefit',
    title: 'Comfort & Connection 💜',
    description: 'Perfect for bedtime when you\'re tired, or when grandparents or caregivers are looking after your little one. Your voice brings comfort even when you\'re not there.',
    tipPosition: 'center',
  },
];

/**
 * Music Tips - shown on first visit to music/sound section
 * Educates parents about binaural beats and calming sounds
 */
export const MUSIC_TIPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'music_welcome',
    title: 'Welcome to Calming Sounds 🎵',
    description: 'This section uses specially designed audio to help your child relax, sleep, or calm down during challenging moments.',
    tipPosition: 'center',
  },
  {
    id: 'binaural_science',
    title: 'The Science of Sound 🧠',
    description: 'Our tracks use binaural beats - subtle sound frequencies that can help guide the brain into calmer states. Research shows these can reduce anxiety and promote relaxation in both children and adults.',
    tipPosition: 'center',
  },
  {
    id: 'headphones_tip',
    title: 'Use Headphones 🎧',
    description: 'For binaural beats to work effectively, headphones are recommended. The different frequencies in each ear create the calming effect. Without headphones, your child still benefits from the soothing music!',
    tipPosition: 'center',
  },
  {
    id: 'tantrum_tip',
    title: 'During Tantrums 😤',
    description: 'When emotions run high, try playing our tantrum-calming tracks. The gentle frequencies can help regulate your child\'s nervous system and bring them back to a calmer state more quickly.',
    tipPosition: 'center',
  },
  {
    id: 'sleep_science',
    title: 'Better Sleep 🌙',
    description: 'Our sleep tracks use delta wave frequencies (0.5-4 Hz) that naturally occur during deep sleep. Playing these as your child falls asleep can help them drift off faster and sleep more soundly.',
    tipPosition: 'center',
  },
  {
    id: 'sleep_routine',
    title: 'Build a Routine 💤',
    description: 'Try playing the same calming track each night as part of your bedtime routine. Over time, your child\'s brain will associate the sounds with sleep, making bedtime easier.',
    tipPosition: 'center',
  },
  {
    id: 'music_stories',
    title: 'Stories Too! 📖',
    description: 'Don\'t forget our story section! Reading together builds vocabulary, imagination, and that precious parent-child bond. Record your voice so your child can hear YOU even when you\'re apart.',
    tipPosition: 'center',
  },
];

/**
 * Get tutorial steps by ID
 */
export function getTutorialSteps(tutorialId: string): Omit<TutorialStep, 'target'>[] {
  switch (tutorialId) {
    case 'main_menu_tour':
      return MAIN_MENU_TOUR_STEPS;
    case 'story_reader_tips':
      return STORY_READER_TIPS;
    case 'emotion_cards_tips':
      return EMOTION_CARDS_TIPS;
    case 'settings_walkthrough':
      return SETTINGS_WALKTHROUGH_STEPS;
    case 'book_mode_tour':
      return BOOK_MODE_TOUR_STEPS;
    case 'record_mode_tour':
      return RECORD_MODE_TOUR_STEPS;
    case 'narrate_mode_tour':
      return NARRATE_MODE_TOUR_STEPS;
    case 'music_tips':
      return MUSIC_TIPS;
    case 'screen_time_tips':
      return SCREEN_TIME_TIPS;
    default:
      return [];
  }
}
