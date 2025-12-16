#!/usr/bin/env node

/**
 * Generate TypeScript code for BUNDLED_STORIES constant
 * This creates the code to replace MOCK_STORIES in grow-with-freya/data/stories.ts
 */

const fs = require('fs');
const path = require('path');

const catalog = require('./story-catalog.json');

const STORY_TAGS = {
  bedtime: { emoji: '🌙', label: 'Bedtime' },
  adventure: { emoji: '🗺️', label: 'Adventure' },
  nature: { emoji: '🐢', label: 'Nature' },
  friendship: { emoji: '🤝', label: 'Friendship' },
  learning: { emoji: '📚', label: 'Learning' },
  fantasy: { emoji: '✨', label: 'Fantasy' }
};

function generateStoryPages(storyId, duration) {
  const pages = [];
  for (let i = 1; i <= duration; i++) {
    pages.push(`    {
      id: '${storyId}-${i}',
      pageNumber: ${i},
      text: 'Page ${i} text goes here...'
    }`);
  }
  return pages.join(',\n');
}

function generateStoryCode(story) {
  const categoryTag = STORY_TAGS[story.category];
  
  return `  {
    id: '${story.id}',
    title: '${story.title}',
    category: '${story.category}',
    tag: '${categoryTag.emoji} ${categoryTag.label}',
    emoji: '${story.emoji}',
    coverImage: '', // Placeholder - add actual asset path
    isAvailable: true,
    ageRange: '${story.ageRange}',
    duration: ${story.duration},
    description: '${story.description}',
    pages: [
${generateStoryPages(story.id, story.duration)}
    ]
  }`;
}

// Generate TypeScript code
const storiesCode = catalog.bundled.map(generateStoryCode).join(',\n');

const output = `import { Story } from '@/types/story';

/**
 * Bundled stories - included in the app bundle
 * These stories work offline and don't require CMS sync
 * 
 * Total: ${catalog.bundled.length} stories (3 per genre × 6 genres)
 * - Bedtime: 3 stories
 * - Adventure: 3 stories
 * - Nature: 3 stories
 * - Friendship: 3 stories
 * - Learning: 3 stories
 * - Fantasy: 3 stories
 */
export const BUNDLED_STORIES: Story[] = [
${storiesCode}
];

/**
 * Get bundled stories by category
 */
export function getBundledStoriesByCategory(category: string): Story[] {
  return BUNDLED_STORIES.filter(story => story.category === category);
}

/**
 * Get a bundled story by ID
 */
export function getBundledStoryById(storyId: string): Story | undefined {
  return BUNDLED_STORIES.find(story => story.id === storyId);
}

/**
 * Check if a story is bundled (vs CMS-only)
 */
export function isBundledStory(storyId: string): boolean {
  return BUNDLED_STORIES.some(story => story.id === storyId);
}
`;

// Write to file
const outputPath = path.join(__dirname, '..', 'grow-with-freya', 'data', 'bundled-stories.ts');
fs.writeFileSync(outputPath, output);

console.log(`✅ Generated: ${outputPath}`);
console.log(`📊 Total bundled stories: ${catalog.bundled.length}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Review the generated file`);
console.log(`   2. Add actual asset paths (coverImage, backgroundImage)`);
console.log(`   3. Update story-loader.ts to merge bundled + CMS stories`);

