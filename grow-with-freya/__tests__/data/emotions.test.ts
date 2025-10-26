import {
  EMOTIONS,
  EMOTION_GAME_CONFIG,
  getEmotionsByDifficulty,
  getEmotionsByCategory,
  getRandomEmotion,
  getRandomPrompt,
  getEmotionById
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
        expect(emotion).toHaveProperty('expressionPrompts');
        expect(emotion).toHaveProperty('difficulty');
        expect(emotion).toHaveProperty('category');

        expect(typeof emotion.id).toBe('string');
        expect(typeof emotion.name).toBe('string');
        expect(typeof emotion.emoji).toBe('string');
        expect(typeof emotion.color).toBe('string');
        expect(typeof emotion.description).toBe('string');
        expect(Array.isArray(emotion.expressionPrompts)).toBe(true);
        expect(['easy', 'medium', 'hard']).toContain(emotion.difficulty);
        expect(['basic', 'complex', 'social']).toContain(emotion.category);
      });
    });

    it('should have unique emotion IDs', () => {
      const ids = EMOTIONS.map(emotion => emotion.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have at least one expression prompt per emotion', () => {
      EMOTIONS.forEach(emotion => {
        expect(emotion.expressionPrompts.length).toBeGreaterThan(0);
        emotion.expressionPrompts.forEach(prompt => {
          expect(typeof prompt).toBe('string');
          expect(prompt.length).toBeGreaterThan(0);
        });
      });
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
      expect(EMOTION_GAME_CONFIG.timePerEmotion).toBe(10);
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

  describe('getRandomPrompt', () => {
    it('should return a random prompt from the emotion', () => {
      const emotion = EMOTIONS[0];
      const prompt = getRandomPrompt(emotion);
      expect(typeof prompt).toBe('string');
      expect(emotion.expressionPrompts).toContain(prompt);
    });

    it('should return different prompts for emotions with multiple prompts', () => {
      const emotionWithMultiplePrompts = EMOTIONS.find(e => e.expressionPrompts.length > 1);
      if (emotionWithMultiplePrompts) {
        const prompts = new Set();
        for (let i = 0; i < 10; i++) {
          prompts.add(getRandomPrompt(emotionWithMultiplePrompts));
        }
        expect(prompts.size).toBeGreaterThan(1);
      }
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
