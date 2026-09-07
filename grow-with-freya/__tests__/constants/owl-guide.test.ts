import {
  BUBBLE_GAP,
  BUBBLE_MARGIN,
  BUBBLE_PERCH_LIFT,
  BUBBLE_SIDE_GAP,
  GUIDE_IDS,
  GUIDE_STEPS,
  GUIDE_OWL_WIDTH,
  GUIDE_BUBBLE_MAX,
  SPOTLIGHT_PADDING,
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

  it('points at all three reading modes on the book mode tour', () => {
    expect(GUIDE_STEPS.book_mode_tour.map((step) => step.target)).toEqual([
      'read_button',
      'record_button',
      'narrate_button',
    ]);
  });

  it('gives every highlighted step a shape', () => {
    GUIDE_IDS.forEach((id) => {
      GUIDE_STEPS[id]
        .filter((step) => step.target)
        .forEach((step) => expect(['circle', 'rounded-rect']).toContain(step.shape));
    });
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

describe('placeGuideBubble', () => {
  const insets = { top: 44, bottom: 34, left: 0, right: 0 };
  const perch = { width: 236, height: 181 };
  const bubble = { maxWidth: 340, height: 160 };
  const place = (target?: { x: number; y: number; width: number; height: number }, landscape = false, frame = PHONE) =>
    placeGuideBubble(frame, insets, perch, bubble, landscape, target);

  it('rests above the owl with its tail down when there is nothing to point at', () => {
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
    const placement = place(undefined, true, PHONE_LANDSCAPE);

    expect(placement.mode).toBe('perch');
    expect(placement.left).toBe(perch.width + BUBBLE_SIDE_GAP);
    expect(placement.tail).toBe('left');
  });

  it('stays on the perch and points up at a highlight well above it', () => {
    const placement = place({ x: 300, y: 60, width: 80, height: 40 });

    expect(placement.mode).toBe('perch');
    expect(placement.tail).toBe('down');
    expect(placement.pointer).toBe('up');
  });

  it('moves above a highlight that its resting place would cover', () => {
    const target = { x: 60, y: 640, width: 260, height: 44 };

    const placement = place(target);

    expect(placement.mode).toBe('above');
    expect(placement.bottom).toBe(PHONE.height - (target.y - BUBBLE_GAP));
    expect(placement.tail).toBeNull();
    expect(placement.pointer).toBe('down');
  });

  it('moves above a highlight that the owl itself would cover', () => {
    const placement = place({ x: 20, y: 800, width: 120, height: 40 });

    expect(placement.mode).toBe('above');
  });

  it('drops below a highlight near the top when there is no room above', () => {
    const target = { x: 20, y: 60, width: 200, height: 40 };
    const placement = placeGuideBubble(PHONE, insets, { width: 236, height: 700 }, bubble, false, target);

    expect(placement.mode).toBe('below');
    expect(placement.top).toBe(target.y + target.height + BUBBLE_GAP);
    expect(placement.pointer).toBe('up');
  });

  it('centres a callout on its highlight but keeps it on screen', () => {
    const centred = place({ x: 100, y: 640, width: 200, height: 40 });
    const clamped = place({ x: 330, y: 640, width: 60, height: 40 });

    expect(centred.mode).toBe('above');
    expect(centred.left).toBe(100 + 100 - bubble.maxWidth / 2);
    expect(clamped.mode).toBe('above');
    expect(clamped.left).toBe(PHONE.width - BUBBLE_MARGIN - bubble.maxWidth);
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
