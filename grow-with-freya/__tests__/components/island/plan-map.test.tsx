import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { ReactTestInstance } from 'react-test-renderer';
import { PlanTrail, ribbonPath, TRAIL_DASH_WIDTH, TRAIL_GLINT_AHEAD, TRAIL_GLINT_LIT, TRAIL_LIT, TRAIL_PALE, TRAIL_RIBBON, TRAIL_RIBBON_LIT } from '@/components/island/plan-trail';
import { CHECKPOINT_COMPACT_BELOW, CHECKPOINT_DIAMETER_COMPACT, CHECKPOINT_DIAMETER_PHONE, CHECKPOINT_DIAMETER_TABLET, CHECKPOINT_TINTS, PlanCheckpoint, checkpointSize } from '@/components/island/plan-checkpoint';
import { PLAN_CARD, PLAN_CARD_STARS, PLAN_CARD_TINTS, PlanPanel, SKILL_ICON, planCardTop } from '@/components/island/plan-panel';
import { contentMargin } from '@/components/child-ui/tokens';
import { CHECKPOINT_LABEL_GAP, CHECKPOINT_SHAPE, ISLAND_TRAIL, ISLAND_TRAIL_VIA, TRAIL_DASH, checkpointReachAbove, trailDashes } from '@/constants/island-trail';
import { PHONE_ISLAND } from '@/constants/island-map';
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
  const dashes = trailDashes(ISLAND_TRAIL, TRAIL_DASH, ISLAND_TRAIL_VIA);
  const paintingPerPoint = 1 / LAYOUT.scale;
  const disc = CHECKPOINT_DIAMETER_PHONE * paintingPerPoint;

  it('draws every dash of the trail over the painting, in the painting`s own coordinates', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={0} />);

    const svg = one('plan-trail', root);
    const drawn = root.findAll((node) => typeof node.props.testID === 'string' && /^plan-dash-\d+$/.test(node.props.testID) && node.parent?.props.testID !== node.props.testID);

    expect(StyleSheet.flatten(svg.props.style)).toEqual(expect.objectContaining({ position: 'absolute', ...LAYOUT.picture }));
    expect(svg.props.pointerEvents).toBe('none');
    expect(svg.props.viewBox).toBe('0 0 1122 1402');
    expect(drawn).toHaveLength(dashes.length);
  });

  it('sizes and spaces its dashes as in the mock: small slim capsules, close together, against a checkpoint', () => {
    expect(TRAIL_DASH.length / disc).toBeGreaterThanOrEqual(0.12);
    expect(TRAIL_DASH.length / disc).toBeLessThanOrEqual(0.16);
    expect(TRAIL_DASH_WIDTH / disc).toBeGreaterThanOrEqual(0.07);
    expect(TRAIL_DASH_WIDTH / disc).toBeLessThanOrEqual(0.1);
    expect((TRAIL_DASH.length + TRAIL_DASH.gap) / disc).toBeGreaterThanOrEqual(0.22);
    expect((TRAIL_DASH.length + TRAIL_DASH.gap) / disc).toBeLessThanOrEqual(0.27);
  });

  it('starts each leg clear of a checkpoint`s ring on a phone', () => {
    expect(TRAIL_DASH.inset).toBeGreaterThanOrEqual(disc / 2 + 4);
  });

  const layersOf = (root: ReactTestInstance, prefix: string) =>
    root
      .findAll((node) => typeof node.props.testID === 'string' && node.props.testID.startsWith(`${prefix}-`) && node.parent?.props.testID !== node.props.testID)
      .sort((a, b) => Number(a.props.testID.slice(prefix.length + 1)) - Number(b.props.testID.slice(prefix.length + 1)));
  const together = (opacities: number[]) => 1 - opacities.reduce((clear, opacity) => clear * (1 - opacity), 1);

  it('draws no SVG filter: a blur per dash froze the screen for 12 s as the island mounted on iOS', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={2} />);

    expect(root.findAll((node) => node.props.testID === 'svg-Filter' || node.props.testID === 'svg-FeGaussianBlur')).toHaveLength(0);
    expect(root.findAll((node) => node.props.filter !== undefined)).toHaveLength(0);
  });

  it('lays a soft band of light along each leg, under its dashes: many faint layers widening outward, so no edge shows', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={2} />);
    const legs = [...new Set(dashes.map((dash) => dash.leg))];

    legs.forEach((leg) => {
      const layers = layersOf(root, `plan-ribbon-${leg}`);
      const onLeg = dashes.filter((dash) => dash.leg === leg);
      const widths = layers.map((layer) => layer.props.strokeWidth);
      const opacities = layers.map((layer) => layer.props.opacity);

      expect(layers.length).toBeGreaterThanOrEqual(5);
      layers.forEach((layer) => {
        expect(layer.props.opacity).toBeLessThanOrEqual(0.15);
        expect(layer.props.fill).toBe('none');
        expect(layer.props.stroke).toBe(leg < 2 ? TRAIL_RIBBON_LIT : TRAIL_RIBBON);
        expect(layer.props.strokeLinecap).toBe('round');
        expect(layer.props.d.startsWith(`M ${onLeg[0].x} ${onLeg[0].y}`)).toBe(true);
        expect((layer.props.d.match(/L /g) ?? []).length).toBe(Math.max(1, onLeg.length - 1));
      });
      widths.slice(1).forEach((width, index) => expect(width).toBeLessThan(widths[index]));
      expect(widths[0]).toBeGreaterThanOrEqual(TRAIL_DASH_WIDTH * 4);
      expect(widths[widths.length - 1]).toBeGreaterThanOrEqual(TRAIL_DASH_WIDTH * 2.5);
      expect(together(opacities)).toBeGreaterThanOrEqual(0.5);
    });
  });

  it('draws a band for a leg of a single dash as a dot, so a short leg still glows', () => {
    expect(ribbonPath([{ x: 10, y: 20, angle: 0, leg: 0 }])).toBe('M 10 20 L 10 20');
    expect(ribbonPath([{ x: 10, y: 20, angle: 0, leg: 0 }, { x: 30, y: 40, angle: 0, leg: 0 }])).toBe('M 10 20 L 30 40');
  });

  it('rings each dash with a tight glint of its own colour, softening outward: gold where walked, lemon ahead', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={2} />);

    dashes.forEach((dash, index) => {
      const layers = layersOf(root, `plan-glint-${index}`);
      const core = one(`plan-dash-${index}`, root);
      const heights = layers.map((layer) => layer.props.height);

      expect(layers.length).toBeGreaterThanOrEqual(2);
      layers.forEach((layer) => {
        expect(layer.props.width).toBeGreaterThan(core.props.width);
        expect(layer.props.height).toBeGreaterThan(core.props.height);
        expect(layer.props.fill).toBe(dash.leg < 2 ? TRAIL_GLINT_LIT : TRAIL_GLINT_AHEAD);
        expect(layer.props.transform).toBe(core.props.transform);
      });
      heights.slice(1).forEach((height, i) => expect(height).toBeLessThan(heights[i]));
      expect(heights[heights.length - 1]).toBeLessThan(core.props.height * 2);
      expect(layers[0].props.opacity).toBeLessThan(layers[layers.length - 1].props.opacity);
    });
  });

  it('draws every band, then the glints, then the dashes, so each dash sits on its light', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={1} />);
    const lastLeg = dashes[dashes.length - 1].leg;
    const lastBand = layersOf(root, `plan-ribbon-${lastLeg}`).length - 1;
    const ids = ['plan-ribbon-0-0', `plan-ribbon-${lastLeg}-${lastBand}`, 'plan-glint-0-0', 'plan-glint-0-1', 'plan-dash-0'];

    const order = root
      .findAll((node) => ids.includes(node.props.testID) && node.parent?.props.testID !== node.props.testID)
      .map((node) => node.props.testID);

    expect(order).toEqual(ids);
  });

  it('glints brighter along the legs walked than along the way ahead, and both can be seen', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={2} />);
    const walked = dashes.findIndex((dash) => dash.leg < 2);
    const ahead = dashes.findIndex((dash) => dash.leg >= 2);
    const brightest = (index: number) => Math.max(...layersOf(root, `plan-glint-${index}`).map((layer) => layer.props.opacity));

    expect(brightest(walked)).toBeGreaterThan(brightest(ahead));
    expect(brightest(ahead)).toBeGreaterThanOrEqual(0.5);
  });

  it('lights the walked legs as in the mock, near-white cores in an orange-gold glint, and the way ahead in lemon cream', () => {
    expect(TRAIL_LIT).toBe('#FFFBE0');
    expect(TRAIL_GLINT_LIT).toBe('#FFA81E');
    expect(TRAIL_PALE).toBe('#FEF9CD');
  });

  it('lights the legs the child has walked, and the way ahead in solid cream, never see-through', () => {
    const { UNSAFE_root: root } = render(<PlanTrail layout={LAYOUT} litLegs={2} />);

    dashes.forEach((dash, index) => {
      expect(one(`plan-dash-${index}`, root).props.fill).toBe(dash.leg < 2 ? TRAIL_LIT : TRAIL_PALE);
    });
    [TRAIL_LIT, TRAIL_PALE].forEach((colour) => expect(colour).toMatch(/^#[0-9A-F]{6}$/i));
  });

  it('lights nothing before the first day, and everything once the week is walked', () => {
    const nothing = render(<PlanTrail layout={LAYOUT} litLegs={0} />).UNSAFE_root;
    const everything = render(<PlanTrail layout={LAYOUT} litLegs={6} />).UNSAFE_root;

    expect(nothing.findAll((node) => node.props.fill === TRAIL_LIT)).toHaveLength(0);
    expect(everything.findAll((node) => node.props.fill === TRAIL_PALE)).toHaveLength(0);
  });

  it('draws the phone trail over the phone painting, every part of it 1.2 times as big, so it looks the same size on a phone', () => {
    const phoneLayout = islandLayout({ width: 402, height: 874, topInset: 62 }, PHONE_ISLAND.art);
    const onPhone = trailDashes(PHONE_ISLAND.trail, PHONE_ISLAND.dash, PHONE_ISLAND.via);
    const tablet = render(<PlanTrail layout={LAYOUT} litLegs={0} />).UNSAFE_root;
    const { UNSAFE_root: root } = render(<PlanTrail map={PHONE_ISLAND} layout={phoneLayout} litLegs={0} />);
    const scale = PHONE_ISLAND.trailScale;

    expect(one('plan-trail', root).props.viewBox).toBe(`0 0 ${PHONE_ISLAND.art.width} ${PHONE_ISLAND.art.height}`);
    expect(StyleSheet.flatten(one('plan-trail', root).props.style)).toEqual(expect.objectContaining(phoneLayout.picture));
    expect(all('plan-dash-' + (onPhone.length - 1), root)).toHaveLength(1);
    expect(all('plan-dash-' + onPhone.length, root)).toHaveLength(0);
    expect(one('plan-dash-0', root).props.x + one('plan-dash-0', root).props.width / 2).toBeCloseTo(onPhone[0].x, 6);
    expect(one('plan-dash-0', root).props.width).toBe(PHONE_ISLAND.dash.length);
    expect(one('plan-dash-0', root).props.height).toBeCloseTo(TRAIL_DASH_WIDTH * scale, 6);
    expect(one('plan-ribbon-0-0', root).props.strokeWidth).toBeCloseTo(one('plan-ribbon-0-0', tablet).props.strokeWidth * scale, 6);
    expect(one('plan-glint-0-0', root).props.height - one('plan-dash-0', root).props.height).toBeCloseTo(
      (one('plan-glint-0-0', tablet).props.height - one('plan-dash-0', tablet).props.height) * scale,
      6
    );
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
  const flat = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style);
  const stopsIn = (node: ReactTestInstance) =>
    node.findAll((inner) => inner.props.testID === 'svg-Stop').map((stop) => stop.props.stopColor);
  const fills = (node: ReactTestInstance) =>
    node.findAll((inner) => typeof inner.props.fill === 'string').map((inner) => inner.props.fill);
  const DIAMETER = CHECKPOINT_DIAMETER_PHONE;

  it('stands on its point of the trail, centred, one touch target wide', () => {
    const { root } = renderOne('locked');

    const centre = artPoint(ISLAND_TRAIL[1].x, ISLAND_TRAIL[1].y, LAYOUT);
    const style = flat(one('plan-checkpoint-2', root));

    expect(style.left).toBeCloseTo(centre.x - DIAMETER / 2, 5);
    expect(style.top).toBeCloseTo(centre.y - DIAMETER / 2, 5);
    expect(style.width).toBe(DIAMETER);
    expect(DIAMETER).toBeGreaterThanOrEqual(44);
  });

  // a short phone (an iPhone SE) has about 200 points between the horizon and the step card, and
  // seven full-size checkpoints with their names cannot fit there without covering each other
  it.each([
    [false, 667, CHECKPOINT_DIAMETER_COMPACT, 10],
    [false, 699, CHECKPOINT_DIAMETER_COMPACT, 10],
    [false, 700, CHECKPOINT_DIAMETER_PHONE, 11],
    [false, 874, CHECKPOINT_DIAMETER_PHONE, 11],
    [true, 667, CHECKPOINT_DIAMETER_TABLET, 13],
    [true, 1210, CHECKPOINT_DIAMETER_TABLET, 13],
  ])('on a tablet: %p, %p points tall, is %p across with names in %p-point type', (isTablet, height, diameter, font) => {
    expect(checkpointSize(isTablet, height)).toEqual({ diameter, font });
  });

  it('stays a full touch target at its smallest', () => {
    expect(CHECKPOINT_DIAMETER_COMPACT).toBeGreaterThanOrEqual(44);
    expect(CHECKPOINT_COMPACT_BELOW).toBe(700);
  });

  it('is smaller on a short phone, and names its place in smaller type', () => {
    const { root } = renderOne('locked', 1, { screenHeight: 667 });

    expect(StyleSheet.flatten(one('plan-checkpoint-2', root).props.style).width).toBe(CHECKPOINT_DIAMETER_COMPACT);
    const words = one('plan-checkpoint-2-label', root).findAll((node) => node.props.children === 'plan.places.wordGarden' && node.props.style !== undefined)[0];
    expect(StyleSheet.flatten(words.props.style).fontSize).toBe(10);
  });

  it('is bigger on a tablet', () => {
    mockTablet = true;
    const { root } = renderOne('locked');

    expect(flat(one('plan-checkpoint-2', root)).width).toBe(CHECKPOINT_DIAMETER_TABLET);
    expect(CHECKPOINT_DIAMETER_TABLET).toBeGreaterThan(DIAMETER);
  });

  it('wears its day number in a small round badge centred on the disc`s top edge, as in the mock', () => {
    const { root } = renderOne('locked');

    const badge = flat(one('plan-checkpoint-2-badge', root));
    const number = one('plan-checkpoint-2-number', root);
    const size = Math.round(DIAMETER * CHECKPOINT_SHAPE.badge);

    expect(badge.width).toBe(size);
    expect(badge.height).toBe(size);
    expect(badge.borderRadius).toBe(size / 2);
    expect(badge.left + size / 2).toBeCloseTo(DIAMETER / 2, 5);
    expect(badge.top + size / 2).toBeCloseTo(-DIAMETER * CHECKPOINT_SHAPE.badgeRise, 5);
    expect(texts(number)).toEqual(['2']);
    expect(flat(number).color).toBe(CHECKPOINT_TINTS.number);
    expect(flat(number).fontSize).toBeGreaterThanOrEqual(size * 0.5);
    expect(number.props.allowFontScaling).toBe(false);
  });

  it.each([
    ['locked', CHECKPOINT_TINTS.coolBadge, CHECKPOINT_TINTS.coolRing],
    ['tomorrow', CHECKPOINT_TINTS.coolBadge, CHECKPOINT_TINTS.coolRing],
    ['open', CHECKPOINT_TINTS.warmBadge, CHECKPOINT_TINTS.warmRing],
    ['done', CHECKPOINT_TINTS.warmBadge, CHECKPOINT_TINTS.warmRing],
  ] as const)('colours the badge of a %s day %s, ringed %s', (state, fill, ring) => {
    const badge = flat(one('plan-checkpoint-2-badge', renderOne(state).root));

    expect(badge.backgroundColor).toBe(fill);
    expect(badge.borderColor).toBe(ring);
  });

  it.each([
    ['locked', true, false, false],
    ['tomorrow', true, false, false],
    ['open', false, true, false],
    ['done', false, false, true],
  ] as const)('when %s shows a padlock: %p, its activity: %p, a tick: %p, and always its number', (state, lock, icon, tick) => {
    const { root } = renderOne(state);

    expect(all('plan-checkpoint-2-number', root).length).toBeGreaterThan(0);
    expect(all('plan-checkpoint-2-lock', root).length > 0).toBe(lock);
    expect(all('plan-checkpoint-2-icon', root).length > 0).toBe(icon);
    expect(all('plan-checkpoint-2-done', root).length > 0).toBe(tick);
  });

  it.each([
    ['locked', CHECKPOINT_TINTS.cool, CHECKPOINT_TINTS.coolRing],
    ['tomorrow', CHECKPOINT_TINTS.cool, CHECKPOINT_TINTS.coolRing],
    ['open', CHECKPOINT_TINTS.open, CHECKPOINT_TINTS.warmRing],
    ['done', CHECKPOINT_TINTS.done, CHECKPOINT_TINTS.warmRing],
  ] as const)('fills the disc of a %s day from its centre out, inside a thin pale ring', (state, face, ring) => {
    const disc = one('plan-checkpoint-2-disc', renderOne(state).root);

    expect(stopsIn(disc)).toEqual([...face]);
    expect(flat(disc).borderColor).toBe(ring);
    expect(flat(disc).borderWidth).toBeGreaterThanOrEqual(2);
    expect(flat(disc).borderWidth).toBeLessThanOrEqual(DIAMETER * 0.05);
  });

  it('darkens the locked disc towards the middle, where the padlock sits, as in the mock', () => {
    const [centre, , rim] = CHECKPOINT_TINTS.cool;
    const lightness = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);

    expect(lightness(centre)).toBeLessThan(lightness(rim));
  });

  it('locks a day not yet open with a white padlock and a navy keyhole, a little above the middle of the disc', () => {
    const lock = one('plan-checkpoint-2-lock', renderOne('locked').root);

    const style = flat(lock);
    const colours = fills(lock);

    expect(style.width).toBeCloseTo(DIAMETER * CHECKPOINT_SHAPE.lockWidth, 0);
    expect(style.left + style.width / 2).toBeCloseTo(DIAMETER / 2, 5);
    expect(style.top + style.height / 2).toBeLessThan(DIAMETER / 2);
    expect(style.top + style.height / 2).toBeGreaterThan(DIAMETER * 0.4);
    expect(colours).toContain(CHECKPOINT_TINTS.lock);
    expect(colours).toContain(CHECKPOINT_TINTS.keyhole);
  });

  it('keeps the tick on a finished day, white', () => {
    const tick = one('plan-checkpoint-2-done', renderOne('done').root);

    expect(tick.props.name).toBe('checkmark');
    expect(tick.props.color).toBe(CHECKPOINT_TINTS.number);
  });

  it('shows an open story day as an open book, white pages in a red cover, as in the mock', () => {
    const index = ISLAND_WEEK.steps.findIndex((step) => step.kind === 'story');
    const icon = one(`plan-checkpoint-${index + 1}-icon`, renderOne('open', index).root);

    expect(fills(icon)).toEqual(expect.arrayContaining([CHECKPOINT_TINTS.page, CHECKPOINT_TINTS.cover]));
  });

  it.each([
    ['words', 'text'],
    ['numbers', 'calculator'],
    ['feelings', 'happy'],
    ['music', 'musical-notes'],
  ] as const)('marks an open %s day with a %s in the book`s red', (kind, name) => {
    const index = ISLAND_WEEK.steps.findIndex((step) => step.kind === kind);
    const icon = one(`plan-checkpoint-${index + 1}-icon`, renderOne('open', index).root);

    expect(icon.props.name).toBe(name);
    expect(icon.props.color).toBe(CHECKPOINT_TINTS.cover);
  });

  it.each([
    ['open', true],
    ['done', true],
    ['locked', false],
    ['tomorrow', false],
  ] as const)('can be pressed while %s: %p, and says so to a screen reader', (state, pressable) => {
    const given = renderOne(state);
    const marker = one('plan-checkpoint-2', given.root);

    act(() => { marker.props.onPress?.(); });

    if (pressable) expect(given.onPress).toHaveBeenCalledWith(expect.objectContaining({ state }));
    else expect(given.onPress).not.toHaveBeenCalled();
    expect(marker.props.disabled).toBe(!pressable);
    expect(marker.props.accessibilityState).toEqual({ disabled: !pressable });
    expect(marker.props.accessibilityLabel).toBe(`plan.a11y.checkpoint|2,plan.places.wordGarden,plan.states.${state}`);
  });

  it('glows warm yellow round the open day, still strong half a disc beyond its ring', () => {
    const open = renderOne('open').root;

    const glow = flat(one('plan-checkpoint-2-glow', open));
    const stops = one('plan-checkpoint-2-glow', open).findAll((node) => node.props.testID === 'svg-Stop');
    const reach = glow.width / 2;
    const opacityAt = (distance: number) => {
      const at = distance / reach;
      const points = stops.map((stop) => ({ offset: Number(stop.props.offset), opacity: Number(stop.props.stopOpacity) }));
      const after = points.findIndex((point) => point.offset >= at);
      const before = points[Math.max(0, after - 1)];
      const next = points[after];
      return before.opacity + ((next.opacity - before.opacity) * (at - before.offset)) / (next.offset - before.offset || 1);
    };

    expect(glow.width).toBeGreaterThanOrEqual(DIAMETER * 2.2);
    expect(glow.width).toBeLessThanOrEqual(DIAMETER * 2.8);
    expect(glow.left + glow.width / 2).toBeCloseTo(DIAMETER / 2, 5);
    expect(opacityAt(DIAMETER / 2)).toBeGreaterThanOrEqual(0.95);
    expect(opacityAt(DIAMETER * 0.75)).toBeGreaterThanOrEqual(0.6);
    expect(opacityAt(reach)).toBe(0);
    stops.forEach((stop) => expect(stop.props.stopColor).toBe(CHECKPOINT_TINTS.glow));
  });

  it('gives a day not yet open a soft blue aura instead, which does not breathe, and a done day neither', () => {
    const locked = renderOne('locked', 1, { pulse: { value: 0.5 } as never }).root;
    const done = renderOne('done').root;

    const aura = one('plan-checkpoint-2-aura', locked);
    const size = flat(aura).width;

    expect(all('plan-checkpoint-2-glow', locked)).toHaveLength(0);
    expect(size).toBeGreaterThan(DIAMETER);
    expect(size).toBeLessThan(DIAMETER * 1.8);
    expect(flat(aura).transform).toBeUndefined();
    aura.findAll((node) => node.props.testID === 'svg-Stop').forEach((stop) => expect(stop.props.stopColor).toBe(CHECKPOINT_TINTS.aura));
    expect(all('plan-checkpoint-2-glow', done)).toHaveLength(0);
    expect(all('plan-checkpoint-2-aura', done)).toHaveLength(0);
  });

  it('breathes its glow with the wind', () => {
    const still = renderOne('open', 1, { pulse: { value: 0 } as never });
    const full = renderOne('open', 1, { pulse: { value: 0.5 } as never });

    const scaleOf = (root: ReactTestInstance) =>
      (StyleSheet.flatten(one('plan-checkpoint-2-glow', root).props.style).transform as { scale: number }[])[0].scale;

    expect(scaleOf(still.root)).toBeCloseTo(1, 5);
    expect(scaleOf(full.root)).toBeGreaterThan(1);
  });

  it.each([
    ['open', CHECKPOINT_TINTS.labelWarm, CHECKPOINT_TINTS.inkWarm],
    ['done', CHECKPOINT_TINTS.labelWarm, CHECKPOINT_TINTS.inkWarm],
    ['locked', CHECKPOINT_TINTS.labelCool, CHECKPOINT_TINTS.ink],
    ['tomorrow', CHECKPOINT_TINTS.labelCool, CHECKPOINT_TINTS.ink],
  ] as const)('sets the place name of a %s day in bold on a rounded tag of %s', (state, fill, ink) => {
    const { root } = renderOne(state);

    const label = one('plan-checkpoint-2-label', root);
    const words = label.findAll((node) => node.props.children === 'plan.places.wordGarden' && node.props.style !== undefined)[0];

    expect(flat(label).backgroundColor).toBe(fill);
    expect(flat(label).borderRadius).toBeGreaterThanOrEqual(8);
    expect(flat(label).borderRadius).toBeLessThanOrEqual(12);
    expect(flat(words).color).toBe(ink);
    expect(flat(words).fontWeight).toBe('800');
    expect(flat(words).fontSize).toBe(11);
  });

  it('tucks the name over the foot of its disc, as in the mock', () => {
    const { root } = renderOne('locked');
    const centre = artPoint(ISLAND_TRAIL[1].x, ISLAND_TRAIL[1].y, LAYOUT);

    const top = flat(one('plan-checkpoint-2-label', root)).top;

    expect(top).toBeCloseTo(centre.y + DIAMETER / 2 - DIAMETER * CHECKPOINT_SHAPE.labelOverlap, 5);
    expect(top).toBeGreaterThan(centre.y);
    expect(top).toBeLessThan(centre.y + DIAMETER / 2);
  });

  it('sets its name above the badge when hanging it would run under the step card', () => {
    const centre = artPoint(ISLAND_TRAIL[1].x, ISLAND_TRAIL[1].y, LAYOUT);
    const crowded = renderOne('locked', 1, { labelFloor: centre.y + DIAMETER / 2 }).root;
    act(() => { one('plan-checkpoint-2-label', crowded).props.onLayout({ nativeEvent: { layout: { width: 110, height: 24 } } }); });

    const top = flat(one('plan-checkpoint-2-label', crowded)).top;

    expect(top).toBeCloseTo(centre.y - checkpointReachAbove(DIAMETER) - CHECKPOINT_LABEL_GAP - 24, 5);
  });

  it('keeps its label on the screen when its point is near the edge, sized by its own words', () => {
    const { root } = renderOne('open', 0);
    act(() => { one('plan-checkpoint-1-label', root).props.onLayout({ nativeEvent: { layout: { width: 120, height: 24 } } }); });

    const label = flat(one('plan-checkpoint-1-label', root));
    const centre = artPoint(ISLAND_TRAIL[0].x, ISLAND_TRAIL[0].y, LAYOUT);

    expect(label.width).toBeUndefined();
    expect(label.left + 120).toBeLessThanOrEqual(390 - 8);
    expect(label.left + 60).toBeLessThan(centre.x);
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
