import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { PlaceEngine, dragAllowed, gestureFor, tapSends, type EngineEvent } from '@/components/experience/engines/place/place-engine';
import type { PackSounds } from '@/components/experience/pack-sounds';
import { loadPack, type LoadedPack } from '@/services/pack-service';
import type { EngineSave } from '@/types/game-pack';
import type { PlanAgeRange } from '@/types/learning-plan';

jest.mock('@/hooks/use-steady-shared-value', () => ({
  useSteadySharedValue: (initial: number) => require('react').useState({ value: initial })[0],
}));

const SCREEN = { width: 402, height: 874, insets: { top: 62, bottom: 34, left: 0, right: 0 } };

let pack: LoadedPack;
beforeAll(async () => {
  pack = await loadPack('wombat-picnic');
});

function renderEngine(overrides: Partial<React.ComponentProps<typeof PlaceEngine>> = {}) {
  const events: EngineEvent[] = [];
  const sounds: PackSounds & { play: jest.Mock } = { play: jest.fn() };
  const props: React.ComponentProps<typeof PlaceEngine> = {
    pack,
    mission: pack.mission('picnic'),
    band: '2-4',
    crop: 'phone',
    screen: SCREEN,
    reduceMotion: false,
    paused: false,
    demo: false,
    save: null,
    sounds,
    onEvent: (event) => events.push(event),
    ...overrides,
  };
  const view = render(<PlaceEngine {...props} />);
  const root = view.UNSAFE_root;
  const press = (testID: string) => {
    const found = root.findAll((node: ReactTestInstance) => node.props.testID === testID && typeof node.props.onPress === 'function');
    fireEvent.press(found[0]);
  };
  return {
    ...view,
    root,
    events,
    sounds,
    press,
    rerenderWith: (next: Partial<React.ComponentProps<typeof PlaceEngine>>) => view.rerender(<PlaceEngine {...props} {...next} />),
    placeBerry: (n: number) => {
      press(`place-item-berry-${n}-press`);
      press('place-zone-leaf');
    },
  };
}

const progress = (events: EngineEvent[]) => events.filter((event) => event.type === 'progress').map((event) => (event.type === 'progress' ? [event.done, event.of] : []));
const lastSave = (events: EngineEvent[]): EngineSave | undefined => [...events].reverse().find((event) => event.type === 'save')?.type === 'save' ? ([...events].reverse().find((event) => event.type === 'save') as { save: EngineSave }).save : undefined;

describe('the gesture each band gets', () => {
  it.each([
    ['1-2', 'tap', true, false],
    ['2-4', 'tap-place', false, false],
    ['4+', 'drag', false, true],
  ] as const)('%s: %s, tap sends %p, drag %p', (band, gesture, sends, drags) => {
    const found = gestureFor(pack.mission('picnic'), band as PlanAgeRange);

    expect(found).toBe(gesture);
    expect(tapSends(found)).toBe(sends);
    expect(dragAllowed(found)).toBe(drags);
  });

  it('free play lets every band drag', () => {
    expect(gestureFor(null, '1-2')).toBe('drag');
  });
});

