/**
 * The planet is environmental artwork, not a control (§6.2): it must never
 * take touches and must hang from the top edge of the viewport. It is the
 * same painted planet that stands at the foot of the home page, turned upside
 * down (operator, 2026-10-03).
 */

import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { PlanetHeaderArtwork } from '@/components/child-ui/planet-header-artwork';
import { planetHorizonLayout } from '@/constants/earth';

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  const matches = tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
  const node = matches[matches.length - 1];
  expect(node).toBeTruthy();
  return node;
}

describe('PlanetHeaderArtwork', () => {
  it('never intercepts touches', () => {
    const tree = render(<PlanetHeaderArtwork />);

    const underTest = byTestId(tree, 'planet-header-artwork').props.pointerEvents;

    expect(underTest).toBe('none');
  });

  // the painting runs on above the top of the viewport, into the cloud between this page and the home page
  it('hangs from the top edge of the viewport, running on above it', () => {
    const { width, height } = Dimensions.get('window');
    const tree = render(<PlanetHeaderArtwork />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'planet-header-artwork').props.style);

    expect(underTest.top).toBe(-planetHorizonLayout(width, height, 'top').overhang);
    expect(underTest.overflow).toBe('hidden');
  });

  it('is the same planet that stands at the foot of the home page, as large, turned upside down', () => {
    const { width, height } = Dimensions.get('window');
    const tree = render(<PlanetHeaderArtwork />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'planet-header-artwork-planet').props.style);

    expect(underTest.width).toBe(planetHorizonLayout(width, height, 'bottom').width);
    expect(underTest.transform).toEqual([{ scaleY: -1 }]);
  });

  it('lays no band of cloud along the top of the page', () => {
    const tree = render(<PlanetHeaderArtwork />);

    expect(tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'planet-header-artwork-clouds')).toHaveLength(0);
  });
});
