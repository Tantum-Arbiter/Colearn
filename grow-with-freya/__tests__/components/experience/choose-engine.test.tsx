import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { ChooseEngine, ENTRANCE_MS, cardOpacity, labelSize, type Choice, type ChooseEvent } from '@/components/experience/engines/choose/choose-engine';
import { cardFrames } from '@/components/experience/engines/choose/choose-layout';

jest.mock('@/hooks/use-steady-shared-value', () => ({
  useSteadySharedValue: (initial: number) => require('react').useState({ value: initial })[0],
}));

const TRAY = { left: 236, top: 90, width: 371, height: 144 };

const CHOICES: Choice[] = [
  { id: 'megaphone', image: 'file:///megaphone.webp', label: 'a loud megaphone picture' },
  { id: 'waving-paw', image: 'file:///paw.webp', label: 'a soft waving paw picture' },
];

function renderEngine(overrides: Partial<React.ComponentProps<typeof ChooseEngine>> = {}) {
  const events: ChooseEvent[] = [];
  const props: React.ComponentProps<typeof ChooseEngine> = {
    choices: CHOICES,
    target: '',
    tray: TRAY,
    reduceMotion: false,
    paused: false,
    onEvent: (event) => events.push(event),
    ...overrides,
  };
  const view = render(<ChooseEngine {...props} />);
  const root = view.UNSAFE_root;
  const card = (id: string) => root.findAll((node: ReactTestInstance) => node.props.testID === `choose-card-${id}` && typeof node.props.onPress === 'function')[0];
  return { ...view, root, events, card, press: (id: string) => fireEvent.press(card(id)) };
}

describe('ChooseEngine: the tray', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows one card per choice, each named for VoiceOver', () => {
    const { card } = renderEngine();

    expect(card('megaphone').props.accessibilityLabel).toBe('a loud megaphone picture');
    expect(card('waving-paw').props.accessibilityRole).toBe('button');
  });

  it('lays the cards out where the tray geometry says', () => {
    const { root } = renderEngine();
    const [first] = cardFrames(2, TRAY);

    const placed = root.findAll((node: ReactTestInstance) => node.props.testID === 'choose-card-megaphone-frame')[0];

    expect(placed.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ left: first.left, top: first.top, width: first.width, height: first.height })]));
  });

  it('tells the host the first action has been shown once the cards have arrived', () => {
    const { events } = renderEngine();

    expect(events).toEqual([]);
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    expect(events).toEqual([{ type: 'first-action-shown' }]);
  });

  it('arrives at once under Reduce Motion', () => {
    const { events } = renderEngine({ reduceMotion: true });

    act(() => jest.advanceTimersByTime(0));

    expect(events).toEqual([{ type: 'first-action-shown' }]);
  });
});

describe('ChooseEngine: choosing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('an open challenge completes with whichever card is tapped', () => {
    const { events, press } = renderEngine();

    press('megaphone');

    expect(events.filter((event) => event.type === 'complete')).toEqual([{ type: 'complete', choice: 'megaphone' }]);
  });

  it('a second tap after choosing changes nothing', () => {
    const { events, press, card } = renderEngine();

    press('waving-paw');
    press('megaphone');

    expect(events.filter((event) => event.type === 'complete')).toHaveLength(1);
    expect(card('waving-paw').props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(card('megaphone').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('a guided challenge repairs a non-target tap, keeps the cards live, and completes on the target', () => {
    const { events, press } = renderEngine({ target: 'waving-paw' });

    press('megaphone');
    press('megaphone');
    press('waving-paw');

    expect(events.filter((event) => event.type !== 'first-action-shown')).toEqual([
      { type: 'repair', id: 'megaphone' },
      { type: 'repair', id: 'megaphone' },
      { type: 'complete', choice: 'waving-paw' },
    ]);
  });

  it('taps while paused do nothing', () => {
    const { events, press } = renderEngine({ paused: true });

    press('megaphone');

    expect(events.filter((event) => event.type === 'complete')).toEqual([]);
  });
});

describe('ChooseEngine: words under the pictures, and leaving', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const words = (node: ReactTestInstance): string[] => node.children.flatMap((child) => (typeof child === 'string' ? [child] : words(child)));

  it('names each card under its picture', () => {
    const { root } = renderEngine({ choices: [{ id: 'shy', image: 'file:///shy.webp', label: 'Shy' }, { id: 'worried', image: 'file:///worried.webp', label: 'Worried' }] });

    expect(words(root.findAll((node: ReactTestInstance) => node.props.testID === 'choose-card-shy-label')[0]).join('')).toBe('Shy');
    expect(words(root.findAll((node: ReactTestInstance) => node.props.testID === 'choose-card-worried-label')[0]).join('')).toBe('Worried');
  });

  it('leaving takes every card away from touch', () => {
    const { root, card } = renderEngine({ leaving: true });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    const frame = root.findAll((node: ReactTestInstance) => node.props.testID === 'choose-card-megaphone-frame')[0];
    expect(frame.props.pointerEvents).toBe('none');
    expect(card('megaphone').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(card('waving-paw').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it.each([
    [false, false, 1],
    [false, true, 0.45],
    [true, false, 0],
    [true, true, 0],
  ])('a card leaving=%p dimmed=%p fades to %p', (hidden, dimmed, opacity) => {
    expect(cardOpacity(hidden, dimmed)).toBe(opacity);
  });

  it.each([
    [60, 13],
    [120, 16],
    [200, 20],
  ])('a %ppt card names its picture at %ppt, never smaller than 13 or larger than 20', (width, size) => {
    expect(labelSize(width)).toBe(size);
  });
});
