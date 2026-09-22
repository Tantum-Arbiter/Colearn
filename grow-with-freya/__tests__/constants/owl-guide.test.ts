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
import { MENU_CORNER_BUTTON } from '@/components/ui/music-control';
import { CIRCLE_BUTTON_DIAMETER_PHONE } from '@/components/child-ui/tokens';
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

  /**
   * The home page is where the bar is first seen, so its tour is where the bar
   * is explained: the two cards, then the bar left to right, and only then the
   * grown-ups corner and the sound.
   */
  it('walks the home: the cards, then the bar left to right, then the sound', () => {
    const onHome = guideSteps('main_menu_tour', [
      'stories_button',
      'achievement_card',
      'nav_learn',
      'nav_progress',
      'screen_time_ring',
      'nav_search',
      'nav_profile',
      'language_control',
      'sound_control',
    ]);

    expect(onHome.map((step) => step.target)).toEqual([
      undefined,
      'stories_button',
      'achievement_card',
      'nav_learn',
      'nav_progress',
      'screen_time_ring',
      'nav_search',
      'nav_profile',
      'language_control',
      'sound_control',
    ]);
  });

  it('names the Learn button with the word the bar itself shows', () => {
    const step = GUIDE_STEPS.main_menu_tour.find((entry) => entry.target === 'nav_learn');

    expect(step?.titleKey).toBe('tutorial.mainMenu.navLearn.title');
    expect(lookup(step!.titleKey)).toBe(lookup('childUi.nav.home'));
  });

  it('no longer has a Learning step on the main menu', () => {
    expect(GUIDE_STEPS.main_menu_tour.map((step) => step.id)).not.toContain('learning_button');
  });

  it('explains the bar in the same words the library tour used', () => {
    const copy = (target: string) => GUIDE_STEPS.main_menu_tour.find((step) => step.target === target)?.titleKey;

    expect(copy('nav_progress')).toBe('tutorial.catalogue.navProgress.title');
    expect(copy('nav_search')).toBe('tutorial.catalogue.navSearch.title');
    expect(copy('nav_profile')).toBe('tutorial.catalogue.navProfile.title');
  });

  it('shows the ring step with a picture of the ring in both its states', () => {
    const step = GUIDE_STEPS.main_menu_tour.find((entry) => entry.id === 'screen_time_ring');

    expect(step?.target).toBe('screen_time_ring');
    expect(step?.shape).toBe('circle');
    expect(step?.illustration).toBe('screenTimeRing');
  });

  it('shows the profile step with a picture of the slot in both its states, face and sign-in', () => {
    const step = GUIDE_STEPS.main_menu_tour.find((entry) => entry.id === 'nav_profile');

    expect(step?.target).toBe('nav_profile');
    expect(step?.shape).toBe('circle');
    expect(step?.illustration).toBe('profileSlot');
  });

  it('has a tour for each journey page, each opening with a step that points at nothing', () => {
    for (const id of ['catalogue_tour', 'progress_tour', 'search_tour', 'profile_tour'] as const) {
      expect(GUIDE_STEPS[id].length).toBeGreaterThanOrEqual(3);
      expect(GUIDE_STEPS[id][0].target).toBeUndefined();
    }
  });

  it('takes the stories tour along the shelf only, now the bar is explained on the home page', () => {
    expect(GUIDE_STEPS.catalogue_tour.map((step) => step.target)).toEqual([
      undefined,
      'theme_tiles',
      'filter_toggle',
      'featured_story',
      'story_shelves',
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

  /** The grown-ups control is a pill as tall as the speaker, so its spotlight is that pill, not a circle. */
  it('spotlights the grown-ups pill as a pill round at both ends', () => {
    const step = GUIDE_STEPS.main_menu_tour.find((entry) => entry.target === 'settings_button');

    expect(step?.shape).toBe('rounded-rect');
    expect(step?.radius).toBe(MENU_CORNER_BUTTON.diameter / 2);
  });

  /** The grown-ups control on the Profile page is a pill with its word, so it is lit as that pill. */
  it('spotlights the Profile page\'s grown-ups control as a pill', () => {
    const step = GUIDE_STEPS.profile_tour.find((entry) => entry.target === 'profile_settings');

    expect(step?.shape).toBe('rounded-rect');
    expect(step?.radius).toBe(CIRCLE_BUTTON_DIAMETER_PHONE / 2);
  });

  /** The language went to the home corner; the step pointing at the gate no longer promises it behind there. */
  it('names what is actually behind the grown-ups gate, not the language that moved home', () => {
    const copy = lookup('tutorial.profile.settings.description') as string;

    expect(copy).not.toMatch(/language/i);
    expect(copy).toMatch(/text size/i);
    expect(copy).toMatch(/screen time/i);
  });

  /**
   * The tour walked past the two controls a parent most needs: the way back
   * home, and the sign-in that keeps the badges. Both are on the page, so both
   * are on the tour.
   */
  it('covers the profile page down to its header, sign-in included', () => {
    expect(GUIDE_STEPS.profile_tour.map((step) => step.target)).toEqual([
      undefined,
      'profile_hero',
      'profile_login',
      'profile_tabs',
      'profile_home',
      'profile_settings',
    ]);
  });

  it('spends the sign-in step on what signing in is worth', () => {
    const step = GUIDE_STEPS.profile_tour.find((entry) => entry.id === 'profile_login');
    const copy = lookup(step!.descriptionKey) as string;

    // It restates the benefit rather than naming the button again.
    expect(copy.length).toBeGreaterThan(40);
    expect(copy.toLowerCase()).toMatch(/badge|streak|device/);
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
describe('the Grown-ups walkthrough', () => {
  it('tours only what the page still holds, with no step for the profile editor it no longer has', () => {
    expect(GUIDE_STEPS.settings_walkthrough.map((step) => step.id)).toEqual([
      'settings_intro',
      'settings_text_size',
      'settings_screen_time',
      'settings_reminders',
      'settings_crash_reports',
    ]);
    expect(lookup('tutorial.settings.avatar')).toBeUndefined();
  });

  /** Signing in moved to the profile page, which has its own step for it. */
  it('leaves signing in to the profile tour, which is where the button went', () => {
    expect(GUIDE_STEPS.settings_walkthrough.map((step) => step.id)).not.toContain('login');
    expect(lookup('tutorial.settings.login')).toBeUndefined();
    expect(GUIDE_STEPS.profile_tour.map((step) => step.id)).toContain('profile_login');
  });

  /** Each control is lit on the page, top to bottom, rather than described in a card with nothing to point at. */
  it('points at every control it names, in the order the page lists them', () => {
    const [intro, ...controls] = GUIDE_STEPS.settings_walkthrough;

    expect(intro.target).toBeUndefined();
    expect(controls.map((step) => step.target)).toEqual([
      'settings_text_size',
      'settings_screen_time',
      'settings_reminders',
      'settings_crash_reports',
    ]);
    for (const step of controls) expect(step.shape).toBe('rounded-rect');
  });

  it('says nothing about the developer options, which no family will ever see', () => {
    for (const step of GUIDE_STEPS.settings_walkthrough) {
      const copy = `${lookup(step.titleKey)} ${lookup(step.descriptionKey)}`;
      expect(copy).not.toMatch(/developer|dev option|debug/i);
    }
  });

  /** The screen-time step once read as the page's whole purpose; now it says what the switch does. */
  it('describes the switches as switches a grown-up can turn off', () => {
    expect(lookup('tutorial.settings.screenTime.description')).toMatch(/\b(on|off)\b/i);
    expect(lookup('tutorial.settings.crashReports.description')).toMatch(/\boff\b/i);
  });

  /** The flag lives in the home corner now, and so does the step that names it. */
  it('leaves the language to the main menu, which is where the flag went', () => {
    expect(GUIDE_STEPS.settings_walkthrough.map((step) => step.id)).not.toContain('language');
    expect(lookup('tutorial.settings.language')).toBeUndefined();

    const step = GUIDE_STEPS.main_menu_tour.find((entry) => entry.id === 'language_control');

    expect(step?.target).toBe('language_control');
    expect(step?.shape).toBe('circle');
    expect(step?.pinned).toBe(true);
    expect(typeof lookup('tutorial.mainMenu.language.title')).toBe('string');
  });
});

describe('pinned steps', () => {
  const pinnedOf = (id: GuideId) =>
    GUIDE_STEPS[id].filter((step) => step.pinned).map((step) => step.target);

  it('pins nothing on the catalogue tour, which stays on the shelf', () => {
    expect(pinnedOf('catalogue_tour')).toEqual([]);
  });

  it('pins the home page controls that sit outside its scroll view, the bar among them', () => {
    expect(pinnedOf('main_menu_tour')).toEqual([
      'nav_learn',
      'nav_progress',
      'screen_time_ring',
      'nav_search',
      'nav_profile',
      'settings_button',
      'language_control',
      'sound_control',
    ]);
  });

  it('pins the profile header, both controls sitting above its column', () => {
    expect(pinnedOf('profile_tour')).toEqual(['profile_home', 'profile_settings']);
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
      'achievement_card',
      'settings_button',
      'sound_control',
    ]);

    expect(withoutInstruments.map((step) => step.id)).toEqual([
      'welcome',
      'stories_button',
      'achievement_card',
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

/**
 * The owl stands at the left end of the bar. On a bar step it steps back for
 * the whole step, not only when the spotlit button happens to be under it, so
 * the child sees the entire bar the owl is talking about.
 */
describe('steps that reveal the bar', () => {
  const BAR_TARGETS = ['nav_learn', 'nav_progress', 'screen_time_ring', 'nav_search', 'nav_profile'];

  it('marks every step on the bar, and no other', () => {
    GUIDE_IDS.forEach((id) => {
      GUIDE_STEPS[id].forEach((step) => {
        expect(Boolean(step.revealsBar)).toBe(id === 'main_menu_tour' && BAR_TARGETS.includes(step.target ?? ''));
      });
    });
  });
});

