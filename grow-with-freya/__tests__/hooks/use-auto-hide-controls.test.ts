/**
 * Tests for the reader's auto-hiding controls.
 *
 * The default reading state is illustration, narration card and a page
 * affordance — nothing else. Controls appear on request and withdraw again
 * after a few seconds so the artwork gets the screen back.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAutoHideControls } from '@/hooks/use-auto-hide-controls';
import { STORY_GARDEN_DELAYS } from '@/constants/story-garden-motion';

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useAutoHideControls', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the default reading state', () => {
    it('should start with the controls out of the way', () => {
      const { result } = renderHook(() => useAutoHideControls());

      expect(result.current.visible).toBe(false);
    });
  });

  describe('revealing', () => {
    it('should show the controls on request', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.reveal());

      expect(result.current.visible).toBe(true);
    });

    it('should withdraw them again after the auto-hide delay', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.reveal());
      advance(STORY_GARDEN_DELAYS.controlsAutoHide + 1);

      expect(result.current.visible).toBe(false);
    });

    it('should still be showing just before the delay elapses', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.reveal());
      advance(STORY_GARDEN_DELAYS.controlsAutoHide - 1);

      expect(result.current.visible).toBe(true);
    });

    it('should restart the countdown when the family keeps interacting', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.reveal());
      advance(STORY_GARDEN_DELAYS.controlsAutoHide - 100);
      act(() => result.current.keepAlive());
      advance(STORY_GARDEN_DELAYS.controlsAutoHide - 100);

      expect(result.current.visible).toBe(true);
    });

    it('should not resurrect hidden controls on keepAlive', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.keepAlive());

      expect(result.current.visible).toBe(false);
    });
  });

  describe('keepAlive', () => {
    it('should schedule no timer at all while the controls are hidden', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.keepAlive());

      expect(jest.getTimerCount()).toBe(0);
    });

    it('should hold a single countdown rather than stacking them', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.reveal());
      act(() => {
        result.current.keepAlive();
        result.current.keepAlive();
      });

      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe('hiding', () => {
    it('should hide immediately when asked', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.reveal());
      act(() => result.current.hide());

      expect(result.current.visible).toBe(false);
    });

    it('should toggle from hidden to visible', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.toggle());

      expect(result.current.visible).toBe(true);
    });

    it('should toggle from visible back to hidden', () => {
      const { result } = renderHook(() => useAutoHideControls());

      act(() => result.current.reveal());
      act(() => result.current.toggle());

      expect(result.current.visible).toBe(false);
    });
  });

  describe('when disabled', () => {
    it('should refuse to reveal so the legacy reader is untouched', () => {
      const { result } = renderHook(() => useAutoHideControls({ enabled: false }));

      act(() => result.current.reveal());

      expect(result.current.visible).toBe(false);
    });
  });

  describe('custom delay', () => {
    it('should respect a shorter auto-hide window', () => {
      const { result } = renderHook(() => useAutoHideControls({ autoHideDelay: 1000 }));

      act(() => result.current.reveal());
      advance(1001);

      expect(result.current.visible).toBe(false);
    });
  });

  describe('teardown', () => {
    it('should not fire its timer after unmount', () => {
      const { result, unmount } = renderHook(() => useAutoHideControls());

      act(() => result.current.reveal());
      unmount();

      expect(() => advance(STORY_GARDEN_DELAYS.controlsAutoHide + 1)).not.toThrow();
    });
  });
});
