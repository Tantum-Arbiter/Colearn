import { TutorialStep } from './spotlight-overlay';

// Tutorial step with translation keys instead of hardcoded text
export interface TutorialStepWithKeys extends Omit<TutorialStep, 'title' | 'description' | 'target'> {
  titleKey: string;
  descriptionKey: string;
  image?: any;
}

/**
 * Main Menu Tour - shown on first login
 * Introduces the main navigation buttons
 */
export const MAIN_MENU_TOUR_STEPS: TutorialStepWithKeys[] = [
  {
    id: 'welcome',
    titleKey: 'tutorial.mainMenu.welcome.title',
    descriptionKey: 'tutorial.mainMenu.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'stories_button',
    titleKey: 'tutorial.mainMenu.stories.title',
    descriptionKey: 'tutorial.mainMenu.stories.description',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 24,
  },
  {
    id: 'learning_button',
    titleKey: 'tutorial.mainMenu.learning.title',
    descriptionKey: 'tutorial.mainMenu.learning.description',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 24,
  },
  {
    id: 'instruments_button',
    titleKey: 'tutorial.mainMenu.instruments.title',
    descriptionKey: 'tutorial.mainMenu.instruments.description',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 24,
  },
  {
    id: 'settings_button',
    titleKey: 'tutorial.mainMenu.settings.title',
    descriptionKey: 'tutorial.mainMenu.settings.description',
    tipPosition: 'center',
  },
  {
    id: 'sound_control',
    titleKey: 'tutorial.mainMenu.sound.title',
    descriptionKey: 'tutorial.mainMenu.sound.description',
    arrowDirection: 'up',
    tipPosition: 'center',
  },
];

/**
 * Story Reader Tips - shown when opening first story
 * Parent guidance for maximising storytime
 */
export const STORY_READER_TIPS: TutorialStepWithKeys[] = [
  {
    id: 'story_welcome',
    titleKey: 'tutorial.storyReader.welcome.title',
    descriptionKey: 'tutorial.storyReader.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'interactive_elements',
    titleKey: 'tutorial.storyReader.interactive.title',
    descriptionKey: 'tutorial.storyReader.interactive.description',
    tipPosition: 'center',
  },
  {
    id: 'point_and_discuss',
    titleKey: 'tutorial.storyReader.point.title',
    descriptionKey: 'tutorial.storyReader.point.description',
    tipPosition: 'center',
  },
  {
    id: 'pause_and_predict',
    titleKey: 'tutorial.storyReader.pause.title',
    descriptionKey: 'tutorial.storyReader.pause.description',
    tipPosition: 'center',
  },
  {
    id: 'voices_and_sounds',
    titleKey: 'tutorial.storyReader.voices.title',
    descriptionKey: 'tutorial.storyReader.voices.description',
    tipPosition: 'center',
  },
  {
    id: 'navigate_story',
    titleKey: 'tutorial.storyReader.navigate.title',
    descriptionKey: 'tutorial.storyReader.navigate.description',
    tipPosition: 'center',
  },
  {
    id: 'tap_words_highlight',
    titleKey: 'tutorial.storyReader.tapWords.title',
    descriptionKey: 'tutorial.storyReader.tapWords.description',
    tipPosition: 'center',
  },
  {
    id: 'compare_languages',
    titleKey: 'tutorial.storyReader.compareLanguages.title',
    descriptionKey: 'tutorial.storyReader.compareLanguages.description',
    tipPosition: 'center',
  },
];

/**
 * Parent guidance for using emotion cards with young children
 */
