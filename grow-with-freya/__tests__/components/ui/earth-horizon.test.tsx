/**
 * Tests for the shared earth.
 *
 * The same globe rises from the bottom of the home page and hangs from the
 * top of the pages beneath it, clipped to a window so nothing spills over the
 * page while the two slide past each other.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { EarthHorizon } from '@/components/ui/earth-horizon';
import { earthLayout } from '@/constants/earth';

const WIDTH = 390;
const HEIGHT = 844;

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function flatStyle(view: RenderResult, testID: string) {
  return StyleSheet.flatten(byTestId(view, testID)[0].props.style);
}

function renderEarth(props: Partial<React.ComponentProps<typeof EarthHorizon>> = {}) {
  return render(<EarthHorizon edge="bottom" width={WIDTH} height={HEIGHT} {...props} />);
}

describe('EarthHorizon', () => {
  it.each(['bottom', 'top'] as const)('should clip the %s window to the visible slice of the globe', (edge) => {
    const view = renderEarth({ edge });

    const underTest = flatStyle(view, 'earth-horizon');

    expect(underTest.height).toBe(earthLayout(WIDTH, HEIGHT, edge).cap);
    expect(underTest.overflow).toBe('hidden');
  });

  it('should sit on the bottom edge of the home page', () => {
    const view = renderEarth({ edge: 'bottom' });

    const underTest = flatStyle(view, 'earth-horizon');

    expect(underTest.bottom).toBe(0);
    expect(underTest.top).toBeUndefined();
  });

  it('should hang from the top edge of a page below', () => {
    const view = renderEarth({ edge: 'top' });

    const underTest = flatStyle(view, 'earth-horizon');

    expect(underTest.top).toBe(0);
    expect(underTest.bottom).toBeUndefined();
  });

  it.each(['bottom', 'top'] as const)('should place the whole globe for the %s edge, letting the window do the cropping', (edge) => {
    const view = renderEarth({ edge });
    const layout = earthLayout(WIDTH, HEIGHT, edge);

    const underTest = flatStyle(view, 'earth-horizon-globe');

    expect(underTest.width).toBe(layout.diameter);
    expect(underTest.height).toBe(layout.diameter);
    expect(underTest.left).toBe(layout.left);
    expect(underTest.top).toBe(layout.top);
  });

  it('should keep its hands off the page', () => {
    const view = renderEarth();

    const underTest = byTestId(view, 'earth-horizon')[0].props.pointerEvents;

    expect(underTest).toBe('none');
  });

  it('should show no scrim unless asked', () => {
    const view = renderEarth();

    const underTest = byTestId(view, 'earth-horizon-scrim');

    expect(underTest).toHaveLength(0);
  });

  it('should lay a round scrim over the globe when given one', () => {
    const view = renderEarth({ scrim: 'rgba(11,21,51,0.34)' });
    const layout = earthLayout(WIDTH, HEIGHT, 'bottom');

    const underTest = flatStyle(view, 'earth-horizon-scrim');

    expect(underTest.backgroundColor).toBe('rgba(11,21,51,0.34)');
    expect(underTest.borderRadius).toBe(layout.diameter / 2);
    expect(underTest.width).toBe(layout.diameter);
  });

  it('should fall back to the window when no size is given', () => {
    const view = render(<EarthHorizon edge="top" />);
    const { width, height } = require('react-native').Dimensions.get('window');

    const underTest = flatStyle(view, 'earth-horizon');

    expect(underTest.height).toBe(earthLayout(width, height, 'top').cap);
  });

  it('should answer to a custom test id', () => {
    const view = renderEarth({ testID: 'home-horizon' });

    const underTest = byTestId(view, 'home-horizon');

    expect(underTest.length).toBeGreaterThan(0);
    expect(byTestId(view, 'home-horizon-globe').length).toBeGreaterThan(0);
  });
});
