export const GUIDE_IDS = [
  'main_menu_tour',
  'catalogue_tour',
  'progress_tour',
  'search_tour',
  'profile_tour',
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

/** A picture the bubble shows under its words, where words alone would not do. */
export type GuideIllustration = 'screenTimeRing';

export interface GuideStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  target?: string;
  shape?: SpotlightShape;
  radius?: number;
  illustration?: GuideIllustration;
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
    { id: 'achievement_card', ...keyed('mainMenu', 'achievement_card', 'achievement'), target: 'achievement_card', shape: 'rounded-rect', radius: 24 },
    { id: 'learning_button', ...keyed('mainMenu', 'learning_button', 'learning'), target: 'learning_button', shape: 'rounded-rect', radius: 24 },
    { id: 'instruments_button', ...keyed('mainMenu', 'instruments_button', 'instruments'), target: 'instruments_button', shape: 'rounded-rect', radius: 24 },
    { id: 'screen_time_ring', ...keyed('mainMenu', 'screen_time_ring', 'screenTime'), target: 'screen_time_ring', shape: 'circle', illustration: 'screenTimeRing' },
    { id: 'settings_button', ...keyed('mainMenu', 'settings_button', 'settings'), target: 'settings_button', shape: 'rounded-rect', radius: 19 },
    { id: 'sound_control', ...keyed('mainMenu', 'sound_control', 'sound'), target: 'sound_control', shape: 'circle' },
  ],
  catalogue_tour: [
    { id: 'catalogue_welcome', ...keyed('catalogue', 'catalogue_welcome', 'welcome') },
    { id: 'theme_tiles', ...keyed('catalogue', 'theme_tiles', 'themes'), target: 'theme_tiles', shape: 'rounded-rect', radius: 22 },
    { id: 'filter_toggle', ...keyed('catalogue', 'filter_toggle', 'filter'), target: 'filter_toggle', shape: 'rounded-rect', radius: 22 },
    { id: 'featured_story', ...keyed('catalogue', 'featured_story', 'featured'), target: 'featured_story', shape: 'rounded-rect', radius: 22 },
    { id: 'story_shelves', ...keyed('catalogue', 'story_shelves', 'shelves'), target: 'story_shelves', shape: 'rounded-rect', radius: 22 },
    { id: 'nav_progress', ...keyed('catalogue', 'nav_progress', 'navProgress'), target: 'nav_progress', shape: 'circle' },
    { id: 'nav_screensafe', ...keyed('catalogue', 'nav_screensafe', 'navScreensafe'), target: 'nav_screensafe', shape: 'circle' },
    { id: 'nav_search', ...keyed('catalogue', 'nav_search', 'navSearch'), target: 'nav_search', shape: 'circle' },
    { id: 'nav_profile', ...keyed('catalogue', 'nav_profile', 'navProfile'), target: 'nav_profile', shape: 'circle' },
  ],
  progress_tour: [
    { id: 'progress_welcome', ...keyed('progress', 'progress_welcome', 'welcome') },
    { id: 'progress_hero', ...keyed('progress', 'progress_hero', 'hero'), target: 'progress_hero', shape: 'rounded-rect', radius: 22 },
    { id: 'progress_challenges', ...keyed('progress', 'progress_challenges', 'challenges'), target: 'progress_challenges', shape: 'rounded-rect', radius: 22 },
    { id: 'progress_milestones', ...keyed('progress', 'progress_milestones', 'milestones'), target: 'progress_milestones', shape: 'rounded-rect', radius: 22 },
    { id: 'progress_badges', ...keyed('progress', 'progress_badges', 'badges'), target: 'progress_badges', shape: 'rounded-rect', radius: 22 },
  ],
  search_tour: [
    { id: 'search_welcome', ...keyed('search', 'search_welcome', 'welcome') },
    { id: 'search_field', ...keyed('search', 'search_field', 'field'), target: 'search_field', shape: 'rounded-rect', radius: 22 },
    { id: 'search_recent', ...keyed('search', 'search_recent', 'recent'), target: 'search_recent', shape: 'rounded-rect', radius: 22 },
  ],
  profile_tour: [
    { id: 'profile_welcome', ...keyed('profile', 'profile_welcome', 'welcome') },
    { id: 'profile_hero', ...keyed('profile', 'profile_hero', 'hero'), target: 'profile_hero', shape: 'circle' },
    { id: 'profile_tabs', ...keyed('profile', 'profile_tabs', 'tabs'), target: 'profile_tabs', shape: 'rounded-rect', radius: 22 },
    { id: 'profile_settings', ...keyed('profile', 'profile_settings', 'settings'), target: 'profile_settings', shape: 'circle' },
  ],
  story_modes_tour: plain('storyModes', [
    ['modes_welcome', 'welcome'],
    ['modes_interactive', 'interactive'],
    ['modes_musical', 'musical'],
    ['modes_jigsaw', 'jigsaw'],
  ]),
  // down the sheet in the order it lists them -- read, play along, record --
  // rather than jumping to the last control and back up to the middle one
  book_mode_tour: [
    { id: 'read_button', ...keyed('bookMode', 'read_button', 'read'), target: 'read_button', shape: 'rounded-rect', radius: 16 },
    { id: 'narrate_button', ...keyed('bookMode', 'narrate_button', 'narrate'), target: 'narrate_button', shape: 'rounded-rect', radius: 16 },
    { id: 'record_button', ...keyed('bookMode', 'record_button', 'record'), target: 'record_button', shape: 'rounded-rect', radius: 16 },
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
  // a page scrolled to reveal a target is still gliding when the ordinary
  // settle is up; measuring then lands the spotlight where the target was
  // passing rather than where it stopped
  scrollSettleMs: 420,
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

/** Where the bubble sits when nothing has pushed it off the owl's perch. */
function restingPlacement(
  frame: GuideFrame,
  insets: GuideInsets,
  perch: PerchSize,
  bubble: BubbleSize,
  landscape: boolean
): BubblePlacement {
  return landscape
    ? {
        mode: 'perch',
        left: perch.width + BUBBLE_SIDE_GAP,
        bottom: BUBBLE_SIDE_BOTTOM + insets.bottom,
        width: bubble.maxWidth,
        tail: 'left',
        pointer: null,
      }
    : {
        mode: 'perch',
        left: BUBBLE_MARGIN + insets.left,
        bottom: perch.height - BUBBLE_PERCH_LIFT,
        width: bubble.maxWidth,
        tail: 'down',
        // no second notch at the highlight: on the perch the bubble is the
        // owl's, its tail says so, and the spotlight already marks what the
        // step is about. Two tails on one bubble read as a mistake.
        pointer: null,
      };
}

/** What the resting bubble and the owl beneath it cover, between them. */
function restingRects(
  frame: GuideFrame,
  perch: PerchSize,
  bubble: BubbleSize,
  resting: BubblePlacement
): { bubble: TargetRect; perch: TargetRect } {
  return {
    bubble: {
      x: resting.left,
      y: frame.height - (resting.bottom ?? 0) - bubble.height,
      width: bubble.maxWidth,
      height: bubble.height,
    },
    perch: { x: 0, y: frame.height - perch.height, width: perch.width, height: perch.height },
  };
}

/**
 * How far a scrolling page has to move for a highlight to sit clear of the
 * bubble resting by the owl, so the bubble can stay where it belongs rather
 * than being lifted off the perch to make room.
 *
 * Positive is a scroll down by that many points. Zero means the highlight is
 * already clear -- including when it is above the resting area rather than
 * behind it, which scrolling would only make worse.
 */
export function guideRevealShift(
  frame: GuideFrame,
  insets: GuideInsets,
  perch: PerchSize,
  bubble: BubbleSize,
  landscape: boolean,
  target: TargetRect
): number {
  const resting = restingPlacement(frame, insets, perch, bubble, landscape);
  const rects = restingRects(frame, perch, bubble, resting);
  const clearOf = Math.min(rects.bubble.y, rects.perch.y) - BUBBLE_GAP;
  if (target.y + target.height <= clearOf) return 0;

  // a highlight past the bottom of the screen is behind nothing, but it is
  // no more visible for that: it needs the same lift as one under the bubble
  const belowTheScreen = target.y >= frame.height;
  const inTheWay = overlaps(target, rects.bubble) || overlaps(target, rects.perch);
  if (!belowTheScreen && !inTheWay) return 0;

  return Math.max(0, Math.round(target.y + target.height - clearOf));
}

export function placeGuideBubble(
  frame: GuideFrame,
  insets: GuideInsets,
  perch: PerchSize,
  bubble: BubbleSize,
  landscape: boolean,
  target?: TargetRect | null
): BubblePlacement {
  const resting = restingPlacement(frame, insets, perch, bubble, landscape);
  if (!target) return resting;

  const rects = restingRects(frame, perch, bubble, resting);
  if (!overlaps(target, rects.bubble) && !overlaps(target, rects.perch)) return resting;

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
