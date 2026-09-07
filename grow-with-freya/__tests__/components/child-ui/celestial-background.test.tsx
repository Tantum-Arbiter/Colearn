/**
 * The catalogue sky is one gradient with a calm, deterministic star field.
 * These pin the §6.1 contract: seeded star positions that never change
 * between renders, a gold minority, and accent stars on top of the count.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { CelestialBackground, clearOfPlanet } from '@/components/child-ui/celestial-background';

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

describe('CelestialBackground', () => {
  it('renders its children above the star field', () => {
    const tree = render(
      <CelestialBackground>
        <Text testID="content">hello</Text>
      </CelestialBackground>
    );

    expect(byTestId(tree, 'content').length).toBeGreaterThan(0);
  });

  it('renders the requested number of point stars plus accent stars', () => {
    const tree = render(<CelestialBackground starCount={12} goldStarRatio={0.25} accentStars={2} />);

    const white = byTestId(tree, 'celestial-star');
    const gold = byTestId(tree, 'celestial-star-gold');
    const accent = byTestId(tree, 'celestial-star-accent');

    expect(white.length + gold.length).toBe(12);
    expect(accent.length).toBe(2);
  });

  it('keeps gold stars a minority of the field', () => {
    const tree = render(<CelestialBackground starCount={28} goldStarRatio={0.25} />);

    const white = byTestId(tree, 'celestial-star');
    const gold = byTestId(tree, 'celestial-star-gold');

    expect(gold.length).toBeGreaterThan(0);
    expect(gold.length).toBeLessThan(white.length);
  });

  it('produces identical star positions across separate renders', () => {
    const positions = (tree: ReturnType<typeof render>) =>
      byTestId(tree, 'celestial-star').map((n: any) => {
        const style = n.props.style.flat().reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
        return [style.left, style.top];
      });

    const first = positions(render(<CelestialBackground starCount={10} />));
    const second = positions(render(<CelestialBackground starCount={10} />));

    expect(first).toEqual(second);
  });

  it('marks the star field as untouchable so stars never intercept taps', () => {
    const tree = render(<CelestialBackground />);

    expect(byTestId(tree, 'celestial-star-field')[0].props.pointerEvents).toBe('none');
  });
});

describe('clearOfPlanet', () => {
  const star = (id: number, top: number) => ({ id, left: 10, top, opacity: 0.6 });

  it('leaves alone every star that is already below the globe', () => {
    const below = [star(1, 300), star(2, 500)];

    expect(clearOfPlanet(below, 200, 800)).toEqual(below);
  });

  it('folds a star off the continents down into the clear sky', () => {
    const [moved] = clearOfPlanet([star(1, 50)], 200, 800);

    expect(moved.top).toBeGreaterThanOrEqual(200);
    expect(moved.top).toBeLessThanOrEqual(800);
  });

  it('keeps a star where it was across the width, so the field stays even', () => {
    const [moved] = clearOfPlanet([star(1, 50)], 200, 800);

    expect(moved.left).toBe(10);
    expect(moved.opacity).toBe(0.6);
  });

  it('keeps the order it was given, deepest under the globe landing lowest', () => {
    const [high, low] = clearOfPlanet([star(1, 20), star(2, 180)], 200, 800);

    expect(low.top).toBeGreaterThan(high.top);
  });

  it('copes with a screen too short to have a clear band', () => {
    expect(() => clearOfPlanet([star(1, 10)], 900, 800)).not.toThrow();
  });
});
