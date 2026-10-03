import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { ReactTestInstance } from 'react-test-renderer';
import { PlanTrail, TRAIL_LIT, TRAIL_PALE } from '@/components/island/plan-trail';
import { CHECKPOINT_DIAMETER_PHONE, CHECKPOINT_DIAMETER_TABLET, CHECKPOINT_TINTS, PlanCheckpoint, checkpointReachBelow } from '@/components/island/plan-checkpoint';
import { PLAN_CARD, PLAN_CARD_STARS, PLAN_CARD_TINTS, PlanPanel, SKILL_ICON, planCardTop } from '@/components/island/plan-panel';
import { contentMargin } from '@/components/child-ui/tokens';
import { ISLAND_TRAIL, TRAIL_DASH, trailDashes } from '@/constants/island-trail';
import { artPoint, islandLayout } from '@/constants/island-scene';
import { ISLAND_WEEK } from '@/data/learning-plan';
import type { PlanStepView } from '@/hooks/use-learning-plan';

const LAYOUT = islandLayout({ width: 390, height: 844, topInset: 47 });

let mockTablet = false;
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({
    scaledFontSize: (size: number) => size,
    scaledPadding: (size: number) => size,
    scaledButtonSize: (size: number) => size,
    isTablet: mockTablet,
    textSizeScale: 1,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values && Object.keys(values).length > 0 ? `${key}|${Object.values(values).join(',')}` : key,
  }),
}));

function view(index: number, state: PlanStepView['state'], extra: Partial<PlanStepView> = {}): PlanStepView {
  const step = ISLAND_WEEK.steps[index];
  return {
    step,
    state,
    point: ISLAND_TRAIL[index],
    title: `Title ${step.day}`,
    picture: step.kind === 'story' ? { uri: `test://cover-${step.day}` } : null,
    launch: step.kind === 'story' ? { kind: 'story', storyId: step.storyId ?? '' } : { kind: 'spelling', activityId: 'wombat-spelling' },
    ...extra,
  };
}

function all(testID: string, root: ReactTestInstance): ReactTestInstance[] {
  return root.findAll((node) => node.props.testID === testID && node.parent?.props.testID !== testID);
}

function one(testID: string, root: ReactTestInstance): ReactTestInstance {
  const found = all(testID, root);
  if (found.length === 0) throw new Error(`nothing called ${testID}`);
  return found[0];
}

function texts(root: ReactTestInstance): string[] {
  return root
    .findAll((node) => node.type === Text || (typeof node.type === 'string' && node.type.toLowerCase().includes('text')))
    .flatMap((node) => (Array.isArray(node.props.children) ? node.props.children : [node.props.children]))
    .filter((child): child is string => typeof child === 'string');
}

beforeEach(() => {
  mockTablet = false;
  (useAnimatedStyle as jest.Mock).mockImplementation((build: () => object) => build());
});

afterEach(() => {
  (useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
});

describe('PlanTrail', () => {
  const dashes = trailDashes(ISLAND_TRAIL, TRAIL_DASH);

  it('draws every dash of the trail over the painting, in the painting`s own coordinates', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={0} />);

    const svg = one('plan-trail', root);
    const drawn = root.findAll((node) => typeof node.props.testID === 'string' && node.props.testID.startsWith('plan-dash-'));

    expect(StyleSheet.flatten(svg.props.style)).toEqual(expect.objectContaining({ position: 'absolute', ...LAYOUT.picture }));
    expect(svg.props.pointerEvents).toBe('none');
    expect(svg.props.viewBox).toBe('0 0 1122 1402');
    expect(drawn).toHaveLength(dashes.length);
  });

  it('lights the legs the child has walked, and leaves the rest pale', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={2} />);

    dashes.forEach((dash, index) => {
      expect(one(`plan-dash-${index}`, root).props.fill).toBe(dash.leg < 2 ? TRAIL_LIT : TRAIL_PALE);
    });
  });

  it('lights nothing before the first day, and everything once the week is walked', () => {
    const nothing = render(<PlanTrail layout={LAYOUT} litLegs={0} />).UNSAFE_root;
    const everything = render(<PlanTrail layout={LAYOUT} litLegs={6} />).UNSAFE_root;

    expect(nothing.findAll((node) => node.props.fill === TRAIL_LIT)).toHaveLength(0);
    expect(everything.findAll((node) => node.props.fill === TRAIL_PALE)).toHaveLength(0);
  });

  it('is kept from a screen reader', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={0} />);

    expect(one('plan-trail', root).props.accessibilityElementsHidden).toBe(true);
  });
});

