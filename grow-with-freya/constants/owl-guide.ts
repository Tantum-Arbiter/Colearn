export const GUIDE_IDS = [
  'main_menu_tour',
  'story_modes_tour',
  'book_mode_tour',
  'story_reader_tips',
  'record_mode_tour',
  'narrate_mode_tour',
  'music_mode_tour',
  'settings_walkthrough',
  'screen_time_tips',
  'emotion_cards_tips',
  'spelling_tips',
  'numbers_tips',
  'feelings_tips',
  'practise_tips',
  'freeplay_tips',
] as const;

export type GuideId = (typeof GUIDE_IDS)[number];

export type SpotlightShape = 'circle' | 'rounded-rect';

export interface GuideStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  target?: string;
  shape?: SpotlightShape;
  radius?: number;
}

function keyed(section: string, id: string, key: string): Pick<GuideStep, 'titleKey' | 'descriptionKey'> {
  return {
    titleKey: `tutorial.${section}.${key}.title`,
    descriptionKey: `tutorial.${section}.${key}.description`,
  };
}

function plain(section: string, ids: readonly [string, string][]): GuideStep[] {
  return ids.map(([id, key]) => ({ id, ...keyed(section, id, key) }));
}

export const GUIDE_STEPS: Record<GuideId, readonly GuideStep[]> = {
  main_menu_tour: [
    { id: 'welcome', ...keyed('mainMenu', 'welcome', 'welcome') },
    { id: 'stories_button', ...keyed('mainMenu', 'stories_button', 'stories'), target: 'stories_button', shape: 'rounded-rect', radius: 24 },
    { id: 'learning_button', ...keyed('mainMenu', 'learning_button', 'learning'), target: 'learning_button', shape: 'rounded-rect', radius: 24 },
    { id: 'instruments_button', ...keyed('mainMenu', 'instruments_button', 'instruments'), target: 'instruments_button', shape: 'rounded-rect', radius: 24 },
    { id: 'settings_button', ...keyed('mainMenu', 'settings_button', 'settings'), target: 'settings_button', shape: 'circle' },
    { id: 'sound_control', ...keyed('mainMenu', 'sound_control', 'sound'), target: 'sound_control', shape: 'circle' },
  ],
  story_modes_tour: plain('storyModes', [
    ['modes_welcome', 'welcome'],
    ['modes_interactive', 'interactive'],
    ['modes_musical', 'musical'],
    ['modes_jigsaw', 'jigsaw'],
  ]),
  book_mode_tour: [
    { id: 'read_button', ...keyed('bookMode', 'read_button', 'read'), target: 'read_button', shape: 'rounded-rect', radius: 16 },
    { id: 'record_button', ...keyed('bookMode', 'record_button', 'record'), target: 'record_button', shape: 'rounded-rect', radius: 16 },
    { id: 'narrate_button', ...keyed('bookMode', 'narrate_button', 'narrate'), target: 'narrate_button', shape: 'rounded-rect', radius: 16 },
  ],
  story_reader_tips: plain('storyReader', [
    ['story_welcome', 'welcome'],
    ['interactive_elements', 'interactive'],
    ['point_and_discuss', 'point'],
    ['pause_and_predict', 'pause'],
    ['voices_and_sounds', 'voices'],
    ['navigate_story', 'navigate'],
    ['tap_words_highlight', 'tapWords'],
    ['compare_languages', 'compareLanguages'],
  ]),
  record_mode_tour: plain('recordMode', [
    ['record_intro', 'intro'],
    ['record_button_tip', 'button'],
    ['playback_controls', 'playback'],
    ['record_sound_tip', 'sound'],
    ['record_limit', 'limit'],
    ['record_benefit', 'benefit'],
    ['record_navigation', 'navigation'],
  ]),
  narrate_mode_tour: plain('narrateMode', [
    ['narrate_intro', 'intro'],
    ['auto_playback', 'autoPlayback'],
    ['narrate_controls', 'controls'],
    ['narrate_sound_tip', 'sound'],
    ['narrate_benefit', 'benefit'],
  ]),
  music_mode_tour: plain('musicMode', [
    ['music_welcome', 'welcome'],
    ['music_instrument', 'instrument'],
    ['music_playing', 'playing'],
    ['music_sheet', 'sheet'],
    ['music_begin', 'begin'],
    ['music_change', 'change'],
  ]),
  settings_walkthrough: plain('settings', [
    ['settings_intro', 'intro'],
    ['login', 'login'],
    ['language', 'language'],
    ['avatar', 'avatar'],
    ['accessibility', 'accessibility'],
    ['screen_time', 'screenTime'],
  ]),
  screen_time_tips: plain('screenTime', [
    ['screen_time_intro', 'intro'],
    ['age_based_limits', 'ageBased'],
    ['weekly_heatmap', 'heatmap'],
    ['custom_reminders', 'reminders'],
    ['routine_building', 'routine'],
  ]),
  emotion_cards_tips: plain('emotionCards', [
    ['emotion_cards_welcome', 'welcome'],
    ['emotion_cards_together', 'together'],
    ['emotion_cards_connect', 'connect'],
    ['emotion_cards_scenarios', 'scenarios'],
    ['emotion_cards_themes', 'themes'],
  ]),
  spelling_tips: plain('spelling', [
    ['spelling_welcome', 'welcome'],
    ['spelling_ages', 'ages'],
    ['spelling_together', 'together'],
    ['spelling_benefit', 'benefit'],
  ]),
  numbers_tips: plain('numbers', [
    ['numbers_welcome', 'welcome'],
    ['numbers_ages', 'ages'],
    ['numbers_together', 'together'],
    ['numbers_benefit', 'benefit'],
  ]),
  feelings_tips: plain('feelings', [
    ['feelings_welcome', 'welcome'],
    ['feelings_ages', 'ages'],
    ['feelings_together', 'together'],
    ['feelings_benefit', 'benefit'],
  ]),
  practise_tips: plain('practise', [
    ['practise_welcome', 'welcome'],
    ['practise_instrument', 'instrument'],
    ['practise_songs', 'songs'],
    ['practise_benefit', 'benefit'],
  ]),
  freeplay_tips: plain('freeplay', [
    ['freeplay_welcome', 'welcome'],
    ['freeplay_instrument', 'instrument'],
    ['freeplay_play', 'play'],
    ['freeplay_benefit', 'benefit'],
  ]),
};

