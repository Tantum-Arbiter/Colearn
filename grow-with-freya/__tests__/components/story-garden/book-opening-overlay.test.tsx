/**
 * Tests for the book-opening overlay's scrim.
 *
 * The brief asks for the environment to dim by ~15% while the book lifts, so the
 * child can still see the shelf it came from. An opaque wash would turn the lift
 * back into the modal this replaces.
 */

import { scrimOpacityFor } from '@/components/stories/story-garden/book-opening-overlay';
import { STORY_GARDEN_SCALE } from '@/constants/story-garden-motion';
import type { BookOpeningPhase } from '@/hooks/use-book-opening';

describe('scrimOpacityFor', () => {
  describe('while the book is being lifted', () => {
    it.each<BookOpeningPhase>(['lifting', 'focused'])(
      'should dim the shelf only slightly during %s',
      (phase) => {
        const underTest = scrimOpacityFor(phase);

        expect(underTest).toBe(STORY_GARDEN_SCALE.environmentDim);
      }
    );

    it('should leave the shelf clearly visible behind the focused book', () => {
      const underTest = scrimOpacityFor('focused');

      expect(underTest).toBeLessThan(0.2);
    });
  });

  describe('once the book starts opening', () => {
    it.each<BookOpeningPhase>(['expanding', 'preOpen', 'bridging', 'settling'])(
      'should take over the screen during %s',
      (phase) => {
        const underTest = scrimOpacityFor(phase);

        expect(underTest).toBe(1);
      }
    );
  });

  describe('at rest', () => {
    it.each<BookOpeningPhase>(['idle', 'open', 'openPortrait'])(
      'should show nothing during %s',
      (phase) => {
        const underTest = scrimOpacityFor(phase);

        expect(underTest).toBe(0);
      }
    );
  });
});