describe('PlanCheckpoint', () => {
  const renderOne = (state: PlanStepView['state'], index = 1, props: Partial<React.ComponentProps<typeof PlanCheckpoint>> = {}) => {
    const onPress = jest.fn();
    const rendered = render(
      <PlanCheckpoint view={view(index, state)} layout={LAYOUT} screenWidth={390} onPress={onPress} {...props} />
    );
    return { root: rendered.UNSAFE_root, onPress, rendered };
  };

  it('stands on its point of the trail, centred, one touch target wide', () => {
    const { root } = renderOne('locked');

    const centre = artPoint(ISLAND_TRAIL[1].x, ISLAND_TRAIL[1].y, LAYOUT);
    const style = StyleSheet.flatten(one('plan-checkpoint-2', root).props.style);

    expect(style.left).toBeCloseTo(centre.x - CHECKPOINT_DIAMETER_PHONE / 2, 5);
    expect(style.top).toBeCloseTo(centre.y - CHECKPOINT_DIAMETER_PHONE / 2, 5);
    expect(style.width).toBe(CHECKPOINT_DIAMETER_PHONE);
    expect(CHECKPOINT_DIAMETER_PHONE).toBeGreaterThanOrEqual(44);
  });

  it('is bigger on a tablet', () => {
    mockTablet = true;
    const { root } = renderOne('locked');

    expect(StyleSheet.flatten(one('plan-checkpoint-2', root).props.style).width).toBe(CHECKPOINT_DIAMETER_TABLET);
    expect(CHECKPOINT_DIAMETER_TABLET).toBeGreaterThan(CHECKPOINT_DIAMETER_PHONE);
  });

  const flat = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style);

  it('shows its day number large and white in the disc, and the name of its place beneath', () => {
    const { root } = renderOne('locked');

    const number = one('plan-checkpoint-2-number', root);

    expect(texts(number)).toEqual(['2']);
    expect(flat(number).color).toBe(CHECKPOINT_TINTS.number);
    expect(flat(number).fontSize).toBeGreaterThanOrEqual(CHECKPOINT_DIAMETER_PHONE * 0.45);
    expect(number.props.allowFontScaling).toBe(false);
    expect(texts(one('plan-checkpoint-2-label', root))).toContain('plan.places.wordGarden');
  });

  it.each([
    ['locked', true, true, false],
    ['tomorrow', true, true, false],
    ['open', true, false, false],
    ['done', false, false, true],
  ] as const)('when %s shows its number: %p, a lock: %p, the tick in its place: %p', (state, number, lock, tick) => {
    const { root } = renderOne(state);

    expect(all('plan-checkpoint-2-number', root).length > 0).toBe(number);
    expect(all('plan-checkpoint-2-lock', root).length > 0).toBe(lock);
    expect(all('plan-checkpoint-2-done', root).length > 0).toBe(tick);
  });

  it('keeps the tick white, where the number was', () => {
    const { root } = renderOne('done');

    const tick = one('plan-checkpoint-2-done', root);

    expect(tick.props.name).toBe('checkmark');
    expect(tick.props.color).toBe(CHECKPOINT_TINTS.number);
  });

  it.each([
    ['open', CHECKPOINT_TINTS.warm],
    ['done', CHECKPOINT_TINTS.warm],
    ['locked', CHECKPOINT_TINTS.cool],
    ['tomorrow', CHECKPOINT_TINTS.cool],
  ] as const)('fills the disc of a %s day amber or periwinkle, inside a white ring', (state, face) => {
    const { root } = renderOne(state);

    const disc = one('plan-checkpoint-2-disc', root);
    const fill = disc.findAll((node) => Array.isArray(node.props.colors))[0];

    expect(fill.props.colors).toEqual([...face]);
    expect(flat(disc).borderColor).toBe(CHECKPOINT_TINTS.ring);
    expect(flat(disc).borderWidth).toBeGreaterThanOrEqual(CHECKPOINT_DIAMETER_PHONE * 0.06);
    expect(flat(disc).borderWidth).toBeLessThanOrEqual(CHECKPOINT_DIAMETER_PHONE * 0.09);
  });

  it('reaches below its centre as far as its lock badge does', () => {
    expect(checkpointReachBelow(CHECKPOINT_DIAMETER_PHONE)).toBeGreaterThan(CHECKPOINT_DIAMETER_PHONE / 2);
    expect(checkpointReachBelow(CHECKPOINT_DIAMETER_PHONE)).toBeLessThan(CHECKPOINT_DIAMETER_PHONE * 0.7);
  });

  it('wears its lock in a small navy badge at its lower right, ringed in white', () => {
    const { root } = renderOne('locked');

    const badge = flat(one('plan-checkpoint-2-lock', root));
    const glyph = one('plan-checkpoint-2-lock', root).findAll((node) => node.props.name === 'lock-closed')[0];

    expect(badge.backgroundColor).toBe(CHECKPOINT_TINTS.badge);
    expect(badge.borderColor).toBe(CHECKPOINT_TINTS.ring);
    expect(badge.width).toBeLessThan(CHECKPOINT_DIAMETER_PHONE * 0.6);
    expect(badge.left + badge.width / 2).toBeGreaterThan(CHECKPOINT_DIAMETER_PHONE);
    expect(badge.top + badge.height / 2).toBeGreaterThan(CHECKPOINT_DIAMETER_PHONE / 2);
    expect(glyph.props.color).toBe(CHECKPOINT_TINTS.number);
  });

  it('glows warm yellow round the open day, still strong half a disc beyond its ring, and nowhere else', () => {
    const open = renderOne('open').root;

    const glow = flat(one('plan-checkpoint-2-glow', open));
    const stops = open.findAll((node) => node.props.testID === 'svg-Stop');
    const reach = glow.width / 2;
    const opacityAt = (distance: number) => {
      const at = distance / reach;
      const points = stops.map((stop) => ({ offset: Number(stop.props.offset), opacity: Number(stop.props.stopOpacity) }));
      const after = points.findIndex((point) => point.offset >= at);
      const before = points[Math.max(0, after - 1)];
      const next = points[after];
      return before.opacity + ((next.opacity - before.opacity) * (at - before.offset)) / (next.offset - before.offset || 1);
    };

    expect(glow.width).toBeGreaterThanOrEqual(CHECKPOINT_DIAMETER_PHONE * 2.2);
    expect(glow.width).toBeLessThanOrEqual(CHECKPOINT_DIAMETER_PHONE * 2.8);
    expect(glow.left + glow.width / 2).toBeCloseTo(CHECKPOINT_DIAMETER_PHONE / 2, 5);
    expect(opacityAt(CHECKPOINT_DIAMETER_PHONE / 2)).toBeGreaterThanOrEqual(0.95);
    expect(opacityAt(CHECKPOINT_DIAMETER_PHONE * 0.75)).toBeGreaterThanOrEqual(0.6);
    expect(opacityAt(reach)).toBe(0);
    stops.forEach((stop) => expect(stop.props.stopColor).toBe(CHECKPOINT_TINTS.glow));
    (['locked', 'tomorrow', 'done'] as const).forEach((state) => {
      expect(all('plan-checkpoint-2-glow', renderOne(state).root)).toHaveLength(0);
    });
  });

  it.each([
    ['open', CHECKPOINT_TINTS.labelWarm],
    ['done', CHECKPOINT_TINTS.labelWarm],
    ['locked', CHECKPOINT_TINTS.labelCool],
    ['tomorrow', CHECKPOINT_TINTS.labelCool],
  ] as const)('sets the place name of a %s day on a cream or lavender label, in navy', (state, fill) => {
    const { root } = renderOne(state);

    const label = one('plan-checkpoint-2-label', root);
    const words = label.findAll((node) => node.props.children === 'plan.places.wordGarden' && node.props.style !== undefined)[0];

    expect(flat(label).backgroundColor).toBe(fill);
    expect(flat(words).color).toBe(CHECKPOINT_TINTS.ink);
  });

  it('can be pressed only while open, and says so to a screen reader', () => {
    const open = renderOne('open');
    const locked = renderOne('locked');

    act(() => { one('plan-checkpoint-2', open.root).props.onPress(); });
    act(() => { one('plan-checkpoint-2', locked.root).props.onPress?.(); });

    expect(open.onPress).toHaveBeenCalledWith(expect.objectContaining({ state: 'open' }));
    expect(locked.onPress).not.toHaveBeenCalled();
    expect(one('plan-checkpoint-2', open.root).props.accessibilityState).toEqual({ disabled: false });
    expect(one('plan-checkpoint-2', locked.root).props.accessibilityState).toEqual({ disabled: true });
    expect(one('plan-checkpoint-2', locked.root).props.accessibilityLabel).toBe('plan.a11y.checkpoint|2,plan.places.wordGarden,plan.states.locked');
  });

  it('keeps its label on the screen when its point is near the edge, sized by its own words', () => {
    const { root } = renderOne('open', 0);
    act(() => { one('plan-checkpoint-1-label', root).props.onLayout({ nativeEvent: { layout: { width: 120, height: 24 } } }); });

    const label = StyleSheet.flatten(one('plan-checkpoint-1-label', root).props.style);
    const centre = artPoint(ISLAND_TRAIL[0].x, ISLAND_TRAIL[0].y, LAYOUT);

    expect(label.width).toBeUndefined();
    expect(label.left + 120).toBeLessThanOrEqual(390 - 8);
    expect(label.left + 60).toBeLessThan(centre.x);
  });

  it('hangs its name under its circle, and sets it above when hanging it would run under the step card', () => {
    const centre = artPoint(ISLAND_TRAIL[1].x, ISLAND_TRAIL[1].y, LAYOUT);
    const radius = CHECKPOINT_DIAMETER_PHONE / 2;
    const free = renderOne('locked', 1, { labelFloor: Number.POSITIVE_INFINITY }).root;
    const crowded = renderOne('locked', 1, { labelFloor: centre.y + radius + 10 }).root;
    act(() => { one('plan-checkpoint-2-label', crowded).props.onLayout({ nativeEvent: { layout: { width: 110, height: 24 } } }); });

    expect(flat(one('plan-checkpoint-2-label', free)).top).toBeCloseTo(centre.y + radius + 4, 5);
    expect(flat(one('plan-checkpoint-2-label', crowded)).top).toBeCloseTo(centre.y - radius - 4 - 24, 5);
  });

  it('breathes its glow with the wind', () => {
    const still = renderOne('open', 1, { pulse: { value: 0 } as never });
    const full = renderOne('open', 1, { pulse: { value: 0.5 } as never });

    const scaleOf = (root: ReactTestInstance) =>
      (StyleSheet.flatten(one('plan-checkpoint-2-glow', root).props.style).transform as { scale: number }[])[0].scale;

    expect(scaleOf(still.root)).toBeCloseTo(1, 5);
    expect(scaleOf(full.root)).toBeGreaterThan(1);
  });
});

