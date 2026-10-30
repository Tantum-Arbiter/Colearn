/**
 * Tests for the world at the edge of a page.
 *
 * It is the operator's painting of a planet rising out of cloud (2026-10-03),
 * the planet itself as wide as the screen and the cloud either side of it
 * running off the edges. It stands at the foot of the home page and hangs
 * upside down from the top of the pages beneath, where the older globe and
 * its cloud banks used to be. The only cloud is the painting's own. The art
 * is never tinted.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { EarthHorizon } from '@/components/ui/earth-horizon';
import { planetHorizonLayout } from '@/constants/earth';
import { PLANET_ART } from '@/constants/planet-art';

const WIDTH = 390;
const HEIGHT = 844;

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID }).filter((node) => node.props.style !== undefined);
}

function flatStyle(view: RenderResult, testID: string) {
  return StyleSheet.flatten(byTestId(view, testID)[0].props.style);
}

function renderEarth(props: Partial<React.ComponentProps<typeof EarthHorizon>> = {}) {
  return render(<EarthHorizon edge="bottom" width={WIDTH} height={HEIGHT} {...props} />);
}

describe('EarthHorizon', () => {
  it.each(['bottom', 'top'] as const)('should keep its hands off the page at the %s edge', (edge) => {
    const view = renderEarth({ edge });

    expect(byTestId(view, 'earth-horizon')[0].props.pointerEvents).toBe('none');
  });

  it.each(['bottom', 'top'] as const)('should draw the operator`s painting at the %s edge, enlarged so the planet spans the screen', (edge) => {
    const view = renderEarth({ edge });
    const layout = planetHorizonLayout(WIDTH, HEIGHT, edge);

    const planet = byTestId(view, 'earth-horizon-planet')[0];
    const underTest = StyleSheet.flatten(planet.props.style);

    expect(planet.props.source).toBe(PLANET_ART.source);
    expect(underTest).toEqual(expect.objectContaining({ position: 'absolute', left: layout.left, width: layout.width, height: layout.height }));
    expect(layout.width).toBeGreaterThan(WIDTH);
    expect(planet.props.contentFit).toBe('fill');
  });

  it.each(['bottom', 'top'] as const)('should leave out the older globe at the %s edge', (edge) => {
    const view = renderEarth({ edge });

    expect(view.UNSAFE_queryAllByProps({ testID: 'earth-horizon-globe' })).toHaveLength(0);
  });

  /**
   * A band of cloud lay along the edge in front of the planet for an hour, at
   * the foot of the home page and the top of the pages below. The operator had
   * it taken off both (2026-10-03): the only cloud is the painting's own.
   */
  it.each(['bottom', 'top'] as const)('should lay no cloud of its own along the %s edge', (edge) => {
    const view = renderEarth({ edge });

    expect(view.UNSAFE_queryAllByProps({ testID: 'earth-horizon-clouds' })).toHaveLength(0);
    expect(view.UNSAFE_queryAllByProps({ testID: 'earth-horizon-cloud' })).toHaveLength(0);
  });

  it.each(['bottom', 'top'] as const)('should mark the painting as decoration at the %s edge, and load it without a fade', (edge) => {
    const view = renderEarth({ edge });

    const planet = byTestId(view, 'earth-horizon-planet')[0];

    expect(planet.props.alt).toBe('');
    expect(planet.props.transition).toBe(0);
  });

  it.each(['bottom', 'top'] as const)('should answer to a custom test id at the %s edge', (edge) => {
    const view = renderEarth({ edge, testID: 'some-horizon' });

    expect(byTestId(view, 'some-horizon').length).toBeGreaterThan(0);
    expect(byTestId(view, 'some-horizon-planet').length).toBeGreaterThan(0);
  });

  it.each(['bottom', 'top'] as const)('should follow the size it is given rather than the window`s, at the %s edge', (edge) => {
    const view = renderEarth({ edge, width: 834, height: 1194 });
    const tablet = planetHorizonLayout(834, 1194, edge);

    expect(flatStyle(view, 'earth-horizon').height).toBe(tablet.rise + tablet.overhang);
    expect(flatStyle(view, 'earth-horizon-planet').width).toBe(tablet.width);
    expect(flatStyle(view, 'earth-horizon-planet').left).toBe(tablet.left);
    expect(flatStyle(view, 'earth-horizon-planet').height).toBe(tablet.height);
  });

  it.each(['bottom', 'top'] as const)('should fall back to the window when no size is given, at the %s edge', (edge) => {
    const view = render(<EarthHorizon edge={edge} />);
    const { width, height } = require('react-native').Dimensions.get('window');

    const layout = planetHorizonLayout(width, height, edge);

    expect(flatStyle(view, 'earth-horizon').height).toBe(layout.rise + layout.overhang);
  });

  describe('at the foot of the home page', () => {
    const layout = planetHorizonLayout(WIDTH, HEIGHT, 'bottom');

    /**
     * The painting runs on below the foot of the page, into the cloud between
     * this page and the next (operator, 2026-10-03), so the planet sinks into
     * the cloud rather than ending at the edge of the screen.
     */
    it('should sit on the bottom edge and run on below it, in a window as tall as the painting stands above it and hangs below', () => {
      const view = renderEarth({ edge: 'bottom' });

      const underTest = flatStyle(view, 'earth-horizon');

      expect(underTest.bottom).toBe(-layout.overhang);
      expect(underTest.top).toBeUndefined();
      expect(underTest.height).toBe(layout.rise + layout.overhang);
      expect(underTest.overflow).toBe('hidden');
      expect(layout.overhang).toBeGreaterThan(0);
    });

    it('should stand the planet the right way up, from the top of its window down', () => {
      const view = renderEarth({ edge: 'bottom' });

      const underTest = flatStyle(view, 'earth-horizon-planet');

      expect(underTest.top).toBe(0);
      expect(underTest.transform).toBeUndefined();
    });
  });

  /**
   * The pages below used to hang the lower half of the older globe here. The
   * painting has only the top of its planet, so the same picture is turned
   * upside down (operator, 2026-10-03): its tip hangs where the globe's
   * underside did, and its cloud lies along the top of the page.
   */
  describe('at the top of a page below', () => {
    const layout = planetHorizonLayout(WIDTH, HEIGHT, 'top');

    it('should hang from the top edge and run on above it, in a window as tall as the painting hangs below and stands above', () => {
      const view = renderEarth({ edge: 'top' });

      const underTest = flatStyle(view, 'earth-horizon');

      expect(underTest.top).toBe(-layout.overhang);
      expect(underTest.bottom).toBeUndefined();
      expect(underTest.height).toBe(layout.rise + layout.overhang);
      expect(underTest.overflow).toBe('hidden');
    });

    it('should turn the planet upside down, its tip at the foot of the window', () => {
      const view = renderEarth({ edge: 'top' });

      const underTest = flatStyle(view, 'earth-horizon-planet');

      expect(underTest.transform).toEqual([{ scaleY: -1 }]);
      expect(underTest.top).toBeCloseTo(layout.rise + layout.overhang - layout.height, 6);
      expect((underTest.top as number) + (underTest.height as number)).toBeCloseTo(layout.rise + layout.overhang, 6);
    });

    it('should draw the painting from above its window on a wide screen, where it is taller than the window', () => {
      const view = renderEarth({ edge: 'top', width: 1194, height: 834 });
      const wide = planetHorizonLayout(1194, 834, 'top');

      const underTest = flatStyle(view, 'earth-horizon-planet');

      expect(wide.height).toBeGreaterThan(wide.rise + wide.overhang + 50);
      expect(underTest.top).toBeCloseTo(wide.rise + wide.overhang - wide.height, 6);
    });
  });
});
