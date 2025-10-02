import { 
  MOCK_STORIES, 
  PLACEHOLDER_STORIES, 
  ALL_STORIES, 
  getAvailableStories, 
  getRandomStory 
} from '@/data/stories';
import { Story, STORY_TAGS } from '@/types/story';

describe('Stories Data', () => {
  describe('MOCK_STORIES', () => {
    it('should have exactly 6 stories', () => {
      expect(MOCK_STORIES).toHaveLength(6);
    });

    it('should have all available stories', () => {
      MOCK_STORIES.forEach(story => {
        expect(story.isAvailable).toBe(true);
      });
    });

    it('should have valid story structure', () => {
      MOCK_STORIES.forEach(story => {
        expect(story.id).toBeTruthy();
        expect(story.title).toBeTruthy();
        expect(story.category).toBeTruthy();
        expect(story.tag).toBeTruthy();
        expect(story.emoji).toBeTruthy();
        expect(typeof story.isAvailable).toBe('boolean');
        
        // Optional fields
        if (story.duration) {
          expect(typeof story.duration).toBe('number');
          expect(story.duration).toBeGreaterThan(0);
        }
        
        if (story.ageRange) {
          expect(story.ageRange).toMatch(/^\d+-\d+$/);
        }
      });
    });

    it('should have unique IDs', () => {
      const ids = MOCK_STORIES.map(story => story.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories = Object.keys(STORY_TAGS);
      MOCK_STORIES.forEach(story => {
        expect(validCategories).toContain(story.category);
      });
    });

    it('should have consistent tag and emoji with category', () => {
      MOCK_STORIES.forEach(story => {
        const categoryTag = STORY_TAGS[story.category];
        expect(story.emoji).toBe(categoryTag.emoji);
        expect(story.tag).toContain(categoryTag.label);
      });
    });
  });

  describe('PLACEHOLDER_STORIES', () => {
    it('should have exactly 4 placeholder stories', () => {
      expect(PLACEHOLDER_STORIES).toHaveLength(4);
    });

    it('should have all unavailable stories', () => {
      PLACEHOLDER_STORIES.forEach(story => {
        expect(story.isAvailable).toBe(false);
      });
    });

    it('should have "Coming Soon" titles', () => {
      PLACEHOLDER_STORIES.forEach(story => {
        expect(story.title).toBe('Coming Soon');
      });
    });

    it('should have unique placeholder IDs', () => {
      const ids = PLACEHOLDER_STORIES.map(story => story.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have placeholder ID format', () => {
      PLACEHOLDER_STORIES.forEach(story => {
        expect(story.id).toMatch(/^placeholder-\d+$/);
      });
    });
  });

  describe('ALL_STORIES', () => {
    it('should have exactly 10 stories total', () => {
      expect(ALL_STORIES).toHaveLength(10);
    });

    it('should contain all mock and placeholder stories', () => {
      expect(ALL_STORIES).toEqual([...MOCK_STORIES, ...PLACEHOLDER_STORIES]);
    });

    it('should have 6 available and 4 unavailable stories', () => {
      const available = ALL_STORIES.filter(story => story.isAvailable);
      const unavailable = ALL_STORIES.filter(story => !story.isAvailable);
      
      expect(available).toHaveLength(6);
      expect(unavailable).toHaveLength(4);
    });

    it('should have unique IDs across all stories', () => {
      const ids = ALL_STORIES.map(story => story.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getAvailableStories', () => {
    it('should return only available stories', () => {
      const availableStories = getAvailableStories();
      
      expect(availableStories).toHaveLength(6);
      availableStories.forEach(story => {
        expect(story.isAvailable).toBe(true);
      });
    });

    it('should return the same stories as MOCK_STORIES', () => {
      const availableStories = getAvailableStories();
      expect(availableStories).toEqual(MOCK_STORIES);
    });
  });

  describe('getRandomStory', () => {
    it('should return a story from available stories', () => {
      const randomStory = getRandomStory();
      
      expect(randomStory).toBeTruthy();
      expect(randomStory!.isAvailable).toBe(true);
      expect(MOCK_STORIES).toContain(randomStory);
    });

    it('should return different stories on multiple calls', () => {
      const stories = new Set();
      
      // Call multiple times to increase chance of getting different stories
      for (let i = 0; i < 20; i++) {
        const story = getRandomStory();
        if (story) {
          stories.add(story.id);
        }
      }
      
      // Should get at least 2 different stories in 20 attempts
      expect(stories.size).toBeGreaterThanOrEqual(2);
    });

    it('should handle edge case with no available stories', () => {
      // Mock empty available stories
      const originalFilter = Array.prototype.filter;
      Array.prototype.filter = jest.fn().mockReturnValue([]);
      
      const randomStory = getRandomStory();
      expect(randomStory).toBeNull();
      
      // Restore original filter
      Array.prototype.filter = originalFilter;
    });
  });

  describe('Story Categories', () => {
    it('should cover all story categories', () => {
      const categoriesInStories = new Set(MOCK_STORIES.map(story => story.category));
      const availableCategories = Object.keys(STORY_TAGS);
      
      // Should have stories from multiple categories
      expect(categoriesInStories.size).toBeGreaterThan(1);
      
      // All story categories should be valid
      categoriesInStories.forEach(category => {
        expect(availableCategories).toContain(category);
      });
    });

    it('should have diverse story content', () => {
      const titles = MOCK_STORIES.map(story => story.title);
      const descriptions = MOCK_STORIES.map(story => story.description).filter(Boolean);
      
      // Should have unique titles
      expect(new Set(titles).size).toBe(titles.length);
      
      // Should have descriptions for most stories
      expect(descriptions.length).toBeGreaterThan(MOCK_STORIES.length / 2);
    });
  });

  describe('Performance', () => {
    it('should load story data quickly', () => {
      const startTime = performance.now();
      
      // Access all story data
      const mockStories = MOCK_STORIES;
      const placeholderStories = PLACEHOLDER_STORIES;
      const allStories = ALL_STORIES;
      const availableStories = getAvailableStories();
      const randomStory = getRandomStory();
      
      const endTime = performance.now();
      
      expect(mockStories).toBeDefined();
      expect(placeholderStories).toBeDefined();
      expect(allStories).toBeDefined();
      expect(availableStories).toBeDefined();
      expect(randomStory).toBeDefined();
      
      // Should load very quickly (less than 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});