describe('PlaceEngine on the picnic', () => {
  it('draws the scene layers, the host, the leaf and every berry, nut and petal, named for a screen reader', () => {
    const { root } = renderEngine();

    expect(root.findAll((node) => node.props.testID === 'place-layer-sky').length).toBeGreaterThan(0);
    expect(root.findAll((node) => node.props.testID === 'place-host-wombat').length).toBeGreaterThan(0);
    expect(root.findAll((node) => node.props.testID === 'place-object-leaf').length).toBeGreaterThan(0);
    const pressables = root.findAll((node) => typeof node.props.testID === 'string' && /^place-item-.*-press$/.test(node.props.testID) && typeof node.props.onPress === 'function');
    const labels = [...new Map(pressables.map((node) => [node.props.testID as string, node.props.accessibilityLabel as string])).values()];
    expect(labels.filter((label) => label === 'packs.wombatPicnic.objects.berry')).toHaveLength(5);
    expect(labels.filter((label) => label === 'packs.wombatPicnic.objects.nut')).toHaveLength(3);
    expect(labels.filter((label) => label === 'packs.wombatPicnic.objects.petal')).toHaveLength(2);
  });

  it('says it is ready, with nothing done of three, as soon as it mounts', () => {
    const { events } = renderEngine();

    expect(events[0]).toEqual({ type: 'ready' });
    expect(progress(events)).toEqual([[0, 3]]);
  });

  it('a tap picks a berry up, a tap on the leaf puts it down, and the wombat counts it', () => {
    const { root, events, sounds, press } = renderEngine();

    press('place-item-berry-1-press');
    const chosen = root.findAll((node) => node.props.testID === 'place-item-berry-1-press' && typeof node.props.onPress === 'function')[0];
    expect(chosen.props.accessibilityState.selected).toBe(true);

    press('place-zone-leaf');

    expect(progress(events)).toEqual([[0, 3], [1, 3]]);
    expect(sounds.play).toHaveBeenCalledWith('pop');
    expect(lastSave(events)?.placed).toEqual({ 'berry-1': 'leaf' });
    expect(lastSave(events)?.missionId).toBe('picnic');
    expect(root.findAll((node) => node.props.testID === 'place-count-text').map((node) => node.props.children)).toContain('1');
  });

  it('tapping the chosen berry again puts it back, and the leaf then takes nothing', () => {
    const { events, press } = renderEngine();

    press('place-item-berry-1-press');
    press('place-item-berry-1-press');
    press('place-zone-leaf');

    expect(progress(events)).toEqual([[0, 3]]);
  });

  it('three berries complete the mission once, with a cheer and the leaf glowing', () => {
    const { root, events, sounds, placeBerry } = renderEngine();

    placeBerry(1);
    placeBerry(2);
    placeBerry(3);
    placeBerry(4);

    expect(events.filter((event) => event.type === 'complete')).toHaveLength(1);
    expect(sounds.play.mock.calls.map(([sound]) => sound)).toEqual(['pop', 'pop', 'pop', 'chime', 'tada', 'pop']);
    expect(lastSave(events)?.states.leaf).toBe('glowing');
    expect(root.findAll((node) => node.props.testID === 'place-object-leaf')[0].props.source).toBe(pack.image('art/phone/leaf-glow.webp'));
    expect(progress(events)[progress(events).length - 1]).toEqual([3, 3]);
  });

  it('a petal is turned away softly: the wombat wonders, nothing is counted, and the petal can be picked up again', () => {
    const { root, events, sounds, press } = renderEngine();

    press('place-item-petal-1-press');
    press('place-zone-leaf');

    expect(sounds.play).toHaveBeenCalledWith('bloop');
    expect(progress(events)).toEqual([[0, 3], [0, 3]]);
    expect(lastSave(events)?.placed).toEqual({});
    const petal = root.findAll((node) => node.props.testID === 'place-item-petal-1-press' && typeof node.props.onPress === 'function')[0];
    expect(petal.props.disabled).toBe(false);
  });

  it('a nut goes on the leaf but does not count towards three berries', () => {
    const { events, press } = renderEngine();

    press('place-item-nut-1-press');
    press('place-zone-leaf');

    expect(lastSave(events)?.placed).toEqual({ 'nut-1': 'leaf' });
    expect(progress(events)).toEqual([[0, 3], [0, 3]]);
  });

  it('for the youngest, one tap sends a berry to the leaf, the goal is two, and there is no number to read', () => {
    const { root, events, press } = renderEngine({ band: '1-2' });

    press('place-item-berry-1-press');

    expect(progress(events)).toEqual([[0, 2], [1, 2]]);
    expect(events.find((event) => event.type === 'stage')).toEqual({ type: 'stage', promptKey: 'packs.wombatPicnic.missions.picnic.stages.two' });
    expect(root.findAll((node) => node.props.testID === 'place-count')).toHaveLength(0);
  });

  it('for the oldest, the goal is three berries and two nuts, then one more', () => {
    const { events, placeBerry, press } = renderEngine({ band: '4+' });

    placeBerry(1);
    placeBerry(2);
    placeBerry(3);
    press('place-item-nut-1-press');
    press('place-zone-leaf');
    press('place-item-nut-2-press');
    press('place-zone-leaf');

    expect(progress(events)[progress(events).length - 1]).toEqual([5, 6]);
    expect(events.find((event) => event.type === 'stage')).toEqual({ type: 'stage', promptKey: 'packs.wombatPicnic.missions.picnic.stages.oneMore' });
    expect(events.filter((event) => event.type === 'complete')).toHaveLength(0);

    placeBerry(4);

    expect(events.filter((event) => event.type === 'complete')).toHaveLength(1);
  });

  it('carries on from a save: a berry already on the leaf counts, and one more berry does not finish three', () => {
    const save: EngineSave = { missionId: 'picnic', stage: 0, states: {}, placed: { 'berry-1': 'leaf' }, savedAt: '2026-10-17T10:00:00.000Z' };
    const { root, events, placeBerry } = renderEngine({ save });

    expect(progress(events)).toEqual([[1, 3]]);
    expect(root.findAll((node) => node.props.testID === 'place-item-berry-1-press' && typeof node.props.onPress === 'function')[0].props.disabled).toBe(true);

    placeBerry(2);

    expect(events.filter((event) => event.type === 'complete')).toHaveLength(0);
  });

  it('ignores every touch while paused', () => {
    const { events, press } = renderEngine({ paused: true });

    press('place-item-berry-1-press');
    press('place-zone-leaf');
    press('place-host-wombat-press');

    expect(progress(events)).toEqual([[0, 3]]);
    expect(events.filter((event) => event.type === 'save')).toHaveLength(0);
  });

  it('a tap on the wombat makes him hum', () => {
    const { sounds, press } = renderEngine();

    press('place-host-wombat-press');

    expect(sounds.play).toHaveBeenCalledWith('hum');
  });

  it('shows the first action once during the intro, then says so', () => {
    const { events } = renderEngine({ demo: true });

    expect(events.filter((event) => event.type === 'first-action-shown')).toHaveLength(1);
  });

  it('shows the first action by waiting a moment under Reduce Motion, then says so', () => {
    jest.useFakeTimers();
    const { events } = renderEngine({ demo: true, reduceMotion: true });

    expect(events.filter((event) => event.type === 'first-action-shown')).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(events.filter((event) => event.type === 'first-action-shown')).toHaveLength(1);
    jest.useRealTimers();
  });

  it('in free play nothing is ever complete and there is nothing to count towards', () => {
    const { events, placeBerry } = renderEngine({ mission: null });

    placeBerry(1);
    placeBerry(2);
    placeBerry(3);

    expect(progress(events).every(([, of]) => of === 0)).toBe(true);
    expect(events.filter((event) => event.type === 'complete')).toHaveLength(0);
    expect(lastSave(events)?.missionId).toBeNull();
  });

  it('uses the tablet crop when asked, with its own frames', () => {
    const phone = renderEngine({ crop: 'phone' });
    const tablet = renderEngine({ crop: 'tablet', screen: { width: 1194, height: 834, insets: { top: 24, bottom: 20, left: 0, right: 0 } } });

    const skyOf = (root: ReactTestInstance) => root.findAll((node) => node.props.testID === 'place-layer-sky')[0].props.style;
    expect(JSON.stringify(skyOf(phone.root))).not.toEqual(JSON.stringify(skyOf(tablet.root)));
  });
});
