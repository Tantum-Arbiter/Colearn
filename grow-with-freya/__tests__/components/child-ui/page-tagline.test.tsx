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

    const onPaths = tree.UNSAFE_root
      .findAll((n: any) => n.props.testID === 'svg-TextPath')
      .map((n: any) => n.props.children);

    expect(arcs(tree)).toHaveLength(2);
    expect(onPaths).toEqual(['catalogue.tagline.one', 'catalogue.tagline.two']);
  });

  it('bends each line along a circle a little wider than the block, so the arch stays shallow', () => {
    const width = 360;
    const tree = render(<PageTagline lines={LINES} width={width} />);
    const radius = width * TAGLINE_ARCH_RADIUS_RATIO;

    const line = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'svg-Path')[0];

    expect(TAGLINE_ARCH_RADIUS_RATIO).toBeGreaterThan(1);
    expect(line.props.d).toContain(`A ${radius} ${radius} 0 0 1 ${width}`);
  });

  it('keeps a line no taller than a line of type, so the arch costs no height', () => {
    const tree = render(<PageTagline lines={LINES} width={360} />);

    const [first] = arcs(tree);

    expect(first.props.height).toBeLessThanOrEqual(20);
  });

  it('sets the words in the app\'s rounded face, centred and white', () => {
    const tree = render(<PageTagline lines={LINES} width={360} />);

    const underTest = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'svg-Text')[0];

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
