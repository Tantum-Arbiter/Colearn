/**
 * The planet is environmental artwork, not a control (§6.2): it must never
 * take touches, must hang above the viewport edge, and must clamp its width
 * ratio to the 0.55-0.65 band the spec allows.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PlanetHeaderArtwork, clampWidthRatio, planetLayout } from '@/components/child-ui/planet-header-artwork';

function artworkNode(tree: ReturnType<typeof render>) {
  const node = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'planet-header-artwork')[0];
  expect(node).toBeTruthy();
  return node;
}

describe('PlanetHeaderArtwork', () => {
  it('never intercepts touches', () => {
    const tree = render(<PlanetHeaderArtwork />);

    expect(artworkNode(tree).props.pointerEvents).toBe('none');
  });

  it('extends above the top of the viewport at the default offset', () => {
    const { top, height } = planetLayout(393, 0.6, -0.34);

    expect(top).toBeLessThan(0);
    expect(top).toBeCloseTo(height * -0.34);
  });

  it.each([
    [0.4, 0.55],
    [0.55, 0.55],
    [0.6, 0.6],
    [0.65, 0.65],
    [0.9, 0.65],
  ])('clamps a width ratio of %s to %s', (input, expected) => {
    expect(clampWidthRatio(input)).toBe(expected);
  });
});
