import React from 'react';
import { render } from '@testing-library/react-native';

import { OwlPerch } from '@/components/screen-time/owl-perch';
import { OWL_PERCH, OWL_RHYTHM, owlPerchFrame } from '@/constants/owl-companion';

const mockReducedMotion = jest.fn(() => false);
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

jest.mock('@/components/screen-time/owl-sprite', () => {
  const { View } = require('react-native');
  return { OwlSprite: (props: Record<string, unknown>) => <View {...props} /> };
});

const reanimated = jest.requireMock('react-native-reanimated');

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((merged, entry) => ({ ...merged, ...flatten(entry) }), {});
  }
  return (style ?? {}) as Record<string, unknown>;
}

function styleOf(tree: ReturnType<typeof render>, testID: string) {
  return flatten(findByTestId(tree, testID)[0].props.style);
}

function timingsOf(duration: number): number {
  return reanimated.withTiming.mock.calls.filter(
    ([, config]: [unknown, { duration?: number } | undefined]) => config?.duration === duration
  ).length;
}

function owl(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll(
    (node: any) => typeof node.props.phase === 'string' && typeof node.props.width === 'number'
  )[0];
}

function renderPerch(props: Partial<React.ComponentProps<typeof OwlPerch>> = {}) {
  return render(<OwlPerch phase="idle" owlWidth={116} {...props} />);
}

describe('owlPerchFrame', () => {
  it('stands the owl on the platform with its feet tucked into the stone', () => {
    const frame = owlPerchFrame(OWL_PERCH.baseOwlWidth);

    expect(frame.scale).toBe(1);
    expect(frame.owl.bottom).toBe(OWL_PERCH.ledgeHeight - OWL_PERCH.platformTop - OWL_PERCH.footOverlap);
    expect(frame.owl.left).toBe(OWL_PERCH.owlLeft);
  });

  it('is as tall as the owl standing on the ledge', () => {
    const frame = owlPerchFrame(116);

    expect(frame.height).toBeCloseTo(frame.owl.bottom + frame.owl.height, 5);
    expect(frame.width).toBe(OWL_PERCH.ledgeWidth);
  });

  it('scales the whole perch with the owl', () => {
    const small = owlPerchFrame(58);
    const full = owlPerchFrame(116);

    expect(small.width).toBeCloseTo(full.width / 2, 5);
    expect(small.owl.bottom).toBeCloseTo(full.owl.bottom / 2, 5);
    expect(small.ledge.height).toBeCloseTo(full.ledge.height / 2, 5);
  });

  it('starts the slide fully off the left edge', () => {
    const frame = owlPerchFrame(116);

    expect(frame.slideFrom).toBeLessThan(-frame.width);
  });

  it('keeps the clouds low around the base', () => {
    const frame = owlPerchFrame(116);

    expect(frame.cloudFront.bottom).toBeLessThan(0);
    expect(frame.cloudBack.bottom).toBeLessThan(0);
    expect(frame.cloudFront.left).toBeLessThan(0);
  });
});

describe('OwlPerch', () => {
  beforeEach(() => {
    mockReducedMotion.mockReturnValue(false);
    reanimated.withTiming.mockClear();
  });

  it('layers the back cloud, the ledge, the owl and the front cloud in that order', () => {
    const tree = renderPerch();

    const order = tree.UNSAFE_root
      .findAll((node: any) => typeof node.props.testID === 'string' && node.props.testID.startsWith('owl-perch-'))
      .map((node: any) => node.props.testID)
      .filter((id: string, index: number, all: string[]) => all.indexOf(id) === index);

    expect(order).toEqual(['owl-perch-cloud-back', 'owl-perch-ledge', 'owl-perch-owl', 'owl-perch-sprite', 'owl-perch-cloud-front']);
  });

  it('sizes itself from the owl', () => {
    const frame = owlPerchFrame(116);
    const tree = renderPerch({ owlWidth: 116 });

    const style = styleOf(tree, 'owl-perch');

    expect(style.width).toBe(frame.width);
    expect(style.height).toBeCloseTo(frame.height, 5);
    expect(styleOf(tree, 'owl-perch-owl')).toMatchObject({ left: frame.owl.left, bottom: frame.owl.bottom });
  });

  it('hands the owl its phase, words and pointing, and keeps it from hopping', () => {
    const onPhaseEnd = jest.fn();
    const tree = renderPerch({ phase: 'arrive', sayCount: 2, pointing: true, wingSide: 'left', onPhaseEnd });

    expect(owl(tree).props).toMatchObject({ phase: 'arrive', sayCount: 2, pointing: true, wingSide: 'left', approach: 'none', onPhaseEnd });
  });

  it('slides in over the arrival', () => {
    renderPerch({ phase: 'arrive' });

    expect(timingsOf(OWL_RHYTHM.arriveMs)).toBeGreaterThan(0);
  });

  it('slides out over the leaving', () => {
    const tree = renderPerch({ phase: 'idle' });
    reanimated.withTiming.mockClear();

    tree.rerender(<OwlPerch phase="leave" owlWidth={116} />);

    expect(timingsOf(OWL_RHYTHM.leaveMs)).toBeGreaterThan(0);
  });

  it('slides away as the delight fades', () => {
    const tree = renderPerch({ phase: 'idle' });
    reanimated.withTiming.mockClear();

    tree.rerender(<OwlPerch phase="delight" owlWidth={116} />);

    expect(timingsOf(OWL_RHYTHM.delightFadeMs)).toBeGreaterThan(0);
  });

  it('lets the clouds drift', () => {
    renderPerch();

    expect(timingsOf(OWL_PERCH.driftMs / 2)).toBeGreaterThan(0);
  });

  it('never intercepts touches', () => {
    const tree = renderPerch();

    expect(findByTestId(tree, 'owl-perch')[0].props.pointerEvents).toBe('none');
  });

  it('names itself for screen readers when asked', () => {
    const tree = renderPerch({ accessibilityLabel: 'An owl on a rock' });

    expect(findByTestId(tree, 'owl-perch')[0].props.accessibilityLabel).toBe('An owl on a rock');
  });

  describe('with reduced motion', () => {
    beforeEach(() => {
      mockReducedMotion.mockReturnValue(true);
      reanimated.withTiming.mockClear();
    });

    it('fades rather than slides', () => {
      renderPerch({ phase: 'arrive' });

      expect(timingsOf(OWL_RHYTHM.reducedFadeMs)).toBeGreaterThan(0);
      expect(timingsOf(OWL_RHYTHM.arriveMs)).toBe(0);
    });

    it('holds the clouds still', () => {
      renderPerch();

      expect(timingsOf(OWL_PERCH.driftMs / 2)).toBe(0);
    });
  });
});
