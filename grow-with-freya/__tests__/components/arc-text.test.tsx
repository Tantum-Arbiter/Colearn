/**
 * Tests for ArcText's geometry.
 *
 * The arc is invisible in a rendered test tree -- react-native-svg is mocked -- so
 * the maths that decides how bowed the line looks is checked directly.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import {
  ArcText,
  arcPointAt,
  arcRadiusForText,
  arcRise,
  DEFAULT_ARC_CURVE,
} from '@/components/ui/arc-text';

/** Sagitta of a chord of `span` on a circle of `radius`. */
function sagitta(span: number, radius: number): number {
  return radius - Math.sqrt(radius * radius - (span / 2) ** 2);
}

describe('arcRadiusForText', () => {
  it.each([
    ['a short label', 120, 0.035],
    ['a title', 275, 0.035],
    ['a long subtitle', 420, 0.016],
    ['a very deep curve', 275, 0.07],
  ])('should bow %s by the requested fraction of its own length', (_name, length, curve) => {
    const radius = arcRadiusForText(length, curve);

    expect(sagitta(length, radius) / length).toBeCloseTo(curve, 2);
  });

  it('should draw a straight line when there is no curve', () => {
    expect(arcRadiusForText(300, 0)).toBe(0);
  });

  it('should draw a straight line for empty text', () => {
    expect(arcRadiusForText(0, DEFAULT_ARC_CURVE)).toBe(0);
  });

  it('should curve a longer line more gently for the same look', () => {
    const short = arcRadiusForText(150, DEFAULT_ARC_CURVE);
    const long = arcRadiusForText(400, DEFAULT_ARC_CURVE);

    expect(long).toBeGreaterThan(short);
  });
});

describe('arcRise', () => {
  it('should be flat with no radius', () => {
    expect(arcRise(400, 0)).toBe(0);
  });

  it('should rise further across a wider span', () => {
    const radius = arcRadiusForText(275, DEFAULT_ARC_CURVE);

    expect(arcRise(500, radius)).toBeGreaterThan(arcRise(275, radius));
  });

  it('should rise less on a gentler curve', () => {
    const gentle = arcRadiusForText(275, 0.016);
    const steep = arcRadiusForText(275, 0.07);

    expect(arcRise(275, gentle)).toBeLessThan(arcRise(275, steep));
  });

  it('should never exceed the radius', () => {
    expect(arcRise(10000, 200)).toBe(200);
  });
});

describe('ArcText', () => {
  it('should render its text', () => {
    const view = render(
      <ArcText width={400} fontSize={24} color="#FFFFFF">Choose your instrument</ArcText>,
    );

    expect(JSON.stringify(view.toJSON())).toContain('Choose your instrument');
  });

  it('should keep the drawn box no taller than the line needs', () => {
    const view = render(
      <ArcText width={500} fontSize={24} color="#FFFFFF" testID="arc">Choose your instrument</ArcText>,
    );

    // The composite element carries testID but no style; the View it renders does.
    const heights = view.UNSAFE_queryAllByProps({ testID: 'arc' })
      .map(node => (StyleSheet.flatten(node.props.style) as { height?: number })?.height)
      .filter((value): value is number => typeof value === 'number');
    const [height] = heights;

    expect(heights.length).toBeGreaterThan(0);

    // Ascent, descent and the text's own rise -- not the rise across the full width,
    // which is far larger and would pad the line out with dead space.
    expect(height).toBeLessThan(24 * 2);
  });
});

describe('arcPointAt', () => {
  const radius = arcRadiusForText(275, DEFAULT_ARC_CURVE);

  it('should not move a decoration sitting on the middle of the line', () => {
    expect(arcPointAt(0, radius)).toEqual({ drop: 0, angle: 0 });
  });

  it('should drop a decoration further the further out it sits', () => {
    expect(arcPointAt(140, radius).drop).toBeGreaterThan(arcPointAt(70, radius).drop);
  });

  it('should tilt a decoration further the further out it sits', () => {
    expect(arcPointAt(140, radius).angle).toBeGreaterThan(arcPointAt(70, radius).angle);
  });

  it('should land on the same curve the text follows', () => {
    // The drop at half the line length is the line's own sagitta.
    expect(arcPointAt(275 / 2, radius).drop).toBeCloseTo(arcRise(275, radius), 5);
  });

  it('should stay flat when there is no curve', () => {
    expect(arcPointAt(140, 0)).toEqual({ drop: 0, angle: 0 });
  });

  it('should not break for a decoration further out than the radius', () => {
    const point = arcPointAt(500, 200);

    expect(point.drop).toBe(200);
    expect(point.angle).toBeCloseTo(90, 5);
  });
});
