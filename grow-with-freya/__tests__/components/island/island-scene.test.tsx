import React from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { PAGE_TRANSITION_DURATION_MS } from '@/constants/page-transition';
import { useAnimatedStyle, withDelay, withTiming } from 'react-native-reanimated';
import type { ReactTestInstance } from 'react-test-renderer';
import { IslandScene } from '@/components/island/island-scene';
import { IslandVoyageProvider, type IslandVoyage } from '@/contexts/island-voyage-context';
import { ISLAND_NIGHT, artFrame, artPoint, islandLayout } from '@/constants/island-scene';
import { ISLAND_ART_PHONE } from '@/constants/island-art-phone';
import { chromeOpacity, islandScale, sunRise, type VoyagePhase } from '@/constants/island-voyage';
import { GULL_COURSES, beamReach, cloudDrift, fallShift, poolRing, starGlow, treeSway, villageGlow, waterGlow } from '@/constants/island-life';
import { CIRCLE_BUTTON_DIAMETER_PHONE, CIRCLE_BUTTON_DIAMETER_TABLET, contentMargin, journeyHeaderTop } from '@/components/child-ui/tokens';
import { ISLAND_WEEK } from '@/data/learning-plan';
import { ISLAND_TRAIL } from '@/constants/island-trail';
import { TRAIL_LIT } from '@/components/island/plan-trail';
import { PHONE_ISLAND, TABLET_ISLAND } from '@/constants/island-map';
import { ROADMAP } from '@/constants/roadmap';
import type { PlanStepView } from '@/hooks/use-learning-plan';

const SCREEN = { width: 390, height: 844 };
const TOP_INSET = 47;
const LAYOUT = islandLayout({ ...SCREEN, topInset: TOP_INSET }, ISLAND_ART_PHONE);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

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

jest.mock('@/constants/island-art-phone', () => ({
  ISLAND_ART_PHONE: {
    ...jest.requireMock('@/constants/island-art').ISLAND_ART,
    picture: { uri: 'test://island-phone' },
    horizon: { uri: 'test://island-phone-horizon' },
    width: 941,
    height: 1672,
    sunX: 520,
    stars: jest.requireMock('@/constants/island-art').ISLAND_ART.stars.map((sheet: { id: string; frame: object }) => ({
      ...sheet,
      source: { uri: `test://phone-${sheet.id}` },
    })),
  },
}));

let mockMuted = false;
const mockToggleMute = jest.fn(() => Promise.resolve());
jest.mock('@/contexts/global-sound-context', () => ({
  useGlobalSound: () => ({ isMuted: mockMuted, toggleMute: mockToggleMute }),
}));

let mockReduceMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

jest.mock('@/constants/island-art', () => ({
  ISLAND_ART: {
    picture: { uri: 'test://island' },
    horizon: { uri: 'test://island-horizon' },
    width: 1122,
    height: 1402,
    bandTop: 226,
    bandBottom: 492,
    seaLine: 398,
    sunX: 620,
    faceFloor: 357,
    farClouds: [
      { id: 'cloud-far', source: { uri: 'test://cloud-far' }, frame: { x: 900, y: 40, width: 200, height: 250 }, reach: 12, beats: 2, lag: 0.5 },
    ],
    nearClouds: [
      { id: 'cloud-near', source: { uri: 'test://cloud-near' }, frame: { x: 500, y: 300, width: 600, height: 150 }, reach: 7, beats: 2, lag: 0 },
    ],
    billows: [
      { id: 'billow', source: { uri: 'test://billow' }, frame: { x: 0, y: 1237, width: 312, height: 165 }, anchorX: 0, anchorY: 1 },
    ],
    lowTrees: [
      { id: 'tree-low', source: { uri: 'test://tree-low' }, frame: { x: 274, y: 874, width: 74, height: 65 }, pivotX: 305, pivotY: 925, sway: 5.5 },
    ],
    horizonTrees: [
      { id: 'tree-a', source: { uri: 'test://tree-a' }, frame: { x: 562, y: 355, width: 52, height: 75 }, pivotX: 588, pivotY: 432, sway: 3.2 },
      { id: 'tree-b', source: { uri: 'test://tree-b' }, frame: { x: 604, y: 371, width: 42, height: 63 }, pivotX: 625, pivotY: 436, sway: 3.2 },
    ],
    water: [{ uri: 'test://water-1' }, { uri: 'test://water-2' }, { uri: 'test://water-3' }],
    falls: [
      { id: 'fall', streaks: { uri: 'test://streaks' }, cover: { uri: 'test://cover' }, frame: { x: 96, y: 798, width: 66, height: 88 }, tile: 48, sprayX: 160, sprayY: 886, spraySize: 56 },
    ],
    spray: { uri: 'test://spray' },
    pools: [
      { id: 'pool', cover: { uri: 'test://pool-cover' }, frame: { x: 148, y: 876, width: 156, height: 92 }, ringX: 188, ringY: 906, ringWidth: 104 },
    ],
    ring: { uri: 'test://ring' },
    ringAspect: 2.2069,
    litWindows: { id: 'lit-windows', source: { uri: 'test://windows' }, frame: { x: 560, y: 560, width: 496, height: 626 } },
    villageLamps: [
      { id: 'lit-village-1', source: { uri: 'test://village-1' }, frame: { x: 190, y: 400, width: 860, height: 820 } },
    ],
    lighthouse: { x: 996, y: 568, glow: { uri: 'test://lamp-glow' }, glowSize: 76, beam: { uri: 'test://lamp-beam' }, beamLength: 380, beamHeight: 44, pulse: { uri: 'test://lamp-pulse' }, pulseSize: 150 },
    stars: [
      { id: 'stars-1', source: { uri: 'test://stars-1' }, frame: { x: 10, y: 20, width: 1100, height: 300 } },
      { id: 'stars-2', source: { uri: 'test://stars-2' }, frame: { x: 12, y: 18, width: 1090, height: 310 } },
      { id: 'stars-3', source: { uri: 'test://stars-3' }, frame: { x: 8, y: 25, width: 1104, height: 290 } },
    ],
  },
}));

const mockClocks = {
  wind: { value: 0.2 },
  tide: { value: 0.25 },
  ripple: { value: 0.5 },
  sky: { value: 0.3 },
  beat: { value: 0.1 },
  fall: { value: 0.4 },
  lamp: { value: 0.15 },
};
const mockAlive: boolean[] = [];

const mockStart = jest.fn();
let mockPlanSteps: PlanStepView[] = [];
let mockCurrent: PlanStepView | null = null;
let mockDoneCount = 0;
const mockPlanTrails: unknown[] = [];
jest.mock('@/hooks/use-learning-plan', () => ({
  useLearningPlan: (_isActive: boolean, trail: unknown) => {
    mockPlanTrails.push(trail);
    return {
    plan: { id: 'island-week', steps: mockPlanSteps.map((view) => view.step) },
    steps: mockPlanSteps,
    current: mockCurrent,
    doneCount: mockDoneCount,
    start: mockStart,
    };
  },
}));

