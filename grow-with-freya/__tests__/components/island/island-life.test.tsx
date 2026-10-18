import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { ReactTestInstance } from 'react-test-renderer';
import { MoonlitImage } from '@/components/island/moonlit-image';
import { BillowingCloud, DriftingCloud } from '@/components/island/island-clouds';
import { SwayingTree } from '@/components/island/island-trees';
import { IslandWater } from '@/components/island/island-water';
import { GULL_COLOUR, IslandGulls } from '@/components/island/island-gulls';
import { IslandWaterfalls } from '@/components/island/island-falls';
import { IslandLights } from '@/components/island/island-lights';
import { ISLAND_NIGHT, artFrame, artPoint, islandLayout } from '@/constants/island-scene';
import {
  GULL_COURSES,
  ISLAND_LIFE,
  beamReach,
  billowSwell,
  cloudDrift,
  fallShift,
  lampFlare,
  poolRing,
  pulseRing,
  sprayPose,
  villageGlow,
  gullPlace,
  gullProgress,
  treeSway,
  waterGlow,
  wingLift,
} from '@/constants/island-life';
import type { IslandBillowArt, IslandCloudArt, IslandFallArt, IslandPoolArt, IslandTreeArt } from '@/constants/island-art';
import type { SharedValue } from 'react-native-reanimated';

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
    farClouds: [],
    nearClouds: [],
    billows: [],
    lowTrees: [],
    horizonTrees: [],
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
      { id: 'lit-village-2', source: { uri: 'test://village-2' }, frame: { x: 200, y: 590, width: 850, height: 600 } },
    ],
    lighthouse: {
      x: 996,
      y: 568,
      glow: { uri: 'test://lamp-glow' },
      glowSize: 76,
      beam: { uri: 'test://lamp-beam' },
      beamLength: 380,
      beamHeight: 44,
      pulse: { uri: 'test://lamp-pulse' },
      pulseSize: 150,
    },
  },
}));

const LAYOUT = islandLayout({ width: 390, height: 844, topInset: 47 });
const CLOUD: IslandCloudArt = { id: 'cloud', source: { uri: 'test://cloud' }, frame: { x: 500, y: 300, width: 600, height: 150 }, reach: 7, beats: 2, lag: 0.1 };
const BILLOW: IslandBillowArt = { id: 'billow', source: { uri: 'test://billow' }, frame: { x: 0, y: 1237, width: 312, height: 165 }, anchorX: 0, anchorY: 1 };
const FALL: IslandFallArt = {
  id: 'fall',
  streaks: { uri: 'test://streaks' },
  cover: { uri: 'test://cover' },
  frame: { x: 96, y: 798, width: 66, height: 88 },
  tile: 48,
  sprayX: 160,
  sprayY: 886,
  spraySize: 56,
};
const POOL: IslandPoolArt = {
  id: 'pool',
  cover: { uri: 'test://pool-cover' },
  frame: { x: 148, y: 876, width: 156, height: 92 },
  ringX: 188,
  ringY: 906,
  ringWidth: 104,
};
const TREE: IslandTreeArt = { id: 'tree', source: { uri: 'test://tree' }, frame: { x: 562, y: 355, width: 52, height: 75 }, pivotX: 588, pivotY: 432, sway: 3.2 };

function clock(value: number): SharedValue<number> {
  return { value } as SharedValue<number>;
}

function outer(root: ReactTestInstance, testID: string): ReactTestInstance {
  const found = root.findAll((node) => node.props.testID === testID && node.parent?.props.testID !== testID);
  if (found.length === 0) throw new Error(`nothing called ${testID}`);
  return found[0];
}

function inner(root: ReactTestInstance, testID: string): ReactTestInstance {
  const found = root.findAll((node) => node.props.testID === testID);
  if (found.length === 0) throw new Error(`nothing called ${testID}`);
  return found[found.length - 1];
}

function picture(root: ReactTestInstance, testID: string): ReactTestInstance {
  const found = root.findAll((node) => node.props.testID === testID && node.props.contentFit !== undefined);
  if (found.length === 0) throw new Error(`no picture called ${testID}`);
  return found[0];
}

