/**
 * Tests for the ambient-animation gate.
 *
 * Every page stays mounted behind the page slider, so a star field that spins
 * forever keeps costing frames while its page is off screen. Loops may only
 * run on the page that is showing, and only once the slide has settled.
 */

import { act, renderHook } from "@testing-library/react-native";
import { cancelAnimation } from "react-native-reanimated";
import {
  useAmbientLoop,
  useSettledAfterTransition,
} from "@/hooks/use-ambient-animation";
import { PAGE_TRANSITION_DURATION_MS } from "@/constants/page-transition";

function sharedValue(initial: number) {
  return { value: initial } as unknown as Parameters<typeof useAmbientLoop>[1];
}

describe("ambient animation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (cancelAnimation as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("useAmbientLoop", () => {
    it("should leave the loop stopped while the page is off screen", () => {
      const value = sharedValue(45);
      const start = jest.fn();

      renderHook(() => useAmbientLoop(false, value, start, 0));
      act(() => jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS * 2));

      expect(start).not.toHaveBeenCalled();
      expect(cancelAnimation).toHaveBeenCalledWith(value);
      expect(value.value).toBe(0);
    });

    it("should wait for the slide to settle before starting", () => {
      const value = sharedValue(0);
      const start = jest.fn();

      renderHook(() => useAmbientLoop(true, value, start, 0));
      act(() => jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS - 1));

      expect(start).not.toHaveBeenCalled();

      act(() => jest.advanceTimersByTime(1));

      expect(start).toHaveBeenCalledTimes(1);
      expect(start).toHaveBeenCalledWith(value);
    });

    it("should stop and rest the value when the page leaves", () => {
      const value = sharedValue(0);
      const start = jest.fn((sv: { value: number }) => {
        sv.value = 180;
      });
      const underTest = renderHook(
        ({ active }: { active: boolean }) =>
          useAmbientLoop(active, value, start, 0),
        {
          initialProps: { active: true },
        },
      );
      act(() => jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS));

      underTest.rerender({ active: false });

      expect(cancelAnimation).toHaveBeenCalledWith(value);
      expect(value.value).toBe(0);
    });

    it("should never start a loop whose page left before the slide settled", () => {
      const value = sharedValue(0);
      const start = jest.fn();
      const underTest = renderHook(
        ({ active }: { active: boolean }) =>
          useAmbientLoop(active, value, start, 0),
        {
          initialProps: { active: true },
        },
      );

      underTest.rerender({ active: false });
      act(() => jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS * 2));

      expect(start).not.toHaveBeenCalled();
    });

    it("should use the latest starter without restarting the loop", () => {
      const value = sharedValue(0);
      const first = jest.fn();
      const second = jest.fn();
      const underTest = renderHook(
        ({ start }: { start: jest.Mock }) =>
          useAmbientLoop(true, value, start, 0),
        {
          initialProps: { start: first },
        },
      );

      underTest.rerender({ start: second });
      act(() => jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS));

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe("useSettledAfterTransition", () => {
    it("should not be settled while the slide is still running", () => {
      const underTest = renderHook(() => useSettledAfterTransition(true));
      act(() => jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS - 1));

      expect(underTest.result.current).toBe(false);
    });

    it("should settle once the slide has finished", () => {
      const underTest = renderHook(() => useSettledAfterTransition(true));

      act(() => jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS));

      expect(underTest.result.current).toBe(true);
    });

    it("should unsettle the moment the page goes off screen", () => {
      const underTest = renderHook(
        ({ active }: { active: boolean }) => useSettledAfterTransition(active),
        {
          initialProps: { active: true },
        },
      );
      act(() => jest.advanceTimersByTime(PAGE_TRANSITION_DURATION_MS));

      underTest.rerender({ active: false });

      expect(underTest.result.current).toBe(false);
    });
  });
});
