import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { ReactTestInstance } from 'react-test-renderer';
import { IslandScene } from '@/components/island/island-scene';
import { IslandVoyageProvider, type IslandVoyage } from '@/contexts/island-voyage-context';
import { ISLAND_NIGHT, islandLayout } from '@/constants/island-scene';
import { chromeOpacity, islandScale, sunRise, type VoyagePhase } from '@/constants/island-voyage';
import { GULL_COURSES, beamReach, cloudDrift, fallShift, poolRing, treeSway, villageGlow, waterGlow } from '@/constants/island-life';
import { CIRCLE_BUTTON_DIAMETER_PHONE, contentMargin, journeyHeaderTop } from '@/components/child-ui/tokens';

const SCREEN = { width: 390, height: 844 };
const TOP_INSET = 47;
const LAYOUT = islandLayout({ ...SCREEN, topInset: TOP_INSET });

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({
    scaledFontSize: (size: number) => size,
    scaledPadding: (size: number) => size,
    scaledButtonSize: (size: number) => size,
    isTablet: false,
    textSizeScale: 1,
  }),
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
    mockMuted = false;
    mockToggleMute.mockClear();
    mockAlive.length = 0;
    (useAnimatedStyle as jest.Mock).mockImplementation((build: () => object) => build());
  });

  afterEach(() => {
    (useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('the picture', () => {
    it('covers the screen where the layout puts it, and is described for someone who cannot see it', () => {
      const { root } = renderScene();

      const underTest = picture(root, 'island-picture');
      const style = StyleSheet.flatten(underTest.props.style);

      expect(underTest.props.source).toEqual({ uri: 'test://island' });
      expect(style).toEqual(expect.objectContaining({ position: 'absolute', ...LAYOUT.picture }));
      expect(underTest.props.accessibilityLabel).toBe('island.scene');
      expect(underTest.props.accessibilityRole).toBe('image');
    });

    it('lays the horizon over the sun, exactly on its place in the picture, taking no touches', () => {
      const { root } = renderScene();

      const horizon = picture(root, 'island-horizon');

      expect(horizon.props.source).toEqual({ uri: 'test://island-horizon' });
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
  });

  describe('by day and by night', () => {
    it('is shown as painted by day', () => {
      const { root } = renderScene();

      expect(outermost(root, 'island-night')).toHaveLength(0);
      expect(outermost(root, 'island-horizon-night')).toHaveLength(0);
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

      expect(shade.props.source).toEqual({ uri: 'test://island-horizon' });
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

    it('says it is ready once its picture has loaded, while the cloud is shut and waiting', () => {
      const given = voyage({ phase: 'crossing' });
      const { root } = renderScene(given);
      expect(given.islandReady).not.toHaveBeenCalled();

      act(() => { picture(root, 'island-picture').props.onLoad(); });

      expect(given.islandReady).toHaveBeenCalledTimes(1);
    });

    it('says so at once on a later visit, when the picture is already there', () => {
      const first = voyage({ phase: 'home' });
      const { root, show } = renderScene(first);
      act(() => { picture(root, 'island-picture').props.onLoad(); });
      expect(first.islandReady).not.toHaveBeenCalled();

      const second = voyage({ phase: 'crossing' });
      show(second);

      expect(second.islandReady).toHaveBeenCalledTimes(1);
    });

    it.each(['home', 'leaving', 'arriving', 'island', 'returning', 'recrossing', 'landing'] as VoyagePhase[])(
      'says nothing about being ready while %s',
      (phase) => {
        const given = voyage({ phase });
        const { root } = renderScene(given);

        act(() => { picture(root, 'island-picture').props.onLoad(); });

        expect(given.islandReady).not.toHaveBeenCalled();
      }
    );
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
});
