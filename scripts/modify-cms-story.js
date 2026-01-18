#!/usr/bin/env node

/**
 * Modify a CMS story for delta sync testing
 *
 * Usage:
 *   node modify-cms-story.js                    # Apply test modification
 *   node modify-cms-story.js --revert           # Revert to original
 *   node modify-cms-story.js --check            # Check current state
 *
 * This script modifies cms-test-9-snowman-squirrel to test delta sync:
 * - Updates page 1 text from "Squirrel puts her boots on" to "nico says hi"
 *
 * After running this, trigger CMS sync and verify only 1 story is synced.
 */

const fs = require('fs');
const path = require('path');

const STORY_ID = 'cms-test-9-snowman-squirrel';
const STORY_PATH = path.join(__dirname, 'cms-stories', STORY_ID, 'story-data.json');

// Original values (for reverting)
const ORIGINAL = {
  title: 'CMS Test 9 - Snowman Squirrel',
  localizedTitle: {
    en: 'Snowman Squirrel',
    pl: 'Wiewiórka i Bałwan',
    es: 'La Ardilla y el Muñeco de Nieve',
    de: 'Das Eichhörnchen und der Schneemann'
  },
  page1Text: 'Squirrel puts her boots on.\nHer hat is on her head.',
  page1LocalizedText: {
    en: 'Squirrel puts her boots on.\nHer hat is on her head.',
    pl: 'Wiewiórka zakłada buty.\nCzapka jest na jej głowie.',
    es: 'La ardilla se pone las botas.\nSu sombrero está en su cabeza.',
    de: 'Das Eichhörnchen zieht seine Stiefel an.\nSein Hut ist auf dem Kopf.'
  }
};

function loadStory() {
  if (!fs.existsSync(STORY_PATH)) {
    console.error(`❌ Story not found: ${STORY_PATH}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(STORY_PATH, 'utf8'));
}

function saveStory(story) {
  fs.writeFileSync(STORY_PATH, JSON.stringify(story, null, 2) + '\n');
}

function checkState() {
  const story = loadStory();
  const isModified = story.pages[1]?.text !== ORIGINAL.page1Text;

  console.log(`\n📖 Story: ${STORY_ID}`);
  console.log(`   Title: ${story.title}`);
  console.log(`   Page 1: ${story.pages[1]?.text}`);
  console.log(`   State: ${isModified ? '🔧 MODIFIED (nico says hi)' : '✅ ORIGINAL (Squirrel puts her boots on)'}`);

  return isModified;
}

function applyModification() {
  const story = loadStory();

  // Modify page 1 text - change first line to "nico says hi"
  story.pages[1].text = 'nico says hi\nHer hat is on her head.';
  story.pages[1].localizedText = {
    en: 'nico says hi\nHer hat is on her head.',
    pl: 'nico mówi cześć\nCzapka jest na jej głowie.',
    es: 'nico dice hola\nSu sombrero está en su cabeza.',
    de: 'nico sagt hallo\nSein Hut ist auf dem Kopf.'
  };

  // Bump version
  story.version = (story.version || 1) + 1;

  saveStory(story);

  console.log(`\n✅ Modified story: ${STORY_ID}`);
  console.log(`   Page 1 text: ${story.pages[1].text}`);
  console.log(`   New version: ${story.version}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Upload to Firestore: FIRESTORE_EMULATOR_HOST=localhost:8082 FIREBASE_PROJECT_ID=grow-with-freya-dev UPLOAD_MODE=cms-only node upload-stories-to-firestore.js`);
  console.log(`   2. Log out and log in from app`);
  console.log(`   3. Check gateway logs - should see only 1 story synced (cms-test-9-snowman-squirrel)`);
}

function revertModification() {
  const story = loadStory();
  
  // Restore original values
  story.title = ORIGINAL.title;
  story.localizedTitle = ORIGINAL.localizedTitle;
  story.pages[1].text = ORIGINAL.page1Text;
  story.pages[1].localizedText = ORIGINAL.page1LocalizedText;
  
  saveStory(story);
  
  console.log(`\n✅ Reverted story: ${STORY_ID}`);
  console.log(`   Title: ${story.title}`);
}

// Main
const args = process.argv.slice(2);

if (args.includes('--check')) {
  checkState();
} else if (args.includes('--revert')) {
  revertModification();
  checkState();
} else {
  applyModification();
}

