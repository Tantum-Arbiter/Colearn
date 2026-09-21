/**
 * The planet is environmental artwork, not a control (§6.2): it must never
 * take touches and must hang from the top edge of the viewport. It is the
 * same globe that rises from the bottom of the home page.
 */

import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { PlanetHeaderArtwork } from '@/components/child-ui/planet-header-artwork';
import { earthLayout } from '@/constants/earth';

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

  it('hangs from the top edge of the viewport', () => {
    const tree = render(<PlanetHeaderArtwork />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'planet-header-artwork').props.style);

    expect(underTest.top).toBe(0);
    expect(underTest.overflow).toBe('hidden');
  });

  it('is the same globe that rises from the bottom of the home page', () => {
    const { width, height } = Dimensions.get('window');
    const tree = render(<PlanetHeaderArtwork />);

    const underTest = StyleSheet.flatten(byTestId(tree, 'planet-header-artwork-globe').props.style);

    expect(underTest.width).toBe(earthLayout(width, height, 'bottom').diameter);
  });
});