describe('PlanPanel', () => {
  const PHONE_WIDTH = 390;
  const PHONE_HEIGHT = 844;
  const TABLET_WIDTH = 834;
  const TABLET_HEIGHT = 1210;

  beforeEach(() => {
    mockTablet = false;
  });

  const renderPanel = (current: PlanStepView | null, props: Partial<React.ComponentProps<typeof PlanPanel>> = {}) => {
    const onStart = jest.fn();
    const onPreview = jest.fn();
    const onHeight = jest.fn();
    const rendered = render(
      <PlanPanel
        current={current}
        total={7}
        doneCount={0}
        bottomInset={34}
        screenWidth={PHONE_WIDTH}
        screenHeight={PHONE_HEIGHT}
        onStart={onStart}
        onPreview={onPreview}
        onHeight={onHeight}
        {...props}
      />
    );
    return { root: rendered.UNSAFE_root, onStart, onPreview, onHeight };
  };

  const pressable = (root: ReactTestInstance, testID: string) =>
    root.findAll((node) => node.props.testID === testID && typeof node.props.onPress === 'function')[0];
  const flat = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style);
  const layoutOf = (node: ReactTestInstance, layout: { x: number; y: number; width: number; height: number }) =>
    act(() => { node.props.onLayout({ nativeEvent: { layout } }); });

  it('floats over the island, in from both sides and lifted off the home indicator', () => {
    const { root } = renderPanel(view(0, 'open'));

    const style = flat(one('plan-panel', root));

    expect(style.position).toBe('absolute');
    expect(style.width).toBe(PHONE_WIDTH - 2 * contentMargin(false));
    expect(style.left).toBe(contentMargin(false));
    expect(style.bottom).toBe(34 + PLAN_CARD.bottomGap);
  });

  it('runs nearly the width of a tablet, as in the mock, held short of a wide landscape screen', () => {
    mockTablet = true;
    const portrait = flat(one('plan-panel', renderPanel(view(0, 'open'), { screenWidth: TABLET_WIDTH, screenHeight: TABLET_HEIGHT }).root));
    const landscape = flat(one('plan-panel', renderPanel(view(0, 'open'), { screenWidth: 1210, screenHeight: TABLET_WIDTH }).root));

    expect(portrait.width).toBe(TABLET_WIDTH - 2 * contentMargin(true));
    expect(landscape.width).toBe(PLAN_CARD.maxWidth);
    expect(landscape.left).toBe((1210 - PLAN_CARD.maxWidth) / 2);
  });

  it.each([false, true])('is deep night blue, edged in pale blue light, with stars scattered where the words are not (tablet: %p)', (tablet) => {
    mockTablet = tablet;
    const { root } = renderPanel(view(0, 'open'), tablet ? { screenWidth: TABLET_WIDTH, screenHeight: TABLET_HEIGHT } : {});
    const layout = tablet ? PLAN_CARD_STARS.tablet : PLAN_CARD_STARS.phone;

    const fill = one('plan-card-fill', root);
    const edge = one('plan-card-edge', root);
    const stars = root.findAll((node) => typeof node.props.testID === 'string' && /^plan-card-star-\d+$/.test(node.props.testID) && node.parent?.props.testID !== node.props.testID);

    expect(fill.props.colors).toEqual([...PLAN_CARD_TINTS.fill]);
    expect(edge.props.colors).toEqual([...PLAN_CARD_TINTS.edge]);
    expect(stars).toHaveLength(layout.length);
    expect(layout.filter((star) => star.sparkle).length).toBeGreaterThanOrEqual(2);
    layout.forEach((star) => {
      expect(star.x).toBeGreaterThan(0);
      expect(star.x).toBeLessThan(1);
      expect(star.y).toBeGreaterThan(0);
      expect(star.y).toBeLessThan(1);
    });
    expect(one('plan-card-stars', root).props.pointerEvents).toBe('none');
  });

  it('keeps the big sparkles on a phone to the right of the words, where the stacked card has room', () => {
    PLAN_CARD_STARS.phone.filter((star) => star.sparkle && star.size >= 10).forEach((star) => {
      expect(star.x).toBeGreaterThanOrEqual(0.85);
    });
  });

  it('says which step of how many, and its kind of learning in blue', () => {
    const { root } = renderPanel(view(0, 'open'));

    const domain = one('plan-panel-domain', root);

    expect(texts(one('plan-panel-step', root))).toContain('plan.stepOf|1,7');
    expect(texts(domain)).toContain('plan.domains.language');
    expect(flat(domain).color).toBe(PLAN_CARD_TINTS.domain);
  });

  it('names the place, then what will be read or played, then says in a sentence what it builds', () => {
    const { root } = renderPanel(view(0, 'open'));

    expect(texts(one('plan-panel-title', root))).toEqual(['plan.places.storyTime']);
    expect(texts(one('plan-panel-subtitle', root))).toEqual(['Title 1']);
    expect(texts(one('plan-panel-aim', root))).toEqual(['plan.islandWeek.day-1.aim']);
    expect(one('plan-panel-title', root).props.accessibilityRole).toBe('header');
  });

  it.each([false, true])('says the sentence on a tablet and a phone alike (tablet: %p)', (tablet) => {
    mockTablet = tablet;
    const { root } = renderPanel(view(0, 'open'), tablet ? { screenWidth: TABLET_WIDTH, screenHeight: TABLET_HEIGHT } : {});

    expect(all('plan-panel-aim', root).length).toBeGreaterThan(0);
  });

  it('shows how long it takes, with a clock, and its two skills, each with its own mark', () => {
    const { root } = renderPanel(view(0, 'open'));

    const chip = (testID: string) => one(testID, root);
    const icon = (node: ReactTestInstance) => node.findAll((inner) => typeof inner.props.name === 'string')[0].props.name;

    expect(texts(chip('plan-chip-minutes'))).toContain('plan.minutes|5,7');
    expect(icon(chip('plan-chip-minutes'))).toBe('time-outline');
    expect(texts(chip('plan-chip-listening'))).toContain('plan.skills.listening');
    expect(icon(chip('plan-chip-listening'))).toBe(SKILL_ICON.listening);
    expect(texts(chip('plan-chip-vocabulary'))).toContain('plan.skills.vocabulary');
    expect(icon(chip('plan-chip-vocabulary'))).toBe(SKILL_ICON.vocabulary);
  });

  it('has a mark for every skill a day can practise', () => {
    ISLAND_WEEK.steps.flatMap((step) => step.skills).forEach((skill) => {
      expect(SKILL_ICON[skill]).toBeTruthy();
    });
  });

  it('shows the book`s cover for a story day, and a mark of its kind otherwise', () => {
    const story = renderPanel(view(0, 'open')).root;
    const words = renderPanel(view(1, 'open')).root;

    expect(coverOf(story)).toEqual({ uri: 'test://cover-1' });
    expect(all('plan-panel-cover', words)).toHaveLength(0);
    expect(one('plan-panel-kind', words).props.name).toBe('text');
  });

  function coverOf(root: ReactTestInstance) {
    return root.findAll((node) => node.props.testID === 'plan-panel-cover' && node.props.source !== undefined)[0].props.source;
  }

  it('starts from the gold Start activity button, which leads with a play mark', () => {
    const current = view(0, 'open');
    const { root, onStart } = renderPanel(current);

    act(() => { pressable(root, 'plan-start').props.onPress(); });

    expect(onStart).toHaveBeenCalledWith(current);
    expect(all('plan-start-glow', root).length).toBeGreaterThan(0);
    expect(texts(one('plan-start', root))).toContain('plan.start');
    expect(one('plan-start-icon', root).findAll((node) => node.props.name === 'play').length).toBeGreaterThan(0);
    expect(all('plan-start-icon-twin', root)).toHaveLength(0);
  });

  it('is not itself a button, so only Start and Preview act', () => {
    const { root } = renderPanel(view(0, 'open'));

    expect(one('plan-panel', root).props.accessibilityRole).toBeUndefined();
    expect(one('plan-panel', root).props.onPress).toBeUndefined();
  });

  it('offers a Preview link, underlined and pointing on, that opens the preview from where the cover is', () => {
    const current = view(0, 'open');
    const { root, onPreview } = renderPanel(current);
    layoutOf(one('plan-panel-card', root), { x: 0, y: 0, width: 358, height: 200 });
    layoutOf(one('plan-panel-thumb', root), { x: 0, y: 0, width: 81, height: 94 });

    const link = pressable(root, 'plan-preview');
    act(() => { link.props.onPress(); });

    const inset = PLAN_CARD.stroke + PLAN_CARD.paddingPhone;
    const cardTop = planCardTop(PHONE_HEIGHT, 34, 200);
    expect(onPreview).toHaveBeenCalledWith(current, { x: contentMargin(false) + inset, y: cardTop + inset, width: 81, height: 94 });
    expect(texts(one('plan-preview', root))).toContain('plan.preview');
    expect(flat(one('plan-preview-label', root)).textDecorationLine).toBe('underline');
    expect(flat(one('plan-preview-label', root)).color).toBe(PLAN_CARD_TINTS.link);
    expect(one('plan-preview', root).findAll((node) => node.props.name === 'chevron-forward').length).toBeGreaterThan(0);
    expect(link.props.accessibilityRole).toBe('link');
  });

  it.each([2, 3, 4])('offers no Preview on a day whose activity has no preview screen (day %s, index)', (index) => {
    const launch = ISLAND_WEEK.steps[index].kind === 'feelings'
      ? { kind: 'feelings' as const, activityIds: ['emotion-faces'] }
      : ISLAND_WEEK.steps[index].kind === 'music'
        ? { kind: 'music' as const, activityId: 'music-practise' }
        : { kind: 'spelling' as const, activityId: 'animal-counting' };
    const { root } = renderPanel(view(index, 'open', { launch }));

    expect(all('plan-preview', root).length > 0).toBe(launch.kind === 'spelling');
  });

  it('says the next day opens tomorrow, under a moon, and offers nothing to start or preview', () => {
    const { root } = renderPanel(view(1, 'tomorrow'), { doneCount: 1 });

    expect(texts(one('plan-panel', root))).toContain('plan.opensTomorrow');
    expect(texts(one('plan-panel-title', root))).toEqual(['plan.places.wordGarden']);
    expect(all('plan-start', root)).toHaveLength(0);
    expect(all('plan-preview', root)).toHaveLength(0);
    expect(all('plan-panel-moon', root).length).toBeGreaterThan(0);
  });

  it('celebrates quietly when the week is done, with nothing to press', () => {
    const { root } = renderPanel(null, { doneCount: 7 });

    const words = texts(one('plan-panel', root));

    expect(all('plan-panel-done', root).length).toBeGreaterThan(0);
    expect(words).toContain('plan.weekDone');
    expect(words).toContain('plan.weekDoneBody|7,7');
    expect(all('plan-start', root)).toHaveLength(0);
    expect(all('plan-chip-minutes', root)).toHaveLength(0);
  });

  it('lays the words beside the cover and the buttons beside the words on a tablet, as in the mock', () => {
    mockTablet = true;
    const { root } = renderPanel(view(0, 'open'), { screenWidth: TABLET_WIDTH, screenHeight: TABLET_HEIGHT });

    expect(flat(one('plan-panel-row', root)).flexDirection).toBe('row');
    expect(one('plan-panel-row', root).findAll((node) => node.props.testID === 'plan-actions').length).toBeGreaterThan(0);
    expect(all('plan-actions', root)).toHaveLength(1);
    expect(all('plan-preview', root)).toHaveLength(1);
  });

  it('stacks on a phone: cover and words, then the skills, then Start and Preview across the foot', () => {
    const { root } = renderPanel(view(0, 'open'));

    expect(one('plan-panel-row', root).findAll((node) => node.props.testID === 'plan-actions')).toHaveLength(0);
    expect(flat(one('plan-actions', root)).flexDirection).toBe('row');
  });

  it('gives the cover more room on a tablet than on a phone, upright like a book', () => {
    const phone = flat(one('plan-panel-thumb', renderPanel(view(0, 'open')).root));
    mockTablet = true;
    const tablet = flat(one('plan-panel-thumb', renderPanel(view(0, 'open'), { screenWidth: TABLET_WIDTH, screenHeight: TABLET_HEIGHT }).root));

    expect(phone.height).toBeGreaterThan(phone.width);
    expect(tablet.width).toBeGreaterThan(phone.width);
  });

  it('says how tall it is once laid out, so the map can keep its names clear of it', () => {
    const { root, onHeight } = renderPanel(view(0, 'open'));

    layoutOf(one('plan-panel-card', root), { x: 0, y: 0, width: 358, height: 196 });

    expect(onHeight).toHaveBeenCalledWith(196);
  });
});

describe('planCardTop', () => {
  it('is where the card begins, its gap and the home indicator below it', () => {
    expect(planCardTop(844, 34, 200)).toBe(844 - 34 - PLAN_CARD.bottomGap - 200);
  });
});
