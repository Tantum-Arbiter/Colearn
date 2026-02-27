#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load all translation dictionaries
const TRANS1 = require('./translation-dictionary.js');
const TRANS2 = require('./translation-dictionary-part2.js');
const TRANS3 = require('./translation-dictionary-part3.js');
const TRANS4 = require('./translation-dictionary-part4.js');
const TRANS5 = require('./translation-dictionary-part5.js');
const TRANS6 = require('./translation-dictionary-part6.js');
const TRANS7 = require('./translation-dictionary-part7.js');
const TRANS8 = require('./translation-dictionary-part8.js');

// Merge all translations
const TRANSLATIONS = {
  ...TRANS1,
  ...TRANS2,
  ...TRANS3,
  ...TRANS4,
  ...TRANS5,
  ...TRANS6,
  ...TRANS7,
  ...TRANS8
};

console.log(`📚 Loaded ${Object.keys(TRANSLATIONS).length} translation entries\n`);

// Process all stories
const cmsStoriesDir = path.join(__dirname, 'cms-stories');
const storyDirs = fs.readdirSync(cmsStoriesDir).filter(f => 
  fs.statSync(path.join(cmsStoriesDir, f)).isDirectory()
);

let totalUpdated = 0;
let totalPages = 0;

storyDirs.forEach(storyDir => {
  const jsonPath = path.join(cmsStoriesDir, storyDir, 'story-data.json');
  if (!fs.existsSync(jsonPath)) return;

  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let modified = false;

    data.pages.forEach(page => {
      if (page.text) {
        // Try exact match first, then try without trailing newline
        let translations = TRANSLATIONS[page.text];
        if (!translations && page.text.endsWith('\n')) {
          translations = TRANSLATIONS[page.text.slice(0, -1)];
        }

        if (translations) {
          totalPages++;
          if (!page.localizedText) {
            page.localizedText = {};
          }

          Object.keys(translations).forEach(lang => {
            // Add newline to translation if original text has it
            let translatedText = translations[lang];
            if (page.text.endsWith('\n') && !translatedText.endsWith('\n')) {
              translatedText = translatedText + '\n';
            }

            if (page.localizedText[lang] !== translatedText) {
              page.localizedText[lang] = translatedText;
              modified = true;
            }
          });

          if (!page.localizedText.en) {
            page.localizedText.en = page.text;
            modified = true;
          }
        }
      }
    });
    
    if (modified) {
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`✅ Updated: ${storyDir}`);
      totalUpdated++;
    }
  } catch (e) {
    console.error(`❌ Error processing ${storyDir}:`, e.message);
  }
});

console.log(`\n✨ Complete! Updated ${totalUpdated} stories with ${totalPages} translated pages.`);