export function guideSteps(id: GuideId, availableTargets: readonly string[] = []): GuideStep[] {
  return GUIDE_STEPS[id].filter((step) => !step.target || availableTargets.includes(step.target));
}

export const GUIDE_TIMING = {
  showDelayMs: 600,
  landscapeShowDelayMs: 1500,
  measureSettleMs: 100,
  turnSettleMs: 500,
  dimMs: 260,
} as const;

export const GUIDE_BUTTON_KEYS = {
  next: 'tutorial.buttons.next',
  finish: 'tutorial.buttons.letsGo',
  skip: 'tutorial.buttons.skip',
} as const;

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuideFrame {
  width: number;
  height: number;
}

export type BubbleTail = 'up' | 'down' | 'left' | 'right';
export type BubblePointer = BubbleTail | null;

export interface GuideLayout {
  landscape: boolean;
  tablet: boolean;
  owlWidth: number;
  bubbleMaxWidth: number;
}

export const GUIDE_OWL_WIDTH = {
  phone: 116,
  phoneLandscape: 92,
  tablet: 148,
  tabletLandscape: 132,
} as const;

export const GUIDE_BUBBLE_MAX = {
  phone: 340,
  tablet: 420,
  landscape: 460,
} as const;

export const TABLET_SHORT_EDGE = 768;

export function isTabletFrame(frame: GuideFrame): boolean {
  return Math.min(frame.width, frame.height) >= TABLET_SHORT_EDGE;
}

export function planGuideLayout(frame: GuideFrame): GuideLayout {
  const landscape = frame.width > frame.height;
  const tablet = isTabletFrame(frame);

  const owlWidth = tablet
    ? landscape
      ? GUIDE_OWL_WIDTH.tabletLandscape
      : GUIDE_OWL_WIDTH.tablet
    : landscape
      ? GUIDE_OWL_WIDTH.phoneLandscape
      : GUIDE_OWL_WIDTH.phone;

  const bubbleMaxWidth = landscape
    ? Math.min(frame.width * 0.5, GUIDE_BUBBLE_MAX.landscape)
    : Math.min(frame.width - 24, tablet ? GUIDE_BUBBLE_MAX.tablet : GUIDE_BUBBLE_MAX.phone);

  return { landscape, tablet, owlWidth, bubbleMaxWidth };
}

