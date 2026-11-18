/**
 * The catalogue sky is one gradient with a calm, deterministic star field.
 * These pin the §6.1 contract: seeded star positions that never change
 * between renders, a gold minority, and accent stars on top of the count.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { CelestialBackground, clearOfPlanet } from '@/components/child-ui/celestial-background';
import { planetReach } from '@/constants/earth';

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

/**
 * A fuller sky, the same handful of gold. The field was asked for more white
 * dots, not for more of the four-pointed accents or a brighter, busier sky --
 * so the gold count stays where it was while the plain dots multiply.
 */
describe('the field’s own defaults', () => {
  function counts(tree: ReturnType<typeof render>) {
    return {
      white: byTestId(tree, 'celestial-star').length,
      gold: byTestId(tree, 'celestial-star-gold').length,
      accent: byTestId(tree, 'celestial-star-accent').length,
    };
  }

  it('draws a good many more white dots than gold ones', () => {
    const { white, gold } = counts(render(<CelestialBackground />));

    expect(white).toBeGreaterThan(gold * 8);
  });

  it('keeps the accents a handful, however full the sky gets', () => {
    expect(counts(render(<CelestialBackground />)).accent).toBeLessThanOrEqual(3);
  });

  it('holds the gold to about the handful it always was', () => {
    expect(counts(render(<CelestialBackground />)).gold).toBeLessThanOrEqual(8);
  });

  /** The point of the extra stars is a fuller sky, so it has to be fuller. */
  it('fills the sky more than the field it grew from', () => {
    const { white, gold } = counts(render(<CelestialBackground />));

    expect(white + gold).toBeGreaterThan(56);
  });
});

/** No star may sit on the continents, at whatever count the field draws. */
describe('a fuller field still clears the globe', () => {
  it('folds every star below the globe’s rim', () => {
    const folded = clearOfPlanet(
      [
        { id: 1, left: 10, top: 0, opacity: 1 },
        { id: 2, left: 20, top: 120, opacity: 1 },
        { id: 3, left: 30, top: 400, opacity: 1 },
      ],
      200,
      800,
    );

    expect(folded.every((star) => star.top >= 200)).toBe(true);
  });
});

/**
 * The painted planet hangs lower than the globe did (operator, 2026-10-03),
 * so the stars are folded down below where it now reaches.
 */
describe('the field and the hanging planet', () => {
  // under react-native-web the viewport is the document's, and jsdom reports 0 by 0 unless told
  function setViewport(width: number, height: number) {
    Object.defineProperty(document.documentElement, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: height, configurable: true });
    window.dispatchEvent(new Event('resize'));
  }

  afterEach(() => {
    setViewport(0, 0);
  });

  it('keeps every star below the planet`s tip, for the window it is drawn in', () => {
    const width = 1194;
    const height = 834;
    setViewport(width, height);
    const tree = render(<CelestialBackground />);

    const tops = ['celestial-star', 'celestial-star-gold', 'celestial-star-accent']
      .flatMap((name) => byTestId(tree, name))
      .map((node: any) => StyleSheet.flatten(node.props.style)?.top)
      .filter((top: unknown): top is number => typeof top === 'number');

    expect(tops.length).toBeGreaterThan(0);
    expect(planetReach(width, height, 'top')).toBeGreaterThan(planetReach(width, height, 'bottom'));
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(planetReach(width, height, 'top'));
    expect(Math.min(...tops)).toBeLessThan(planetReach(width, height, 'top') + 60);
  });
});
