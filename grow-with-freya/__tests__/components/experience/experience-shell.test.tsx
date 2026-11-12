import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { CELEBRATION, ExperienceShell } from '@/components/experience/experience-shell';
import { useAppStore } from '@/store/app-store';
import type { EngineSave, ShellResult } from '@/types/game-pack';

jest.mock('@/hooks/use-steady-shared-value', () => ({
  useSteadySharedValue: (initial: number) => require('react').useState({ value: initial })[0],
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/global-sound-context', () => ({
  useGlobalSound: () => ({ isMuted: false, toggleMute: jest.fn() }),
}));

let mockReduceMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

jest.mock('@/hooks/use-ambient-animation', () => ({
  useSettledAfterTransition: (active: boolean) => active,
}));

const warningCallbacks: ((warning: { type: string; remainingTime: number; message: string }) => void)[] = [];
jest.mock('@/services/screen-time-service', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      onWarning: (callback: (warning: { type: string; remainingTime: number; message: string }) => void) => warningCallbacks.push(callback),
      removeWarningCallback: (callback: (warning: { type: string; remainingTime: number; message: string }) => void) => {
        const at = warningCallbacks.indexOf(callback);
        if (at >= 0) warningCallbacks.splice(at, 1);
      },
    }),
  },
}));

interface StoreStub {
  kept: EngineSave | null;
  gameSaveFor: jest.Mock<EngineSave | null, [string]>;
  saveGame: jest.Mock;
  clearGameSave: jest.Mock;
  recordMissionFinished: jest.Mock;
  childAgeInMonths: number;
}

const store: StoreStub = {
  kept: null,
  gameSaveFor: jest.fn((_packId: string): EngineSave | null => store.kept),
  saveGame: jest.fn(),
  clearGameSave: jest.fn(),
  recordMissionFinished: jest.fn(),
  childAgeInMonths: 36,
};

function pressOne(root: ReactTestInstance, testID: string): void {
  const found = root.findAll((node) => node.props.testID === testID && typeof node.props.onPress === 'function');
  fireEvent.press(found[0]);
}

function has(root: ReactTestInstance, testID: string): boolean {
  return root.findAll((node) => node.props.testID === testID).length > 0;
}

function textsOf(node: ReactTestInstance): string[] {
  return node.children.flatMap((child) => (typeof child === 'string' ? [child] : textsOf(child)));
}

async function renderShell(props: Partial<React.ComponentProps<typeof ExperienceShell>> = {}) {
  const results: ShellResult[] = [];
  const view = render(<ExperienceShell packId="wombat-picnic" missionId="picnic" band="2-4" isActive onDone={(result) => results.push(result)} {...props} />);
  const root = view.UNSAFE_root;
  await waitFor(() => expect(has(root, 'experience-loading')).toBe(false));
  return { ...view, root, results };
}

function playToTheEnd(root: ReactTestInstance): void {
  expect(has(root, 'place-zone-leaf')).toBe(true);
  [1, 2, 3].forEach((n) => {
    pressOne(root, `place-item-berry-${n}-press`);
    pressOne(root, 'place-zone-leaf');
  });
}

