import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  IslandVoyageProvider,
  useIslandVoyage,
  useIslandVoyageController,
  type IslandVoyage,
} from '@/contexts/island-voyage-context';
import { VOYAGE_TIMING, type VoyagePage } from '@/constants/island-voyage';

let mockReduceMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

const FULL = VOYAGE_TIMING.full;
const REDUCED = VOYAGE_TIMING.reduced;

function sailing() {
  const onShowPage = jest.fn<void, [VoyagePage]>();
  const rendered = renderHook(() => useIslandVoyageController(onShowPage));
  return { ...rendered, onShowPage };
}

function wait(ms: number) {
  act(() => { jest.advanceTimersByTime(ms); });
}

function depart(result: { current: IslandVoyage }) {
  act(() => { result.current.depart(); });
}

function reachTheIsland(result: { current: IslandVoyage }) {
  depart(result);
  wait(FULL.leaveMs);
  act(() => { result.current.islandReady(); });
  wait(FULL.crossingMinMs);
  wait(FULL.arriveMs);
}

describe('useIslandVoyageController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduceMotion = false;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('at rest', () => {
    it('begins at home, with nothing moved and no cloud', () => {
      const { result, onShowPage } = sailing();

      expect(result.current.phase).toBe('home');
      expect(result.current.travel.value).toBe(0);
      expect(result.current.clouds.value).toBe(0);
      expect(result.current.arrival.value).toBe(0);
      expect(onShowPage).not.toHaveBeenCalled();
    });

    it('goes nowhere when asked to come back from home', () => {
      const { result, onShowPage } = sailing();

      act(() => { result.current.comeBack(); });
      wait(5000);

      expect(result.current.phase).toBe('home');
      expect(onShowPage).not.toHaveBeenCalled();
    });

    it('takes word that the island is ready as nothing while nobody is on the way', () => {
      const { result } = sailing();

      act(() => { result.current.islandReady(); });
      wait(5000);

      expect(result.current.phase).toBe('home');
    });
  });

  describe('word that the island is ready, at the wrong time', () => {
    it('is nothing once the island has been reached', () => {
      const { result } = sailing();
      reachTheIsland(result);

      act(() => { result.current.islandReady(); });
      wait(5000);

      expect(result.current.phase).toBe('island');
    });

    it('is nothing once home again, and does not cut the next crossing short', () => {
      const { result } = sailing();
      reachTheIsland(result);
      act(() => { result.current.comeBack(); });
      wait(FULL.returnMs + FULL.recrossingMs + FULL.landMs);

      act(() => { result.current.islandReady(); });
      expect(result.current.phase).toBe('home');

      depart(result);
      act(() => { result.current.islandReady(); });
      wait(FULL.leaveMs);
      expect(result.current.phase).toBe('crossing');
      wait(FULL.crossingMinMs);
      expect(result.current.phase).toBe('crossing');
    });
  });

  describe('going to the island', () => {
    it('leaves first, on the home page still', () => {
      const { result, onShowPage } = sailing();

      depart(result);

      expect(result.current.phase).toBe('leaving');
      expect(onShowPage).not.toHaveBeenCalled();
    });

    it('sets the home moving and the cloud closing', () => {
      const { result } = sailing();

      depart(result);

      expect(result.current.travel.value).toBe(1);
      expect(result.current.clouds.value).toBe(1);
    });

    it('changes the page only once the cloud has closed', () => {
      const { result, onShowPage } = sailing();
      depart(result);

      wait(FULL.leaveMs - 1);
      expect(result.current.phase).toBe('leaving');
      expect(onShowPage).not.toHaveBeenCalled();

      wait(1);
      expect(result.current.phase).toBe('crossing');
      expect(onShowPage).toHaveBeenCalledTimes(1);
      expect(onShowPage).toHaveBeenCalledWith('island');
    });

    it('holds the cloud shut until the island says it is ready', () => {
      const { result } = sailing();
      depart(result);
      wait(FULL.leaveMs);

      wait(FULL.crossingMinMs * 2);
      expect(result.current.phase).toBe('crossing');

      act(() => { result.current.islandReady(); });
      expect(result.current.phase).toBe('arriving');
    });

    it('holds it a moment even when the island is ready at once', () => {
      const { result } = sailing();
      depart(result);
      wait(FULL.leaveMs);

      act(() => { result.current.islandReady(); });
      expect(result.current.phase).toBe('crossing');

      wait(FULL.crossingMinMs - 1);
      expect(result.current.phase).toBe('crossing');
      wait(1);
      expect(result.current.phase).toBe('arriving');
    });

    it('opens the cloud anyway if the island never says so', () => {
      const { result } = sailing();
      depart(result);
      wait(FULL.leaveMs);

      wait(FULL.crossingMaxMs - 1);
      expect(result.current.phase).toBe('crossing');
      wait(1);
      expect(result.current.phase).toBe('arriving');
    });

    it('opens the cloud and brings the island in', () => {
      const { result } = sailing();
      depart(result);
      wait(FULL.leaveMs);
      act(() => { result.current.islandReady(); });
      wait(FULL.crossingMinMs);

      expect(result.current.clouds.value).toBe(2);
      expect(result.current.arrival.value).toBe(1);
    });

    it('comes to rest on the island with the cloud put away', () => {
      const { result, onShowPage } = sailing();

      reachTheIsland(result);

      expect(result.current.phase).toBe('island');
      expect(result.current.clouds.value).toBe(0);
      expect(result.current.arrival.value).toBe(1);
      expect(onShowPage).toHaveBeenCalledTimes(1);
    });

    it.each(['leaving', 'crossing', 'arriving', 'island'] as const)('takes a second press while %s as nothing', (during) => {
      const { result, onShowPage } = sailing();
      depart(result);
      if (during !== 'leaving') wait(FULL.leaveMs);
      if (during === 'arriving' || during === 'island') {
        act(() => { result.current.islandReady(); });
        wait(FULL.crossingMinMs);
      }
      if (during === 'island') wait(FULL.arriveMs);
      expect(result.current.phase).toBe(during);

      depart(result);

      expect(result.current.phase).toBe(during);
      expect(onShowPage.mock.calls.filter(([page]) => page === 'island').length).toBeLessThanOrEqual(1);
    });

    it.each(['leaving', 'crossing', 'arriving'] as const)('cannot be turned back while %s', (during) => {
      const { result } = sailing();
      depart(result);
      if (during !== 'leaving') wait(FULL.leaveMs);
      if (during === 'arriving') {
        act(() => { result.current.islandReady(); });
        wait(FULL.crossingMinMs);
      }

      act(() => { result.current.comeBack(); });

      expect(result.current.phase).toBe(during);
    });
  });

  describe('coming home', () => {
    it('closes the cloud over the island first', () => {
      const { result, onShowPage } = sailing();
      reachTheIsland(result);

      act(() => { result.current.comeBack(); });

      expect(result.current.phase).toBe('returning');
      expect(result.current.clouds.value).toBe(1);
      expect(onShowPage).toHaveBeenCalledTimes(1);
    });

    it('changes the page back only once the cloud has closed', () => {
      const { result, onShowPage } = sailing();
      reachTheIsland(result);
      act(() => { result.current.comeBack(); });

      wait(FULL.returnMs - 1);
      expect(onShowPage).toHaveBeenCalledTimes(1);

      wait(1);
      expect(result.current.phase).toBe('recrossing');
      expect(onShowPage).toHaveBeenLastCalledWith('main');
      expect(onShowPage).toHaveBeenCalledTimes(2);
    });

    it('lands a moment later, the cloud opening and the home drawing back', () => {
      const { result } = sailing();
      reachTheIsland(result);
      act(() => { result.current.comeBack(); });
      wait(FULL.returnMs);

      wait(FULL.recrossingMs);

      expect(result.current.phase).toBe('landing');
      expect(result.current.clouds.value).toBe(2);
      expect(result.current.travel.value).toBe(0);
    });

    it('comes to rest at home with everything as it began, ready to go again', () => {
      const { result, onShowPage } = sailing();
      reachTheIsland(result);
      act(() => { result.current.comeBack(); });
      wait(FULL.returnMs + FULL.recrossingMs + FULL.landMs);

      expect(result.current.phase).toBe('home');
      expect(result.current.travel.value).toBe(0);
      expect(result.current.clouds.value).toBe(0);
      expect(result.current.arrival.value).toBe(0);

      depart(result);
      expect(result.current.phase).toBe('leaving');
      expect(onShowPage).toHaveBeenCalledTimes(2);
    });

    it('takes a second press on the way back as nothing', () => {
      const { result, onShowPage } = sailing();
      reachTheIsland(result);
      act(() => { result.current.comeBack(); });

      act(() => { result.current.comeBack(); });
      wait(FULL.returnMs + FULL.recrossingMs + FULL.landMs);

      expect(result.current.phase).toBe('home');
      expect(onShowPage).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the app leaves the island by some other road', () => {
    it('is home at once, with nothing left moved, when told the island is no longer showing', () => {
      const { result } = sailing();
      reachTheIsland(result);

      act(() => { result.current.settleHome(); });

      expect(result.current.phase).toBe('home');
      expect(result.current.travel.value).toBe(0);
      expect(result.current.clouds.value).toBe(0);
      expect(result.current.arrival.value).toBe(0);
    });

    it('can set off again afterwards', () => {
      const { result } = sailing();
      reachTheIsland(result);
      act(() => { result.current.settleHome(); });

      depart(result);

      expect(result.current.phase).toBe('leaving');
    });

    it.each(['home', 'leaving', 'crossing', 'arriving', 'returning'] as const)('pays no heed while %s', (during) => {
      const { result } = sailing();
      if (during !== 'home') depart(result);
      if (during === 'crossing' || during === 'arriving' || during === 'returning') wait(FULL.leaveMs);
      if (during === 'arriving' || during === 'returning') {
        act(() => { result.current.islandReady(); });
        wait(FULL.crossingMinMs);
      }
      if (during === 'returning') {
        wait(FULL.arriveMs);
        act(() => { result.current.comeBack(); });
      }
      expect(result.current.phase).toBe(during);

      act(() => { result.current.settleHome(); });

      expect(result.current.phase).toBe(during);
    });
  });

  describe('for someone who has asked for less motion', () => {
    beforeEach(() => { mockReduceMotion = true; });

    it('says so', () => {
      expect(sailing().result.current.reduceMotion).toBe(true);
    });

    it('fades through the cloud without moving the home', () => {
      const { result } = sailing();

      depart(result);

      expect(result.current.travel.value).toBe(0);
      expect(result.current.clouds.value).toBe(1);
    });

    it('takes the short way there and back', () => {
      const { result, onShowPage } = sailing();
      depart(result);

      wait(REDUCED.leaveMs);
      expect(result.current.phase).toBe('crossing');
      act(() => { result.current.islandReady(); });
      wait(REDUCED.crossingMinMs + REDUCED.arriveMs);
      expect(result.current.phase).toBe('island');

      act(() => { result.current.comeBack(); });
      wait(REDUCED.returnMs + REDUCED.recrossingMs + REDUCED.landMs);
      expect(result.current.phase).toBe('home');
      expect(result.current.travel.value).toBe(0);
      expect(onShowPage.mock.calls.map(([page]) => page)).toEqual(['island', 'main']);
    });
  });

  describe('a change of mind about motion, while the app is open', () => {
    it('takes the short way from then on', () => {
      const onShowPage = jest.fn<void, [VoyagePage]>();
      const { result, rerender } = renderHook(() => useIslandVoyageController(onShowPage));

      mockReduceMotion = true;
      rerender({});
      depart(result);

      expect(result.current.travel.value).toBe(0);
      wait(REDUCED.leaveMs);
      expect(result.current.phase).toBe('crossing');
    });
  });

  describe('the page it asks for', () => {
    it('is asked of whoever is listening now, not whoever was listening at the start', () => {
      const first = jest.fn<void, [VoyagePage]>();
      const second = jest.fn<void, [VoyagePage]>();
      const { result, rerender } = renderHook(
        ({ onShowPage }: { onShowPage: (page: VoyagePage) => void }) => useIslandVoyageController(onShowPage),
        { initialProps: { onShowPage: first } },
      );
      depart(result);

      rerender({ onShowPage: second });
      wait(FULL.leaveMs);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith('island');
    });
  });

  describe('when the app tree goes away mid-voyage', () => {
    it('leaves no timer running', () => {
      const { result, unmount } = sailing();
      depart(result);

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('asks for no page afterwards', () => {
      const { result, unmount, onShowPage } = sailing();
      depart(result);

      unmount();
      act(() => { jest.advanceTimersByTime(10000); });

      expect(onShowPage).not.toHaveBeenCalled();
    });
  });
});

describe('useIslandVoyage', () => {
  it('has a voyage that goes nowhere when nothing above provides one', () => {
    const { result } = renderHook(() => useIslandVoyage());

    expect(result.current.phase).toBe('home');
    expect(result.current.travel.value).toBe(0);
    expect(() => {
      result.current.depart();
      result.current.comeBack();
      result.current.islandReady();
      result.current.settleHome();
    }).not.toThrow();
    expect(result.current.phase).toBe('home');
  });

  it('hands down the voyage it is given', () => {
    const controller = renderHook(() => useIslandVoyageController(jest.fn()));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <IslandVoyageProvider voyage={controller.result.current}>{children}</IslandVoyageProvider>
    );

    const { result } = renderHook(() => useIslandVoyage(), { wrapper });

    expect(result.current).toBe(controller.result.current);
  });
});
