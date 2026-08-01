/**
 * Tests for the "pause and notice" interaction rhythm.
 *
 * Today every interactive element pulses forever and all of them at once. The
 * rhythm replaces that: narration plays, the page stays still, the story invites
 * the interaction, ONE object receives ONE soft highlight, the child acts, the
 * page settles.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useInteractionRhythm } from '@/hooks/use-interaction-rhythm';
import { STORY_GARDEN_DELAYS } from '@/constants/story-garden-motion';

const OBSERVATION = STORY_GARDEN_DELAYS.hotspotObservation;

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useInteractionRhythm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the page at rest', () => {
    it('should start every hotspot dormant', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf', 'gate'] }));

      expect(result.current.stageFor('scarf')).toBe('dormant');
      expect(result.current.stageFor('gate')).toBe('dormant');
    });

    it('should advertise nothing before the observation period', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf'] }));

      act(() => result.current.beginObservation());
      advance(OBSERVATION - 1);

      expect(result.current.isInvited('scarf')).toBe(false);
    });
  });

  describe('the invitation', () => {
    it('should invite the interaction after the page has been still', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf'] }));

      act(() => result.current.beginObservation());
      advance(OBSERVATION);

      expect(result.current.stageFor('scarf')).toBe('invited');
    });

    it('should follow with a single soft highlight', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf'] }));

      act(() => result.current.beginObservation());
      advance(OBSERVATION * 2);

      expect(result.current.stageFor('scarf')).toBe('highlighted');
    });

    it('should never invite two objects at once', () => {
      const { result } = renderHook(() =>
        useInteractionRhythm({ hotspotIds: ['scarf', 'gate', 'cart'] })
      );

      act(() => result.current.beginObservation());
      advance(OBSERVATION * 2);

      const invited = ['scarf', 'gate', 'cart'].filter((id) => result.current.isInvited(id));

      expect(invited).toEqual(['scarf']);
    });
  });

  describe('after the child acts', () => {
    it('should stop inviting that object', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf'] }));

      act(() => result.current.beginObservation());
      advance(OBSERVATION * 2);
      act(() => result.current.markActed('scarf'));

      expect(result.current.isInvited('scarf')).toBe(false);
    });

    it('should let the page settle again', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf'] }));

      act(() => result.current.markActed('scarf'));
      advance(1000);

      expect(result.current.stageFor('scarf')).toBe('settled');
    });

    it('should move attention to the next object only after the first is done', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf', 'gate'] }));

      expect(result.current.activeHotspotId).toBe('scarf');

      act(() => result.current.markActed('scarf'));

      expect(result.current.activeHotspotId).toBe('gate');
    });

    it('should have nothing active once every object has been touched', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf'] }));

      act(() => result.current.markActed('scarf'));

      expect(result.current.activeHotspotId).toBeNull();
    });
  });

  describe('turning the page', () => {
    it('should reset the rhythm for the new page', () => {
      const { result, rerender } = renderHook(
        ({ ids }: { ids: string[] }) => useInteractionRhythm({ hotspotIds: ids }),
        { initialProps: { ids: ['scarf'] } }
      );

      act(() => result.current.markActed('scarf'));
      rerender({ ids: ['gate'] });

      expect(result.current.stageFor('gate')).toBe('dormant');
      expect(result.current.activeHotspotId).toBe('gate');
    });
  });

  describe('when disabled', () => {
    it('should never invite anything, leaving the legacy behaviour alone', () => {
      const { result } = renderHook(() =>
        useInteractionRhythm({ hotspotIds: ['scarf'], enabled: false })
      );

      act(() => result.current.beginObservation());
      advance(OBSERVATION * 4);

      expect(result.current.isInvited('scarf')).toBe(false);
    });
  });

  describe('stability under re-render', () => {
    it('should keep a stable identity so consumer effects do not re-fire every render', () => {
      const { result, rerender } = renderHook(() =>
        useInteractionRhythm({ hotspotIds: ['scarf'] })
      );

      const first = result.current;
      rerender({});

      expect(result.current).toBe(first);
    });

    it('should not stack timers when observation is requested repeatedly', () => {
      const { result } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf'] }));

      act(() => result.current.beginObservation());
      const afterFirst = jest.getTimerCount();
      act(() => {
        result.current.beginObservation();
        result.current.beginObservation();
        result.current.beginObservation();
      });

      expect(jest.getTimerCount()).toBe(afterFirst);
    });

    it('should still observe the next object after the first is acted on', () => {
      const { result } = renderHook(() =>
        useInteractionRhythm({ hotspotIds: ['scarf', 'gate'] })
      );

      act(() => result.current.beginObservation());
      advance(OBSERVATION * 2);
      act(() => result.current.markActed('scarf'));
      act(() => result.current.beginObservation());
      advance(OBSERVATION * 2);

      expect(result.current.stageFor('gate')).toBe('highlighted');
    });
  });

  describe('teardown', () => {
    it('should not advance the rhythm after unmount', () => {
      const { result, unmount } = renderHook(() => useInteractionRhythm({ hotspotIds: ['scarf'] }));

      act(() => result.current.beginObservation());
      unmount();

      expect(() => advance(OBSERVATION * 4)).not.toThrow();
    });
  });
});
