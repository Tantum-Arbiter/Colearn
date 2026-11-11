import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SCENE_ENTRANCE_MS, SceneEngine, type SceneEvent, type Spot } from '@/components/experience/engines/scene/scene-engine';

jest.mock('@/hooks/use-steady-shared-value', () => ({
  useSteadySharedValue: (initial: number) => require('react').useState({ value: initial })[0],
}));

const HOOKS: Spot[] = [
  { id: 'hook-1', label: 'first hook', frame: { left: 300, top: 100, width: 60, height: 70 } },
  { id: 'hook-2', label: 'second hook', frame: { left: 400, top: 100, width: 60, height: 70 } },
  { id: 'hook-3', label: 'third hook', frame: { left: 500, top: 100, width: 60, height: 70 } },
];

function renderEngine(overrides: Partial<React.ComponentProps<typeof SceneEngine>> = {}) {
  const events: SceneEvent[] = [];
  const props: React.ComponentProps<typeof SceneEngine> = {
    spots: HOOKS,
    mode: 'count',
    target: '',
    reduceMotion: false,
    paused: false,
    onEvent: (event) => events.push(event),
    ...overrides,
  };
  const view = render(<SceneEngine {...props} />);
  const root = view.UNSAFE_root;
  const spot = (id: string) => root.findAll((node: ReactTestInstance) => node.props.testID === `scene-spot-${id}` && typeof node.props.onPress === 'function')[0];
  const mark = (id: string) => root.findAll((node: ReactTestInstance) => node.props.testID === `scene-spot-${id}-mark` && typeof node.props.children !== 'undefined')[0];
  return { ...view, root, events, spot, mark, press: (id: string) => fireEvent.press(spot(id)) };
}

describe('SceneEngine: the spots', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('puts one named, touchable spot where each hotspot lands', () => {
    const { root, spot } = renderEngine();
    const placed = root.findAll((node: ReactTestInstance) => node.props.testID === 'scene-spot-hook-2-frame')[0];

    expect(spot('hook-2').props.accessibilityLabel).toBe('second hook');
    expect(spot('hook-2').props.accessibilityRole).toBe('button');
    expect(placed.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ left: 400, top: 100, width: 60, height: 70 })]));
  });

  it('tells the host the first action has been shown once the spots have appeared', () => {
    const { events } = renderEngine();

    expect(events).toEqual([]);
    act(() => jest.advanceTimersByTime(SCENE_ENTRANCE_MS));

    expect(events).toEqual([{ type: 'first-action-shown' }]);
  });

  it('appears at once under Reduce Motion', () => {
    const { events } = renderEngine({ reduceMotion: true });

    act(() => jest.advanceTimersByTime(0));

    expect(events).toEqual([{ type: 'first-action-shown' }]);
  });
});

describe('SceneEngine: counting', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('numbers each spot as it is counted, in the order tapped', () => {
    const { press, mark, events } = renderEngine();

    press('hook-3');
    press('hook-1');

    expect(mark('hook-3').props.children).toBe(1);
    expect(mark('hook-1').props.children).toBe(2);
    expect(mark('hook-2')).toBeUndefined();
    expect(events.filter((event) => event.type === 'counted')).toEqual([
      { type: 'counted', id: 'hook-3', count: 1 },
      { type: 'counted', id: 'hook-1', count: 2 },
    ]);
  });

  it('a counted spot tapped again keeps its number and the count', () => {
    const { press, mark, events } = renderEngine();

    press('hook-1');
    press('hook-1');

    expect(mark('hook-1').props.children).toBe(1);
    expect(events.filter((event) => event.type === 'repair')).toEqual([{ type: 'repair', id: 'hook-1' }]);
  });

  it('completes on the last spot and then stops answering', () => {
    const { press, events, spot } = renderEngine();

    press('hook-1');
    press('hook-2');
    press('hook-3');
    press('hook-1');

    expect(events.filter((event) => event.type === 'complete')).toEqual([{ type: 'complete', choice: '' }]);
    expect(spot('hook-1').props.disabled).toBe(true);
  });

  it('says on each spot whether it has been counted', () => {
    const { press, spot } = renderEngine();

    press('hook-2');

    expect(spot('hook-2').props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(spot('hook-1').props.accessibilityState).toEqual({ selected: false, disabled: false });
  });

  it('finding every one ticks the spot instead of numbering it', () => {
    const { press, mark } = renderEngine({ mode: 'every' });

    press('hook-2');

    expect(mark('hook-2').props.children).toBe('✓');
  });

  it('ignores taps while paused', () => {
    const { press, events, mark } = renderEngine({ paused: true });

    press('hook-1');

    expect(events.filter((event) => event.type !== 'first-action-shown')).toEqual([]);
    expect(mark('hook-1')).toBeUndefined();
  });
});

describe('SceneEngine: finding the one', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const GROUPS: Spot[] = [
    { id: 'two-dots', label: 'two dots', frame: { left: 300, top: 300, width: 80, height: 80 } },
    { id: 'three-dots', label: 'three dots', frame: { left: 420, top: 300, width: 80, height: 80 } },
  ];

  it('the target completes the challenge and is marked', () => {
    const { press, events, mark } = renderEngine({ spots: GROUPS, mode: 'find', target: 'two-dots' });

    press('two-dots');

    expect(events.filter((event) => event.type === 'complete')).toEqual([{ type: 'complete', choice: 'two-dots' }]);
    expect(mark('two-dots').props.children).toBe('✓');
  });

  it('another spot is answered gently, unmarked, and play goes on', () => {
    const { press, events, mark } = renderEngine({ spots: GROUPS, mode: 'find', target: 'two-dots' });

    press('three-dots');
    press('two-dots');

    expect(mark('three-dots')).toBeUndefined();
    expect(events.filter((event) => event.type !== 'first-action-shown')).toEqual([
      { type: 'repair', id: 'three-dots' },
      { type: 'complete', choice: 'two-dots' },
    ]);
  });
});
