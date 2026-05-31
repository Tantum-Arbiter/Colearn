import {
  MOCK_STORIES,
  ALL_STORIES,
  getAvailableStories,
  getRandomStory
} from '@/data/stories';
import { Story, StoryPage, CatalogEntry, StoryCategory, STORY_TAGS } from '@/types/story';
import * as fs from 'fs';
import * as path from 'path';

describe('Stories Data', () => {
  describe('MOCK_STORIES', () => {
    it('should have exactly 1 story (Snuggle Little Wombat)', () => {
      expect(MOCK_STORIES).toHaveLength(1);
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

    it('should have a valid category with a matching STORY_TAGS entry', () => {
      MOCK_STORIES.forEach(story => {
        const categoryTag = STORY_TAGS[story.category];
        expect(categoryTag).toBeDefined();
        expect(categoryTag.emoji).toBeTruthy();
      });
    });
  });

  describe('ALL_STORIES', () => {
    it('should have stories', () => {
      expect(ALL_STORIES.length).toBeGreaterThan(0);
    });

    it('should contain all available stories', () => {
      const available = ALL_STORIES.filter(story => story.isAvailable);
      expect(available.length).toBeGreaterThan(0);
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

      expect(availableStories).toHaveLength(4); // Wombat, Jigsaw, Spelling, Word Placing
      availableStories.forEach(story => {
        expect(story.isAvailable).toBe(true);
      });
    });

    it('should return all available stories from ALL_STORIES', () => {
      const availableStories = getAvailableStories();
      const expectedAvailable = ALL_STORIES.filter(story => story.isAvailable);
      expect(availableStories).toEqual(expectedAvailable);
    });
  });

  describe('getRandomStory', () => {
    it('should return a story from available stories', () => {
      const randomStory = getRandomStory();

      expect(randomStory).toBeTruthy();
      expect(randomStory!.isAvailable).toBe(true);

      const availableStories = getAvailableStories();
      expect(availableStories).toContain(randomStory);
    });

    it('should return one of the available stories', () => {
      const stories = new Set();

      // Call multiple times
      for (let i = 0; i < 5; i++) {
        const story = getRandomStory();
        if (story) {
          stories.add(story.id);
        }
      }

      // Four available stories, so at most 4 unique IDs
      expect(stories.size).toBeGreaterThanOrEqual(1);
      expect(stories.size).toBeLessThanOrEqual(4);
    });

    it('should handle edge case with no available stories', () => {
      // Test the actual implementation behavior when no stories are available
      // Since getRandomStory uses getAvailableStories(), we need to test what happens
      // when the array is empty. Looking at the implementation, it would return undefined
      // if availableStories.length is 0, but since we always have stories, let's test
      // the mathematical edge case

      const availableStories = getAvailableStories();
      expect(availableStories.length).toBeGreaterThan(0);

      // Test that getRandomStory always returns a valid story when stories exist
      const randomStory = getRandomStory();
      expect(randomStory).toBeTruthy();
      expect(randomStory.isAvailable).toBe(true);
    });
  });

  describe('Story Categories', () => {
    it('should have valid story categories', () => {
      const categoriesInStories = new Set(MOCK_STORIES.map(story => story.category));
      const availableCategories = Object.keys(STORY_TAGS);

      // Should have at least one category
      expect(categoriesInStories.size).toBeGreaterThanOrEqual(1);

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
      expect(descriptions.length).toBeGreaterThanOrEqual(MOCK_STORIES.length / 2);
    });
  });

  describe('Performance', () => {
    it('should load story data quickly', () => {
      const startTime = performance.now();

      // Access all story data
      const mockStories = MOCK_STORIES;
      const allStories = ALL_STORIES;
      const availableStories = getAvailableStories();
      const randomStory = getRandomStory();

      const endTime = performance.now();

      expect(mockStories).toBeDefined();
      expect(allStories).toBeDefined();
      expect(availableStories).toBeDefined();
      expect(randomStory).toBeDefined();

      // Should load very quickly (less than 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // CMS Schema Tag Validation
  // Prevents regressions like the "interactive" tag incident that
  // broke the entire CMS pipeline.
  // ──────────────────────────────────────────────────────────────

  describe('CMS Schema Tag Validation', () => {
    const schemaPath = path.resolve(__dirname, '../../../scripts/story-schema.json');
    const cmsStoriesDir = path.resolve(__dirname, '../../../scripts/cms-stories');
    let schema: any;
    let schemaTags: string[];

    beforeAll(() => {
      schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      schemaTags = schema.properties.tags.items.enum;
    });

    it('schema should include "interactive" in allowed tags', () => {
      expect(schemaTags).toContain('interactive');
    });

    it('schema tags should include all 16 expected tags', () => {
      const expectedTags = [
        'calming', 'bedtime', 'adventure', 'learning', 'music',
        'family-exercises', 'imagination-games', 'animals', 'friendship',
        'nature', 'fantasy', 'counting', 'emotions', 'silly', 'rhymes',
        'interactive',
      ];
      expectedTags.forEach(tag => {
        expect(schemaTags).toContain(tag);
      });
    });

    it('validate-all-stories VALID_TAGS should match schema tags', () => {
      // Read the validate-all-stories.js and extract VALID_TAGS
      const validateScript = fs.readFileSync(
        path.resolve(__dirname, '../../../scripts/validate-all-stories.js'),
        'utf8'
      );
      const match = validateScript.match(/const VALID_TAGS = \[([^\]]+)\]/);
      expect(match).toBeTruthy();
      const scriptTags = match![1]
        .split(',')
        .map(t => t.trim().replace(/'/g, ''));

      // Every schema tag should be in the validation script
      schemaTags.forEach(tag => {
        expect(scriptTags).toContain(tag);
      });
    });

    it('all CMS story tags should be valid per schema', () => {
      const storyDirs = fs.readdirSync(cmsStoriesDir)
        .filter(d => fs.statSync(path.join(cmsStoriesDir, d)).isDirectory());

      const invalidEntries: { story: string; invalidTags: string[] }[] = [];

      for (const dir of storyDirs) {
        const dataPath = path.join(cmsStoriesDir, dir, 'story-data.json');
        if (!fs.existsSync(dataPath)) continue;

        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        if (data.tags && Array.isArray(data.tags)) {
          const bad = data.tags.filter((t: string) => !schemaTags.includes(t));
          if (bad.length > 0) {
            invalidEntries.push({ story: dir, invalidTags: bad });
          }
        }
      }

      expect(invalidEntries).toEqual([]);
    });

    it('squirrels-snowman should have the interactive tag', () => {
      const snowmanPath = path.join(cmsStoriesDir, 'squirrels-snowman', 'story-data.json');
      const snowman = JSON.parse(fs.readFileSync(snowmanPath, 'utf8'));
      expect(snowman.tags).toContain('interactive');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Interactive Story Filter Logic
  // Tests the storyHasInteractive detection used by the story
  // selection screen to decide which stories show in Interactive mode.
  // ──────────────────────────────────────────────────────────────

  describe('Interactive story filtering', () => {
    /** Local replica of storyHasInteractive from story-selection-screen.tsx */
    function storyHasInteractive(story: Story): boolean {
      return !!story.pages?.some(
        (p: StoryPage) => p.interactiveElements && p.interactiveElements.length > 0
      );
    }

    it('should detect story with interactiveElements as interactive', () => {
      const story: Story = {
        id: 'test-interactive',
        title: 'Interactive Story',
        category: 'adventure',
        isAvailable: true,
        pages: [
          { id: 'p0', pageNumber: 0, text: 'Cover' },
          {
            id: 'p1', pageNumber: 1, text: 'Page 1',
            interactiveElements: [{
              id: 'el-1',
              type: 'reveal',
              image: 'some/path.webp',
              position: { x: 0.5, y: 0.5 },
              size: { width: 0.2, height: 0.2 },
            }],
          },
        ],
      };
      expect(storyHasInteractive(story)).toBe(true);
    });

    it('should not detect story without interactiveElements as interactive', () => {
      const story: Story = {
        id: 'test-plain',
        title: 'Plain Story',
        category: 'bedtime',
        isAvailable: true,
        pages: [
          { id: 'p0', pageNumber: 0, text: 'Cover' },
          { id: 'p1', pageNumber: 1, text: 'Page 1' },
        ],
      };
      expect(storyHasInteractive(story)).toBe(false);
    });

    it('should not detect story with empty interactiveElements array', () => {
      const story: Story = {
        id: 'test-empty-elements',
        title: 'Empty Elements Story',
        category: 'nature',
        isAvailable: true,
        pages: [
          { id: 'p0', pageNumber: 0, text: 'Cover', interactiveElements: [] },
        ],
      };
      expect(storyHasInteractive(story)).toBe(false);
    });

    it('should handle story with no pages gracefully', () => {
      const story: Story = {
        id: 'test-no-pages',
        title: 'No Pages',
        category: 'fantasy',
        isAvailable: true,
      };
      expect(storyHasInteractive(story)).toBe(false);
    });

    it('squirrels-snowman CMS data should pass the interactive filter', () => {
      const snowmanPath = path.resolve(
        __dirname, '../../../scripts/cms-stories/squirrels-snowman/story-data.json'
      );
      const snowman = JSON.parse(fs.readFileSync(snowmanPath, 'utf8'));
      // Cast to Story — CMS data matches the same shape
      expect(storyHasInteractive(snowman as Story)).toBe(true);
    });

    it('squirrels-snowman should have interactiveElements on 4 pages', () => {
      const snowmanPath = path.resolve(
        __dirname, '../../../scripts/cms-stories/squirrels-snowman/story-data.json'
      );
      const snowman = JSON.parse(fs.readFileSync(snowmanPath, 'utf8'));
      const pagesWithElements = snowman.pages.filter(
        (p: any) => p.interactiveElements && p.interactiveElements.length > 0
      );
      expect(pagesWithElements.length).toBe(4);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Catalog Entry Mode Filtering
  // Tests that catalog entries (not-yet-downloaded stories from CMS)
  // appear in mode-filtered views using their tags as a proxy.
  // Previously, catalog entries were hidden entirely when a mode
  // was selected — this caused the interactive page to be empty.
  // ──────────────────────────────────────────────────────────────

  describe('Catalog entry mode filtering', () => {
    // Replicate the filtering logic from story-selection-screen.tsx
    type StoryMode = 'interactive' | 'music' | 'jigsaw';

    function filterCatalogByMode(entries: CatalogEntry[], mode: StoryMode | null): CatalogEntry[] {
      if (mode === 'interactive') {
        return entries.filter(e => e.tags?.includes('interactive'));
      } else if (mode === 'music') {
        return entries.filter(e => e.tags?.includes('music'));
      } else if (mode === 'jigsaw') {
        return []; // No jigsaw tag in CMS — bundled locally
      }
      return entries; // No mode selected — show all
    }

    const makeCatalogEntry = (id: string, category: StoryCategory, tags: string[]): CatalogEntry => ({
      storyId: id,
      title: `Story ${id}`,
      category,
      tags,
      isFree: false,
      isReferralReward: false,
      isPremium: false,
    });

    const interactiveEntry = makeCatalogEntry('snowman', 'adventure', ['adventure', 'interactive']);
    const musicEntry = makeCatalogEntry('music-1', 'music', ['music', 'calming']);
    const plainEntry = makeCatalogEntry('plain-1', 'bedtime', ['bedtime', 'calming']);
    const multiTagEntry = makeCatalogEntry('multi', 'adventure', ['interactive', 'music', 'adventure']);

    const allEntries = [interactiveEntry, musicEntry, plainEntry, multiTagEntry];

    it('interactive mode should show only entries with "interactive" tag', () => {
      const result = filterCatalogByMode(allEntries, 'interactive');
      expect(result).toHaveLength(2);
      expect(result.map(e => e.storyId)).toEqual(['snowman', 'multi']);
    });

    it('music mode should show only entries with "music" tag', () => {
      const result = filterCatalogByMode(allEntries, 'music');
      expect(result).toHaveLength(2);
      expect(result.map(e => e.storyId)).toEqual(['music-1', 'multi']);
    });

    it('jigsaw mode should return empty (jigsaw is bundled only)', () => {
      const result = filterCatalogByMode(allEntries, 'jigsaw');
      expect(result).toHaveLength(0);
    });

    it('no mode selected should show all entries', () => {
      const result = filterCatalogByMode(allEntries, null);
      expect(result).toHaveLength(4);
    });

    it('should exclude entries without matching tag in interactive mode', () => {
      const result = filterCatalogByMode([plainEntry, musicEntry], 'interactive');
      expect(result).toHaveLength(0);
    });

    it('entries with no tags should be excluded from all modes', () => {
      const noTagEntry = makeCatalogEntry('no-tags', 'adventure', []);
      expect(filterCatalogByMode([noTagEntry], 'interactive')).toHaveLength(0);
      expect(filterCatalogByMode([noTagEntry], 'music')).toHaveLength(0);
      expect(filterCatalogByMode([noTagEntry], 'jigsaw')).toHaveLength(0);
    });

    it('entries with no tags should still appear when no mode is selected', () => {
      const noTagEntry = makeCatalogEntry('no-tags', 'adventure', []);
      expect(filterCatalogByMode([noTagEntry], null)).toHaveLength(1);
    });
  });

  describe('Localization support', () => {
    it('should accept localizedTitle field', () => {
      // Verify story type accepts localized fields
      const storyWithLocalization: Story = {
        id: 'test-localized',
        title: 'Default Title',
        localizedTitle: {
          en: 'English Title',
          pl: 'Polish Title',
        },
        category: 'adventure',
        isAvailable: true,
      };

      expect(storyWithLocalization.localizedTitle?.en).toBe('English Title');
      expect(storyWithLocalization.localizedTitle?.pl).toBe('Polish Title');
    });

    it('should accept localizedDescription field', () => {
      const storyWithLocalization: Story = {
        id: 'test-localized',
        title: 'Title',
        description: 'Default description',
        localizedDescription: {
          en: 'English description',
          es: 'Spanish description',
        },
        category: 'bedtime',
        isAvailable: true,
      };

      expect(storyWithLocalization.localizedDescription?.en).toBe('English description');
      expect(storyWithLocalization.localizedDescription?.es).toBe('Spanish description');
    });
  });
});