function has(root: ReactTestInstance, testID: string): boolean {
  return root.findAll((node) => node.props.testID === testID).length > 0;
}

function styleOf(root: ReactTestInstance, testID: string) {
  return StyleSheet.flatten(inner(root, testID).props.style);
}

beforeEach(() => {
  (useAnimatedStyle as jest.Mock).mockImplementation((build: () => object) => build());
});

afterEach(() => {
  (useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
});

describe('MoonlitImage', () => {
  const FRAME = { left: 10, top: 20, width: 300, height: 120 };

  it('draws the picture where it is told, to the size it is told, taking no touches', () => {
    const { UNSAFE_root: root } = render(<MoonlitImage testID="piece" source={{ uri: 'test://piece' }} frame={FRAME} night={false} />);

    const underTest = picture(root, 'piece');

    expect(underTest.props.source).toEqual({ uri: 'test://piece' });
    expect(StyleSheet.flatten(underTest.props.style)).toEqual(expect.objectContaining({ position: 'absolute', ...FRAME }));
    expect(underTest.props.pointerEvents).toBe('none');
    expect(underTest.props.contentFit).toBe('fill');
    expect(has(root, 'piece-night')).toBe(false);
  });

  it('lays the night over it in its own shape, so nothing behind it is dimmed', () => {
    const { UNSAFE_root: root } = render(<MoonlitImage testID="piece" source={{ uri: 'test://piece' }} frame={FRAME} night />);

    const shade = picture(root, 'piece-night');

    expect(shade.props.source).toEqual({ uri: 'test://piece' });
    expect(shade.props.tintColor).toBe(ISLAND_NIGHT.tint);
    expect(StyleSheet.flatten(shade.props.style)).toEqual(expect.objectContaining({ ...FRAME, opacity: ISLAND_NIGHT.strength }));
    expect(shade.props.pointerEvents).toBe('none');
  });
});

describe('DriftingCloud', () => {
  it('sits where it was painted, to the size it was painted', () => {
    const { UNSAFE_root: root } = render(<DriftingCloud cloud={CLOUD} layout={LAYOUT} tide={clock(0)} />);

    const frame = artFrame(CLOUD.frame, LAYOUT);

    expect(styleOf(root, 'cloud')).toEqual(expect.objectContaining({ position: 'absolute', ...frame }));
    expect(StyleSheet.flatten(picture(root, 'cloud-art').props.style)).toEqual(
      expect.objectContaining({ left: 0, top: 0, width: frame.width, height: frame.height })
    );
    expect(inner(root, 'cloud').props.pointerEvents).toBe('none');
  });

  it.each([0, 0.13, 0.4, 0.75])('is carried as far as the tide says, measured on this screen, at a tide of %p', (tide) => {
    const { UNSAFE_root: root } = render(<DriftingCloud cloud={CLOUD} layout={LAYOUT} tide={clock(tide)} />);

    expect(styleOf(root, 'cloud').transform).toEqual([
      { translateX: cloudDrift(tide, CLOUD.reach, CLOUD.beats, CLOUD.lag) * LAYOUT.scale },
    ]);
  });

  it('is dimmed in its own shape at night when it lies in front of the moon, and not otherwise', () => {
    const lit = render(<DriftingCloud cloud={CLOUD} layout={LAYOUT} tide={clock(0)} />);
    const dimmed = render(<DriftingCloud cloud={CLOUD} layout={LAYOUT} tide={clock(0)} night />);

    expect(has(lit.UNSAFE_root, 'cloud-art-night')).toBe(false);
    expect(has(dimmed.UNSAFE_root, 'cloud-art-night')).toBe(true);
  });
});

describe('BillowingCloud', () => {
  it.each([0, 0.05, 0.2])('swells about its corner of the painting, at a tide of %p', (tide) => {
    const { UNSAFE_root: root } = render(<BillowingCloud billow={BILLOW} layout={LAYOUT} tide={clock(tide)} index={1} />);

    const frame = artFrame(BILLOW.frame, LAYOUT);

    expect(styleOf(root, 'billow')).toEqual(expect.objectContaining({ position: 'absolute', ...frame }));
    expect(styleOf(root, 'billow').transform).toEqual([
      { translateX: -frame.width / 2 },
      { translateY: frame.height / 2 },
      { scale: billowSwell(tide, 1) },
      { translateX: frame.width / 2 },
      { translateY: -frame.height / 2 },
    ]);
  });

  it('swells about the right-hand corner when that is its corner', () => {
    const right = { ...BILLOW, anchorX: 1 as const };
    const { UNSAFE_root: root } = render(<BillowingCloud billow={right} layout={LAYOUT} tide={clock(0.05)} index={0} />);

    const frame = artFrame(right.frame, LAYOUT);

    expect(styleOf(root, 'billow').transform[0]).toEqual({ translateX: frame.width / 2 });
    expect(styleOf(root, 'billow').transform[3]).toEqual({ translateX: -frame.width / 2 });
  });
});

describe('SwayingTree', () => {
  const frame = artFrame(TREE.frame, LAYOUT);
  const pivot = artPoint(TREE.pivotX, TREE.pivotY, LAYOUT);
  const across = pivot.x - (frame.left + frame.width / 2);
  const down = pivot.y - (frame.top + frame.height / 2);

  it('stands where it was painted, taking no touches', () => {
    const { UNSAFE_root: root } = render(<SwayingTree tree={TREE} layout={LAYOUT} wind={clock(0)} index={3} />);

    expect(styleOf(root, 'tree')).toEqual(expect.objectContaining({ position: 'absolute', ...frame }));
    expect(inner(root, 'tree').props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(picture(root, 'tree-art').props.style)).toEqual(
      expect.objectContaining({ left: 0, top: 0, width: frame.width, height: frame.height })
    );
  });

  it.each([0, 0.2, 0.6])('leans about its foot as the wind says, at a wind of %p', (wind) => {
    const { UNSAFE_root: root } = render(<SwayingTree tree={TREE} layout={LAYOUT} wind={clock(wind)} index={3} />);

    expect(styleOf(root, 'tree').transform).toEqual([
      { translateX: across },
      { translateY: down },
      { rotate: `${treeSway(wind, 3, TREE.sway)}deg` },
      { translateX: -across },
      { translateY: -down },
    ]);
  });

  it('turns about a point below its middle, where it is rooted', () => {
    expect(down).toBeGreaterThan(0);
  });

  it('is dimmed in its own shape at night when it stands in front of the moon', () => {
    const { UNSAFE_root: root } = render(<SwayingTree tree={TREE} layout={LAYOUT} wind={clock(0)} index={0} night />);

    expect(has(root, 'tree-art-night')).toBe(true);
  });
});

describe('IslandWater', () => {
  it.each([0, 0.2, 0.5, 0.9])('shows each sheet of wave marks as much as the ripple says, at %p', (ripple) => {
    const { UNSAFE_root: root } = render(<IslandWater layout={LAYOUT} ripple={clock(ripple)} />);

    [0, 1, 2].forEach((sheet) => {
      expect(styleOf(root, `island-water-${sheet}`).opacity).toBe(waterGlow(ripple, sheet, 3));
    });
  });

  it('lays every sheet over the whole painting, taking no touches', () => {
    const { UNSAFE_root: root } = render(<IslandWater layout={LAYOUT} ripple={clock(0)} />);

    [0, 1, 2].forEach((sheet) => {
      expect(styleOf(root, `island-water-${sheet}`)).toEqual(expect.objectContaining({ position: 'absolute', ...LAYOUT.picture }));
      expect(inner(root, `island-water-${sheet}`).props.pointerEvents).toBe('none');
      const art = picture(root, `island-water-${sheet}-art`);
      expect(art.props.source).toEqual({ uri: `test://water-${sheet + 1}` });
      expect(StyleSheet.flatten(art.props.style)).toEqual(
        expect.objectContaining({ width: LAYOUT.picture.width, height: LAYOUT.picture.height })
      );
    });
  });
});

describe('IslandGulls', () => {
  const renderGulls = (sky: number, beat: number) =>
    render(<IslandGulls layout={LAYOUT} sky={clock(sky)} beat={clock(beat)} />).UNSAFE_root;

  it('flies one gull for every course', () => {
    const root = renderGulls(0, 0);

    GULL_COURSES.forEach((_, index) => expect(has(root, `island-gull-${index}`)).toBe(true));
    expect(has(root, `island-gull-${GULL_COURSES.length}`)).toBe(false);
  });

  it.each([0, 0.3, 0.77])('has each gull where its course puts it on this screen, at a sky of %p', (sky) => {
    const root = renderGulls(sky, 0);

    GULL_COURSES.forEach((course, index) => {
      const place = gullPlace(gullProgress(sky, course), course);
      const at = artPoint(place.x, place.y, LAYOUT);
      const span = course.size * LAYOUT.scale;
      const style = styleOf(root, `island-gull-${index}`);

      expect(style.width).toBe(span);
      expect(style.transform).toEqual([
        { translateX: at.x - span / 2 },
        { translateY: at.y - style.height / 2 },
        { scale: place.scale },
      ]);
    });
  });

  it.each([0, 0.25, 0.6])('lifts both wings by the same amount, one each way, at a beat of %p', (beat) => {
    const root = renderGulls(0.3, beat);

    GULL_COURSES.forEach((course, index) => {
      const lift = wingLift(beat, gullProgress(0.3, course), index);
      const left = styleOf(root, `island-gull-${index}-wing-left`).transform;
      const right = styleOf(root, `island-gull-${index}-wing-right`).transform;

      expect(left[2]).toEqual({ rotate: `${lift}deg` });
      expect(right[2]).toEqual({ rotate: `${-lift}deg` });
    });
  });

  it('hinges each wing at the body, the left at its right end and the right at its left', () => {
    const root = renderGulls(0, 0);
    const span = GULL_COURSES[0].size * LAYOUT.scale;

    const left = styleOf(root, 'island-gull-0-wing-left');
    const right = styleOf(root, 'island-gull-0-wing-right');

    expect(left.width).toBe(span / 2);
    expect(right.left).toBe(span / 2);
    expect(left.transform[0]).toEqual({ translateX: span / 4 });
    expect(left.transform[3]).toEqual({ translateX: -span / 4 });
    expect(right.transform[0]).toEqual({ translateX: -span / 4 });
    expect(right.transform[3]).toEqual({ translateX: span / 4 });
  });

  it('takes no touches and is kept from a screen reader', () => {
    const root = renderGulls(0, 0);

    const flock = outer(root, 'island-gulls');

    expect(flock.props.pointerEvents).toBe('none');
    expect(flock.props.accessibilityElementsHidden).toBe(true);
    expect(flock.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('paints every gull white: two wings and a body each', () => {
    const root = renderGulls(0, 0);

    const painted = root.findAll((node) => node.props.fill !== undefined && typeof node.type !== 'string').map((node) => node.props.fill);

    expect(painted.length).toBeGreaterThanOrEqual(GULL_COURSES.length * 3);
    expect(new Set(painted)).toEqual(new Set([GULL_COLOUR]));
  });
});

describe('IslandWaterfalls', () => {
  const frame = artFrame(FALL.frame, LAYOUT);
  const poolFrame = artFrame(POOL.frame, LAYOUT);
  const renderFalls = (fall: number) => render(<IslandWaterfalls layout={LAYOUT} clock={clock(fall)} />).UNSAFE_root;

  it('opens a window on the fall just the size of it, and lets nothing spill out', () => {
    const root = renderFalls(0);

    expect(styleOf(root, 'fall-window')).toEqual(expect.objectContaining({ position: 'absolute', ...frame, overflow: 'hidden' }));
    expect(inner(root, 'fall-window').props.pointerEvents).toBe('none');
  });

  it('hangs a strip of streaks in it, one tile taller than the fall', () => {
    const root = renderFalls(0);

    const strip = picture(root, 'fall-streaks-art');

    expect(strip.props.source).toEqual({ uri: 'test://streaks' });
    expect(StyleSheet.flatten(strip.props.style)).toEqual(
      expect.objectContaining({ left: 0, top: 0, width: frame.width, height: (FALL.frame.height + FALL.tile) * LAYOUT.scale })
    );
  });

  it.each([0, 0.1, 0.33, 0.9])('runs the strip down as far as the clock says, measured on this screen, at %p', (fall) => {
    const root = renderFalls(fall);

    expect(styleOf(root, 'fall-streaks').transform).toEqual([{ translateY: fallShift(fall, FALL.tile) * LAYOUT.scale }]);
  });

  it('opens a window on the pool at the foot of the fall, and lets nothing spill out', () => {
    const root = renderFalls(0);

    expect(styleOf(root, 'pool-window')).toEqual(expect.objectContaining({ position: 'absolute', ...poolFrame, overflow: 'hidden' }));
    expect(inner(root, 'pool-window').props.pointerEvents).toBe('none');
  });

  it.each([0, 0.2, 0.7])('spreads ripples in the pool from where the water lands, each as the clock says, at %p', (fall) => {
    const root = renderFalls(fall);
    const width = POOL.ringWidth * LAYOUT.scale;
    const height = width / 2.2069;
    const at = artPoint(POOL.ringX, POOL.ringY, LAYOUT);

    Array.from({ length: ISLAND_LIFE.poolRings }, (_, ring) => ring).forEach((ring) => {
      const pose = poolRing(fall, ring);
      const style = styleOf(root, `pool-ring-${ring}`);

      expect(style.left).toBeCloseTo(at.x - poolFrame.left - width / 2, 5);
      expect(style.top).toBeCloseTo(at.y - poolFrame.top - height / 2, 5);
      expect(style.width).toBeCloseTo(width, 5);
      expect(style.height).toBeCloseTo(height, 5);
      expect(style.opacity).toBe(pose.opacity);
      expect(style.transform).toEqual([{ scale: pose.scale }]);
      expect(picture(root, `pool-ring-${ring}-art`).props.source).toEqual({ uri: 'test://ring' });
    });
    expect(has(root, `pool-ring-${ISLAND_LIFE.poolRings}`)).toBe(false);
  });

  it('lays every cover over every window, so what moves shows only where there is water', () => {
    const root = renderFalls(0);

    const names = ['fall-window', 'pool-window', 'fall-cover', 'pool-cover', 'fall-spray-0'];
    const order = root
      .findAll((node) => names.includes(node.props.testID as string) && node.parent?.props.testID !== node.props.testID)
      .map((node) => node.props.testID);

    expect(order).toEqual(names);
    expect(picture(root, 'fall-cover').props.source).toEqual({ uri: 'test://cover' });
    expect(StyleSheet.flatten(picture(root, 'fall-cover').props.style)).toEqual(expect.objectContaining({ position: 'absolute', ...frame }));
    expect(picture(root, 'pool-cover').props.source).toEqual({ uri: 'test://pool-cover' });
    expect(StyleSheet.flatten(picture(root, 'pool-cover').props.style)).toEqual(expect.objectContaining({ position: 'absolute', ...poolFrame }));
  });

  it.each([0, 0.3, 0.8])('throws up two puffs of spray at the foot of the fall, each as the clock says, at %p', (fall) => {
    const root = renderFalls(fall);
    const size = FALL.spraySize * LAYOUT.scale;
    const at = artPoint(FALL.sprayX, FALL.sprayY, LAYOUT);

    [0, 1].forEach((puff) => {
      const pose = sprayPose(fall, puff);
      const style = styleOf(root, `fall-spray-${puff}`);

      expect(style).toEqual(expect.objectContaining({ position: 'absolute', left: at.x - size / 2, top: at.y - size / 2, width: size, height: size }));
      expect(style.opacity).toBe(pose.opacity);
      expect(style.transform).toEqual([{ scale: pose.scale }]);
      expect(inner(root, `fall-spray-${puff}`).props.pointerEvents).toBe('none');
      expect(picture(root, `fall-spray-${puff}-art`).props.source).toEqual({ uri: 'test://spray' });
    });
  });
});

describe('IslandLights', () => {
  const renderLights = (lamp: number) => render(<IslandLights layout={LAYOUT} lamp={clock(lamp)} />).UNSAFE_root;
  const lampAt = artPoint(996, 568, LAYOUT);

  it('lights the windows, steady, each on the window painted there', () => {
    const root = renderLights(0.3);

    const windows = picture(root, 'lit-windows');

    expect(windows.props.source).toEqual({ uri: 'test://windows' });
    expect(StyleSheet.flatten(windows.props.style)).toEqual(
      expect.objectContaining({ position: 'absolute', ...artFrame({ x: 560, y: 560, width: 496, height: 626 }, LAYOUT) })
    );
  });

  it.each([0, 0.2, 0.61])('glimmers each sheet of village lamps as the clock says, at %p', (lamp) => {
    const root = renderLights(lamp);

    [1, 2].forEach((sheet) => {
      expect(styleOf(root, `lit-village-${sheet}`).opacity).toBe(villageGlow(lamp, sheet - 1));
    });
    expect(styleOf(root, 'lit-village-1')).toEqual(
      expect.objectContaining({ position: 'absolute', ...artFrame({ x: 190, y: 400, width: 860, height: 820 }, LAYOUT) })
    );
  });

  it.each([0, 0.25, 0.6])('glows at the lighthouse lamp as brightly as the clock says, at %p', (lamp) => {
    const root = renderLights(lamp);
    const size = 76 * LAYOUT.scale;

    const style = styleOf(root, 'lighthouse-glow');

    expect(style).toEqual(expect.objectContaining({ position: 'absolute', left: lampAt.x - size / 2, top: lampAt.y - size / 2, width: size, height: size }));
    expect(style.opacity).toBe(lampFlare(lamp));
  });

  it.each([0, 0.1, 0.5, 0.9])('turns its twin beams about the lamp between them, at %p', (lamp) => {
    const root = renderLights(lamp);
    const length = 380 * LAYOUT.scale;
    const height = 44 * LAYOUT.scale;

    const style = styleOf(root, 'lighthouse-beam');

    expect(style).toEqual(
      expect.objectContaining({ position: 'absolute', left: lampAt.x - length / 2, top: lampAt.y - height / 2, width: length, height })
    );
    expect(style.transform).toEqual([{ scaleX: beamReach(lamp) }]);
  });

  it.each([0, 0.25, 0.3, 0.8])('sends a ring of light out from the lamp after each flash, at %p', (lamp) => {
    const root = renderLights(lamp);
    const size = 150 * LAYOUT.scale;
    const pose = pulseRing(lamp);

    const style = styleOf(root, 'lighthouse-pulse');

    expect(style).toEqual(
      expect.objectContaining({ position: 'absolute', left: lampAt.x - size / 2, top: lampAt.y - size / 2, width: size, height: size })
    );
    expect(style.opacity).toBe(pose.opacity);
    expect(style.transform).toEqual([{ scale: pose.scale }]);
    expect(picture(root, 'lighthouse-pulse-art').props.source).toEqual({ uri: 'test://lamp-pulse' });
  });

  it('draws the pulse and the beams under the glow of the lamp itself', () => {
    const root = renderLights(0.3);

    const names = ['lighthouse-pulse', 'lighthouse-beam', 'lighthouse-glow'];
    const order = root
      .findAll((node) => names.includes(node.props.testID as string) && node.parent?.props.testID !== node.props.testID)
      .map((node) => node.props.testID);

    expect(order).toEqual(names);
  });

  it('takes no touches and is kept from a screen reader', () => {
    const root = renderLights(0);

    const lights = outer(root, 'island-lights');

    expect(lights.props.pointerEvents).toBe('none');
    expect(lights.props.accessibilityElementsHidden).toBe(true);
    expect(lights.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
