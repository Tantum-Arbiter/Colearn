/**
 * Tests for the book-opening ritual state machine.
 *
 * This is the "choose a book, open a world" journey: lift → focus → expand →
 * begin opening → rotate → settle → read. The device rotation happens INSIDE
 * that journey, so the machine never advances on a rotation timer — it waits on
 * the orientation controller and always offers a way out.
 *
 * Key behaviors tested:
 * 1. The lift is acknowledged before the choices appear
 * 2. Landscape is requested only after the book has begun opening
 * 3. An escape appears if the family never turns the device
 * 4. "Read this way" never locks orientation
 * 5. Reduced motion collapses the dimensional stages
 * 6. Already-landscape devices skip the rotation cue entirely
 */

import { renderHook, act } from '@testing-library/react-native';
import { STORY_GARDEN_MOTION, STORY_GARDEN_DELAYS } from '@/constants/story-garden-motion';
import type { Story } from '@/types/story';

const mockLockLandscape = jest.fn();
const mockLockPortrait = jest.fn();
let mockOrientation: 'portrait' | 'landscape' = 'portrait';
let mockReduceMotion = false;

jest.mock('@/hooks/use-story-orientation', () => ({
  useStoryOrientation: () => ({
    orientation: mockOrientation,
    isSettling: false,
    isTablet: false,
    lockLandscape: mockLockLandscape,
    lockPortrait: mockLockPortrait,
  }),
}));

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

import { useBookOpening } from '@/hooks/use-book-opening';

const story = { id: 'wombat', title: 'Snuggle Little Wombat', category: 'bedtime' } as Story;

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useBookOpening', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockOrientation = 'portrait';
    mockReduceMotion = false;
    mockLockLandscape.mockResolvedValue('landscape');
    mockLockPortrait.mockResolvedValue('portrait');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('at rest', () => {
    it('should start idle with no book chosen', () => {
      const { result } = renderHook(() => useBookOpening());

      expect(result.current.phase).toBe('idle');
      expect(result.current.story).toBeNull();
    });
  });

  describe('picking a book up', () => {
    it('should lift the book before showing any choices', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));

      expect(result.current.phase).toBe('lifting');
    });

    it('should remember which book was chosen', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));

      expect(result.current.story?.id).toBe('wombat');
    });

    it('should settle into the focused state after the lift', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration);

      expect(result.current.phase).toBe('focused');
    });

    it('should not touch orientation while the child is still choosing', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(2000);

      expect(mockLockLandscape).not.toHaveBeenCalled();
    });
  });

  describe('where the book was lifted from', () => {
    it('should remember the shelf position so the lift starts there', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story, { x: 40, y: 300, width: 200, height: 267 }));

      expect(result.current.origin).toEqual({ x: 40, y: 300, width: 200, height: 267 });
    });

    it('should cope with a book it could not measure', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));

      expect(result.current.origin).toBeNull();
    });

    it('should forget the position when the book goes back', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story, { x: 40, y: 300, width: 200, height: 267 }));
      act(() => result.current.putBack());

      expect(result.current.origin).toBeNull();
    });
  });

  describe('putting a book back', () => {
    it('should return to idle', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(1000);
      act(() => result.current.putBack());

      expect(result.current.phase).toBe('idle');
    });

    it('should forget the book', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      act(() => result.current.putBack());

      expect(result.current.story).toBeNull();
    });
  });

  describe('the opening ritual', () => {
    function openTo(result: { current: ReturnType<typeof useBookOpening> }) {
      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration);
      act(() => result.current.choose('read', null));
    }

    it('should expand the cover first', () => {
      const { result } = renderHook(() => useBookOpening());

      openTo(result);

      expect(result.current.phase).toBe('expanding');
    });

    it('should begin opening the book before asking for landscape', () => {
      const { result } = renderHook(() => useBookOpening());

      openTo(result);
      advance(STORY_GARDEN_MOTION.coverExpansion.duration);

      expect(result.current.phase).toBe('preOpen');
      expect(mockLockLandscape).not.toHaveBeenCalled();
    });

    it('should request landscape once the book has begun to open', () => {
      const { result } = renderHook(() => useBookOpening());

      openTo(result);
      advance(STORY_GARDEN_MOTION.coverExpansion.duration + STORY_GARDEN_MOTION.preOpen.duration);

      expect(mockLockLandscape).toHaveBeenCalledTimes(1);
    });

    it('should carry the chosen mode through to the reader', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration);
      act(() => result.current.choose('narrate', null));

      expect(result.current.mode).toBe('narrate');
    });
  });

  describe('when nobody turns the device', () => {
    it('should offer a way out rather than trapping the family', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration);
      act(() => result.current.choose('read', null));
      advance(
        STORY_GARDEN_MOTION.coverExpansion.duration
          + STORY_GARDEN_MOTION.preOpen.duration
          + STORY_GARDEN_DELAYS.rotationPrompt
      );

      expect(result.current.showRotationEscape).toBe(true);
    });

    it('should not offer the escape before the prompt delay', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration);
      act(() => result.current.choose('read', null));
      advance(STORY_GARDEN_MOTION.coverExpansion.duration + STORY_GARDEN_MOTION.preOpen.duration);

      expect(result.current.showRotationEscape).toBe(false);
    });

    it('should open a portrait reader when the family chooses to read this way', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration);
      act(() => result.current.choose('read', null));
      advance(5000);
      act(() => result.current.readThisWay());

      expect(result.current.phase).toBe('openPortrait');
    });

    it('should return to portrait rather than leaving a half-applied landscape lock', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration);
      act(() => result.current.choose('read', null));
      advance(5000);
      act(() => result.current.readThisWay());

      expect(mockLockPortrait).toHaveBeenCalled();
    });
  });

  describe('on a device already in landscape', () => {
    beforeEach(() => {
      mockOrientation = 'landscape';
    });

    it('should never show the rotation cue', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration);
      act(() => result.current.choose('read', null));
      advance(5000);

      expect(result.current.showRotationEscape).toBe(false);
    });
  });

  describe('with reduced motion', () => {
    beforeEach(() => {
      mockReduceMotion = true;
    });

    it('should skip the dimensional pre-open stage', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.focusSettle.reducedDuration);
      act(() => result.current.choose('read', null));
      advance(STORY_GARDEN_MOTION.coverExpansion.reducedDuration);

      expect(result.current.phase).not.toBe('preOpen');
    });

    it('should still take the family to landscape', () => {
      const { result } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      advance(STORY_GARDEN_MOTION.focusSettle.reducedDuration);
      act(() => result.current.choose('read', null));
      advance(1000);

      expect(mockLockLandscape).toHaveBeenCalled();
    });
  });

  describe('teardown', () => {
    it('should not advance the ritual after unmount', () => {
      const { result, unmount } = renderHook(() => useBookOpening());

      act(() => result.current.pickUp(story));
      unmount();
      advance(5000);

      expect(mockLockLandscape).not.toHaveBeenCalled();
    });
  });
});
