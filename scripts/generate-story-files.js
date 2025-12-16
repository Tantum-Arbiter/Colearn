#!/usr/bin/env node

/**
 * Generate story-data.json files for all stories in the catalog
 * - Bundled stories: grow-with-freya/assets/stories/{story-id}/story-data.json
 * - CMS-only stories: scripts/cms-stories/{story-id}/story-data.json
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
    pages.push({
      id: `${storyId}-${i}`,
      pageNumber: i,
      backgroundImage: `assets/stories/${storyId}/page-${i}/background.webp`,
      text: `Page ${i} text goes here...`
    });
  }
  return pages;
}

function generateStoryData(story, isCmsOnly = false) {
  const categoryTag = STORY_TAGS[story.category];
  
  return {
    id: story.id,
    title: story.title,
    category: story.category,
    tag: `${categoryTag.emoji} ${categoryTag.label}`,
    emoji: story.emoji,
    coverImage: `assets/stories/${story.id}/cover/thumbnail.webp`,
    isAvailable: true,
    ageRange: story.ageRange,
    duration: story.duration,
    description: story.description,
    isPremium: story.isPremium || false,
    author: story.author || 'Freya Stories',
    tags: [story.category],
    pages: generateStoryPages(story.id, story.duration)
  };
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeStoryFile(story, isCmsOnly = false) {
  const baseDir = isCmsOnly 
    ? path.join(__dirname, 'cms-stories')
    : path.join(__dirname, '..', 'grow-with-freya', 'assets', 'stories');
  
  const storyDir = path.join(baseDir, story.id);
  ensureDirectoryExists(storyDir);
  
  const storyData = generateStoryData(story, isCmsOnly);
  const filePath = path.join(storyDir, 'story-data.json');
  
  fs.writeFileSync(filePath, JSON.stringify(storyData, null, 2));
  console.log(`✅ Created: ${filePath}`);
}

// Generate bundled stories
console.log('\n📦 Generating bundled story files...\n');
catalog.bundled.forEach(story => {
  writeStoryFile(story, false);
});

// Generate CMS-only stories
console.log('\n☁️  Generating CMS-only story files...\n');
catalog.cms_only.forEach(story => {
  writeStoryFile(story, true);
});

console.log('\n✅ All story files generated successfully!');
console.log(`\n📊 Summary:`);
console.log(`   - Bundled stories: ${catalog.bundled.length}`);
console.log(`   - CMS-only stories: ${catalog.cms_only.length}`);
console.log(`   - Total stories: ${catalog.bundled.length + catalog.cms_only.length}`);
console.log(`\n📁 Locations:`);
console.log(`   - Bundled: grow-with-freya/assets/stories/`);
console.log(`   - CMS-only: scripts/cms-stories/`);

