/**
 * Tests for the living sky around the sun.
 *
 * A warm halo, a curated scatter of star and sparkle art framing
 * both edges, and the sun itself -- each its own layer,
 * none of them in the way of a finger.
 */

import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { render, type RenderResult } from '@testing-library/react-native';
import { HomeHeroSky } from '@/components/home/home-hero-sky';
import { HERO_HALO } from '@/constants/home-sky';
import { buildHeroSky, sunFrame } from '@/constants/home-sky';

interface RenderedNode {
  type: unknown;
  props: Record<string, unknown>;
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function artByTestIdPrefix(view: RenderResult, prefix: string) {
  return view.UNSAFE_root.findAll(
    (node: RenderedNode) => node.type === Image && typeof node.props.testID === 'string' && node.props.testID.startsWith(prefix)
  );
}

const WIDTH = 402;
const TOP_INSET = 59;

function renderSky(props: Partial<React.ComponentProps<typeof HomeHeroSky>> = {}) {
  const view = render(<HomeHeroSky width={WIDTH} topInset={TOP_INSET} timeOfDay="day" active {...props} />);

  return { view, ...view };
}

describe('HomeHeroSky', () => {
  const layout = buildHeroSky(WIDTH, sunFrame(WIDTH, TOP_INSET));

  it('should lay every star and sparkle from the layout as its own piece of art', () => {
    const { view } = renderSky();

    const underTest = artByTestIdPrefix(view, 'hero-star-');

    expect(underTest.length).toBe(layout.stars.length);
  });

  it('should keep the sun as the one thing to touch', () => {
    const { view } = renderSky();

    const decor = ['home-hero-sky', 'hero-sky-background', 'hero-stars-layer'].map(
      (testID) => byTestId(view, testID)[0]?.props.pointerEvents
    );
    const sun = byTestId(view, 'sky-face')[0];

    expect(decor).toEqual(['none', 'none', 'none']);
    expect(sun.props.accessibilityRole).toBe('button');
  });

  it.each([
    ['day', HERO_HALO.day],
    ['night', HERO_HALO.night],
  ] as const)('at %s should glow behind the face in its own colour', (timeOfDay, colour) => {
    const { view } = renderSky({ timeOfDay });

    const stops = view.UNSAFE_root.findAll((node: RenderedNode) => node.props.testID === 'svg-Stop');

    expect(byTestId(view, 'hero-sky-halo').length).toBeGreaterThan(0);
    expect(stops.some((stop: RenderedNode) => stop.props.stopColor === colour)).toBe(true);
  });

  it('should tell the scene how tall it is so the welcome can sit beneath', () => {
    const { view } = renderSky();

    const root = byTestId(view, 'home-hero-sky')[0];

    expect(StyleSheet.flatten(root.props.style).height).toBe(layout.height);
  });

  it('should still show the whole scene when motion is off', () => {
    const { view } = renderSky({ active: false });

    expect(artByTestIdPrefix(view, 'hero-star-').length).toBe(layout.stars.length);
  });
});
