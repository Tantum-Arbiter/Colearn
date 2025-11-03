import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  getEnabledFeatures,
  shouldShowAnimationsForStory,
  shouldUseSimpleDemo,
  shouldUseFullFrameAnimation,
} from '@/constants/feature-flags';

describe('Feature Flags', () => {
  describe('FEATURE_FLAGS constant', () => {
    it('should have all expected flags defined', () => {
      expect(FEATURE_FLAGS).toHaveProperty('ENABLE_ANIMATED_CHARACTERS');
      expect(FEATURE_FLAGS).toHaveProperty('ENABLE_SIMPLE_ANIMATION_DEMO');
      expect(FEATURE_FLAGS).toHaveProperty('ENABLE_FULL_FRAME_ANIMATION');
      expect(FEATURE_FLAGS).toHaveProperty('ENABLE_CHARACTER_AUDIO');
      expect(FEATURE_FLAGS).toHaveProperty('ENABLE_MOVEMENT_PATTERNS');
      expect(FEATURE_FLAGS).toHaveProperty('ENABLE_STORY_ANIMATIONS_FOR_WOMBAT');
    });

    it('should have boolean values for all flags', () => {
      Object.values(FEATURE_FLAGS).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return correct boolean value for existing flags', () => {
      const result = isFeatureEnabled('ENABLE_ANIMATED_CHARACTERS');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(FEATURE_FLAGS.ENABLE_ANIMATED_CHARACTERS);
    });

    it('should return correct value for simple demo flag', () => {
      const result = isFeatureEnabled('ENABLE_SIMPLE_ANIMATION_DEMO');
      expect(result).toBe(FEATURE_FLAGS.ENABLE_SIMPLE_ANIMATION_DEMO);
    });
  });

  describe('getEnabledFeatures', () => {
    it('should return array of enabled feature names', () => {
      const enabledFeatures = getEnabledFeatures();
      expect(Array.isArray(enabledFeatures)).toBe(true);
      
      // Should only contain features that are actually enabled
      enabledFeatures.forEach(featureName => {
        expect(FEATURE_FLAGS[featureName as keyof typeof FEATURE_FLAGS]).toBe(true);
      });
    });

    it('should include ENABLE_ANIMATED_CHARACTERS if enabled', () => {
      const enabledFeatures = getEnabledFeatures();
      if (FEATURE_FLAGS.ENABLE_ANIMATED_CHARACTERS) {
        expect(enabledFeatures).toContain('ENABLE_ANIMATED_CHARACTERS');
      } else {
        expect(enabledFeatures).not.toContain('ENABLE_ANIMATED_CHARACTERS');
      }
    });
  });

  describe('shouldShowAnimationsForStory', () => {
    it('should return false if ENABLE_ANIMATED_CHARACTERS is disabled', () => {
      // Mock the feature flag as disabled
      const originalFlag = FEATURE_FLAGS.ENABLE_ANIMATED_CHARACTERS;
      (FEATURE_FLAGS as any).ENABLE_ANIMATED_CHARACTERS = false;

      const result = shouldShowAnimationsForStory('snuggle-little-wombat');
      expect(result).toBe(false);

      // Restore original value
      (FEATURE_FLAGS as any).ENABLE_ANIMATED_CHARACTERS = originalFlag;
    });

    it('should return true for wombat story when wombat flag is enabled', () => {
      // Ensure the main flag is enabled
      (FEATURE_FLAGS as any).ENABLE_ANIMATED_CHARACTERS = true;
      (FEATURE_FLAGS as any).ENABLE_STORY_ANIMATIONS_FOR_WOMBAT = true;
      (FEATURE_FLAGS as any).ENABLE_STORY_ANIMATIONS_FOR_ALL = false;

      const result = shouldShowAnimationsForStory('snuggle-little-wombat');
      expect(result).toBe(true);
    });

    it('should return false for non-wombat story when only wombat flag is enabled', () => {
      (FEATURE_FLAGS as any).ENABLE_ANIMATED_CHARACTERS = true;
      (FEATURE_FLAGS as any).ENABLE_STORY_ANIMATIONS_FOR_WOMBAT = true;
      (FEATURE_FLAGS as any).ENABLE_STORY_ANIMATIONS_FOR_ALL = false;

      const result = shouldShowAnimationsForStory('some-other-story');
      expect(result).toBe(false);
    });

    it('should return true for any story when all stories flag is enabled', () => {
      (FEATURE_FLAGS as any).ENABLE_ANIMATED_CHARACTERS = true;
      (FEATURE_FLAGS as any).ENABLE_STORY_ANIMATIONS_FOR_ALL = true;

      const result1 = shouldShowAnimationsForStory('snuggle-little-wombat');
      const result2 = shouldShowAnimationsForStory('some-other-story');
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('shouldUseSimpleDemo', () => {
    it('should return true when simple demo is enabled and full frame is disabled', () => {
      (FEATURE_FLAGS as any).ENABLE_SIMPLE_ANIMATION_DEMO = true;
      (FEATURE_FLAGS as any).ENABLE_FULL_FRAME_ANIMATION = false;

      const result = shouldUseSimpleDemo();
      expect(result).toBe(true);
    });

    it('should return false when simple demo is disabled', () => {
      (FEATURE_FLAGS as any).ENABLE_SIMPLE_ANIMATION_DEMO = false;
      (FEATURE_FLAGS as any).ENABLE_FULL_FRAME_ANIMATION = false;

      const result = shouldUseSimpleDemo();
      expect(result).toBe(false);
    });

    it('should return false when full frame animation is enabled', () => {
      (FEATURE_FLAGS as any).ENABLE_SIMPLE_ANIMATION_DEMO = true;
      (FEATURE_FLAGS as any).ENABLE_FULL_FRAME_ANIMATION = true;

      const result = shouldUseSimpleDemo();
      expect(result).toBe(false);
    });
  });

  describe('shouldUseFullFrameAnimation', () => {
    it('should return true when full frame animation is enabled', () => {
      (FEATURE_FLAGS as any).ENABLE_FULL_FRAME_ANIMATION = true;

      const result = shouldUseFullFrameAnimation();
      expect(result).toBe(true);
    });

    it('should return false when full frame animation is disabled', () => {
      (FEATURE_FLAGS as any).ENABLE_FULL_FRAME_ANIMATION = false;

      const result = shouldUseFullFrameAnimation();
      expect(result).toBe(false);
    });
  });
});
