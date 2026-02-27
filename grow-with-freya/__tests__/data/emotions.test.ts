import {
  EMOTIONS,
  EMOTION_GAME_CONFIG,
  getEmotionsByDifficulty,
  getEmotionsByCategory,
  getRandomEmotion,
  getRandomPromptIndex,
  getPromptTranslationKey,
  getEmotionById,
  PROMPTS_PER_EMOTION
} from '@/data/emotions';

describe('Emotions Data', () => {
  describe('EMOTIONS array', () => {
    it('should contain valid emotion objects', () => {
      expect(EMOTIONS).toBeDefined();
      expect(EMOTIONS.length).toBeGreaterThan(0);

      EMOTIONS.forEach(emotion => {
        expect(emotion).toHaveProperty('id');
        expect(emotion).toHaveProperty('name');
        expect(emotion).toHaveProperty('emoji');
        expect(emotion).toHaveProperty('color');
        expect(emotion).toHaveProperty('description');
        expect(emotion).toHaveProperty('difficulty');
        expect(emotion).toHaveProperty('category');

        expect(typeof emotion.id).toBe('string');
        expect(typeof emotion.name).toBe('string');
        expect(typeof emotion.emoji).toBe('string');
        expect(typeof emotion.color).toBe('string');
        expect(typeof emotion.description).toBe('string');
        expect(['easy', 'medium', 'hard']).toContain(emotion.difficulty);
        expect(['basic', 'complex', 'social']).toContain(emotion.category);
      });
    });

    it('should have unique emotion IDs', () => {
      const ids = EMOTIONS.map(emotion => emotion.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have PROMPTS_PER_EMOTION defined correctly', () => {
      expect(PROMPTS_PER_EMOTION).toBe(4);
    });
  });

  describe('EMOTION_GAME_CONFIG', () => {
    it('should have valid configuration values', () => {
      expect(EMOTION_GAME_CONFIG).toBeDefined();
      expect(typeof EMOTION_GAME_CONFIG.emotionsPerLevel).toBe('number');
      expect(typeof EMOTION_GAME_CONFIG.pointsPerCorrect).toBe('number');
      expect(typeof EMOTION_GAME_CONFIG.pointsForStreak).toBe('number');
      expect(typeof EMOTION_GAME_CONFIG.maxLevel).toBe('number');
      expect(typeof EMOTION_GAME_CONFIG.timePerEmotion).toBe('number');

      expect(EMOTION_GAME_CONFIG.emotionsPerLevel).toBe(5);
      expect(EMOTION_GAME_CONFIG.timePerEmotion).toBe(60);
      expect(EMOTION_GAME_CONFIG.pointsPerCorrect).toBeGreaterThan(0);
      expect(EMOTION_GAME_CONFIG.pointsForStreak).toBeGreaterThan(0);
      expect(EMOTION_GAME_CONFIG.maxLevel).toBeGreaterThan(0);
    });
  });

  describe('getEmotionsByDifficulty', () => {
    it('should return emotions filtered by difficulty', () => {
      const easyEmotions = getEmotionsByDifficulty('easy');
      const mediumEmotions = getEmotionsByDifficulty('medium');
      const hardEmotions = getEmotionsByDifficulty('hard');

      expect(Array.isArray(easyEmotions)).toBe(true);
      expect(Array.isArray(mediumEmotions)).toBe(true);
      expect(Array.isArray(hardEmotions)).toBe(true);

      easyEmotions.forEach(emotion => {
        expect(emotion.difficulty).toBe('easy');
      });

      mediumEmotions.forEach(emotion => {
        expect(emotion.difficulty).toBe('medium');
      });

      hardEmotions.forEach(emotion => {
        expect(emotion.difficulty).toBe('hard');
      });
    });
  });

  describe('getEmotionsByCategory', () => {
    it('should return emotions filtered by category', () => {
      const basicEmotions = getEmotionsByCategory('basic');
      const complexEmotions = getEmotionsByCategory('complex');
      const socialEmotions = getEmotionsByCategory('social');

      expect(Array.isArray(basicEmotions)).toBe(true);
      expect(Array.isArray(complexEmotions)).toBe(true);
      expect(Array.isArray(socialEmotions)).toBe(true);

      basicEmotions.forEach(emotion => {
        expect(emotion.category).toBe('basic');
      });

      complexEmotions.forEach(emotion => {
        expect(emotion.category).toBe('complex');
      });

      socialEmotions.forEach(emotion => {
        expect(emotion.category).toBe('social');
      });
    });
  });

  describe('getRandomEmotion', () => {
    it('should return a random emotion', () => {
      const emotion = getRandomEmotion();
      expect(emotion).toBeDefined();
      expect(EMOTIONS).toContain(emotion);
    });

    it('should exclude specified emotion IDs', () => {
      const excludeIds = ['happy', 'sad'];
      const emotion = getRandomEmotion(excludeIds);
      expect(emotion).toBeDefined();
      expect(excludeIds).not.toContain(emotion.id);
    });

    it('should return different emotions on multiple calls', () => {
      const emotions = new Set();
      for (let i = 0; i < 10; i++) {
        emotions.add(getRandomEmotion().id);
      }
      // With 10+ emotions available, we should get some variety
      expect(emotions.size).toBeGreaterThan(1);
    });
  });

  describe('getRandomPromptIndex', () => {
    it('should return a random index within valid range', () => {
      const index = getRandomPromptIndex();
      expect(typeof index).toBe('number');
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PROMPTS_PER_EMOTION);
    });

    it('should return different indices over multiple calls', () => {
      const indices = new Set();
      for (let i = 0; i < 20; i++) {
        indices.add(getRandomPromptIndex());
      }
      // With 4 possible indices and 20 tries, we should get variety
      expect(indices.size).toBeGreaterThan(1);
    });
  });

  describe('getPromptTranslationKey', () => {
    it('should return a valid translation key', () => {
      const key = getPromptTranslationKey('happy', 0);
      expect(key).toBe('emotions.prompts.happy.0');
    });

    it('should work with different emotions and indices', () => {
      expect(getPromptTranslationKey('sad', 2)).toBe('emotions.prompts.sad.2');
      expect(getPromptTranslationKey('angry', 3)).toBe('emotions.prompts.angry.3');
    });
  });

  describe('getEmotionById', () => {
    it('should return the correct emotion by ID', () => {
      const emotion = getEmotionById('happy');
      expect(emotion).toBeDefined();
      expect(emotion?.id).toBe('happy');
      expect(emotion?.name).toBe('Happy');
    });

    it('should return undefined for non-existent ID', () => {
      const emotion = getEmotionById('non-existent');
      expect(emotion).toBeUndefined();
    });
  });
});