export const EMOTION_CARDS_TIPS: TutorialStepWithKeys[] = [
  {
    id: 'emotion_cards_welcome',
    titleKey: 'tutorial.emotionCards.welcome.title',
    descriptionKey: 'tutorial.emotionCards.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'emotion_cards_together',
    titleKey: 'tutorial.emotionCards.together.title',
    descriptionKey: 'tutorial.emotionCards.together.description',
    tipPosition: 'center',
    image: require('@/assets/images/ui-elements/emotion-cards-tip.webp'),
  },
  {
    id: 'emotion_cards_connect',
    titleKey: 'tutorial.emotionCards.connect.title',
    descriptionKey: 'tutorial.emotionCards.connect.description',
    tipPosition: 'center',
    image: require('@/assets/images/ui-elements/emotion-cards-tip.webp'),
  },
  {
    id: 'emotion_cards_scenarios',
    titleKey: 'tutorial.emotionCards.scenarios.title',
    descriptionKey: 'tutorial.emotionCards.scenarios.description',
    tipPosition: 'center',
    image: require('@/assets/images/ui-elements/emotion-cards-tip.webp'),
  },
  {
    id: 'emotion_cards_themes',
    titleKey: 'tutorial.emotionCards.themes.title',
    descriptionKey: 'tutorial.emotionCards.themes.description',
    tipPosition: 'center',
  },
];

/**
 * Settings Walkthrough - shown on first settings visit
 */
export const SETTINGS_WALKTHROUGH_STEPS: TutorialStepWithKeys[] = [
  {
    id: 'settings_intro',
    titleKey: 'tutorial.settings.intro.title',
    descriptionKey: 'tutorial.settings.intro.description',
    tipPosition: 'center',
  },
  {
    id: 'login',
    titleKey: 'tutorial.settings.login.title',
    descriptionKey: 'tutorial.settings.login.description',
    tipPosition: 'center',
  },
  {
    id: 'language',
    titleKey: 'tutorial.settings.language.title',
    descriptionKey: 'tutorial.settings.language.description',
    tipPosition: 'center',
  },
  {
    id: 'avatar',
    titleKey: 'tutorial.settings.avatar.title',
    descriptionKey: 'tutorial.settings.avatar.description',
    tipPosition: 'center',
  },
  {
    id: 'accessibility',
    titleKey: 'tutorial.settings.accessibility.title',
    descriptionKey: 'tutorial.settings.accessibility.description',
    tipPosition: 'center',
  },
  {
    id: 'screen_time',
    titleKey: 'tutorial.settings.screenTime.title',
    descriptionKey: 'tutorial.settings.screenTime.description',
    tipPosition: 'center',
  },
];

/**
 * Screen Time Tips - shown on first visit to screen time controls
 * Guides parents through screen time management features
 */
export const SCREEN_TIME_TIPS: TutorialStepWithKeys[] = [
  {
    id: 'screen_time_intro',
    titleKey: 'tutorial.screenTime.intro.title',
    descriptionKey: 'tutorial.screenTime.intro.description',
    tipPosition: 'center',
  },
  {
    id: 'age_based_limits',
    titleKey: 'tutorial.screenTime.ageBased.title',
    descriptionKey: 'tutorial.screenTime.ageBased.description',
    tipPosition: 'center',
  },
  {
    id: 'weekly_heatmap',
    titleKey: 'tutorial.screenTime.heatmap.title',
    descriptionKey: 'tutorial.screenTime.heatmap.description',
    tipPosition: 'center',
  },
  {
    id: 'custom_reminders',
    titleKey: 'tutorial.screenTime.reminders.title',
    descriptionKey: 'tutorial.screenTime.reminders.description',
    tipPosition: 'center',
  },
  {
    id: 'routine_building',
    titleKey: 'tutorial.screenTime.routine.title',
    descriptionKey: 'tutorial.screenTime.routine.description',
    tipPosition: 'center',
  },
];

/**
 * Gesture Hints - contextual tips for specific gestures
 */
export const GESTURE_HINTS: Record<string, TutorialStepWithKeys> = {
  speaker_long_press: {
    id: 'speaker_long_press',
    titleKey: 'tutorial.gestures.speakerLongPress.title',
    descriptionKey: 'tutorial.gestures.speakerLongPress.description',
    arrowDirection: 'down',
    tipPosition: 'above',
  },
  story_swipe: {
    id: 'story_swipe',
    titleKey: 'tutorial.gestures.storySwipe.title',
    descriptionKey: 'tutorial.gestures.storySwipe.description',
    tipPosition: 'center',
  },
};

