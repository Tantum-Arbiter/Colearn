import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GUIDE_STORAGE_KEY,
  OwlGuideProvider,
  migrateGuideState,
  useOwlGuide,
} from '@/contexts/owl-guide-context';
import { guideRevision } from '@/constants/owl-guide';

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
    expect(migrateGuideState(null)).toEqual({ completedGuides: [], lastResetTimestamp: 0, seenRevisions: {} });
    expect(migrateGuideState('garbage')).toEqual({ completedGuides: [], lastResetTimestamp: 0, seenRevisions: {} });
  });

  it('reads the new shape back unchanged', () => {
    const state = { completedGuides: ['practise_tips'], lastResetTimestamp: 42, seenRevisions: { practise_tips: 1 } };

    expect(migrateGuideState(state)).toEqual(state);
  });

  it('reads a record from before revisions with none seen, and keeps only revisions of tours it knows', () => {
    expect(migrateGuideState({ completedGuides: ['main_menu_tour'] }).seenRevisions).toEqual({});
    expect(
      migrateGuideState({ completedGuides: [], seenRevisions: { main_menu_tour: 2, gone_tour: 4, catalogue_tour: 'x' } }).seenRevisions
    ).toEqual({ main_menu_tour: 2 });
  });

  it('carries the old tutorial list forward', () => {
    expect(migrateGuideState({ completedTutorials: ['main_menu_tour', 'emotion_cards_tips'] }).completedGuides).toEqual([
      'main_menu_tour',
      'emotion_cards_tips',
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

    expect(migrated.completedGuides.sort()).toEqual(['story_reader_tips', 'settings_walkthrough'].sort());
  });

  it('drops ids it no longer knows, and duplicates', () => {
    const migrated = migrateGuideState({
      completedTutorials: ['gesture_hints', 'spelling_tips', 'practise_tips', 'practise_tips', 42],
    });

    expect(migrated.completedGuides).toEqual(['practise_tips']);
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
    storage.getItem.mockResolvedValue(JSON.stringify({ completedTutorials: ['progress_tour'] }));

    const { result } = await loaded();

    expect(storage.getItem).toHaveBeenCalledWith(GUIDE_STORAGE_KEY);
    expect(result.current.completedGuides).toEqual(['progress_tour']);
    expect(result.current.shouldShowGuide('progress_tour')).toBe(false);
    expect(result.current.shouldShowGuide('practise_tips')).toBe(true);
  });

  it('still becomes loaded when storage fails', async () => {
    storage.getItem.mockRejectedValue(new Error('no storage'));

    const { result } = await loaded();

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.completedGuides).toEqual([]);
  });

  it('starts a guide on its first step', async () => {
    const { result } = await loaded();

    act(() => result.current.startGuide('practise_tips'));

    expect(result.current.activeGuide).toBe('practise_tips');
    expect(result.current.stepIndex).toBe(0);
  });

  it('walks forward one step at a time', async () => {
    const { result } = await loaded();
    act(() => result.current.startGuide('practise_tips'));

    act(() => result.current.nextStep());
    act(() => result.current.nextStep());

    expect(result.current.stepIndex).toBe(2);
  });

  it('remembers a completed guide', async () => {
    const { result } = await loaded();
    act(() => result.current.startGuide('practise_tips'));

    act(() => result.current.completeGuide());

    expect(result.current.activeGuide).toBeNull();
    expect(result.current.shouldShowGuide('practise_tips')).toBe(false);
    expect(lastPersisted()).toMatchObject({ completedGuides: ['practise_tips'] });
  });

  it('treats a skip as seen, so it is not asked again', async () => {
    const { result } = await loaded();
    act(() => result.current.startGuide('emotion_cards_tips'));

    act(() => result.current.skipGuide());

    expect(result.current.shouldShowGuide('emotion_cards_tips')).toBe(false);
  });

  it('can be dismissed without being remembered, for replays', async () => {
    const { result } = await loaded();
    act(() => result.current.startGuide('emotion_cards_tips'));

    act(() => result.current.dismissGuide());

    expect(result.current.activeGuide).toBeNull();
    expect(result.current.shouldShowGuide('emotion_cards_tips')).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  describe('a tour that has changed since it was finished', () => {
    it('is shown once more to a family who finished an older revision of it', async () => {
      storage.getItem.mockResolvedValue(JSON.stringify({ completedGuides: ['main_menu_tour', 'progress_tour'] }));
      const { result } = await loaded();

      expect(result.current.shouldShowGuide('main_menu_tour')).toBe(true);
      expect(result.current.shouldShowGuide('progress_tour')).toBe(false);
    });

    it('is put away again once the new revision is finished, with the revision remembered', async () => {
      storage.getItem.mockResolvedValue(JSON.stringify({ completedGuides: ['main_menu_tour'] }));
      const { result } = await loaded();
      act(() => result.current.startGuide('main_menu_tour'));

      act(() => result.current.completeGuide());

      expect(result.current.shouldShowGuide('main_menu_tour')).toBe(false);
      expect(lastPersisted()).toMatchObject({
        completedGuides: ['main_menu_tour'],
        seenRevisions: { main_menu_tour: guideRevision('main_menu_tour') },
      });
    });

    it('stays put away once its current revision has been seen', async () => {
      storage.getItem.mockResolvedValue(
        JSON.stringify({ completedGuides: ['main_menu_tour'], seenRevisions: { main_menu_tour: guideRevision('main_menu_tour') } })
      );
      const { result } = await loaded();

      expect(result.current.shouldShowGuide('main_menu_tour')).toBe(false);
    });
  });

  it('does not write the same guide twice', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ completedGuides: ['emotion_cards_tips'] }));
    const { result } = await loaded();
    act(() => result.current.startGuide('emotion_cards_tips'));

    act(() => result.current.completeGuide());

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('forgets everything on reset and stamps when it did', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ completedGuides: ['emotion_cards_tips', 'practise_tips'] }));
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
