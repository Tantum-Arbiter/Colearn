import { CIRCLE_BUTTON_DIAMETER_PHONE } from '@/components/child-ui/tokens';

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

export const GUIDE_STORAGE_KEY = '@tutorial_state';

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
  /**
   * The subject is furniture the page cannot move -- a fixed bar, a corner
   * control, a button on a sheet that does not scroll. Scrolling to reveal it
   * only walks the page away from what the owl is talking about, so a pinned
   * step is spotlit where it stands.
   */
  pinned?: boolean;
  /**
   * The subject is on the bottom bar, whose left end is where the owl stands.
   * The owl steps back for the whole step so the child sees all of the bar,
   * not only when the lit button happens to be under it.
   */
  revealsBar?: boolean;
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
    { id: 'instruments_button', ...keyed('mainMenu', 'instruments_button', 'instruments'), target: 'instruments_button', shape: 'rounded-rect', radius: 24 },
    // the bar, left to right, before the corner controls
    { id: 'nav_learn', ...keyed('mainMenu', 'nav_learn', 'navLearn'), target: 'nav_learn', shape: 'circle', pinned: true, revealsBar: true },
    { id: 'nav_progress', ...keyed('catalogue', 'nav_progress', 'navProgress'), target: 'nav_progress', shape: 'circle', pinned: true, revealsBar: true },
    { id: 'screen_time_ring', ...keyed('mainMenu', 'screen_time_ring', 'screenTime'), target: 'screen_time_ring', shape: 'circle', illustration: 'screenTimeRing', pinned: true, revealsBar: true },
    { id: 'nav_search', ...keyed('catalogue', 'nav_search', 'navSearch'), target: 'nav_search', shape: 'circle', pinned: true, revealsBar: true },
    { id: 'nav_profile', ...keyed('catalogue', 'nav_profile', 'navProfile'), target: 'nav_profile', shape: 'circle', pinned: true, revealsBar: true },
    { id: 'settings_button', ...keyed('mainMenu', 'settings_button', 'settings'), target: 'settings_button', shape: 'rounded-rect', radius: 24, pinned: true },
    { id: 'sound_control', ...keyed('mainMenu', 'sound_control', 'sound'), target: 'sound_control', shape: 'circle', pinned: true },
  ],
  catalogue_tour: [
    { id: 'catalogue_welcome', ...keyed('catalogue', 'catalogue_welcome', 'welcome') },
    { id: 'theme_tiles', ...keyed('catalogue', 'theme_tiles', 'themes'), target: 'theme_tiles', shape: 'rounded-rect', radius: 22 },
    { id: 'filter_toggle', ...keyed('catalogue', 'filter_toggle', 'filter'), target: 'filter_toggle', shape: 'rounded-rect', radius: 22 },
    { id: 'featured_story', ...keyed('catalogue', 'featured_story', 'featured'), target: 'featured_story', shape: 'rounded-rect', radius: 22 },
    { id: 'story_shelves', ...keyed('catalogue', 'story_shelves', 'shelves'), target: 'story_shelves', shape: 'rounded-rect', radius: 22 },
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
    { id: 'profile_settings', ...keyed('profile', 'profile_settings', 'settings'), target: 'profile_settings', shape: 'rounded-rect', radius: CIRCLE_BUTTON_DIAMETER_PHONE / 2, pinned: true },
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
  // the spotlight lands first and is left alone for a beat, so the eye is
  // already on the new subject by the time the words arrive
  highlightLeadMs: 260,
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

/**
 * The bubble belongs to the owl and never leaves it. Between steps the only
 * things that change are the spotlight and the words -- a bubble that flew to
 * whatever was being pointed at read as a second, unattached voice.
 */
export type BubbleMode = 'perch';

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

/** Whether two rectangles touch, allowing a little breathing room between. */
export function rectsOverlap(a: TargetRect, b: TargetRect, margin = 8): boolean {
  return (
    a.x < b.x + b.width + margin &&
    a.x + a.width + margin > b.x &&
    a.y < b.y + b.height + margin &&
    a.y + a.height + margin > b.y
  );
}

/** Where the bubble sits: over the owl on a phone, beside it in landscape. */
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
 * How far a scrolling page has to move for a highlight to sit in the clear
 * band: below the top of the screen, above the bubble resting by the owl.
 *
 * Positive scrolls the page down, negative up, zero leaves it alone. The
 * move is from wherever the page is now, not from a resting place it has to
 * be carried home to first -- that round trip was a visible bounce between
 * every pair of steps, and the ring was still drawn over the page while it
 * made it.
 *
 * A subject taller than the band keeps its head: scrolling far enough to
 * clear the bubble would take its top off the screen instead.
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
  const bandTop = insets.top + BUBBLE_MARGIN;
  const bandBottom = Math.min(rects.bubble.y, rects.perch.y) - BUBBLE_GAP;

  // low enough to be behind the bubble or the owl, or off the bottom
  // altogether -- something merely low but beside them is already visible and
  // moving the page for it would only take something else away
  const buried = target.y + target.height - bandBottom;
  const hidden =
    target.y >= frame.height || rectsOverlap(target, rects.bubble) || rectsOverlap(target, rects.perch);
  if (buried > 0 && hidden) {
    // never so far that the head of the subject goes off the top instead
    return Math.round(Math.min(buried, Math.max(0, target.y - bandTop)));
  }

  // clipped by the top of the screen: brought down until its head shows
  if (target.y < insets.top) return Math.round(target.y - bandTop);

  return 0;
}

export function placeGuideBubble(
  frame: GuideFrame,
  insets: GuideInsets,
  perch: PerchSize,
  bubble: BubbleSize,
  landscape: boolean
): BubblePlacement {
  return restingPlacement(frame, insets, perch, bubble, landscape);
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
