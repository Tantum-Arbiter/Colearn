#!/usr/bin/env node

/**
 * Update story-data.json files to include interactiveElements
 * with correctly prefixed prop file paths
 */

const fs = require('fs');
const path = require('path');

const CMS_STORIES_DIR = path.join(__dirname, 'cms-stories');

// Interactive elements configuration (from squirrels-snowman reference)
const INTERACTIVE_CONFIG = {
  2: {
    id: 'door',
    type: 'reveal',
    propFile: 'door-open.webp',
    position: { x: 0.481, y: 0.337 },
    size: { width: 0.273, height: 0.301 }
  },
  4: {
    id: 'basket',
    type: 'reveal',
    propFile: 'page-4-basket-open.webp',
    position: { x: 0.633, y: 0.637 },
    size: { width: 0.245, height: 0.308 }
  },
  6: {
    id: 'basket',
    type: 'reveal',
    propFile: 'page-6-basket-open.webp',
    position: { x: 0.471, y: 0.579 },
    size: { width: 0.396, height: 0.366 }
  },
  8: {
    id: 'food-cover',
    type: 'reveal',
    propFile: 'page-8-food-cover-open.webp',
    position: { x: 0.335, y: 0.609 },
    size: { width: 0.287, height: 0.213 }
  },
  10: {
    id: 'curtains',
    type: 'reveal',
    propFile: 'page-10-curtains-open.webp',
    position: { x: 0.373, y: 0.380 },
    size: { width: 0.601, height: 0.387 }
  }
};

// Get all story directories
const storyDirs = fs.readdirSync(CMS_STORIES_DIR).filter(name => {
  const fullPath = path.join(CMS_STORIES_DIR, name);
  return fs.statSync(fullPath).isDirectory() && name.startsWith('cms-test-');
});

console.log(`Found ${storyDirs.length} CMS test stories to process...\n`);

for (const storyId of storyDirs) {
  const storyDir = path.join(CMS_STORIES_DIR, storyId);
  const jsonPath = path.join(storyDir, 'story-data.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.log(`Skipping ${storyId}: no story-data.json found`);
    continue;
  }
  
  const storyData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let modified = false;
  
  // Process each page
  for (const page of storyData.pages || []) {
    const pageNum = page.pageNumber;
    const config = INTERACTIVE_CONFIG[pageNum];
    
    if (config) {
      // Check if prop file exists
      const propsDir = path.join(storyDir, `page-${pageNum}`, 'props');
      const propFilename = `${storyId}-${config.propFile}`;
      const propPath = path.join(propsDir, propFilename);
      
      if (fs.existsSync(propPath)) {
        // Add interactive element with prefixed path
        const imagePath = `assets/stories/${storyId}/page-${pageNum}/props/${propFilename}`;
        
        page.interactiveElements = [
          {
            id: config.id,
            type: config.type,
            image: imagePath,
            position: config.position,
            size: config.size
          }
        ];
        modified = true;
      } else {
        console.log(`  Warning: Prop file not found: ${propPath}`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(jsonPath, JSON.stringify(storyData, null, 2) + '\n');
    console.log(`Updated: ${storyId}/story-data.json`);
  }
}

console.log('\nDone updating story-data.json files with interactiveElements.');