function planView(index: number, state: PlanStepView['state']): PlanStepView {
  const step = ISLAND_WEEK.steps[index];
  return {
    step,
    state,
    point: ISLAND_TRAIL[index],
    title: `Title ${step.day}`,
    picture: null,
    launch: step.kind === 'story' ? { kind: 'story', storyId: step.storyId ?? '' } : { kind: 'spelling', activityId: 'wombat-spelling' },
  };
}

function aWeek(states: PlanStepView['state'][]) {
  mockPlanSteps = states.map((state, index) => planView(index, state));
  mockCurrent = mockPlanSteps.find((view) => view.state === 'open' || view.state === 'tomorrow') ?? null;
  mockDoneCount = states.filter((state) => state === 'done').length;
}

const mockLift = {
  style: { liftedForTheTour: true },
  scroller: { reveal: jest.fn(), away: jest.fn(() => 0), release: jest.fn() },
};
jest.mock('@/components/owl-guide/use-guide-lift', () => ({
  useGuideLift: () => mockLift,
}));

jest.mock('@/hooks/use-island-clocks', () => ({
  useIslandClocks: (alive: boolean) => {
    mockAlive.push(alive);
    return mockClocks;
  },
}));

function voyage(overrides: Partial<IslandVoyage> = {}): IslandVoyage {
  return {
    phase: 'island',
    travel: { value: 1 },
    clouds: { value: 0 },
    arrival: { value: 1 },
    reduceMotion: false,
    depart: jest.fn(),
    comeBack: jest.fn(),
    islandReady: jest.fn(),
    settleHome: jest.fn(),
    ...overrides,
  } as unknown as IslandVoyage;
}

function renderScene(given: IslandVoyage = voyage(), props: Partial<React.ComponentProps<typeof IslandScene>> = {}) {
  const tree = (current: IslandVoyage, sceneProps: Partial<React.ComponentProps<typeof IslandScene>>) => (
    <IslandVoyageProvider voyage={current}>
      <IslandScene timeOfDay="day" {...sceneProps} />
    </IslandVoyageProvider>
  );
  const view = render(tree(given, props));

  return {
    ...view,
    root: view.UNSAFE_root,
    given,
    show: (next: IslandVoyage, nextProps: Partial<React.ComponentProps<typeof IslandScene>> = props) =>
      view.rerender(tree(next, nextProps)),
  };
}

function outermost(root: ReactTestInstance, testID: string): ReactTestInstance[] {
  return root.findAll((node) => node.props.testID === testID && node.parent?.props.testID !== testID);
}

function innermost(root: ReactTestInstance, testID: string): ReactTestInstance {
  const found = root.findAll((node) => node.props.testID === testID);
  if (found.length === 0) throw new Error(`nothing called ${testID}`);
  return found[found.length - 1];
}

function picture(root: ReactTestInstance, testID: string): ReactTestInstance {
  const found = root.findAll((node) => node.props.testID === testID && node.props.contentFit !== undefined);
  if (found.length === 0) throw new Error(`no picture called ${testID}`);
  return found[0];
}

function styleOf(root: ReactTestInstance, testID: string) {
  return StyleSheet.flatten(innermost(root, testID).props.style);
}

function withSource(root: ReactTestInstance, uri: string): ReactTestInstance[] {
  return root.findAll((node) => node.props.source?.uri === uri && node.parent?.props.source?.uri !== uri);
}

function measureTheScreen() {
  Object.defineProperty(document.documentElement, 'clientWidth', { value: SCREEN.width, configurable: true });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: SCREEN.height, configurable: true });
  act(() => { window.dispatchEvent(new Event('resize')); });
}