describe('ExperienceShell', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockReduceMotion = false;
    store.kept = null;
    store.gameSaveFor.mockClear();
    store.saveGame.mockClear();
    store.clearGameSave.mockClear();
    store.recordMissionFinished.mockClear();
    warningCallbacks.length = 0;
    (useAppStore as unknown as jest.Mock).mockImplementation((selector?: (state: typeof store) => unknown) => (selector ? selector(store) : store));
  });

  it('loads the pack, shows the first action, then lets the child play with the prompt and a way back', async () => {
    const { root } = await renderShell();

    expect(has(root, 'place-engine')).toBe(true);
    expect(has(root, 'experience-back')).toBe(true);
    const prompt = root.findAll((node) => node.props.testID === 'experience-prompt')[0];
    expect(textsOf(prompt)).toContain('packs.wombatPicnic.missions.picnic.stages.three');
    expect(has(root, 'experience-paused')).toBe(false);
  });

  it('celebrates three berries, ticks the mission off, clears the save, then offers the bridge and Finish ends it as completed', async () => {
    const { root, results } = await renderShell();
    jest.useFakeTimers();

    playToTheEnd(root);

    expect(has(root, 'experience-celebrating')).toBe(true);
    expect(store.recordMissionFinished).toHaveBeenCalledWith('wombat-picnic', 'picnic');
    expect(store.clearGameSave).toHaveBeenCalledWith('wombat-picnic');
    act(() => {
      jest.advanceTimersByTime(CELEBRATION.duration);
    });
    expect(has(root, 'experience-bridge')).toBe(true);
    expect(has(root, 'experience-bridge-atHome')).toBe(true);

    pressOne(root, 'experience-finish');

    expect(results).toEqual([{ outcome: 'completed', packId: 'wombat-picnic', missionId: 'picnic', durationMs: expect.any(Number) }]);
    expect(store.saveGame).not.toHaveBeenCalled();
  });

  it('celebrates more briefly under Reduce Motion', async () => {
    mockReduceMotion = true;
    const { root } = await renderShell();
    jest.useFakeTimers();

    playToTheEnd(root);
    act(() => {
      jest.advanceTimersByTime(CELEBRATION.reducedDuration);
    });

    expect(has(root, 'experience-bridge')).toBe(true);
  });

  it('going back mid-play leaves, and keeps what the child had placed for next time', async () => {
    const { root, results } = await renderShell();
    pressOne(root, 'place-item-berry-1-press');
    pressOne(root, 'place-zone-leaf');

    pressOne(root, 'experience-back');

    expect(results).toEqual([{ outcome: 'left', packId: 'wombat-picnic', missionId: 'picnic', durationMs: expect.any(Number) }]);
    expect(store.saveGame).toHaveBeenCalledWith('wombat-picnic', expect.objectContaining({ missionId: 'picnic', placed: { 'berry-1': 'leaf' } }));
    expect(store.recordMissionFinished).not.toHaveBeenCalled();
  });

  it('going back during the celebration still counts as completed', async () => {
    const { root, results } = await renderShell();
    playToTheEnd(root);

    pressOne(root, 'experience-back');

    expect(results[0].outcome).toBe('completed');
  });

  it('stops when the day`s screen time runs out, saving and leaving, and ignores a mere warning', async () => {
    const { root, results } = await renderShell();
    pressOne(root, 'place-item-berry-1-press');
    pressOne(root, 'place-zone-leaf');

    act(() => {
      warningCallbacks.forEach((callback) => callback({ type: 'approaching_limit', remainingTime: 300, message: 'soon' }));
    });
    expect(results).toEqual([]);

    act(() => {
      warningCallbacks.forEach((callback) => callback({ type: 'limit_reached', remainingTime: 0, message: 'now' }));
    });

    expect(results).toEqual([{ outcome: 'left', packId: 'wombat-picnic', missionId: 'picnic', durationMs: expect.any(Number) }]);
    expect(store.saveGame).toHaveBeenCalledWith('wombat-picnic', expect.objectContaining({ placed: { 'berry-1': 'leaf' } }));
  });

  it('lets go of the screen-time warnings once it is done', async () => {
    const { root } = await renderShell();
    expect(warningCallbacks).toHaveLength(1);

    pressOne(root, 'experience-back');

    expect(warningCallbacks).toHaveLength(0);
  });

  it('carries on from the save of the same mission, and ignores a save of another', async () => {
    store.kept = { missionId: 'picnic', stage: 0, states: {}, placed: { 'berry-1': 'leaf' }, savedAt: '2026-10-17T10:00:00.000Z' };
    const resumed = await renderShell();
    expect(resumed.root.findAll((node) => node.props.testID === 'place-item-berry-1-press' && typeof node.props.onPress === 'function')[0].props.disabled).toBe(true);

    store.kept = { missionId: 'another', stage: 0, states: {}, placed: { 'berry-1': 'leaf' }, savedAt: '2026-10-17T10:00:00.000Z' };
    const fresh = await renderShell();
    expect(fresh.root.findAll((node) => node.props.testID === 'place-item-berry-1-press' && typeof node.props.onPress === 'function')[0].props.disabled).toBe(false);
  });

  it('reports a pack it cannot find as left, without an engine', async () => {
    const results: ShellResult[] = [];
    const view = render(<ExperienceShell packId="nothing-of-the-sort" missionId="picnic" band="2-4" isActive onDone={(result) => results.push(result)} />);

    await waitFor(() => expect(results).toHaveLength(1));

    expect(results[0]).toEqual({ outcome: 'left', packId: 'nothing-of-the-sort', missionId: 'picnic', durationMs: expect.any(Number) });
    expect(has(view.UNSAFE_root, 'place-engine')).toBe(false);
  });

  it('free play has no stages to prompt and leaves on Back without a mission', async () => {
    const { root, results } = await renderShell({ missionId: null });

    expect(has(root, 'experience-prompt')).toBe(false);
    pressOne(root, 'experience-back');

    expect(results).toEqual([{ outcome: 'left', packId: 'wombat-picnic', missionId: null, durationMs: expect.any(Number) }]);
  });
});
