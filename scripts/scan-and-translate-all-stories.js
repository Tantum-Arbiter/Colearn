#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const cmsStoriesDir = path.join(__dirname, 'cms-stories');

// Step 1: Scan all stories and collect all unique English text
console.log('📚 Scanning all stories for unique English text...\n');

const uniqueTexts = new Set();
const storyDirs = fs.readdirSync(cmsStoriesDir).filter(f => 
  fs.statSync(path.join(cmsStoriesDir, f)).isDirectory()
);

storyDirs.forEach(storyDir => {
  const jsonPath = path.join(cmsStoriesDir, storyDir, 'story-data.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      data.pages.forEach(page => {
        if (page.text && page.text.trim()) {
          uniqueTexts.add(page.text);
        }
      });
    } catch (e) {
      console.error(`Error reading ${storyDir}:`, e.message);
    }
  }
});

console.log(`Found ${uniqueTexts.size} unique text strings\n`);

// Step 2: Check which texts need translations
const textsNeedingTranslations = [];
uniqueTexts.forEach(text => {
  textsNeedingTranslations.push(text);
});

console.log('Texts that need translations:');
textsNeedingTranslations.forEach((text, idx) => {
  console.log(`${idx + 1}. "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
});

console.log('\n✅ Scan complete. Use this list to create translations.');

