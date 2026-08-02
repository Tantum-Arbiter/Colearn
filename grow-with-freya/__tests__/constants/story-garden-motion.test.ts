/**
 * Tests for the Story Garden motion contract.
 *
 * These constants are the single source of truth for the opening ritual.
 * The assertions here encode the product brief so a future timing tweak
 * cannot silently turn the ritual back into ordinary navigation.
 */

import {
  STORY_GARDEN_MOTION,
  STORY_GARDEN_DELAYS,
  STORY_GARDEN_SCALE,
  OPEN_RITUAL_DURATION,
  motionDuration,
} from '@/constants/story-garden-motion';

describe('story garden motion', () => {
  describe('the open ritual', () => {
    it('should last between 900ms and 1200ms so it reads as a ritual, not navigation', () => {
      const underTest = OPEN_RITUAL_DURATION;

      expect(underTest).toBeGreaterThanOrEqual(900);
      expect(underTest).toBeLessThanOrEqual(1200);
    });

    it('should sum the three timed stages, excluding the device-driven rotation', () => {
      const underTest = OPEN_RITUAL_DURATION;

      expect(underTest).toBe(
        STORY_GARDEN_MOTION.coverExpansion.duration
          + STORY_GARDEN_MOTION.preOpen.duration
          + STORY_GARDEN_MOTION.landscapeSettle.duration
      );
    });

    it('should be markedly longer than an ordinary 300-400ms transition', () => {
      const underTest = OPEN_RITUAL_DURATION;

      expect(underTest).toBeGreaterThan(400 * 2);
    });
  });

  describe('page turning', () => {
    it('should fall in the 400-550ms band that keeps turns predictable', () => {
      const underTest = STORY_GARDEN_MOTION.pageTurn.duration;

      expect(underTest).toBeGreaterThanOrEqual(400);
      expect(underTest).toBeLessThanOrEqual(550);
    });
  });

  describe('shelf sizing', () => {
    it('should size shelf covers at 45-55% of usable width', () => {
      const underTest = STORY_GARDEN_SCALE.shelfCoverWidthRatio;

      expect(underTest).toBeGreaterThanOrEqual(0.45);
      expect(underTest).toBeLessThanOrEqual(0.55);
    });

    it('should size the focused cover at 65-75% of usable width', () => {
      const underTest = STORY_GARDEN_SCALE.focusedCoverWidthRatio;

      expect(underTest).toBeGreaterThanOrEqual(0.65);
      expect(underTest).toBeLessThanOrEqual(0.75);
    });

    it('should grow the centred book by 8-12%', () => {
      const underTest = STORY_GARDEN_SCALE.shelfCentredBook;

      expect(underTest).toBeGreaterThanOrEqual(1.08);
      expect(underTest).toBeLessThanOrEqual(1.12);
    });

    it('should use a portrait 3:4 cover crop', () => {
      const underTest = STORY_GARDEN_SCALE.coverAspectRatio;

      expect(underTest).toBeCloseTo(3 / 4);
    });

    it('should dim the environment by about 15% behind a lifted book', () => {
      const underTest = STORY_GARDEN_SCALE.environmentDim;

      expect(underTest).toBeCloseTo(0.15);
    });
  });

  describe('delays', () => {
    it('should offer an escape from the rotation prompt after about two seconds', () => {
      const underTest = STORY_GARDEN_DELAYS.rotationPrompt;

      expect(underTest).toBeGreaterThanOrEqual(1500);
      expect(underTest).toBeLessThanOrEqual(2500);
    });

    it('should hide reader controls after four to five seconds', () => {
      const underTest = STORY_GARDEN_DELAYS.controlsAutoHide;

      expect(underTest).toBeGreaterThanOrEqual(4000);
      expect(underTest).toBeLessThanOrEqual(5000);
    });
  });

  describe('motionDuration', () => {
    it('should return the full duration when motion is not reduced', () => {
      const underTest = motionDuration(STORY_GARDEN_MOTION.bookLift, false);

      expect(underTest).toBe(STORY_GARDEN_MOTION.bookLift.duration);
    });

    it('should return the reduced duration when motion is reduced', () => {
      const underTest = motionDuration(STORY_GARDEN_MOTION.bookLift, true);

      expect(underTest).toBe(STORY_GARDEN_MOTION.bookLift.reducedDuration);
    });

    it('should never make a reduced beat longer than the full beat', () => {
      Object.values(STORY_GARDEN_MOTION).forEach((beat) => {
        expect(beat.reducedDuration).toBeLessThanOrEqual(beat.duration);
      });
    });

    it('should collapse the dimensional book lift entirely under reduced motion', () => {
      const underTest = motionDuration(STORY_GARDEN_MOTION.bookLift, true);

      expect(underTest).toBe(0);
    });
  });
});
