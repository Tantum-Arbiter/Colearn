/**
 * The badge medallion draws at whatever diameter it is given, so the same
 * artwork serves the Progress cards and the Profile page's denser wall.
 * Everything inside it -- rim, glow, sparkles -- follows that diameter.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { BadgeArtwork, BADGE_ARTWORK_SIZE } from '@/components/progress/badge-artwork';
import type { BadgeStatus } from '@/components/progress/progress-model';

const ARTWORK = { uri: 'test://artwork' };

function flatten(style: unknown): any {
  return [style].flat(Infinity).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
}

/** The medallion is the one view that rounds itself into a circle. */
function circleStyle(tree: ReturnType<typeof render>, status: BadgeStatus) {
  const wrapper = tree.UNSAFE_root.findAll((n: any) => n.props.testID === `badge-artwork-${status}`)[0];
  const circle = wrapper
    .findAll((n: any) => Array.isArray(n.props.style))
    .map((n: any) => flatten(n.props.style))
    .find((style: any) => typeof style.borderRadius === 'number');

  expect(circle).toBeTruthy();
  return circle;
}

describe('BadgeArtwork', () => {
  it('draws at the shared default diameter when none is given', () => {
    const underTest = render(<BadgeArtwork artwork={ARTWORK} status="earned" />);

    expect(circleStyle(underTest, 'earned').width).toBe(BADGE_ARTWORK_SIZE);
  });

  it.each([44, 60, 96])('draws at the %ipt diameter it is given', (size) => {
    const underTest = render(<BadgeArtwork artwork={ARTWORK} status="earned" size={size} />);

    const style = circleStyle(underTest, 'earned');

    expect(style.width).toBe(size);
    expect(style.height).toBe(size);
    expect(style.borderRadius).toBe(size / 2);
  });

  it('keeps the earned sparkles pinned to the rim at any diameter', () => {
    const underTest = render(<BadgeArtwork artwork={ARTWORK} status="earned" size={48} />);

    const sparkles = underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'badge-sparkle');

    expect(sparkles).toHaveLength(2);
    for (const sparkle of sparkles) {
      const style = flatten(sparkle.props.style);
      expect(style.left).toBeLessThanOrEqual(48);
      expect(style.left).toBeGreaterThanOrEqual(-8);
    }
  });
});
