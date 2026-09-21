import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GUIDE_STORAGE_KEY,
  OwlGuideProvider,
  migrateGuideState,
  useOwlGuide,
} from '@/contexts/owl-guide-context';

jest.unmock('@/contexts/owl-guide-context');

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function wrapper({ children }: { children: React.ReactNode }) {
  return <OwlGuideProvider>{children}</OwlGuideProvider>;
}

function renderGuide() {
  return renderHook(() => useOwlGuide(), { wrapper });
}

async function loaded() {
  const hook = renderGuide();
  await waitFor(() => expect(hook.result.current.isLoaded).toBe(true));
  return hook;
}

function lastPersisted(): unknown {
  const calls = storage.setItem.mock.calls;
  return calls.length ? JSON.parse(calls[calls.length - 1][1]) : null;
}

describe('migrateGuideState', () => {
  it('starts empty from nothing', () => {
    expect(migrateGuideState(null)).toEqual({ completedGuides: [], lastResetTimestamp: 0 });
    expect(migrateGuideState('garbage')).toEqual({ completedGuides: [], lastResetTimestamp: 0 });
  });

  it('reads the new shape back unchanged', () => {
    const state = { completedGuides: ['spelling_tips'], lastResetTimestamp: 42 };

    expect(migrateGuideState(state)).toEqual(state);
  });

  it('carries the old tutorial list forward', () => {
    expect(migrateGuideState({ completedTutorials: ['main_menu_tour', 'numbers_tips'] }).completedGuides).toEqual([
      'main_menu_tour',
      'numbers_tips',
    ]);
  });

  it('turns the old seen flags into completed guides', () => {
    const migrated = migrateGuideState({
      completedTutorials: [],
      hasSeenFirstStory: true,
      hasSeenSettings: true,
      hasSeenEmotionCards: false,
      hasSeenScreenTime: true,
    });

    expect(migrated.completedGuides.sort()).toEqual(
      ['story_reader_tips', 'settings_walkthrough', 'screen_time_tips'].sort()
    );
  });

  it('drops ids it no longer knows, and duplicates', () => {
    const migrated = migrateGuideState({
      completedTutorials: ['gesture_hints', 'spelling_tips', 'spelling_tips', 42],
    });

    expect(migrated.completedGuides).toEqual(['spelling_tips']);
  });

  it('keeps the reset timestamp', () => {
    expect(migrateGuideState({ lastResetTimestamp: 1700 }).lastResetTimestamp).toBe(1700);
  });
});

describe('OwlGuideProvider', () => {
  beforeEach(() => {
    storage.getItem.mockReset();
    storage.setItem.mockReset();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
  });

  it('loads what was stored under the old key', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ completedTutorials: ['main_menu_tour'] }));

    const { result } = await loaded();

    expect(storage.getItem).toHaveBeenCalledWith(GUIDE_STORAGE_KEY);
    expect(result.current.completedGuides).toEqual(['main_menu_tour']);
    expect(result.current.shouldShowGuide('main_menu_tour')).toBe(false);
    expect(result.current.shouldShowGuide('spelling_tips')).toBe(true);
  });

  it('still becomes loaded when storage fails', async () => {
    storage.getItem.mockRejectedValue(new Error('no storage'));

    const { result } = await loaded();

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.completedGuides).toEqual([]);
  });

  it('starts a guide on its first step', async () => {
    const { result } = await loaded();

    act(() => result.current.startGuide('spelling_tips'));

    expect(result.current.activeGuide).toBe('spelling_tips');
    expect(result.current.stepIndex).toBe(0);
  });

  it('walks forward one step at a time', async () => {
    const { result } = await loaded();
    act(() => result.current.startGuide('spelling_tips'));

    act(() => result.current.nextStep());
    act(() => result.current.nextStep());

    expect(result.current.stepIndex).toBe(2);
  });

  it('remembers a completed guide', async () => {
    const { result } = await loaded();
    act(() => result.current.startGuide('spelling_tips'));

    act(() => result.current.completeGuide());

    expect(result.current.activeGuide).toBeNull();
    expect(result.current.shouldShowGuide('spelling_tips')).toBe(false);
    expect(lastPersisted()).toMatchObject({ completedGuides: ['spelling_tips'] });
  });

  it('treats a skip as seen, so it is not asked again', async () => {
    const { result } = await loaded();
    act(() => result.current.startGuide('numbers_tips'));

    act(() => result.current.skipGuide());

    expect(result.current.shouldShowGuide('numbers_tips')).toBe(false);
  });

  it('can be dismissed without being remembered, for replays', async () => {
    const { result } = await loaded();
    act(() => result.current.startGuide('numbers_tips'));

    act(() => result.current.dismissGuide());

    expect(result.current.activeGuide).toBeNull();
    expect(result.current.shouldShowGuide('numbers_tips')).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('does not write the same guide twice', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ completedGuides: ['numbers_tips'] }));
    const { result } = await loaded();
    act(() => result.current.startGuide('numbers_tips'));

    act(() => result.current.completeGuide());

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('forgets everything on reset and stamps when it did', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ completedGuides: ['numbers_tips', 'spelling_tips'] }));
    const { result } = await loaded();
    const before = Date.now();

    await act(async () => {
      await result.current.resetGuides();
    });

    expect(result.current.completedGuides).toEqual([]);
    expect(result.current.lastResetTimestamp).toBeGreaterThanOrEqual(before);
    expect(result.current.activeGuide).toBeNull();
  });

  it('is only usable inside its provider', () => {
    expect(() => renderHook(() => useOwlGuide())).toThrow('OwlGuideProvider');
  });
});
