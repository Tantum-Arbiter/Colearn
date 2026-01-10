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
    arrowDirection: 'down',
    tipPosition: 'below',
  },
  {
    id: 'emotions_button',
    title: 'Emotion Check-ins 💜',
    description: 'Help your child learn about their feelings with guided emotion check-ins.',
    arrowDirection: 'down',
    tipPosition: 'below',
  },
  {
    id: 'bedtime_button',
    title: 'Bedtime Music 🌙',
    description: 'Relaxing sounds and lullabies to help your little one drift off to sleep.',
    arrowDirection: 'down',
    tipPosition: 'below',
  },
  {
    id: 'settings_button',
    title: 'Settings & Account ⚙️',
    description: 'Customise your experience and manage your account settings.',
    arrowDirection: 'down',
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
 * Settings Walkthrough - shown on first settings visit
 */
export const SETTINGS_WALKTHROUGH_STEPS: Omit<TutorialStep, 'target'>[] = [
  {
    id: 'settings_intro',
    title: 'Account Overview ⚙️',
    description: 'Here you can personalise the app experience for your family.',
    tipPosition: 'center',
  },
  {
    id: 'notifications',
    title: 'Notifications 🔔',
    description: 'Set up bedtime reminders and story notifications to build consistent routines.',
    arrowDirection: 'up',
    tipPosition: 'below',
  },
  {
    id: 'schedule',
    title: 'Schedule Builder 📅',
    description: 'Create custom reminders for story time, emotion check-ins, or any routine you want to establish.',
    arrowDirection: 'up',
    tipPosition: 'below',
  },
  {
    id: 'accessibility',
    title: 'Accessibility Options 👁️',
    description: 'Adjust text size, enable high contrast, and customise the experience for your child\'s needs.',
    arrowDirection: 'up',
    tipPosition: 'below',
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
 * Get tutorial steps by ID
 */
export function getTutorialSteps(tutorialId: string): Omit<TutorialStep, 'target'>[] {
  switch (tutorialId) {
    case 'main_menu_tour':
      return MAIN_MENU_TOUR_STEPS;
    case 'story_reader_tips':
      return STORY_READER_TIPS;
    case 'settings_walkthrough':
      return SETTINGS_WALKTHROUGH_STEPS;
    default:
      return [];
  }
}

