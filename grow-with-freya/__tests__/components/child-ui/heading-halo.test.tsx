/**
 * Tests for the night-sky halo behind a page's heading (operator, 2026-10-03:
 * "make the titles clear as day"). The heading lies over the painted planet,
 * whose ice, sea and land are as bright as the white letters. A soft dark
 * glow behind the words, strongest at their middle and gone at its edge,
 * lets them read on any part of the world without an outline round each
 * letter -- an outline was tried and read as a smudge.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { HEADING_HALO, HeadingHalo } from '@/components/child-ui/heading-halo';
import { NIGHT_VOID } from '@/constants/night-palette';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

describe('HeadingHalo', () => {
  it('should reach past the words it sits behind by the spread it is given', () => {
    const view = render(<HeadingHalo spread={{ x: 40, y: 16 }} />);

    const underTest = StyleSheet.flatten(byTestId(view, 'heading-halo')[0].props.style);

    expect(underTest).toEqual(expect.objectContaining({ position: 'absolute', left: -40, right: -40, top: -16, bottom: -16 }));
  });

  it('should be a soft glow of the night sky, darkest at its middle and gone at its edge', () => {
    const view = render(<HeadingHalo spread={{ x: 40, y: 16 }} />);

    const stops = byTestId(view, 'svg-Stop').map((stop) => stop.props);
    const opacities = stops.map((stop) => stop.stopOpacity as number);

    stops.forEach((stop) => expect(stop.stopColor).toBe(NIGHT_VOID));
    expect(stops.map((stop) => stop.offset)).toEqual(HEADING_HALO.stops.map((stop) => stop.at));
    expect(opacities[0]).toBeCloseTo(HEADING_HALO.strength, 6);
    expect(opacities[opacities.length - 1]).toBe(0);
    opacities.slice(1).forEach((opacity, index) => expect(opacity).toBeLessThan(opacities[index]));
  });

  // the words reach most of the way out across the halo, so it holds its strength well past its middle
  it('should stay nearly full strength out to the ends of the words, and only then fade', () => {
    const plateau = HEADING_HALO.stops.filter((stop) => stop.at >= 0.4 && stop.share >= 0.8);

    expect(plateau.length).toBeGreaterThan(0);
  });

  it('should be strong enough to carry white words over white ice, and leave the planet showing through', () => {
    expect(HEADING_HALO.strength).toBeGreaterThanOrEqual(0.65);
    expect(HEADING_HALO.strength).toBeLessThanOrEqual(0.8);
  });

  it('should fill its box with one gradient, stretched to its shape, and no blur', () => {
    const view = render(<HeadingHalo spread={{ x: 40, y: 16 }} />);

    const gradient = byTestId(view, 'svg-RadialGradient')[0].props;
    const fill = byTestId(view, 'svg-Rect')[0].props;

    expect(gradient).toEqual(expect.objectContaining({ cx: '50%', cy: '50%', r: '50%' }));
    expect(fill).toEqual(expect.objectContaining({ width: '100%', height: '100%', fill: `url(#${gradient.id})` }));
    expect(byTestId(view, 'svg-FeGaussianBlur')).toHaveLength(0);
  });

  it('should give every halo its own gradient, so two on a screen never share one', () => {
    const view = render(
      <>
        <HeadingHalo spread={{ x: 40, y: 16 }} />
        <HeadingHalo spread={{ x: 40, y: 16 }} />
      </>
    );

    const ids = byTestId(view, 'svg-RadialGradient').map((node) => node.props.id);

    expect(new Set(ids).size).toBe(2);
  });

  it('should be out of the way of touches and of a screen reader', () => {
    const view = render(<HeadingHalo spread={{ x: 40, y: 16 }} />);

    const halo = byTestId(view, 'heading-halo')[0];

    expect(halo.props.pointerEvents).toBe('none');
    expect(halo.props.accessibilityElementsHidden).toBe(true);
    expect(halo.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