export interface GuideInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PerchSize {
  width: number;
  height: number;
}

export interface BubbleSize {
  maxWidth: number;
  height: number;
}

export type BubbleMode = 'perch' | 'above' | 'below';

export interface BubblePlacement {
  mode: BubbleMode;
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  tail: BubbleTail | null;
  pointer: BubblePointer;
}

export const BUBBLE_MARGIN = 12;
export const BUBBLE_GAP = 12;
export const BUBBLE_PERCH_LIFT = 4;
export const BUBBLE_SIDE_GAP = 8;
export const BUBBLE_SIDE_BOTTOM = 18;
export const DEFAULT_BUBBLE_HEIGHT = 160;

function overlaps(a: TargetRect, b: TargetRect, margin = 8): boolean {
  return (
    a.x < b.x + b.width + margin &&
    a.x + a.width + margin > b.x &&
    a.y < b.y + b.height + margin &&
    a.y + a.height + margin > b.y
  );
}

export function placeGuideBubble(
  frame: GuideFrame,
  insets: GuideInsets,
  perch: PerchSize,
  bubble: BubbleSize,
  landscape: boolean,
  target?: TargetRect | null
): BubblePlacement {
  const resting: BubblePlacement = landscape
    ? {
        mode: 'perch',
        left: perch.width + BUBBLE_SIDE_GAP,
        bottom: BUBBLE_SIDE_BOTTOM + insets.bottom,
        width: bubble.maxWidth,
        tail: 'left',
        pointer: target ? 'up' : null,
      }
    : {
        mode: 'perch',
        left: BUBBLE_MARGIN + insets.left,
        bottom: perch.height - BUBBLE_PERCH_LIFT,
        width: bubble.maxWidth,
        tail: 'down',
        pointer: target ? 'up' : null,
      };

  if (!target) return resting;

  const restingRect: TargetRect = {
    x: resting.left,
    y: frame.height - (resting.bottom ?? 0) - bubble.height,
    width: bubble.maxWidth,
    height: bubble.height,
  };
  const perchRect: TargetRect = { x: 0, y: frame.height - perch.height, width: perch.width, height: perch.height };
  if (!overlaps(target, restingRect) && !overlaps(target, perchRect)) return resting;

  const width = bubble.maxWidth;
  const minLeft = BUBBLE_MARGIN + insets.left;
  const maxLeft = frame.width - insets.right - BUBBLE_MARGIN - width;
  const left = Math.min(Math.max(target.x + target.width / 2 - width / 2, minLeft), Math.max(minLeft, maxLeft));
  const fitsAbove = target.y - BUBBLE_GAP - bubble.height >= insets.top + BUBBLE_MARGIN;

  if (fitsAbove) {
    return { mode: 'above', left, bottom: frame.height - (target.y - BUBBLE_GAP), width, tail: null, pointer: 'down' };
  }
  return { mode: 'below', left, top: target.y + target.height + BUBBLE_GAP, width, tail: null, pointer: 'up' };
}

export const SPOTLIGHT_PADDING = 8;

export interface SpotlightFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export function spotlightFrame(target: TargetRect, shape: SpotlightShape = 'circle', radius = 20): SpotlightFrame {
  if (shape === 'circle') {
    const diameter = Math.max(target.width, target.height) + SPOTLIGHT_PADDING * 2;
    return {
      x: target.x + target.width / 2 - diameter / 2,
      y: target.y + target.height / 2 - diameter / 2,
      width: diameter,
      height: diameter,
      radius: diameter / 2,
    };
  }

  return {
    x: target.x - SPOTLIGHT_PADDING,
    y: target.y - SPOTLIGHT_PADDING,
    width: target.width + SPOTLIGHT_PADDING * 2,
    height: target.height + SPOTLIGHT_PADDING * 2,
    radius,
  };
}
