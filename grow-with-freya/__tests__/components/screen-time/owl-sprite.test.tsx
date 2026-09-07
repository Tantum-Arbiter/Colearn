import React from 'react';
import { render, act } from '@testing-library/react-native';

import { OwlSprite } from '@/components/screen-time/owl-sprite';
import {
  OWL_CANVAS,
  OWL_LAYERS,
  OWL_LAYER_ORDER,
  OWL_RIG,
  OWL_RHYTHM,
  owlOrigin,
} from '@/constants/owl-companion';

const mockReducedMotion = jest.fn(() => false);
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

const reanimated = jest.requireMock('react-native-reanimated');

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (merged, entry) => ({ ...merged, ...flattenStyle(entry) }),
      {}
    );
  }
  return (style ?? {}) as Record<string, unknown>;
}

function styleOf(tree: ReturnType<typeof render>, testID: string) {
  return flattenStyle(findByTestId(tree, testID)[0].props.style);
}

function renderOwl(props: Partial<React.ComponentProps<typeof OwlSprite>> = {}) {
  return render(<OwlSprite phase="idle" width={116} {...props} />);
}

function timingsOf(duration: number): number {
  return reanimated.withTiming.mock.calls.filter(
    ([, config]: [unknown, { duration?: number } | undefined]) => config?.duration === duration
  ).length;
}

function blinkCalls(): number {
  return timingsOf(OWL_RHYTHM.blinkDownMs);
}

function talkCalls(): number {
  return timingsOf(OWL_RHYTHM.talkOpenMs);
}

describe('OwlSprite layers', () => {
  beforeEach(() => {
    mockReducedMotion.mockReturnValue(false);
  });

  it('sizes the stage from its width, keeping the canvas aspect', () => {
    const tree = renderOwl({ width: 116 });

    const stage = styleOf(tree, 'owl-sprite');

    expect(stage.width).toBe(116);
    expect(stage.height).toBeCloseTo((116 * OWL_CANVAS.height) / OWL_CANVAS.width, 5);
  });

  it('stacks the five layers back to front', () => {
    const tree = renderOwl();

    const layers = tree.UNSAFE_root
      .findAll((node: any) => typeof node.props.testID === 'string' && node.props.testID.startsWith('owl-layer-'))
      .map((node: any) => node.props.testID.replace('owl-layer-', ''));

    expect([...new Set(layers)]).toEqual([...OWL_LAYER_ORDER]);
  });

  it.each(OWL_LAYER_ORDER)('draws the %s layer from its own cut-out', (name) => {
    const tree = renderOwl();

    const images = tree.UNSAFE_root.findAll(
      (node: any) => node.props.testID === `owl-layer-${name}` && node.props.source !== undefined
    );

    expect(images[0].props.source).toBe(OWL_LAYERS[name]);
  });

  it('turns the head about the neck', () => {
    const tree = renderOwl();

    expect(styleOf(tree, 'owl-head').transformOrigin).toBe(owlOrigin(OWL_RIG.headPivot));
  });

  it('swings the wing from the shoulder', () => {
    const tree = renderOwl();

    expect(styleOf(tree, 'owl-wing').transformOrigin).toBe(owlOrigin(OWL_RIG.wingPivot));
  });

  it('breathes from the feet so they stay planted', () => {
    const tree = renderOwl();

    expect(styleOf(tree, 'owl-body').transformOrigin).toBe('50% 100%');
  });

  it('clips the closed eyes behind a lid window', () => {
    const tree = renderOwl();

    const window = styleOf(tree, 'owl-eye-window');

    expect(window.overflow).toBe('hidden');
    expect(window.position).toBe('absolute');
  });

  it('keeps the whole owl out of the way of touches', () => {
    const tree = renderOwl();

    expect(findByTestId(tree, 'owl-sprite')[0].props.pointerEvents).toBe('none');
  });
});