describe('IslandScene', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    measureTheScreen();
    mockReduceMotion = false;
    mockTablet = false;
    mockPlanTrails.length = 0;
    mockMuted = false;
    mockToggleMute.mockClear();
    mockAlive.length = 0;
    mockStart.mockReset();
    mockStart.mockImplementation((view: PlanStepView) => view.launch);
    aWeek(['open', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
    (useAnimatedStyle as jest.Mock).mockImplementation((build: () => object) => build());
  });

  afterEach(() => {
    (useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('the owl\'s tour of the island', () => {
    function tourOf(root: ReactTestInstance) {
      return root.findAll((node) => node.props.id === 'island_tour' && node.props.targets !== undefined)[0];
    }

    it('hands the tour the day\'s checkpoint, the plan card and the Home pill', () => {
      const { root } = renderScene();

      expect(Object.keys(tourOf(root).props.targets).sort()).toEqual(['island_checkpoint', 'island_home', 'island_plan_card']);
    });

    it.each([
      ['today\'s step is done and the next opens tomorrow', ['done', 'tomorrow', 'locked', 'locked', 'locked', 'locked', 'locked']],
      ['the whole week is done', ['done', 'done', 'done', 'done', 'done', 'done', 'done']],
    ] as const)('leaves the checkpoint off the tour when %s, since nothing glows to point at', (_, week) => {
      aWeek([...week]);
      const { root } = renderScene();

      expect(Object.keys(tourOf(root).props.targets).sort()).toEqual(['island_home', 'island_plan_card']);
    });

    // On a phone the bubble sat over the top of the plan card and the owl over
    // Start activity; the card rises clear for its step, as the book card does.
    it('lets the tour lift the plan card clear of the bubble', () => {
      const { root } = renderScene();
      const layer = root.findAll((node) => node.props.testID === 'island-plan-panel' && node.props.style !== undefined)[0];

      expect(tourOf(root).props.scroller).toBe(mockLift.scroller);
      expect(StyleSheet.flatten(layer.props.style)).toEqual(expect.objectContaining({ liftedForTheTour: true }));
    });

    it('points at the checkpoint for today alone, not the days still to come', () => {
      aWeek(['done', 'open', 'locked', 'locked', 'locked', 'locked', 'locked']);
      const { root } = renderScene();
      const marked = root.findAll((node) => node.props.view !== undefined && node.props.markerRef !== undefined);

      expect(marked).toHaveLength(1);
      expect(marked[0].props.view.step.day).toBe(2);
      expect(marked[0].props.markerRef).toBe(tourOf(root).props.targets.island_checkpoint);
    });

    it('points at the plan card the panel draws, in a host that can be measured', () => {
      const { root } = renderScene();
      const panel = root.findAll((node) => node.props.cardRef !== undefined && node.props.onStart !== undefined)[0];
      const card = root.findAll((node) => node.props.testID === 'plan-panel-card' && node.props.style !== undefined)[0];

      expect(panel.props.cardRef).toBe(tourOf(root).props.targets.island_plan_card);
      expect(card.props.collapsable).toBe(false);
    });

    it('wraps the Home pill in a host that can be measured', () => {
      const { root } = renderScene();

      const hosts = root.findAll(
        (node) => node.props.collapsable === false && node.findAll((child) => child.props.testID === 'island-home-button').length > 0
      );

      expect(hosts.length).toBeGreaterThan(0);
    });

    it('waits for the island to have arrived and settled before the owl speaks', () => {
      const arriving = renderScene(voyage({ phase: 'arriving' }));

      expect(tourOf(arriving.root).props.active).toBe(false);
      arriving.unmount();

      const { root } = renderScene();
      const before = tourOf(root).props.active;
      act(() => { jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS); });

      expect(before).toBe(false);
      expect(tourOf(root).props.active).toBe(true);
    });
  });

  // the wide painting cropped to a phone lost the island's sides and left the trail crowded; a
  // phone has a painting of its own, made for a tall screen (operator, 2026-10-03)
  describe('on a phone and on a tablet', () => {
    const propsOf = (root: ReactTestInstance, has: string[]) =>
      root.findAll((node) => has.every((name) => node.props[name] !== undefined))[0]?.props;

    it.each([
      [false, 'test://island-phone', 'test://island-phone-horizon'],
      [true, 'test://island', 'test://island-horizon'],
    ])('on a tablet: %p, shows the painting %p and its horizon %p', (tablet, painting, horizon) => {
      mockTablet = tablet;
      const { root } = renderScene();

      expect(picture(root, 'island-picture').props.source).toEqual({ uri: painting });
      expect(withSource(root, horizon).length).toBeGreaterThan(0);
      expect(withSource(root, tablet ? 'test://island-phone' : 'test://island')).toHaveLength(0);
    });

    it.each([
      [false, PHONE_ISLAND],
      [true, TABLET_ISLAND],
    ])('on a tablet: %p, lays the trail, the gulls, the water, the falls and the plan from that painting', (tablet, map) => {
      mockTablet = tablet;
      const { root } = renderScene();

      expect(propsOf(root, ['map', 'litLegs']).map).toBe(map);
      expect(mockPlanTrails[mockPlanTrails.length - 1]).toBe(map.trail);
      expect(propsOf(root, ['courses', 'beat']).courses).toBe(map.gulls);
      expect(propsOf(root, ['art', 'ripple']).art).toBe(map.art);
      expect(propsOf(root, ['art', 'clock']).art).toBe(map.art);
    });

    it.each([
      [false, 'test://phone-stars-1', 'test://stars-1'],
      [true, 'test://stars-1', 'test://phone-stars-1'],
    ])('on a tablet: %p, shows the stars of its own painting at night', (tablet, shown, hidden) => {
      mockTablet = tablet;
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      expect(withSource(root, shown).length).toBeGreaterThan(0);
      expect(withSource(root, hidden)).toHaveLength(0);
    });

    it('lights the windows of the painting it shows, at night', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      expect(propsOf(root, ['art', 'lamp']).art).toBe(PHONE_ISLAND.art);
    });

    it('tells each checkpoint how tall the screen is, so a short phone can have smaller ones', () => {
      const { root } = renderScene();
      const checkpoints = root.findAll((node) => node.props.view !== undefined && node.props.screenWidth !== undefined);

      expect(checkpoints).toHaveLength(7);
      checkpoints.forEach((checkpoint) => expect(checkpoint.props.screenHeight).toBe(SCREEN.height));
    });
  });

  describe('the picture', () => {
    it('covers the screen where the layout puts it, and is described for someone who cannot see it', () => {
      const { root } = renderScene();

      const underTest = picture(root, 'island-picture');
      const style = StyleSheet.flatten(underTest.props.style);

      expect(underTest.props.source).toEqual({ uri: 'test://island-phone' });
      expect(style).toEqual(expect.objectContaining({ position: 'absolute', ...LAYOUT.picture }));
      expect(underTest.props.accessibilityLabel).toBe('island.scene');
      expect(underTest.props.accessibilityRole).toBe('image');
    });

    it('lays the horizon over the sun, exactly on its place in the picture, taking no touches', () => {
      const { root } = renderScene();

      const horizon = picture(root, 'island-horizon');

      expect(horizon.props.source).toEqual({ uri: 'test://island-phone-horizon' });
      expect(StyleSheet.flatten(horizon.props.style)).toEqual(expect.objectContaining({ position: 'absolute', ...LAYOUT.band }));
      expect(horizon.props.pointerEvents).toBe('none');
    });

    it('draws the picture, then the sun, then the horizon in front of it', () => {
      const { root } = renderScene();

      const order = root
        .findAll((node) => ['island-picture', 'island-sun-clip', 'island-horizon'].includes(node.props.testID as string)
          && node.parent?.props.testID !== node.props.testID)
        .map((node) => node.props.testID);

      expect(order).toEqual(['island-picture', 'island-sun-clip', 'island-horizon']);
    });
  });

  describe('the sun', () => {
    it('is the same sun as on the home screen, at the size and place the island gives it', () => {
      const { root } = renderScene();

      const sun = root.findAll((node) => node.props.sun !== undefined && node.props.timeOfDay !== undefined)[0];

      expect(sun.props.sun).toEqual(LAYOUT.sun);
      expect(sun.props.timeOfDay).toBe('day');
      expect(outermost(root, 'sky-face').length).toBeGreaterThan(0);
    });

    it('is cut off at the foot of the horizon band, where nothing else would hide it', () => {
      const { root } = renderScene();

      const clip = styleOf(root, 'island-sun-clip');

      expect(clip).toEqual(expect.objectContaining({ position: 'absolute', left: 0, top: 0, height: LAYOUT.clipHeight, overflow: 'hidden' }));
      expect(clip.width).toBe(SCREEN.width);
    });

    it('can still be touched through the layers around it', () => {
      const { root } = renderScene();

      expect(innermost(root, 'island-sun-clip').props.pointerEvents).toBe('box-none');
      expect(innermost(root, 'island-sun-rise').props.pointerEvents).toBe('box-none');
    });

    it.each([0, 0.4, 0.8, 1])('stands as far below its place as the arrival says, at %p', (arrival) => {
      const { root } = renderScene(voyage({ arrival: { value: arrival } } as Partial<IslandVoyage>));

      expect(styleOf(root, 'island-sun-rise').transform).toEqual([{ translateY: sunRise(arrival, LAYOUT.riseFrom) }]);
    });

    it('becomes the moon at night', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      const sun = root.findAll((node) => node.props.sun !== undefined && node.props.timeOfDay !== undefined)[0];

      expect(sun.props.timeOfDay).toBe('night');
    });

    it.each([
      [true, false, true, 'full'],
      [true, true, true, 'gentle'],
      [false, false, false, 'off'],
    ])('when shown is %p and less motion is %p, has its face alive: %p, and moves: %s', (isActive, reduce, alive, mode) => {
      mockReduceMotion = reduce;
      const { root } = renderScene(voyage({ reduceMotion: reduce }), { isActive });
      act(() => { jest.advanceTimersByTime(2000); });

      const sun = root.findAll((node) => node.props.sun !== undefined && node.props.timeOfDay !== undefined)[0];

      expect(sun.props.animated).toBe(alive);
      expect(sun.props.mode).toBe(mode);
    });

    it.each([
      ['crossing', 'off'],
      ['arriving', 'off'],
      ['island', 'full'],
    ] as [VoyagePhase, string][])('while %s, shown and long settled, moves: %s, so its motion starts once the island is at rest', (phase, mode) => {
      const { root } = renderScene(voyage({ phase }), { isActive: true });
      act(() => { jest.advanceTimersByTime(2000); });

      const sun = root.findAll((node) => node.props.sun !== undefined && node.props.timeOfDay !== undefined)[0];

      expect(sun.props.mode).toBe(mode);
    });
  });

  describe('by day and by night', () => {
    it('is shown as painted by day', () => {
      const { root } = renderScene();

      expect(outermost(root, 'island-night')).toHaveLength(0);
      expect(outermost(root, 'island-horizon-night')).toHaveLength(0);
      expect(outermost(root, 'island-stars')).toHaveLength(0);
    });

    it('shows the painting`s stars at night, each sheet where the painting puts it, undimmed', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      ['stars-1', 'stars-2', 'stars-3'].forEach((id, index) => {
        const sheet = innermost(root, id);
        const frame = [
          { x: 10, y: 20, width: 1100, height: 300 },
          { x: 12, y: 18, width: 1090, height: 310 },
          { x: 8, y: 25, width: 1104, height: 290 },
        ][index];
        expect(StyleSheet.flatten(sheet.props.style)).toEqual(expect.objectContaining(artFrame(frame, LAYOUT)));
        expect(withSource(root, `test://phone-${id}`).length).toBeGreaterThan(0);
      });
      expect(outermost(root, 'island-stars')[0].props.pointerEvents).toBe('none');
      expect(outermost(root, 'island-stars')[0].props.accessibilityElementsHidden).toBe(true);
    });

    it('twinkles the star sheets in turn with the lamp`s clock', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      ['stars-1', 'stars-2', 'stars-3'].forEach((id, index) => {
        expect(StyleSheet.flatten(innermost(root, id).props.style).opacity).toBeCloseTo(starGlow(mockClocks.lamp.value, index, 3), 6);
      });
    });

    it('draws the stars over the night sky and behind the moon, so the moon, the clouds and the land hide them', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      const names = ['island-night', 'island-stars', 'island-sun-clip', 'cloud-near', 'island-horizon'];
      const order = root
        .findAll((node) => names.includes(node.props.testID as string) && node.parent?.props.testID !== node.props.testID)
        .map((node) => node.props.testID);

      expect(order).toEqual(names);
    });

    it('is dimmed to moonlight at night, behind the moon', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      const night = styleOf(root, 'island-night');

      expect(night).toEqual(expect.objectContaining({ ...LAYOUT.picture, backgroundColor: ISLAND_NIGHT.tint, opacity: ISLAND_NIGHT.strength }));
      expect(innermost(root, 'island-night').props.pointerEvents).toBe('none');
    });

    it('dims the horizon by the same amount, in its own shape, so the moon is not dimmed with it', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      const shade = picture(root, 'island-horizon-night');

      expect(shade.props.source).toEqual({ uri: 'test://island-phone-horizon' });
      expect(shade.props.tintColor).toBe(ISLAND_NIGHT.tint);
      expect(StyleSheet.flatten(shade.props.style)).toEqual(expect.objectContaining({ ...LAYOUT.band, opacity: ISLAND_NIGHT.strength }));
      expect(shade.props.pointerEvents).toBe('none');
    });

    it('draws the night over the picture and under the moon, and the shade over the horizon', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      const names = ['island-picture', 'island-night', 'island-sun-clip', 'island-horizon', 'island-horizon-night'];
      const order = root
        .findAll((node) => names.includes(node.props.testID as string) && node.parent?.props.testID !== node.props.testID)
        .map((node) => node.props.testID);

      expect(order).toEqual(names);
    });
  });

  describe('the island alive', () => {
    const has = (root: ReactTestInstance, testID: string) => root.findAll((node) => node.props.testID === testID).length > 0;

    it('is built up from the back: the painting, the water, the far trees and clouds, the sun, the horizon cloud, the land, the near trees, the gulls', () => {
      const { root } = renderScene();

      const names = [
        'island-picture', 'island-water-0', 'island-water-2', 'fall-window', 'pool-window', 'fall-cover', 'pool-cover', 'tree-low', 'cloud-far', 'billow',
        'island-sun-clip', 'cloud-near', 'island-horizon', 'tree-a', 'tree-b', 'island-gulls',
      ];
      const order = root
        .findAll((node) => names.includes(node.props.testID as string) && node.parent?.props.testID !== node.props.testID)
        .map((node) => node.props.testID);

      expect(order).toEqual(names);
    });

    it('puts the night over everything behind the moon, and nothing in front of it under that night', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      const names = [
        'island-water-2', 'fall-cover', 'tree-low', 'cloud-far', 'billow', 'island-night',
        'island-sun-clip', 'cloud-near', 'island-horizon', 'tree-b', 'island-lights',
      ];
      const order = root
        .findAll((node) => names.includes(node.props.testID as string) && node.parent?.props.testID !== node.props.testID)
        .map((node) => node.props.testID);

      expect(order).toEqual(names);
    });

    it.each([
      ['cloud-near-art-night', true],
      ['tree-a-art-night', true],
      ['tree-b-art-night', true],
      ['island-horizon-night', true],
      ['cloud-far-art-night', false],
      ['tree-low-art-night', false],
      ['billow-art-night', false],
    ])('at night, has %s: %p', (testID, there) => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      expect(has(root, testID)).toBe(there);
    });

    it('dims nothing in its own shape by day', () => {
      const { root } = renderScene();

      ['cloud-near-art-night', 'tree-a-art-night', 'island-horizon-night'].forEach((testID) => expect(has(root, testID)).toBe(false));
    });

    it('drives the clouds by the tide, the trees by the wind and the water by the ripple', () => {
      const { root } = renderScene();

      expect(styleOf(root, 'cloud-near').transform).toEqual([{ translateX: cloudDrift(0.25, 7, 2, 0) * LAYOUT.scale }]);
      expect(styleOf(root, 'cloud-far').transform).toEqual([{ translateX: cloudDrift(0.25, 12, 2, 0.5) * LAYOUT.scale }]);
      expect(styleOf(root, 'tree-low').transform[2]).toEqual({ rotate: `${treeSway(0.2, 0, 5.5)}deg` });
      expect(styleOf(root, 'island-water-1').opacity).toBe(waterGlow(0.5, 1, 3));
    });

    it('sways no two trees in step, near or far', () => {
      const { root } = renderScene();

      const leans = ['tree-low', 'tree-a', 'tree-b'].map((testID) => styleOf(root, testID).transform[2].rotate);

      expect(leans).toEqual([`${treeSway(0.2, 0, 5.5)}deg`, `${treeSway(0.2, 1, 3.2)}deg`, `${treeSway(0.2, 2, 3.2)}deg`]);
    });

    it('flies its gulls by day, and has no lights lit', () => {
      const { root } = renderScene();

      expect(has(root, `island-gull-${GULL_COURSES.length - 1}`)).toBe(true);
      expect(has(root, 'island-lights')).toBe(false);
      expect(has(root, 'lit-windows')).toBe(false);
    });

    it('has the gulls gone to roost at night, and the lights lit instead', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      expect(has(root, 'island-gulls')).toBe(false);
      expect(has(root, 'island-gull-0')).toBe(false);
      expect(has(root, 'lit-windows')).toBe(true);
      expect(has(root, 'lit-village-1')).toBe(true);
      expect(has(root, 'lighthouse-glow')).toBe(true);
    });

    it('runs the waterfall by the fall clock and the lights by the lamp clock', () => {
      const { root } = renderScene(voyage(), { timeOfDay: 'night' });

      expect(styleOf(root, 'fall-streaks').transform).toEqual([{ translateY: fallShift(0.4, 48) * LAYOUT.scale }]);
      expect(styleOf(root, 'lit-village-1').opacity).toBe(villageGlow(0.15, 0));
      expect(styleOf(root, 'lighthouse-beam').transform).toEqual([{ scaleX: beamReach(0.15) }]);
      expect(styleOf(root, 'pool-ring-1').opacity).toBe(poolRing(0.4, 1).opacity);
    });

    it('runs the waterfall by day as well', () => {
      const { root } = renderScene();

      expect(styleOf(root, 'fall-streaks').transform).toEqual([{ translateY: fallShift(0.4, 48) * LAYOUT.scale }]);
    });

    it.each([
      [true, false, 2000, true],
      [true, false, 100, false],
      [true, true, 2000, false],
      [false, false, 2000, false],
    ])('when shown is %p, less motion is %p and %i ms have passed, is alive: %p', (isActive, reduce, waited, alive) => {
      mockReduceMotion = reduce;
      renderScene(voyage({ reduceMotion: reduce }), { isActive });
      act(() => { jest.advanceTimersByTime(waited); });

      expect(mockAlive[mockAlive.length - 1]).toBe(alive);
    });

    // starting every tree, cloud and wave at once stalled the screen for 70-230 ms; started while
    // the cloud was parting it showed, started once the island has settled it cannot
    it.each([
      ['crossing', false],
      ['arriving', false],
      ['island', true],
      ['returning', true],
      ['recrossing', true],
      ['landing', true],
    ] as [VoyagePhase, boolean][])('while %s, shown and long settled, is alive: %p', (phase, alive) => {
      renderScene(voyage({ phase }), { isActive: true });
      act(() => { jest.advanceTimersByTime(2000); });

      expect(mockAlive[mockAlive.length - 1]).toBe(alive);
    });

    it('keeps everything that moves from a screen reader, and lets no touch land on it', () => {
      const { root } = renderScene();

      ['cloud-near', 'cloud-far', 'tree-a', 'tree-low', 'billow', 'island-water-0'].forEach((testID) => {
        expect(innermost(root, testID).props.pointerEvents).toBe('none');
      });
      expect(innermost(root, 'island-stage').props.importantForAccessibility).not.toBe('no-hide-descendants');
    });
  });

  describe('arriving', () => {
    it.each([0, 0.5, 1])('holds the island as close as the arrival says, at %p', (arrival) => {
      const { root } = renderScene(voyage({ arrival: { value: arrival } } as Partial<IslandVoyage>));

      expect(styleOf(root, 'island-stage').transform).toEqual([{ scale: islandScale(arrival) }]);
    });

    it.each([0, 0.8, 1])('brings the header into view as the arrival says, at %p', (arrival) => {
      const { root } = renderScene(voyage({ arrival: { value: arrival } } as Partial<IslandVoyage>));

      expect(styleOf(root, 'island-chrome').opacity).toBe(chromeOpacity(arrival));
    });

    const drawFrames = (count: number) => {
      for (let frame = 0; frame < count; frame += 1) act(() => { jest.advanceTimersByTime(17); });
    };

    it('says it is ready once its picture has loaded and two frames have been drawn, while the cloud is shut', () => {
      const given = voyage({ phase: 'crossing' });
      const { root } = renderScene(given);

      act(() => { picture(root, 'island-picture').props.onLoad(); });
      expect(given.islandReady).not.toHaveBeenCalled();
      drawFrames(1);
      expect(given.islandReady).not.toHaveBeenCalled();
      drawFrames(1);

      expect(given.islandReady).toHaveBeenCalledTimes(1);
    });

    it('says so two frames into a later visit, when the picture is already there', () => {
      const first = voyage({ phase: 'home' });
      const { root, show } = renderScene(first);
      act(() => { picture(root, 'island-picture').props.onLoad(); });
      drawFrames(3);
      expect(first.islandReady).not.toHaveBeenCalled();

      const second = voyage({ phase: 'crossing' });
      show(second);
      expect(second.islandReady).not.toHaveBeenCalled();
      drawFrames(2);

      expect(second.islandReady).toHaveBeenCalledTimes(1);
    });

    it('says nothing if the cloud stops waiting before the frames are drawn', () => {
      const first = voyage({ phase: 'crossing' });
      const { root, show } = renderScene(first);
      act(() => { picture(root, 'island-picture').props.onLoad(); });

      const moved = voyage({ phase: 'arriving' });
      show(moved);
      drawFrames(3);

      expect(first.islandReady).not.toHaveBeenCalled();
      expect(moved.islandReady).not.toHaveBeenCalled();
    });

    it.each(['home', 'leaving', 'arriving', 'island', 'returning', 'recrossing', 'landing'] as VoyagePhase[])(
      'says nothing about being ready while %s',
      (phase) => {
        const given = voyage({ phase });
        const { root } = renderScene(given);

        act(() => { picture(root, 'island-picture').props.onLoad(); });
        act(() => { jest.advanceTimersByTime(100); });

        expect(given.islandReady).not.toHaveBeenCalled();
      }
    );
  });

  describe('the learning plan on the map', () => {
    const has = (root: ReactTestInstance, testID: string) => root.findAll((node) => node.props.testID === testID).length > 0;
    const pressable = (root: ReactTestInstance, testID: string) =>
      root.findAll((node) => node.props.testID === testID && typeof node.props.onPress === 'function')[0];
    const marker = (root: ReactTestInstance, day: number) => pressable(root, `plan-checkpoint-${day}`);

    it('lays the seven checkpoints and their trail over the island, in front of everything that moves', () => {
      const { root } = renderScene();

      [1, 2, 3, 4, 5, 6, 7].forEach((day) => expect(has(root, `plan-checkpoint-${day}`)).toBe(true));
      const names = ['island-gulls', 'plan-trail', 'plan-checkpoint-1', 'plan-checkpoint-7'];
      const order = root
        .findAll((node) => names.includes(node.props.testID as string) && node.parent?.props.testID !== node.props.testID)
        .map((node) => node.props.testID);
      expect(order).toEqual(names);
    });

    it('keeps the checkpoints on the stage, so they settle in with the island', () => {
      const { root } = renderScene();

      expect(innermost(root, 'island-stage').findAll((node) => node.props.testID === 'plan-checkpoint-3').length).toBeGreaterThan(0);
    });

    it('lights the trail as far as the open day', () => {
      aWeek(['done', 'done', 'open', 'locked', 'locked', 'locked', 'locked']);
      const { root } = renderScene();

      const lit = root.findAll((node) => typeof node.props.testID === 'string' && node.props.testID.startsWith('plan-dash-') && node.props.fill === TRAIL_LIT);
      const pale = root.findAll((node) => typeof node.props.testID === 'string' && node.props.testID.startsWith('plan-dash-') && node.props.fill !== TRAIL_LIT);

      expect(lit.length).toBeGreaterThan(0);
      expect(pale.length).toBeGreaterThan(0);
      expect(lit.length + pale.length).toBe(root.findAll((node) => typeof node.props.testID === 'string' && node.props.testID.startsWith('plan-dash-')).length);
    });

    it('lights only the legs walked when the next day is still to open', () => {
      aWeek(['done', 'tomorrow', 'locked', 'locked', 'locked', 'locked', 'locked']);
      const open = renderScene().root;
      aWeek(['done', 'open', 'locked', 'locked', 'locked', 'locked', 'locked']);
      const tomorrow = renderScene().root;

      const litIn = (root: ReactTestInstance) => root.findAll((node) => typeof node.props.testID === 'string' && node.props.testID.startsWith('plan-dash-') && node.props.fill === TRAIL_LIT).length;

      expect(litIn(tomorrow)).toBeGreaterThan(litIn(open));
    });

    it('sizes the card to the screen it is on', () => {
      const { root } = renderScene();

      expect(StyleSheet.flatten(innermost(root, 'plan-panel').props.style).width).toBe(SCREEN.width - 2 * contentMargin(false));
    });

    it('opens the preview from the card`s Preview link, from where the cover sits, and tells the app what to preview', () => {
      const onPreviewActivity = jest.fn();
      const { root } = renderScene(voyage(), { onPreviewActivity });

      act(() => { pressable(root, 'plan-preview').props.onPress(); });

      expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ step: ISLAND_WEEK.steps[0] }));
      expect(onPreviewActivity).toHaveBeenCalledWith(
        { kind: 'story', storyId: 'snuggle-little-wombat' },
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), width: expect.any(Number), height: expect.any(Number) })
      );
    });

    it('previews nothing when the plan has nothing to set off on', () => {
      mockStart.mockImplementation(() => null);
      const onPreviewActivity = jest.fn();
      const { root } = renderScene(voyage(), { onPreviewActivity });

      act(() => { pressable(root, 'plan-preview').props.onPress(); });

      expect(onPreviewActivity).not.toHaveBeenCalled();
    });

    it('keeps the checkpoints` names clear of the card, measuring it once it is laid out', () => {
      const { root } = renderScene();
      const card = root.findAll((node) => node.props.testID === 'plan-panel-card' && typeof node.props.onLayout === 'function')[0];
      const floorOf = () =>
        root.findAll((node) => node.props.testID === 'plan-checkpoint-6-label' && node.props.style !== undefined)[0];
      const labelTop = () => StyleSheet.flatten(floorOf().props.style).top as number;

      act(() => { card.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 358, height: 120 } } }); });
      const roomy = labelTop();
      act(() => { card.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 358, height: 420 } } }); });
      const crowded = labelTop();

      const centre = artPoint(ISLAND_TRAIL[5].x, ISLAND_TRAIL[5].y, LAYOUT);
      expect(roomy).toBeGreaterThan(centre.y);
      expect(crowded).toBeLessThan(centre.y);
    });

    it('shows the panel for the day that is next, fading in with the rest of the chrome', () => {
      const { root } = renderScene(voyage({ arrival: { value: 0.9 } } as Partial<IslandVoyage>));

      expect(has(root, 'plan-panel')).toBe(true);
      expect(styleOf(root, 'island-plan-panel').opacity).toBe(chromeOpacity(0.9));
    });

    it('sets the child off when the open checkpoint is pressed, and tells the app what to open', () => {
      const onStartActivity = jest.fn();
      const { root } = renderScene(voyage(), { onStartActivity });

      act(() => { marker(root, 1).props.onPress(); });

      expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ step: ISLAND_WEEK.steps[0] }));
      expect(onStartActivity).toHaveBeenCalledWith({ kind: 'story', storyId: 'snuggle-little-wombat' });
    });

    it('sets the child off from the panel`s button just the same', () => {
      const onStartActivity = jest.fn();
      const { root } = renderScene(voyage(), { onStartActivity });

      act(() => { pressable(root, 'plan-start').props.onPress(); });

      expect(onStartActivity).toHaveBeenCalledWith({ kind: 'story', storyId: 'snuggle-little-wombat' });
    });

    it('opens nothing when the plan has nothing to set off on', () => {
      mockStart.mockImplementation(() => null);
      const onStartActivity = jest.fn();
      const { root } = renderScene(voyage(), { onStartActivity });

      act(() => { pressable(root, 'plan-start').props.onPress(); });

      expect(onStartActivity).not.toHaveBeenCalled();
    });

    it('breathes the open checkpoint by the island`s own wind', () => {
      const { root } = renderScene();

      const glow = styleOf(root, 'plan-checkpoint-1-glow');

      expect((glow.transform as { scale: number }[])[0].scale).toBeGreaterThan(1);
    });
  });

  describe('the header', () => {
    const button = (root: ReactTestInstance, testID: string) =>
      root.findAll((node) => node.props.testID === testID && node.props.type !== undefined)[0];

    it('runs across the top like every other page: clear of the status bar, a margin in from each side, one button high', () => {
      const { root } = renderScene();

      expect(styleOf(root, 'island-chrome')).toEqual(
        expect.objectContaining({
          position: 'absolute',
          top: journeyHeaderTop(TOP_INSET, false),
          left: contentMargin(false),
          right: contentMargin(false),
          height: CIRCLE_BUTTON_DIAMETER_PHONE,
          flexDirection: 'row',
          justifyContent: 'space-between',
        })
      );
    });

    it('has the same Home pill on the left as the other pages, word and all', () => {
      const { root } = renderScene();

      const home = button(root, 'island-home-button');

      expect(home.props.type).toBe('home');
      expect(home.props.label).toBe('common.home');
      expect(home.props.accessibilityLabel).toBe('common.home');
    });

    it('sets off for home when the pill is pressed', () => {
      const given = voyage();
      const { root } = renderScene(given);

      act(() => { button(root, 'island-home-button').props.onPress(); });

      expect(given.comeBack).toHaveBeenCalledTimes(1);
    });

    it('has the speaker on the right, as the other pages do', () => {
      const { root } = renderScene();

      const speaker = button(root, 'island-sound-button');
      const order = root
        .findAll((node) => ['island-home-button', 'island-sound-button'].includes(node.props.testID as string) && node.props.type !== undefined)
        .map((node) => node.props.testID);

      expect(speaker.props.type).toBe('audio');
      expect(speaker.props.label).toBeUndefined();
      expect(speaker.props.accessibilityLabel).toBe('catalogue.sound');
      expect(order).toEqual(['island-home-button', 'island-sound-button']);
    });

    it.each([true, false])('shows the speaker crossed out when the sound is off: %p', (muted) => {
      mockMuted = muted;
      const { root } = renderScene();

      expect(button(root, 'island-sound-button').props.muted).toBe(muted);
    });

    it('turns the sound off and on when the speaker is pressed', () => {
      const { root } = renderScene();

      act(() => { button(root, 'island-sound-button').props.onPress(); });

      expect(mockToggleMute).toHaveBeenCalledTimes(1);
    });
  });
  describe('the road map behind the last day', () => {
    const DONE = ['done', 'done', 'done', 'done', 'done', 'done', 'done'] as const;
    const has = (root: ReactTestInstance, testID: string) => root.findAll((node) => node.props.testID === testID).length > 0;
    const roadmapIn = (root: ReactTestInstance) =>
      root.findAll((node) => Array.isArray(node.props.controls))[0];
    const press = (root: ReactTestInstance, testID: string) => {
      const target = root.findAll((node) => node.props.testID === testID && typeof node.props.onPress === 'function')[0];
      act(() => { target.props.onPress(); });
    };
    const openTheMap = (root: ReactTestInstance) => press(root, 'plan-checkpoint-7');
    const layoutOf = (root: ReactTestInstance, testID: string, rect: { x: number; y: number; width: number; height: number }) => {
      const host = root.findAll(
        (node) => typeof node.props.onLayout === 'function' && node.findAll((child) => child.props.testID === testID).length > 0
      )[0];
      act(() => { host.props.onLayout({ nativeEvent: { layout: rect } }); });
    };

    beforeEach(() => aWeek([...DONE]));

    it('keeps the island once the whole week is done, its checkpoints, trail and card all there', () => {
      const { root } = renderScene();

      expect(has(root, 'island-picture')).toBe(true);
      expect(has(root, 'plan-checkpoint-1')).toBe(true);
      expect(has(root, 'island-plan-panel')).toBe(true);
      expect(has(root, 'roadmap-scene')).toBe(false);
    });

    it.each([1, 3, 6])('plays day %i again when it is pressed, and opens no map', (day) => {
      const onStartActivity = jest.fn();
      const { root } = renderScene(voyage(), { onStartActivity });

      press(root, `plan-checkpoint-${day}`);

      expect(mockStart).toHaveBeenCalledWith(mockPlanSteps[day - 1]);
      expect(onStartActivity).toHaveBeenCalledWith(mockPlanSteps[day - 1].launch);
      expect(has(root, 'roadmap-scene')).toBe(false);
    });

    it('opens the road map over the island when the last day, done, is pressed, and plays nothing', () => {
      const onStartActivity = jest.fn();
      const { root } = renderScene(voyage(), { onStartActivity });

      openTheMap(root);

      expect(has(root, 'roadmap-scene')).toBe(true);
      expect(has(root, 'island-picture')).toBe(true);
      expect(mockStart).not.toHaveBeenCalled();
      expect(onStartActivity).not.toHaveBeenCalled();
    });

    it('starts the last day as any other while it is still open', () => {
      aWeek(['done', 'done', 'done', 'done', 'done', 'done', 'open']);
      const onStartActivity = jest.fn();
      const { root } = renderScene(voyage(), { onStartActivity });

      openTheMap(root);

      expect(onStartActivity).toHaveBeenCalledWith(mockPlanSteps[6].launch);
      expect(has(root, 'roadmap-scene')).toBe(false);
    });

    it('lays the map over everything on the island, its own buttons on top, and hides the island from a screen reader', () => {
      const { root } = renderScene();
      openTheMap(root);

      const ids = root.findAll((node) => typeof node.props.testID === 'string').map((node) => node.props.testID);
      const layer = root.findAll((node) => node.props.testID === 'island-roadmap' && node.props.style !== undefined)[0];
      const island = root.findAll((node) => node.props.testID === 'island-stage' && node.props.importantForAccessibility !== undefined)[0];

      expect(ids.indexOf('island-roadmap')).toBeGreaterThan(ids.indexOf('island-chrome'));
      expect(ids.indexOf('roadmap-back-button')).toBeGreaterThan(ids.indexOf('roadmap-scene'));
      expect(StyleSheet.flatten(layer.props.style)).toEqual(expect.objectContaining({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }));
      expect(layer.props.accessibilityViewIsModal).toBe(true);
      expect(island.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(island.props.accessibilityElementsHidden).toBe(true);
    });

    it('heads the map with a way back to the island, Play again beside it and the speaker on the right', () => {
      const { root } = renderScene();
      openTheMap(root);

      const back = root.findAll((node) => node.props.testID === 'roadmap-back-button' && node.props.type !== undefined)[0];
      const again = root.findAll((node) => node.props.testID === 'roadmap-play-again' && node.props.icon !== undefined)[0];
      const sound = root.findAll((node) => node.props.testID === 'roadmap-sound-button' && node.props.type !== undefined)[0];
      const row = root.findAll((node) => node.props.testID === 'roadmap-chrome' && node.props.style !== undefined)[0];

      expect(back.props).toEqual(expect.objectContaining({ type: 'back', label: 'common.back', accessibilityLabel: 'common.back' }));
      expect(again.props).toEqual(expect.objectContaining({ label: 'roadmap.playAgain', icon: 'refresh' }));
      expect(sound.props).toEqual(expect.objectContaining({ type: 'audio', muted: mockMuted, accessibilityLabel: 'catalogue.sound' }));
      expect(StyleSheet.flatten(row.props.style)).toEqual(
        expect.objectContaining({ top: journeyHeaderTop(TOP_INSET, false), left: contentMargin(false), right: contentMargin(false), height: CIRCLE_BUTTON_DIAMETER_PHONE })
      );
    });

    it.each([
      ['a phone', false, ROADMAP.playAgain.phone],
      ['a tablet', true, ROADMAP.playAgain.tablet],
    ])('keeps Play again compact on %s, one icon and no twin, so it sits beside Back and clear of the speaker', (_name, tablet, size) => {
      mockTablet = tablet;
      const { root } = renderScene();
      openTheMap(root);

      const again = root.findAll((node) => node.props.testID === 'roadmap-play-again' && node.props.icon !== undefined)[0];

      expect(again.props).toEqual(
        expect.objectContaining({
          balanced: false,
          fontSize: size.fontSize,
          iconSize: size.iconSize,
          paddingHorizontal: size.padding,
          height: tablet ? CIRCLE_BUTTON_DIAMETER_TABLET : CIRCLE_BUTTON_DIAMETER_PHONE,
        })
      );
      expect(size.padding).toBeLessThan(26);
    });

    it('goes back to the island from its back button, the map gone', () => {
      const { root } = renderScene();
      openTheMap(root);

      press(root, 'roadmap-back-button');

      expect(has(root, 'roadmap-scene')).toBe(false);
      expect(has(root, 'island-picture')).toBe(true);
    });

    it('plays the last day again from Play again, closing the map', () => {
      const onStartActivity = jest.fn();
      const { root } = renderScene(voyage(), { onStartActivity });
      openTheMap(root);

      press(root, 'roadmap-play-again');

      expect(mockStart).toHaveBeenCalledWith(mockPlanSteps[6]);
      expect(onStartActivity).toHaveBeenCalledWith(mockPlanSteps[6].launch);
      expect(has(root, 'roadmap-scene')).toBe(false);
    });

    it('closes the map and opens nothing from Play again when the last day has nothing to open', () => {
      const onStartActivity = jest.fn();
      mockStart.mockImplementation(() => null);
      const { root } = renderScene(voyage(), { onStartActivity });
      openTheMap(root);

      press(root, 'roadmap-play-again');

      expect(mockStart).toHaveBeenCalledWith(mockPlanSteps[6]);
      expect(onStartActivity).not.toHaveBeenCalled();
      expect(has(root, 'roadmap-scene')).toBe(false);
    });

    it('turns the sound off and on from the map`s speaker', () => {
      const { root } = renderScene();
      openTheMap(root);

      press(root, 'roadmap-sound-button');

      expect(mockToggleMute).toHaveBeenCalledTimes(1);
    });

    it('tells the map where its buttons sit, measured once laid out, so the portal stays clear of them', () => {
      const { root } = renderScene();
      openTheMap(root);
      const top = journeyHeaderTop(TOP_INSET, false);
      const margin = contentMargin(false);
      const size = CIRCLE_BUTTON_DIAMETER_PHONE;
      const before = roadmapIn(root).props.controls;

      layoutOf(root, 'roadmap-back-button', { x: 0, y: 0, width: 92.4, height: size });
      layoutOf(root, 'roadmap-play-again', { x: 104, y: 0, width: 151.6, height: 52 });

      expect(before).toEqual([
        { left: margin, top, width: size * ROADMAP.homePillSpan, height: size },
        { left: SCREEN.width - margin - size, top, width: size, height: size },
      ]);
      expect(roadmapIn(root).props.controls).toEqual([
        { left: margin, top, width: 92, height: size },
        { left: margin + 104, top, width: 152, height: 52 },
        { left: SCREEN.width - margin - size, top, width: size, height: size },
      ]);
    });

    it('keeps the owl quiet while the map is up', () => {
      const { root } = renderScene();
      act(() => { jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS); });
      const tourOf = () => root.findAll((node) => node.props.id === 'island_tour' && node.props.targets !== undefined)[0];
      const before = tourOf().props.active;

      openTheMap(root);

      expect(before).toBe(true);
      expect(tourOf().props.active).toBe(false);
    });

    describe('fading in and out', () => {
      const timing = withTiming as unknown as jest.Mock;
      const delay = withDelay as unknown as jest.Mock;
      const realTiming = timing.getMockImplementation();
      let finishes: ((finished: boolean) => void)[] = [];
      const timed = (value: number, duration: number) =>
        timing.mock.calls.filter(([to, config]) => to === value && config?.duration === duration);
      const overlay = (root: ReactTestInstance) =>
        root.findAll((node) => node.props.testID === 'island-roadmap' && node.props.style !== undefined)[0];

      function holdTheFade() {
        finishes = [];
        timing.mockImplementation((value: number, _config: unknown, callback?: (finished: boolean) => void) => {
          if (callback) finishes.push(callback);
          return value;
        });
      }

      afterEach(() => {
        timing.mockImplementation(realTiming);
        mockReduceMotion = false;
      });

      it('runs no fade at all while the map has never been opened', () => {
        timing.mockClear();

        renderScene();

        expect(timed(0, ROADMAP.fade.out.duration)).toHaveLength(0);
        expect(timed(1, ROADMAP.fade.mapIn.duration)).toHaveLength(0);
      });

      it('fades the map in over the island, then its heading after it', () => {
        const { root } = renderScene();
        timing.mockClear();
        delay.mockClear();

        openTheMap(root);

        const fadesIn = timing.mock.calls.filter(([to]) => to === 1).map(([, config]) => config.duration);

        expect(fadesIn.filter((duration) => duration === ROADMAP.fade.mapIn.duration)).toHaveLength(1);
        expect(fadesIn.filter((duration) => duration === ROADMAP.fade.titleIn.duration)).toHaveLength(1);
        expect(delay).toHaveBeenCalledWith(ROADMAP.fade.titleDelay.duration, expect.anything());
        expect(overlay(root).props.pointerEvents).toBe('auto');
        expect(typeof StyleSheet.flatten(overlay(root).props.style).opacity).toBe('number');
      });

      it('hands the map its heading`s fade', () => {
        const { root } = renderScene();
        openTheMap(root);

        const scene = root.findAll((node) => Array.isArray(node.props.controls) && node.props.titleStyle !== undefined)[0];

        expect(typeof StyleSheet.flatten(scene.props.titleStyle).opacity).toBe('number');
      });

      it('fades the map out from Back, still showing it, letting touches through to the island, and only then takes it away', () => {
        holdTheFade();
        const { root } = renderScene();
        openTheMap(root);
        finishes = [];
        timing.mockClear();

        press(root, 'roadmap-back-button');
        const leaving = overlay(root);
        const island = root.findAll((node) => node.props.testID === 'island-stage' && node.props.accessibilityElementsHidden !== undefined)[0];

        expect(timed(0, ROADMAP.fade.out.duration).length).toBeGreaterThanOrEqual(1);
        expect(leaving).toBeDefined();
        expect(leaving.props.pointerEvents).toBe('none');
        expect(leaving.props.accessibilityViewIsModal).toBe(false);
        expect(island.props.accessibilityElementsHidden).toBe(false);

        act(() => finishes.forEach((finish) => finish(true)));

        expect(has(root, 'island-roadmap')).toBe(false);
        expect(has(root, 'roadmap-scene')).toBe(false);
      });

      it('keeps the map if it is opened again before it has faded away', () => {
        holdTheFade();
        const { root } = renderScene();
        openTheMap(root);
        press(root, 'roadmap-back-button');
        const outgoing = [...finishes];

        openTheMap(root);
        act(() => outgoing.forEach((finish) => finish(false)));

        expect(has(root, 'roadmap-scene')).toBe(true);
        expect(overlay(root).props.pointerEvents).toBe('auto');
      });

      it('fades the map out as Play again sets the last day off', () => {
        holdTheFade();
        const onStartActivity = jest.fn();
        const { root } = renderScene(voyage(), { onStartActivity });
        openTheMap(root);
        timing.mockClear();

        press(root, 'roadmap-play-again');

        expect(onStartActivity).toHaveBeenCalledTimes(1);
        expect(timed(0, ROADMAP.fade.out.duration).length).toBeGreaterThanOrEqual(1);
        expect(overlay(root).props.pointerEvents).toBe('none');
      });

      it('keeps a short dissolve under Reduce Motion, with no wait for the heading', () => {
        mockReduceMotion = true;
        const { root } = renderScene();
        timing.mockClear();
        delay.mockClear();

        openTheMap(root);

        const fadesIn = timing.mock.calls.filter(([to]) => to === 1).map(([, config]) => config.duration);

        expect(fadesIn.filter((duration) => duration === ROADMAP.fade.mapIn.reducedDuration)).toHaveLength(2);
        expect(fadesIn).not.toContain(ROADMAP.fade.mapIn.duration);
        expect(fadesIn).not.toContain(ROADMAP.fade.titleIn.duration);
        expect(delay).toHaveBeenCalledWith(0, expect.anything());
      });
    });

    it('closes the map when the island is left, so it is not waiting there on the next visit', () => {
      const view = renderScene();
      openTheMap(view.root);

      view.rerender(
        <IslandVoyageProvider voyage={view.given}>
          <IslandScene timeOfDay="day" isActive={false} />
        </IslandVoyageProvider>
      );
      view.rerender(
        <IslandVoyageProvider voyage={view.given}>
          <IslandScene timeOfDay="day" isActive />
        </IslandVoyageProvider>
      );

      expect(has(view.root, 'roadmap-scene')).toBe(false);
    });

    it('closes the map, not the island, on Android`s back button', () => {
      const listeners: (() => boolean)[] = [];
      const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
        listeners.push(handler as () => boolean);
        return { remove: () => { listeners.splice(listeners.indexOf(handler as () => boolean), 1); } };
      });
      const { root, given } = renderScene();
      const idle = listeners.length;
      openTheMap(root);

      let handled = false;
      act(() => { handled = listeners[listeners.length - 1](); });

      expect(idle).toBe(0);
      expect(handled).toBe(true);
      expect(has(root, 'roadmap-scene')).toBe(false);
      expect(listeners).toHaveLength(0);
      expect(given.comeBack).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
