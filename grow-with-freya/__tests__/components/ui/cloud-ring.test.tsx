/**
 * Tests for what lies between the home page and the page below it while they
 * slide (operator, 2026-10-03): a stretch of sky under the pages, from the
 * home page's lower sky to the next page's upper sky, and a ring of the
 * painting's cloud over the pages, round the waist of the world the two
 * planet halves make there. Both ride on the home page's slide and are
 * decoration.
 */

import React from 'react';
import { PixelRatio, StyleSheet } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import { CloudRing, GapSky } from '@/components/ui/cloud-ring';
import { EARTH, cloudGap, cloudRingLayout, planetHorizonLayout } from '@/constants/earth';
import { HOME_THEMES } from '@/constants/home-scene';
import { SKY_GRADIENT_WORLD } from '@/constants/night-palette';
import { snapToPixel } from '@/constants/page-slide';
import { CLOUD_RING_ART, PLANET_ART } from '@/constants/planet-art';

jest.mock('@/hooks/use-time-of-day', () => ({ useTimeOfDay: () => mockTimeOfDay }));
let mockTimeOfDay: 'night' | 'day' = 'night';

const WIDTH = 834;
const HEIGHT = 1194;
const GAP = cloudGap(WIDTH, HEIGHT);

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID }).filter((node) => node.props.style !== undefined);
}

function flat(view: RenderResult, testID: string) {
  return StyleSheet.flatten(byTestId(view, testID)[0].props.style);
}

const offset = (value: number) => ({ value }) as never;

describe('GapSky', () => {
  it.each(['night', 'day'] as const)('should run from the home page`s lower %s sky to the next page`s upper sky', (timeOfDay) => {
    mockTimeOfDay = timeOfDay;
    const view = render(<GapSky mainOffset={offset(0)} width={WIDTH} height={HEIGHT} gap={GAP} />);

    const sky = byTestId(view, 'gap-sky')[0];
    const colour = byTestId(view, 'gap-sky-colour')[0];

    expect(colour.props.colors).toEqual([HOME_THEMES[timeOfDay].skyBottom, SKY_GRADIENT_WORLD[0]]);
    expect(StyleSheet.flatten(sky.props.style)).toEqual(
      expect.objectContaining({ position: 'absolute', top: 0, left: 0, right: 0, height: GAP + EARTH.seamOverlap })
    );
    expect(sky.props.pointerEvents).toBe('none');
  });

  // the page below starts on a whole pixel and the gap ends on a fraction of one, so the sky and the
  // planet in it reach a point on under that page, where it covers them, and no dark hairline shows
  it('should reach a point on under the page below, so no hairline of backdrop shows between them', () => {
    const view = render(<GapSky mainOffset={offset(0)} width={WIDTH} height={HEIGHT} gap={GAP} />);
    const window = flat(view, 'gap-sky-planet-window');

    expect((window.top as number) + (window.height as number)).toBeCloseTo(GAP + EARTH.seamOverlap, 6);
    expect(flat(view, 'gap-sky').height).toBeCloseTo(GAP + EARTH.seamOverlap, 6);
  });

  it('should draw nothing when there is no gap', () => {
    const view = render(<GapSky mainOffset={offset(0)} width={WIDTH} height={HEIGHT} gap={0} />);

    expect(view.UNSAFE_queryAllByProps({ testID: 'gap-sky' })).toHaveLength(0);
  });

  /**
   * A page's own background clips what runs on above its top edge, so the
   * part of the next page's upside-down planet that runs on into the gap is
   * drawn here, under the pages, exactly where that page would draw it.
   */
  it('should draw the run-on of the next page`s upside-down planet, just above that page`s top', () => {
    const view = render(<GapSky mainOffset={offset(0)} width={WIDTH} height={HEIGHT} gap={GAP} />);
    const below = planetHorizonLayout(WIDTH, HEIGHT, 'top');

    const window = flat(view, 'gap-sky-planet-window');
    const planet = byTestId(view, 'gap-sky-planet')[0];
    const placed = StyleSheet.flatten(planet.props.style);

    expect(window).toEqual(
      expect.objectContaining({ position: 'absolute', left: 0, right: 0, top: GAP - below.overhang, height: below.overhang + EARTH.seamOverlap, overflow: 'hidden' })
    );
    expect(planet.props.source).toBe(PLANET_ART.source);
    expect(placed).toEqual(expect.objectContaining({ position: 'absolute', left: below.left, width: below.width, height: below.height }));
    expect(GAP - below.overhang + (placed.top as number)).toBeCloseTo(GAP + below.rise - below.height, 6);
    expect(placed.transform).toEqual([{ scaleY: -1 }]);
    expect(planet.props.contentFit).toBe('fill');
    expect(planet.props.transition).toBe(0);
    expect(planet.props.alt).toBe('');
  });
});

describe('CloudRing', () => {
  const renderRing = (value = 0) => render(<CloudRing mainOffset={offset(value)} width={WIDTH} height={HEIGHT} gap={GAP} />);

  it('should draw the painting`s ring where its layout puts it, inside a layer as tall as the gap', () => {
    const view = renderRing();
    const ring = cloudRingLayout(WIDTH, HEIGHT);

    const image = byTestId(view, 'cloud-ring-art')[0];

    expect(flat(view, 'cloud-ring')).toEqual(expect.objectContaining({ position: 'absolute', top: 0, left: 0, right: 0, height: GAP }));
    expect(image.props.source).toBe(CLOUD_RING_ART.source);
    expect(StyleSheet.flatten(image.props.style)).toEqual(
      expect.objectContaining({ position: 'absolute', left: ring.left, top: ring.top, width: ring.width, height: ring.height })
    );
    expect(image.props.contentFit).toBe('fill');
    expect(image.props.transition).toBe(0);
    expect(image.props.alt).toBe('');
  });

  it('should be out of the way of touches and of a screen reader', () => {
    const view = renderRing();

    const layer = byTestId(view, 'cloud-ring')[0];

    expect(layer.props.pointerEvents).toBe('none');
    expect(layer.props.accessibilityElementsHidden).toBe(true);
    expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('should draw nothing when there is no gap', () => {
    const view = render(<CloudRing mainOffset={offset(0)} width={WIDTH} height={HEIGHT} gap={0} />);

    expect(view.UNSAFE_queryAllByProps({ testID: 'cloud-ring' })).toHaveLength(0);
  });

  describe('as the home page slides', () => {
    beforeEach(() => {
      (useAnimatedStyle as jest.Mock).mockImplementation((updater: () => object) => updater());
    });

    afterEach(() => {
      (useAnimatedStyle as jest.Mock).mockImplementation(() => ({}));
    });

    it.each([0, -0.25, -0.5, -1])('should ride just below the home page, the home page at %p of the slide', (done) => {
      const home = (HEIGHT + GAP) * done;
      const ring = render(<CloudRing mainOffset={offset(home)} width={WIDTH} height={HEIGHT} gap={GAP} />);
      mockTimeOfDay = 'night';
      const sky = render(<GapSky mainOffset={offset(home)} width={WIDTH} height={HEIGHT} gap={GAP} />);
      const expected = [{ translateY: snapToPixel(home + HEIGHT, PixelRatio.get()) }];

      expect(flat(ring, 'cloud-ring').transform).toEqual(expected);
      expect(flat(sky, 'gap-sky').transform).toEqual(expected);
    });
  });
});
