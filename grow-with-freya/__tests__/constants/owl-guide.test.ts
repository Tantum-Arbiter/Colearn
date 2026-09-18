import {
  BUBBLE_MARGIN,
  BUBBLE_PERCH_LIFT,
  BUBBLE_SIDE_GAP,
  GUIDE_IDS,
  GUIDE_STEPS,
  GUIDE_OWL_WIDTH,
  GUIDE_BUBBLE_MAX,
  SPOTLIGHT_PADDING,
  guideRevealShift,
  guideSteps,
  placeGuideBubble,
  planGuideLayout,
  spotlightFrame,
  type GuideId,
} from '@/constants/owl-guide';
import en from '@/locales/en';

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
    return undefined;
  }, en);
}

const PHONE = { width: 402, height: 874 };
const PHONE_LANDSCAPE = { width: 874, height: 402 };
const TABLET = { width: 834, height: 1194 };
const TABLET_LANDSCAPE = { width: 1194, height: 834 };

describe('GUIDE_STEPS', () => {
  it('covers every guide id', () => {
    expect(Object.keys(GUIDE_STEPS).sort()).toEqual([...GUIDE_IDS].sort());
  });

  it.each(GUIDE_IDS)('%s has at least one step with unique ids', (id) => {
    const steps = GUIDE_STEPS[id];
    const ids = steps.map((step) => step.id);

    expect(steps.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(GUIDE_IDS)('%s speaks only copy that exists in the English locale', (id) => {
    GUIDE_STEPS[id].forEach((step) => {
      expect(typeof lookup(step.titleKey)).toBe('string');
      expect(typeof lookup(step.descriptionKey)).toBe('string');
    });
  });

  it('points at the menu buttons on the main menu tour', () => {
    const targets = GUIDE_STEPS.main_menu_tour.map((step) => step.target);

    expect(targets).toContain('stories_button');
    expect(targets).toContain('settings_button');
    expect(targets).toContain('sound_control');
  });

  /** The home tour was skipping the achievement card and never mentioned the ring. */
  it('walks the home in reading order: stories, achievement, learning, ring, grown-ups, sound', () => {
    const ids = GUIDE_STEPS.main_menu_tour.map((step) => step.id);

    expect(ids.indexOf('achievement_card')).toBe(ids.indexOf('stories_button') + 1);
    expect(ids.indexOf('learning_button')).toBe(ids.indexOf('achievement_card') + 1);
    expect(ids.indexOf('screen_time_ring')).toBeGreaterThan(ids.indexOf('learning_button'));
    expect(ids.indexOf('settings_button')).toBe(ids.indexOf('screen_time_ring') + 1);
  });

  it('shows the ring step with a picture of the ring in both its states', () => {
    const step = GUIDE_STEPS.main_menu_tour.find((entry) => entry.id === 'screen_time_ring');

    expect(step?.target).toBe('screen_time_ring');
    expect(step?.shape).toBe('circle');
    expect(step?.illustration).toBe('screenTimeRing');
  });

  it('has a tour for each journey page, each opening with a step that points at nothing', () => {
    for (const id of ['catalogue_tour', 'progress_tour', 'search_tour', 'profile_tour'] as const) {
      expect(GUIDE_STEPS[id].length).toBeGreaterThanOrEqual(3);
      expect(GUIDE_STEPS[id][0].target).toBeUndefined();
    }
  });

  it('takes the stories tour along the shelf and then down the bar', () => {
    expect(GUIDE_STEPS.catalogue_tour.map((step) => step.target)).toEqual([
      undefined,
      'theme_tiles',
      'filter_toggle',
      'featured_story',
      'story_shelves',
      'nav_progress',
      'nav_screensafe',
      'nav_search',
      'nav_profile',
    ]);
  });

  /** Down the sheet in the order the child reads it: read, then play along, then record. */
  it('points at the three reading modes in the order the sheet lists them', () => {
    expect(GUIDE_STEPS.book_mode_tour.map((step) => step.target)).toEqual([
      'read_button',
      'narrate_button',
      'record_button',
    ]);
  });

  /** The grown-ups control is a pill, so its spotlight is the same pill, not a circle around it. */
  it('spotlights the grown-ups pill as a pill', () => {
    const step = GUIDE_STEPS.main_menu_tour.find((entry) => entry.target === 'settings_button');

    expect(step?.shape).toBe('rounded-rect');
    expect(step?.radius).toBe(19);
  });

  /** The face and the name are a round subject: a circle round the two of them, not a band across the page. */
  it('rings the profile face and name with a circle', () => {
    const step = GUIDE_STEPS.profile_tour.find((entry) => entry.target === 'profile_hero');

    expect(step?.shape).toBe('circle');
  });

  it('gives every highlighted step a shape', () => {
    GUIDE_IDS.forEach((id) => {
      GUIDE_STEPS[id]
        .filter((step) => step.target)
        .forEach((step) => expect(['circle', 'rounded-rect']).toContain(step.shape));
    });
  });
});

/**
 * The tour scrolled the page to lift the child nav bar clear of the bubble.
 * The bar is pinned below the scroll view, so the page walked off whatever the
 * owl was talking about and came back a step later, over and over.
 */
describe('pinned steps', () => {
  const pinnedOf = (id: GuideId) =>
    GUIDE_STEPS[id].filter((step) => step.pinned).map((step) => step.target);

  it('pins the child nav bar on the catalogue tour', () => {
    expect(pinnedOf('catalogue_tour')).toEqual([
      'nav_progress',
      'nav_screensafe',
      'nav_search',
      'nav_profile',
    ]);
  });

  it('pins the home page controls that sit outside its scroll view', () => {
    expect(pinnedOf('main_menu_tour')).toEqual([
      'screen_time_ring',
      'settings_button',
      'sound_control',
    ]);
  });

  it('pins the gear on the profile page, which sits above its column', () => {
    expect(pinnedOf('profile_tour')).toEqual(['profile_settings']);
  });

  /** The card sheet has no scroll view but it does rise for the owl, so its
   *  buttons are movable rather than pinned. */
  it('leaves the mode sheet free to lift', () => {
    const steps = GUIDE_STEPS.book_mode_tour;

    expect(steps.some((step) => step.pinned)).toBe(false);
  });

  it('leaves the cards inside a scrolling column free to be scrolled to', () => {
    const scrollable = GUIDE_STEPS.catalogue_tour
      .filter((step) => step.target && !step.pinned)
      .map((step) => step.target);

    expect(scrollable).toEqual(['theme_tiles', 'filter_toggle', 'featured_story', 'story_shelves']);
  });
});

describe('guideSteps', () => {
  it('keeps every step when all its targets are on screen', () => {
    const targets = GUIDE_STEPS.main_menu_tour.map((step) => step.target).filter(Boolean) as string[];

    expect(guideSteps('main_menu_tour', targets)).toHaveLength(GUIDE_STEPS.main_menu_tour.length);
  });

  it('drops a step whose target is not on this screen, keeping the rest', () => {
    const withoutInstruments = guideSteps('main_menu_tour', [
      'stories_button',
      'learning_button',
      'settings_button',
      'sound_control',
    ]);

    expect(withoutInstruments.map((step) => step.id)).toEqual([
      'welcome',
      'stories_button',
      'learning_button',
      'settings_button',
      'sound_control',
    ]);
  });

  it('never drops a step that has no target', () => {
    expect(guideSteps('story_reader_tips')).toHaveLength(GUIDE_STEPS.story_reader_tips.length);
  });

  it('returns a fresh array each time', () => {
    expect(guideSteps('spelling_tips')).not.toBe(GUIDE_STEPS.spelling_tips);
  });
});

describe('planGuideLayout', () => {
  it('sizes a phone in portrait', () => {
    expect(planGuideLayout(PHONE)).toEqual({
      landscape: false,
      tablet: false,
      owlWidth: GUIDE_OWL_WIDTH.phone,
      bubbleMaxWidth: Math.min(PHONE.width - 24, GUIDE_BUBBLE_MAX.phone),
    });
  });

  it('shrinks the owl and halves the bubble in phone landscape', () => {
    const layout = planGuideLayout(PHONE_LANDSCAPE);

    expect(layout.landscape).toBe(true);
    expect(layout.owlWidth).toBe(GUIDE_OWL_WIDTH.phoneLandscape);
    expect(layout.bubbleMaxWidth).toBeLessThanOrEqual(PHONE_LANDSCAPE.width / 2);
  });

  it('scales the owl up on a tablet', () => {
    expect(planGuideLayout(TABLET)).toMatchObject({ tablet: true, owlWidth: GUIDE_OWL_WIDTH.tablet, bubbleMaxWidth: GUIDE_BUBBLE_MAX.tablet });
    expect(planGuideLayout(TABLET_LANDSCAPE).owlWidth).toBe(GUIDE_OWL_WIDTH.tabletLandscape);
  });
});

/**
 * A page that can scroll does not need the bubble moved off the owl: the page
 * moves instead, until the highlight sits clear of where the bubble rests.
 */
describe('guideRevealShift', () => {
  const insets = { top: 44, bottom: 34, left: 0, right: 0 };
  const perch = { width: 236, height: 181 };
  const bubble = { maxWidth: 340, height: 160 };
  const shiftFor = (target: { x: number; y: number; width: number; height: number }, landscape = false) =>
    guideRevealShift(PHONE, insets, perch, bubble, landscape, target);

  it('asks for nothing when the highlight is already clear of the bubble', () => {
    expect(shiftFor({ x: 40, y: 120, width: 200, height: 44 })).toBe(0);
  });

  it('asks for enough scroll to lift a buried highlight clear of the bubble', () => {
    const target = { x: 40, y: 700, width: 200, height: 44 };

    const shift = shiftFor(target);

    expect(shift).toBeGreaterThan(0);
    // once the page has moved by that much, nothing is left to ask for
    expect(shiftFor({ ...target, y: target.y - shift })).toBe(0);
  });

  /**
   * On a phone the badge grid starts below the bottom of the screen. Nothing
   * on screen is behind the bubble, so it used to count as clear and the page
   * stayed put with the owl talking about something no one could see.
   */
  it('asks for enough scroll to bring a highlight below the screen up into the clear', () => {
    const target = { x: 40, y: PHONE.height + 200, width: 200, height: 44 };

    const shift = shiftFor(target);

    expect(shift).toBeGreaterThan(200);
    expect(shiftFor({ ...target, y: target.y - shift })).toBe(0);
  });

  it('still leaves alone a highlight beside the bubble that is fully on screen', () => {
    // bottom-right edge, past the end of the resting bubble and the perch
    expect(shiftFor({ x: PHONE.width - 30, y: PHONE.height - 60, width: 28, height: 20 })).toBe(0);
  });

  /**
   * The page is no longer carried home between steps, so a subject the tour
   * has already scrolled past has to be reached by scrolling back up to it.
   */
  it('carries the page back up for a highlight clipped by the top of the screen', () => {
    const shift = shiftFor({ x: 40, y: -80, width: 200, height: 44 });

    expect(shift).toBeLessThan(0);
    expect(shiftFor({ x: 40, y: -80 - shift, width: 200, height: 44 })).toBe(0);
  });

  it('leaves alone a highlight that is fully in the clear band', () => {
    expect(shiftFor({ x: 40, y: 200, width: 200, height: 44 })).toBe(0);
  });

  it('asks for more of a page the deeper the highlight is buried', () => {
    const higher = shiftFor({ x: 40, y: 640, width: 200, height: 44 });
    const lower = shiftFor({ x: 40, y: 760, width: 200, height: 44 });

    expect(lower).toBeGreaterThan(higher);
  });
});

/**
 * The bubble belongs to the owl. It used to fly to whatever was being pointed
 * at, which left a box floating mid-screen with no owl attached to it; between
 * steps only the spotlight and the words change now.
 */
describe('placeGuideBubble', () => {
  const insets = { top: 44, bottom: 34, left: 0, right: 0 };
  const perch = { width: 236, height: 181 };
  const bubble = { maxWidth: 340, height: 160 };
  const place = (landscape = false, frame = PHONE) =>
    placeGuideBubble(frame, insets, perch, bubble, landscape);

  it('rests above the owl with its tail down', () => {
    expect(place()).toEqual({
      mode: 'perch',
      left: BUBBLE_MARGIN,
      bottom: perch.height - BUBBLE_PERCH_LIFT,
      width: bubble.maxWidth,
      tail: 'down',
      pointer: null,
    });
  });

  it('rests beside the owl in landscape', () => {
    const placement = place(true, PHONE_LANDSCAPE);

    expect(placement.mode).toBe('perch');
    expect(placement.left).toBe(perch.width + BUBBLE_SIDE_GAP);
    expect(placement.tail).toBe('left');
  });

  it('allows for the left inset so a notch does not push it off screen', () => {
    const placement = placeGuideBubble(PHONE, { ...insets, left: 20 }, perch, bubble, false);

    expect(placement.left).toBe(BUBBLE_MARGIN + 20);
  });
});

describe('spotlightFrame', () => {
  const target = { x: 100, y: 200, width: 60, height: 40 };

  it('pads a rounded rectangle evenly around the target', () => {
    expect(spotlightFrame(target, 'rounded-rect', 12)).toEqual({
      x: 100 - SPOTLIGHT_PADDING,
      y: 200 - SPOTLIGHT_PADDING,
      width: 60 + SPOTLIGHT_PADDING * 2,
      height: 40 + SPOTLIGHT_PADDING * 2,
      radius: 12,
    });
  });

  it('circles the longer side of the target, centred on it', () => {
    const frame = spotlightFrame(target, 'circle');

    expect(frame.width).toBe(frame.height);
    expect(frame.width).toBe(60 + SPOTLIGHT_PADDING * 2);
    expect(frame.x + frame.width / 2).toBe(130);
    expect(frame.y + frame.height / 2).toBe(220);
    expect(frame.radius).toBe(frame.width / 2);
  });

  it('circles by default', () => {
    expect(spotlightFrame(target).radius).toBe(spotlightFrame(target, 'circle').radius);
  });
});

describe('GUIDE_IDS', () => {
  it('no longer carries the unused gesture hints', () => {
    expect((GUIDE_IDS as readonly string[]).includes('gesture_hints')).toBe(false);
  });

  it('is a closed list', () => {
    const id: GuideId = 'main_menu_tour';

    expect(GUIDE_IDS).toContain(id);
  });
});
