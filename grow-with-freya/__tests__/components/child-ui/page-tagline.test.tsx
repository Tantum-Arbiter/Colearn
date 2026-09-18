/**
 * PageTagline -- the caption beneath the page title, set on two shallow
 * arches in the app's own rounded face with a small gold star under it.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PageTagline, TAGLINE_ARCH_RADIUS_RATIO } from '@/components/child-ui/page-tagline';
import { ACCENT_GOLD, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';

const mockAccessibility = jest.fn(() => ({
  scaledFontSize: (n: number) => n,
  scaledButtonSize: (n: number) => n,
  scaledPadding: (n: number) => n,
  isTablet: false,
  contentMaxWidth: 402,
}));
jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => mockAccessibility(),
}));

const LINES = ['catalogue.tagline.one', 'catalogue.tagline.two'] as const;

function byTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID);
}

function arcs(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll(
    (n: any) => typeof n.props.testID === 'string' && n.props.testID.endsWith('-arc')
  );
}

describe('PageTagline', () => {
  it('sets the caption on two lines, each on its own arch', () => {
    const tree = render(<PageTagline lines={LINES} width={360} />);

    const onPaths = [...new Set(tree.UNSAFE_root
      .findAll((n: any) => n.props.testID === 'svg-TextPath')
      .map((n: any) => n.props.children))];

    expect(arcs(tree)).toHaveLength(2);
    expect(onPaths).toEqual(['catalogue.tagline.one', 'catalogue.tagline.two']);
  });

  it('bends each line along a circle wider than the block, so the arch stays shallow', () => {
    const width = 360;
    const tree = render(<PageTagline lines={LINES} width={width} />);
    const radius = width * TAGLINE_ARCH_RADIUS_RATIO;

    const line = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'svg-Path')[0];

    expect(TAGLINE_ARCH_RADIUS_RATIO).toBeGreaterThan(1);
    expect(line.props.d).toContain(`A ${radius} ${radius} 0 0 1 ${width}`);
  });

  /**
   * The box has to hold the whole arc, not just its crown. A long line reaches
   * the ends, which fall well below the middle -- and a box sized for one line
   * of type cuts them off there. "Everything you loved" lost its E and its d
   * to exactly that edge.
   */
  it('stands tall enough to hold the ends of its own arch', () => {
    const width = 360;
    const tree = render(<PageTagline lines={LINES} width={width} />);
    const radius = width * TAGLINE_ARCH_RADIUS_RATIO;
    const rise = radius - Math.sqrt(radius * radius - (width / 2) ** 2);

    const svg = tree.UNSAFE_root.findAll((n: any) => n.props.testID?.endsWith('-arc'))[0];

    expect(svg.props.height).toBeGreaterThanOrEqual(rise);
  });

  it('spans the full width it was given', () => {
    const tree = render(<PageTagline lines={LINES} width={360} />);

    const svg = tree.UNSAFE_root.findAll((n: any) => n.props.testID?.endsWith('-arc'))[0];

    expect(svg.props.width).toBe(360);
  });

  /**
   * This once asserted the opposite -- that a line cost no more height than a
   * line of type. That was the bug: the arch's ends fall below its crown, and a
   * box that tight cuts off the words riding there. The arch costs its rise,
   * and the flatter curve is what keeps that cost small.
   */
  it('costs the height of its arch and little more', () => {
    const width = 360;
    const tree = render(<PageTagline lines={LINES} width={width} />);
    const radius = width * TAGLINE_ARCH_RADIUS_RATIO;
    const rise = radius - Math.sqrt(radius * radius - (width / 2) ** 2);

    const [first] = arcs(tree);

    expect(first.props.height).toBeGreaterThan(rise);
    expect(first.props.height).toBeLessThan(rise + 30);
  });

  it('sets the words in the app\'s rounded face, centred and white', () => {
    const tree = render(<PageTagline lines={LINES} width={360} />);

    const underTest = tree.UNSAFE_root.findAll(
      (n: any) => n.props.testID === 'svg-Text' && n.props.fill === TEXT_PRIMARY,
    )[0];

    expect(underTest.props.fontFamily).toBe(Fonts.rounded);
    expect(underTest.props.textAnchor).toBe('middle');
    expect(underTest.props.fill).toBe(TEXT_PRIMARY);
  });

  it('closes with a small gold star, and reads as one line to assistive tech', () => {
    const tree = render(<PageTagline lines={LINES} width={360} />);

    const block = byTestId(tree, 'page-tagline')[0];
    const stars = tree.UNSAFE_root.findAll((n: any) => n.props.name === 'star' && n.props.color === ACCENT_GOLD);

    expect(stars.length).toBeGreaterThan(0);
    expect(block.props.accessibilityLabel).toBe('catalogue.tagline.one catalogue.tagline.two');
  });

  it('gives each line its own arc, so two taglines never share a path', () => {
    const tree = render(<PageTagline lines={LINES} width={360} />);

    const ids = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'svg-Path').map((n: any) => n.props.id);

    expect(new Set(ids).size).toBe(2);
  });

  it('should set the caption larger on a tablet, where there is room for it', () => {
    const phone = render(<PageTagline lines={LINES} width={360} />);
    const phoneSize = phone.UNSAFE_root.findAll((n: any) => n.props.testID === 'svg-Text')[0].props.fontSize;
    mockAccessibility.mockReturnValue({
      scaledFontSize: (n: number) => n,
      scaledButtonSize: (n: number) => n,
      scaledPadding: (n: number) => n,
      isTablet: true,
      contentMaxWidth: 834,
    });

    const tablet = render(<PageTagline lines={LINES} width={360} />);

    const underTest = tablet.UNSAFE_root.findAll((n: any) => n.props.testID === 'svg-Text')[0].props.fontSize;
    expect(underTest).toBeGreaterThan(phoneSize);
  });
});

/**
 * The arched lines sit on the globe. They lift off it by size alone -- a
 * dark outline behind the words was tried and read as a smudge -- so each
 * line is drawn once, white, seven percent larger than it was.
 */
describe('PageTagline over the globe', () => {
  it('draws each line once, with no outline behind it', () => {
    const tree = render(<PageTagline lines={['A brighter world', 'in every story']} width={300} />);

    const layers = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'svg-Text');
    const outlined = layers.filter((n: any) => typeof n.props.stroke === 'string' && n.props.stroke !== 'none');

    expect(layers).toHaveLength(2);
    expect(outlined).toHaveLength(0);
    for (const layer of layers) expect(layer.props.fill).toBe(TEXT_PRIMARY);
  });

  it.each([
    ['a phone', false, 16],
    ['a tablet', true, 20],
  ])('sets the type seven percent up from where it was on %s', (_case, isTablet, size) => {
    mockAccessibility.mockReturnValue({
      scaledFontSize: (n: number) => n,
      scaledButtonSize: (n: number) => n,
      scaledPadding: (n: number) => n,
      isTablet,
      contentMaxWidth: 402,
    });
    const tree = render(<PageTagline lines={['A brighter world', 'in every story']} width={300} />);

    const layer = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'svg-Text')[0];

    expect(layer.props.fontSize).toBe(size);
  });

  it('still reads as exactly the two lines to assistive tech', () => {
    const tree = render(<PageTagline lines={['A brighter world', 'in every story']} width={300} />);

    const block = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'page-tagline')[0];

    expect(block.props.accessibilityLabel).toBe('A brighter world in every story');
  });
});
