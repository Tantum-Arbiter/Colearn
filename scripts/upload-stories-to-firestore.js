#!/usr/bin/env node

/**
 * Upload story metadata to Firestore
 * Reads story-data.json files from grow-with-freya/assets/stories/
 * and uploads them to Firestore with version tracking
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const BUNDLED_STORIES_DIR = path.join(__dirname, '../grow-with-freya/assets/stories');
const CMS_STORIES_DIR = path.join(__dirname, 'cms-stories');
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'apt-icon-472307-b7';
const UPLOAD_MODE = process.env.UPLOAD_MODE || 'cms-only'; // 'cms-only', 'bundled', or 'all'

// Initialize Firebase Admin
if (!SERVICE_ACCOUNT_PATH) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY_PATH environment variable not set');
  console.log('Usage: FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/key.json node upload-stories-to-firestore.js');
  process.exit(1);
}

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ Error: Service account key file not found: ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: PROJECT_ID
});

const db = admin.firestore();

/**
 * Calculate SHA-256 checksum of story content
 */
function calculateStoryChecksum(story) {
  const content = [
    story.id,
    story.title,
    story.category,
    story.description || '',
    story.version || 1,
    ...story.pages.map(p => `${p.id}${p.text}${p.pageNumber}`)
  ].join('');

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Read all story-data.json files from a directory
 */
function readStoryFilesFromDir(storiesDir) {
  const stories = [];

  if (!fs.existsSync(storiesDir)) {
    console.log(`⚠️  Directory not found: ${storiesDir}`);
    return stories;
  }

  const storyDirs = fs.readdirSync(storiesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const storyDir of storyDirs) {
    const storyDataPath = path.join(storiesDir, storyDir, 'story-data.json');

    if (fs.existsSync(storyDataPath)) {
      try {
        const storyData = JSON.parse(fs.readFileSync(storyDataPath, 'utf8'));

        // Add metadata
        storyData.createdAt = admin.firestore.Timestamp.now();
        storyData.updatedAt = admin.firestore.Timestamp.now();
        storyData.version = storyData.version || 1;
        storyData.isPremium = storyData.isPremium || false;
        storyData.author = storyData.author || 'Grow with Freya';
        storyData.tags = storyData.tags || [];
        
        // Calculate checksum
        storyData.checksum = calculateStoryChecksum(storyData);
        
        stories.push(storyData);
        console.log(`✅ Loaded story: ${storyData.id} (${storyData.pages.length} pages)`);
      } catch (error) {
        console.error(`❌ Error reading ${storyDataPath}:`, error.message);
      }
    }
  }

  return stories;
}

/**
 * Upload stories to Firestore
 */
async function uploadStories(stories) {
  console.log(`\n📤 Uploading ${stories.length} stories to Firestore...`);

  const batch = db.batch();
  const storyChecksums = {};

  for (const story of stories) {
    const storyRef = db.collection('stories').doc(story.id);
    batch.set(storyRef, story);
    storyChecksums[story.id] = story.checksum;
    console.log(`  ➡️  ${story.id}: ${story.title}`);
  }

  // Commit batch
  await batch.commit();
  console.log(`✅ Successfully uploaded ${stories.length} stories`);

  return storyChecksums;
}

/**
 * Update content version document
 */
async function updateContentVersion(storyChecksums) {
  console.log('\n📝 Updating content version...');

  const versionRef = db.collection('content_versions').doc('current');
  const versionDoc = await versionRef.get();

  let version = 1;
  if (versionDoc.exists) {
    version = (versionDoc.data().version || 0) + 1;
  }

  const contentVersion = {
    id: 'current',
    version: version,
    lastUpdated: admin.firestore.Timestamp.now(),
    storyChecksums: storyChecksums,
    totalStories: Object.keys(storyChecksums).length
  };

  await versionRef.set(contentVersion);
  console.log(`✅ Content version updated to v${version} (${contentVersion.totalStories} stories)`);

  return contentVersion;
}

/**
 * Read story files based on upload mode
 */
function readStoryFiles() {
  let stories = [];

  if (UPLOAD_MODE === 'cms-only') {
    console.log('📦 Mode: CMS-only stories (premium content)');
    stories = readStoryFilesFromDir(CMS_STORIES_DIR);
  } else if (UPLOAD_MODE === 'bundled') {
    console.log('📦 Mode: Bundled stories (app bundle)');
    stories = readStoryFilesFromDir(BUNDLED_STORIES_DIR);
  } else if (UPLOAD_MODE === 'all') {
    console.log('📦 Mode: All stories (bundled + CMS)');
    const bundled = readStoryFilesFromDir(BUNDLED_STORIES_DIR);
    const cms = readStoryFilesFromDir(CMS_STORIES_DIR);
    stories = [...bundled, ...cms];
  } else {
    console.error(`❌ Invalid UPLOAD_MODE: ${UPLOAD_MODE}`);
    console.log('Valid modes: cms-only, bundled, all');
    process.exit(1);
  }

  return stories;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Story Metadata Upload Script');
  console.log('================================\n');
  console.log(`📁 Bundled stories: ${BUNDLED_STORIES_DIR}`);
  console.log(`📁 CMS stories: ${CMS_STORIES_DIR}`);
  console.log(`🔥 Firebase project: ${PROJECT_ID}\n`);

  try {
    // Read story files
    const stories = readStoryFiles();

    if (stories.length === 0) {
      console.log('⚠️  No stories found to upload');
      process.exit(0);
    }

    // Upload to Firestore
    const storyChecksums = await uploadStories(stories);

    // Update content version
    const contentVersion = await updateContentVersion(storyChecksums);

    console.log('\n✨ Upload complete!');
    console.log(`   Mode: ${UPLOAD_MODE}`);
    console.log(`   Version: ${contentVersion.version}`);
    console.log(`   Stories: ${contentVersion.totalStories}`);
    console.log(`   Timestamp: ${contentVersion.lastUpdated.toDate().toISOString()}`);

  } catch (error) {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

main();

