/**
 * The home sky's stars. The field was filled out with extra dots that hang
 * steady, so the renderer has to honour each seed's own answer rather than
 * animating everything it is handed.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StarField, starAnimates } from '@/components/home/star-field';
import { STAR_FIELD, buildStarField } from '@/constants/night-sky';

const PHONE = { width: 390, height: 844 };

function props(overrides: Record<string, unknown> = {}) {
  return {
    width: PHONE.width,
    height: PHONE.height,
    colour: '#FFFFFF',
    intensity: 1,
    ...overrides,
  };
}

describe('StarField', () => {
  it('draws every star the field promises', () => {
    const underTest = render(<StarField {...props()} />);

    const stars = underTest.UNSAFE_root.findAll((n: any) => n.props.style && !n.props.testID);

    expect(buildStarField(PHONE.width, PHONE.height)).toHaveLength(STAR_FIELD.count);
    expect(stars.length).toBeGreaterThanOrEqual(STAR_FIELD.count);
  });

  it('draws nothing at all when the sky is not lit', () => {
    const underTest = render(<StarField {...props({ intensity: 0 })} />);

    expect(underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'star-field')).toHaveLength(0);
  });

  it('never intercepts a tap', () => {
    const underTest = render(<StarField {...props()} />);

    const field = underTest.UNSAFE_root.findAll((n: any) => n.props.testID === 'star-field')[0];

    expect(field.props.pointerEvents).toBe('none');
  });
});

/**
 * The twinkle is the thing that had to stay put while the field grew: each
 * star animates only if its own seed says so, so the number of breathing
 * stars is the seed's business and not the renderer's.
 */
describe('which stars breathe', () => {
  it('animates the seeds that twinkle and leaves the rest steady', () => {
    const seeds = buildStarField(PHONE.width, PHONE.height);

    expect(seeds.filter((seed) => seed.twinkles)).toHaveLength(STAR_FIELD.twinkleCount);
    expect(seeds.filter((seed) => !seed.twinkles)).toHaveLength(
      STAR_FIELD.count - STAR_FIELD.twinkleCount,
    );
  });

  it.each([
    { case: 'a twinkling seed on the scene in front', twinkles: true, reduceMotion: false, active: true, expected: true },
    { case: 'a steady seed, which was never meant to breathe', twinkles: false, reduceMotion: false, active: true, expected: false },
    { case: 'a twinkling seed with motion reduced', twinkles: true, reduceMotion: true, active: true, expected: false },
    { case: 'a twinkling seed on a scene behind another', twinkles: true, reduceMotion: false, active: false, expected: false },
  ])('$case breathes: $expected', ({ twinkles, reduceMotion, active, expected }) => {
    const seed = { ...buildStarField(PHONE.width, PHONE.height)[0], twinkles };

    expect(starAnimates(seed, reduceMotion, active)).toBe(expected);
  });
});
