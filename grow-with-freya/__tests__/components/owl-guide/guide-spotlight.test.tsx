import React from 'react';
import { render } from '@testing-library/react-native';
import { Rect } from 'react-native-svg';

import { GuideSpotlight, RING_PULSE_MS } from '@/components/owl-guide/guide-spotlight';
import { spotlightFrame } from '@/constants/owl-guide';

const mockReducedMotion = jest.fn(() => false);
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

const reanimated = jest.requireMock('react-native-reanimated');

const TARGET = { x: 100, y: 200, width: 80, height: 40 };

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((merged, entry) => ({ ...merged, ...flatten(entry) }), {});
  }
  return (style ?? {}) as Record<string, unknown>;
}

function renderSpotlight(props: Partial<React.ComponentProps<typeof GuideSpotlight>> = {}) {
  return render(<GuideSpotlight width={400} height={800} target={TARGET} {...props} />);
}

describe('GuideSpotlight', () => {
  beforeEach(() => {
    mockReducedMotion.mockReturnValue(false);
    reanimated.withTiming.mockClear();
    reanimated.cancelAnimation.mockClear();
  });

  it('dims the whole screen', () => {
    const tree = renderSpotlight();

    const rects = tree.UNSAFE_root.findAllByType(Rect);
    const full = rects.filter((rect: any) => rect.props.width === 400 && rect.props.height === 800);

    expect(full.length).toBeGreaterThanOrEqual(2);
  });

  it('cuts a hole where the highlight is', () => {
    const tree = renderSpotlight({ shape: 'rounded-rect', radius: 12 });
    const frame = spotlightFrame(TARGET, 'rounded-rect', 12);

    const cutout = findByTestId(tree, 'owl-guide-cutout')[0];

    expect(cutout.props).toMatchObject({
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      rx: 12,
      fill: 'black',
    });
  });

  it('rounds the hole fully for a circle', () => {
    const tree = renderSpotlight({ shape: 'circle' });
    const frame = spotlightFrame(TARGET, 'circle');

    const cutout = findByTestId(tree, 'owl-guide-cutout')[0];

    expect(cutout.props.rx).toBe(frame.radius);
    expect(cutout.props.width).toBe(cutout.props.height);
  });

  it('draws a ring just outside the hole', () => {
    const tree = renderSpotlight({ shape: 'circle' });
    const frame = spotlightFrame(TARGET, 'circle');

    const ring = flatten(findByTestId(tree, 'owl-guide-ring')[0].props.style);

    expect(ring.left).toBe(frame.x - 3);
    expect(ring.top).toBe(frame.y - 3);
    expect(ring.width).toBe(frame.width + 6);
  });

  it('pulses the ring', () => {
    renderSpotlight();

    const pulses = reanimated.withTiming.mock.calls.filter(
      ([, config]: [unknown, { duration?: number } | undefined]) => config?.duration === RING_PULSE_MS / 2
    );

    expect(pulses.length).toBeGreaterThan(0);
  });

  it('holds the ring still under reduced motion', () => {
    mockReducedMotion.mockReturnValue(true);

    renderSpotlight();

    const pulses = reanimated.withTiming.mock.calls.filter(
      ([, config]: [unknown, { duration?: number } | undefined]) => config?.duration === RING_PULSE_MS / 2
    );
    expect(pulses).toHaveLength(0);
  });

  it('only dims, with no hole or ring, when there is nothing to highlight', () => {
    const tree = renderSpotlight({ target: null });

    expect(findByTestId(tree, 'owl-guide-cutout')).toHaveLength(0);
    expect(findByTestId(tree, 'owl-guide-ring')).toHaveLength(0);
  });

  it('never intercepts touches itself', () => {
    const tree = renderSpotlight();

    expect(findByTestId(tree, 'owl-guide-spotlight')[0].props.pointerEvents).toBe('none');
  });
});
