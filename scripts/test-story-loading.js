#!/usr/bin/env node
/**
 * Test that the upload script can read and checksum all CMS stories
 * without actually connecting to Firestore.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CMS_STORIES_DIR = path.join(__dirname, 'cms-stories');

function calculateStoryChecksum(story) {
  const serializeLocalized = (obj) => obj ? JSON.stringify(obj) : '';
  const content = [
    story.id, story.title, serializeLocalized(story.localizedTitle),
    story.category, story.description || '', serializeLocalized(story.localizedDescription),
    story.version || 1,
    ...story.pages.map(p => {
      const interactiveStr = p.interactiveElements ? JSON.stringify(p.interactiveElements) : '';
      const musicStr = p.musicChallenge ? JSON.stringify(p.musicChallenge) : '';
      const localizedTextStr = serializeLocalized(p.localizedText);
      return `${p.id}${p.text}${localizedTextStr}${p.pageNumber}${p.backgroundImage || ''}${interactiveStr}${p.interactionType || ''}${musicStr}`;
    })
  ].join('');
  return crypto.createHash('sha256').update(content).digest('hex');
}

const storyDirs = fs.readdirSync(CMS_STORIES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

let loaded = 0, failed = 0;
const checksums = {};

for (const dir of storyDirs) {
  const jsonPath = path.join(CMS_STORIES_DIR, dir, 'story-data.json');
  if (!fs.existsSync(jsonPath)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const checksum = calculateStoryChecksum(data);
    checksums[data.id] = checksum;
    loaded++;
  } catch (e) {
    console.error(`FAIL: ${dir}: ${e.message}`);
    failed++;
  }
}

console.log(`\nStory Loading Test:`);
console.log(`  Loaded: ${loaded}`);
console.log(`  Failed: ${failed}`);
console.log(`  Unique checksums: ${new Set(Object.values(checksums)).size}`);
console.log(`  Would fit in 1 Firestore batch (< 500): ${loaded < 500 ? 'YES' : 'NO - needs chunking'}`);

// Estimate content_versions doc size
const docJson = JSON.stringify({ storyChecksums: checksums });
const docSizeKB = (Buffer.byteLength(docJson, 'utf8') / 1024).toFixed(1);
console.log(`  content_versions doc size: ${docSizeKB} KB (limit: 1024 KB)`);

// Check gsutil rsync file count
let totalAssets = 0;
for (const dir of storyDirs) {
  const dirPath = path.join(CMS_STORIES_DIR, dir);
  const count = countFiles(dirPath);
  totalAssets += count;
}
console.log(`  Total asset files for GCS sync: ${totalAssets}`);
console.log(`\n${failed === 0 ? '✅ Ready for pipeline!' : '❌ Fix failures above'}\n`);

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && !entry.name.endsWith('.json')) count++;
    else if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
  }
  return count;
}