describe('OwlSprite phases', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports landing once the hop is over', () => {
    const onPhaseEnd = jest.fn();
    renderOwl({ phase: 'arrive', onPhaseEnd });

    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.arriveMs - 1);
    });
    expect(onPhaseEnd).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onPhaseEnd).toHaveBeenCalledWith('arrive');
  });

  it('reports the delight once the hop of joy is over', () => {
    const onPhaseEnd = jest.fn();
    renderOwl({ phase: 'delight', onPhaseEnd });

    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.delightMs);
    });

    expect(onPhaseEnd).toHaveBeenCalledWith('delight');
  });

  it('reports leaving once it has gone', () => {
    const onPhaseEnd = jest.fn();
    renderOwl({ phase: 'leave', onPhaseEnd });

    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.leaveMs);
    });

    expect(onPhaseEnd).toHaveBeenCalledWith('leave');
  });

  it('fades away at the end of its delight rather than vanishing', () => {
    const before = timingsOf(OWL_RHYTHM.delightFadeMs);

    renderOwl({ phase: 'delight' });

    expect(timingsOf(OWL_RHYTHM.delightFadeMs)).toBeGreaterThan(before);
  });

  it('does not fade while merely idling', () => {
    const before = timingsOf(OWL_RHYTHM.delightFadeMs);

    renderOwl({ phase: 'idle' });

    expect(timingsOf(OWL_RHYTHM.delightFadeMs)).toBe(before);
  });

  it('never reports the end of idling', () => {
    const onPhaseEnd = jest.fn();
    renderOwl({ phase: 'idle', onPhaseEnd });

    act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(onPhaseEnd).not.toHaveBeenCalled();
  });

  it('reports each phase once, not on every render', () => {
    const onPhaseEnd = jest.fn();
    const tree = renderOwl({ phase: 'arrive', onPhaseEnd });

    tree.rerender(<OwlSprite phase="arrive" width={116} onPhaseEnd={onPhaseEnd} sayCount={1} />);
    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.arriveMs * 2);
    });

    expect(onPhaseEnd).toHaveBeenCalledTimes(1);
  });

  it('says nothing about a phase it was unmounted during', () => {
    const onPhaseEnd = jest.fn();
    const tree = renderOwl({ phase: 'arrive', onPhaseEnd });

    tree.unmount();
    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.arriveMs * 2);
    });

    expect(onPhaseEnd).not.toHaveBeenCalled();
  });

  it('blinks on its own once idle', () => {
    renderOwl({ phase: 'idle' });
    const before = blinkCalls();

    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.blinkFirstMs);
    });

    expect(blinkCalls()).toBeGreaterThan(before);
  });

  it('holds still while arriving rather than blinking mid-hop', () => {
    renderOwl({ phase: 'arrive' });
    const before = blinkCalls();

    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.blinkFirstMs + OWL_RHYTHM.glanceFirstMs);
    });

    expect(blinkCalls()).toBe(before);
  });

  it('does not repeat itself when the motion preference changes', () => {
    mockReducedMotion.mockReturnValue(true);
    const tree = renderOwl({ phase: 'idle', sayCount: 1 });
    const before = talkCalls();

    mockReducedMotion.mockReturnValue(false);
    tree.rerender(<OwlSprite phase="idle" width={120} sayCount={1} />);

    expect(talkCalls()).toBe(before);
  });

  it('works the beak each time it is given something new to say', () => {
    const tree = renderOwl({ phase: 'idle', sayCount: 0 });
    const before = talkCalls();

    tree.rerender(<OwlSprite phase="idle" width={116} sayCount={1} />);

    expect(talkCalls()).toBeGreaterThan(before);
  });

  it('does not talk just because it re-rendered', () => {
    const tree = renderOwl({ phase: 'idle', sayCount: 1 });
    const before = talkCalls();

    tree.rerender(<OwlSprite phase="idle" width={120} sayCount={1} />);

    expect(talkCalls()).toBe(before);
  });

  it('stops its breathing loop when unmounted', () => {
    const tree = renderOwl();
    reanimated.cancelAnimation.mockClear();

    tree.unmount();

    expect(reanimated.cancelAnimation).toHaveBeenCalled();
  });
});

describe('OwlSprite with reduced motion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is simply there, after a short fade', () => {
    const onPhaseEnd = jest.fn();
    renderOwl({ phase: 'arrive', onPhaseEnd });

    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.reducedFadeMs);
    });

    expect(onPhaseEnd).toHaveBeenCalledWith('arrive');
  });

  it('never fidgets', () => {
    const tree = renderOwl({ phase: 'idle', sayCount: 0 });
    const blinks = blinkCalls();
    const talks = talkCalls();

    act(() => {
      jest.advanceTimersByTime(60000);
    });
    tree.rerender(<OwlSprite phase="idle" width={116} sayCount={1} />);

    expect(blinkCalls()).toBe(blinks);
    expect(talkCalls()).toBe(talks);
  });

  it('still lets the delight and the leaving finish', () => {
    const onPhaseEnd = jest.fn();
    const tree = renderOwl({ phase: 'delight', onPhaseEnd });
    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.reducedFadeMs);
    });

    tree.rerender(<OwlSprite phase="leave" width={116} onPhaseEnd={onPhaseEnd} />);
    act(() => {
      jest.advanceTimersByTime(OWL_RHYTHM.reducedFadeMs);
    });

    expect(onPhaseEnd).toHaveBeenCalledWith('delight');
    expect(onPhaseEnd).toHaveBeenCalledWith('leave');
  });
});
