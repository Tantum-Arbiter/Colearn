/**
 * Tests for the child UI's motion contract.
 *
 * Every beat carries a reduced-motion duration alongside its full one, and
 * motionDuration is the only thing that chooses between them. The invariant
 * below is the one that matters: honouring reduced motion must never make a
 * movement last longer than it would have.
 */

import { CHILD_UI_MOTION, motionDuration } from '@/constants/child-ui-motion';

describe('child ui motion', () => {
  describe('motionDuration', () => {
    it('should return the full duration when motion is not reduced', () => {
      const underTest = motionDuration(CHILD_UI_MOTION.viewSwap, false);

      expect(underTest).toBe(CHILD_UI_MOTION.viewSwap.duration);
    });

    it('should return the reduced duration when motion is reduced', () => {
      const underTest = motionDuration(CHILD_UI_MOTION.viewSwap, true);

      expect(underTest).toBe(CHILD_UI_MOTION.viewSwap.reducedDuration);
    });
  });

  describe('the reduced-motion contract', () => {
    it('should never make a reduced beat longer than the full beat', () => {
      Object.values(CHILD_UI_MOTION).forEach((beat) => {
        expect(beat.reducedDuration).toBeLessThanOrEqual(beat.duration);
      });
    });

    it('should cut rather than move for every beat, since the child UI has no essential motion', () => {
      Object.values(CHILD_UI_MOTION).forEach((beat) => {
        expect(beat.reducedDuration).toBe(0);
      });
    });
  });
});