/**
 * Book Mode Selection Tour - shown when opening first book
 * Introduces the reading mode options
 */
export const BOOK_MODE_TOUR_STEPS: TutorialStepWithKeys[] = [
  {
    id: 'read_button',
    titleKey: 'tutorial.bookMode.read.title',
    descriptionKey: 'tutorial.bookMode.read.description',
    arrowDirection: 'up',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 16,
  },
  {
    id: 'record_button',
    titleKey: 'tutorial.bookMode.record.title',
    descriptionKey: 'tutorial.bookMode.record.description',
    arrowDirection: 'up',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 16,
  },
  {
    id: 'narrate_button',
    titleKey: 'tutorial.bookMode.narrate.title',
    descriptionKey: 'tutorial.bookMode.narrate.description',
    arrowDirection: 'up',
    tipPosition: 'below',
    spotlightShape: 'rounded-rect',
    spotlightBorderRadius: 16,
  },
  {
    id: 'preview_button',
    titleKey: 'tutorial.bookMode.preview.title',
    descriptionKey: 'tutorial.bookMode.preview.description',
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
export const RECORD_MODE_TOUR_STEPS: TutorialStepWithKeys[] = [
  {
    id: 'record_intro',
    titleKey: 'tutorial.recordMode.intro.title',
    descriptionKey: 'tutorial.recordMode.intro.description',
    tipPosition: 'center',
  },
  {
    id: 'record_button_tip',
    titleKey: 'tutorial.recordMode.button.title',
    descriptionKey: 'tutorial.recordMode.button.description',
    tipPosition: 'center',
  },
  {
    id: 'playback_controls',
    titleKey: 'tutorial.recordMode.playback.title',
    descriptionKey: 'tutorial.recordMode.playback.description',
    tipPosition: 'center',
  },
  {
    id: 'record_sound_tip',
    titleKey: 'tutorial.recordMode.sound.title',
    descriptionKey: 'tutorial.recordMode.sound.description',
    tipPosition: 'center',
  },
  {
    id: 'record_limit',
    titleKey: 'tutorial.recordMode.limit.title',
    descriptionKey: 'tutorial.recordMode.limit.description',
    tipPosition: 'center',
  },
  {
    id: 'record_benefit',
    titleKey: 'tutorial.recordMode.benefit.title',
    descriptionKey: 'tutorial.recordMode.benefit.description',
    tipPosition: 'center',
  },
  {
    id: 'record_navigation',
    titleKey: 'tutorial.recordMode.navigation.title',
    descriptionKey: 'tutorial.recordMode.navigation.description',
    tipPosition: 'center',
  },
];

/**
 * Narrate Mode Tutorial - shown when entering narrate mode for the first time
 * Explains how auto-playback works
 */
export const NARRATE_MODE_TOUR_STEPS: TutorialStepWithKeys[] = [
  {
    id: 'narrate_intro',
    titleKey: 'tutorial.narrateMode.intro.title',
    descriptionKey: 'tutorial.narrateMode.intro.description',
    tipPosition: 'center',
  },
  {
    id: 'auto_playback',
    titleKey: 'tutorial.narrateMode.autoPlayback.title',
    descriptionKey: 'tutorial.narrateMode.autoPlayback.description',
    tipPosition: 'center',
  },
  {
    id: 'narrate_controls',
    titleKey: 'tutorial.narrateMode.controls.title',
    descriptionKey: 'tutorial.narrateMode.controls.description',
    tipPosition: 'center',
  },
  {
    id: 'narrate_sound_tip',
    titleKey: 'tutorial.narrateMode.sound.title',
    descriptionKey: 'tutorial.narrateMode.sound.description',
    tipPosition: 'center',
  },
  {
    id: 'narrate_benefit',
    titleKey: 'tutorial.narrateMode.benefit.title',
    descriptionKey: 'tutorial.narrateMode.benefit.description',
    tipPosition: 'center',
  },
];

/**
 * Music Mode Tutorial - shown when first reaching a music challenge page
 * Explains instruments, note buttons, music sheet, and changing instrument
 */
export const MUSIC_MODE_TOUR_STEPS: TutorialStepWithKeys[] = [
  {
    id: 'music_welcome',
    titleKey: 'tutorial.musicMode.welcome.title',
    descriptionKey: 'tutorial.musicMode.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'music_instrument',
    titleKey: 'tutorial.musicMode.instrument.title',
    descriptionKey: 'tutorial.musicMode.instrument.description',
    tipPosition: 'center',
  },
  {
    id: 'music_playing',
    titleKey: 'tutorial.musicMode.playing.title',
    descriptionKey: 'tutorial.musicMode.playing.description',
    tipPosition: 'center',
  },
  {
    id: 'music_sheet',
    titleKey: 'tutorial.musicMode.sheet.title',
    descriptionKey: 'tutorial.musicMode.sheet.description',
    tipPosition: 'center',
  },
  {
    id: 'music_begin',
    titleKey: 'tutorial.musicMode.begin.title',
    descriptionKey: 'tutorial.musicMode.begin.description',
    tipPosition: 'center',
  },
  {
    id: 'music_change',
    titleKey: 'tutorial.musicMode.change.title',
    descriptionKey: 'tutorial.musicMode.change.description',
    tipPosition: 'center',
  },
];

/**
 * Story Modes Tour - shown when mode cards (Interactive/Musical/Jigsaw) appear for the first time
 * Explains each story mode's unique developmental benefits
 */
export const STORY_MODES_TOUR_STEPS: TutorialStepWithKeys[] = [
  {
    id: 'modes_welcome',
    titleKey: 'tutorial.storyModes.welcome.title',
    descriptionKey: 'tutorial.storyModes.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'modes_interactive',
    titleKey: 'tutorial.storyModes.interactive.title',
    descriptionKey: 'tutorial.storyModes.interactive.description',
    tipPosition: 'center',
  },
  {
    id: 'modes_musical',
    titleKey: 'tutorial.storyModes.musical.title',
    descriptionKey: 'tutorial.storyModes.musical.description',
    tipPosition: 'center',
  },
  {
    id: 'modes_jigsaw',
    titleKey: 'tutorial.storyModes.jigsaw.title',
    descriptionKey: 'tutorial.storyModes.jigsaw.description',
    tipPosition: 'center',
  },
];

/**
 * Spelling Tips - shown when entering the spelling section for the first time
 */
export const SPELLING_TIPS: TutorialStepWithKeys[] = [
  {
    id: 'spelling_welcome',
    titleKey: 'tutorial.spelling.welcome.title',
    descriptionKey: 'tutorial.spelling.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'spelling_ages',
    titleKey: 'tutorial.spelling.ages.title',
    descriptionKey: 'tutorial.spelling.ages.description',
    tipPosition: 'center',
  },
  {
    id: 'spelling_together',
    titleKey: 'tutorial.spelling.together.title',
    descriptionKey: 'tutorial.spelling.together.description',
    tipPosition: 'center',
  },
  {
    id: 'spelling_benefit',
    titleKey: 'tutorial.spelling.benefit.title',
    descriptionKey: 'tutorial.spelling.benefit.description',
    tipPosition: 'center',
  },
];

/**
 * Numbers Tips - shown when entering the numbers section for the first time
 */
export const NUMBERS_TIPS: TutorialStepWithKeys[] = [
  {
    id: 'numbers_welcome',
    titleKey: 'tutorial.numbers.welcome.title',
    descriptionKey: 'tutorial.numbers.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'numbers_ages',
    titleKey: 'tutorial.numbers.ages.title',
    descriptionKey: 'tutorial.numbers.ages.description',
    tipPosition: 'center',
  },
  {
    id: 'numbers_together',
    titleKey: 'tutorial.numbers.together.title',
    descriptionKey: 'tutorial.numbers.together.description',
    tipPosition: 'center',
  },
  {
    id: 'numbers_benefit',
    titleKey: 'tutorial.numbers.benefit.title',
    descriptionKey: 'tutorial.numbers.benefit.description',
    tipPosition: 'center',
  },
];

/**
 * Feelings Tips - shown when entering the feelings section for the first time
 */
export const FEELINGS_TIPS: TutorialStepWithKeys[] = [
  {
    id: 'feelings_welcome',
    titleKey: 'tutorial.feelings.welcome.title',
    descriptionKey: 'tutorial.feelings.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'feelings_ages',
    titleKey: 'tutorial.feelings.ages.title',
    descriptionKey: 'tutorial.feelings.ages.description',
    tipPosition: 'center',
  },
  {
    id: 'feelings_together',
    titleKey: 'tutorial.feelings.together.title',
    descriptionKey: 'tutorial.feelings.together.description',
    tipPosition: 'center',
  },
  {
    id: 'feelings_benefit',
    titleKey: 'tutorial.feelings.benefit.title',
    descriptionKey: 'tutorial.feelings.benefit.description',
    tipPosition: 'center',
  },
];

/**
 * Practise Mode Tips - shown when entering practise mode for the first time
 */
export const PRACTISE_TIPS: TutorialStepWithKeys[] = [
  {
    id: 'practise_welcome',
    titleKey: 'tutorial.practise.welcome.title',
    descriptionKey: 'tutorial.practise.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'practise_instrument',
    titleKey: 'tutorial.practise.instrument.title',
    descriptionKey: 'tutorial.practise.instrument.description',
    tipPosition: 'center',
  },
  {
    id: 'practise_songs',
    titleKey: 'tutorial.practise.songs.title',
    descriptionKey: 'tutorial.practise.songs.description',
    tipPosition: 'center',
  },
  {
    id: 'practise_benefit',
    titleKey: 'tutorial.practise.benefit.title',
    descriptionKey: 'tutorial.practise.benefit.description',
    tipPosition: 'center',
  },
];

/**
 * Freeplay Mode Tips - shown when entering freeplay mode for the first time
 */
export const FREEPLAY_TIPS: TutorialStepWithKeys[] = [
  {
    id: 'freeplay_welcome',
    titleKey: 'tutorial.freeplay.welcome.title',
    descriptionKey: 'tutorial.freeplay.welcome.description',
    tipPosition: 'center',
  },
  {
    id: 'freeplay_instrument',
    titleKey: 'tutorial.freeplay.instrument.title',
    descriptionKey: 'tutorial.freeplay.instrument.description',
    tipPosition: 'center',
  },
  {
    id: 'freeplay_play',
    titleKey: 'tutorial.freeplay.play.title',
    descriptionKey: 'tutorial.freeplay.play.description',
    tipPosition: 'center',
  },
  {
    id: 'freeplay_benefit',
    titleKey: 'tutorial.freeplay.benefit.title',
    descriptionKey: 'tutorial.freeplay.benefit.description',
    tipPosition: 'center',
  },
];

/**
 * Get tutorial steps by ID
 */
export function getTutorialSteps(tutorialId: string): TutorialStepWithKeys[] {
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
    case 'screen_time_tips':
      return SCREEN_TIME_TIPS;
    case 'music_mode_tour':
      return MUSIC_MODE_TOUR_STEPS;
    case 'story_modes_tour':
      return STORY_MODES_TOUR_STEPS;
    case 'spelling_tips':
      return SPELLING_TIPS;
    case 'numbers_tips':
      return NUMBERS_TIPS;
    case 'feelings_tips':
      return FEELINGS_TIPS;
    case 'practise_tips':
      return PRACTISE_TIPS;
    case 'freeplay_tips':
      return FREEPLAY_TIPS;
    default:
      return [];
  }
}
