import {
  EMOTION_THEMES,
  getThemeIcon,
  getThemeName,
  getAllThemes,
  getThemeById
} from '@/data/emotion-themes';

describe('Emotion Themes', () => {
  describe('EMOTION_THEMES', () => {
    it('should contain all themes', () => {
      expect(EMOTION_THEMES).toBeDefined();
      expect(Object.keys(EMOTION_THEMES)).toEqual(['emoji', 'animals', 'bear']);
    });

    it('should have valid theme structure', () => {
      Object.values(EMOTION_THEMES).forEach(theme => {
        expect(theme).toHaveProperty('id');
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('description');
        expect(theme).toHaveProperty('icon');
        expect(theme).toHaveProperty('emotions');

        expect(typeof theme.id).toBe('string');
        expect(typeof theme.name).toBe('string');
        expect(typeof theme.description).toBe('string');
        expect(typeof theme.icon).toBe('string');
        expect(typeof theme.emotions).toBe('object');
      });
    });

    it('should have emotions for all basic emotion IDs', () => {
      const basicEmotionIds = ['happy', 'sad', 'angry', 'surprised', 'scared', 'excited', 'confused', 'proud', 'shy', 'loving'];
      
      Object.values(EMOTION_THEMES).forEach(theme => {
        basicEmotionIds.forEach(emotionId => {
          expect(theme.emotions).toHaveProperty(emotionId);
          expect(theme.emotions[emotionId]).toHaveProperty('icon');
          expect(theme.emotions[emotionId]).toHaveProperty('name');
          expect(typeof theme.emotions[emotionId].icon).toBe('string');
          expect(typeof theme.emotions[emotionId].name).toBe('string');
        });
      });
    });
  });

  describe('getThemeIcon', () => {
    it('should return correct icon for valid emotion and theme', () => {
      expect(getThemeIcon('happy', 'emoji')).toBe('😊');
      expect(getThemeIcon('happy', 'animals')).toBe('🐱');
      expect(getThemeIcon('happy', 'bear')).toBe('🐻');
    });

    it('should return fallback for invalid emotion', () => {
      expect(getThemeIcon('invalid', 'emoji')).toBe('❓');
    });
  });

  describe('getThemeName', () => {
    it('should return correct name for valid emotion and theme', () => {
      expect(getThemeName('happy', 'emoji')).toBe('Happy');
      expect(getThemeName('happy', 'animals')).toBe('Happy Cat');
      expect(getThemeName('happy', 'bear')).toBe('Happy Bear');
    });

    it('should return fallback for invalid emotion', () => {
      expect(getThemeName('invalid', 'emoji')).toBe('Unknown');
    });
  });

  describe('getAllThemes', () => {
    it('should return array of all themes', () => {
      const themes = getAllThemes();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes).toHaveLength(3);
      expect(themes.map(t => t.id)).toEqual(['emoji', 'animals', 'bear']);
    });
  });

  describe('getThemeById', () => {
    it('should return correct theme for valid ID', () => {
      const emojiTheme = getThemeById('emoji');
      expect(emojiTheme.id).toBe('emoji');
      expect(emojiTheme.name).toBe('Emoji');

      const animalsTheme = getThemeById('animals');
      expect(animalsTheme.id).toBe('animals');
      expect(animalsTheme.name).toBe('Animals');

      const bearTheme = getThemeById('bear');
      expect(bearTheme.id).toBe('bear');
      expect(bearTheme.name).toBe('Bear');
    });
  });
});
