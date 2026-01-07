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
const SERVICE_ACCOUNT_JSON = process.env.GCP_SA_KEY; // Base64 or raw JSON for CI
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'apt-icon-472307-b7';
const UPLOAD_MODE = process.env.UPLOAD_MODE || 'cms-only'; // 'cms-only', 'bundled', or 'all'
const DRY_RUN = process.env.DRY_RUN === 'true';
const FORCE_UPLOAD = process.env.FORCE_UPLOAD === 'true'; // Force re-upload all stories, ignoring checksums

// Initialize Firebase Admin
function getServiceAccountCredentials() {
  // Option 1: Base64-encoded JSON (for CI/CD)
  if (SERVICE_ACCOUNT_JSON) {
    try {
      // Try base64 decode first
      const decoded = Buffer.from(SERVICE_ACCOUNT_JSON, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch {
      // Fall back to raw JSON
      try {
        return JSON.parse(SERVICE_ACCOUNT_JSON);
      } catch (e) {
        console.error('❌ Error: GCP_SA_KEY is not valid JSON or base64');
        process.exit(1);
      }
    }
  }

  // Option 2: File path (for local development)
  if (SERVICE_ACCOUNT_PATH) {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      console.error(`❌ Error: Service account key file not found: ${SERVICE_ACCOUNT_PATH}`);
      process.exit(1);
    }
    return require(SERVICE_ACCOUNT_PATH);
  }

  console.error('❌ Error: No service account credentials provided');
  console.log('Usage:');
  console.log('  Local: FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/key.json node upload-stories-to-firestore.js');
  console.log('  CI/CD: GCP_SA_KEY=<base64-json> node upload-stories-to-firestore.js');
  process.exit(1);
}

const serviceAccount = getServiceAccountCredentials();

// Log which service account is being used (for debugging)
console.log(`🔐 Using service account: ${serviceAccount.client_email}`);
console.log(`📁 Project ID: ${PROJECT_ID}`);

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
    ...story.pages.map(p => {
      // Include interactive elements in checksum
      const interactiveStr = p.interactiveElements
        ? JSON.stringify(p.interactiveElements)
        : '';
      return `${p.id}${p.text}${p.pageNumber}${p.backgroundImage || ''}${interactiveStr}`;
    })
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
 * Get current checksums from Firestore for delta comparison
 */
async function getCurrentChecksums() {
  try {
    const versionRef = db.collection('content_versions').doc('current');
    const versionDoc = await versionRef.get();

    if (versionDoc.exists && versionDoc.data().storyChecksums) {
      return versionDoc.data().storyChecksums;
    }
  } catch (error) {
    console.log('Could not fetch current checksums, will upload all stories');
  }
  return {};
}

/**
 * Upload stories to Firestore (delta-sync: only upload changed stories)
 */
async function uploadStories(stories) {
  console.log(`\n📊 Checking ${stories.length} stories for changes...`);

  if (FORCE_UPLOAD) {
    console.log('  ⚠️  FORCE_UPLOAD enabled - uploading all stories regardless of checksums');
  }

  const currentChecksums = FORCE_UPLOAD ? {} : await getCurrentChecksums();
  const storyChecksums = {};
  const changedStories = [];
  const unchangedStories = [];

  for (const story of stories) {
    storyChecksums[story.id] = story.checksum;

    if (currentChecksums[story.id] === story.checksum) {
      unchangedStories.push(story);
    } else {
      changedStories.push(story);
    }
  }

  console.log(`  ✅ ${unchangedStories.length} unchanged (skipping)`);
  console.log(`  📝 ${changedStories.length} new/changed (uploading)`);

  if (changedStories.length === 0) {
    console.log('\n✨ No changes detected - nothing to upload!');
    return storyChecksums;
  }

  if (DRY_RUN) {
    console.log(`\n🔍 [DRY RUN] Would upload ${changedStories.length} stories:`);
    for (const story of changedStories) {
      const isNew = !currentChecksums[story.id];
      console.log(`  🔍 ${story.id}: ${story.title} (${isNew ? 'NEW' : 'CHANGED'})`);
    }
  } else {
    console.log(`\n📤 Uploading ${changedStories.length} changed stories...`);

    const batch = db.batch();
    for (const story of changedStories) {
      const storyRef = db.collection('stories').doc(story.id);
      batch.set(storyRef, story);
      const isNew = !currentChecksums[story.id];
      console.log(`  ➡️  ${story.id}: ${story.title} (${isNew ? 'NEW' : 'CHANGED'})`);
    }

    await batch.commit();
    console.log(`✅ Successfully uploaded ${changedStories.length} stories`);
    console.log(`💰 Saved ${unchangedStories.length} writes (delta-sync)`);
  }

  return storyChecksums;
}

/**
 * Delete stories that exist in Firestore but not in source files
 * Returns the list of deleted story IDs
 */
async function deleteOrphanedStories(validStoryIds) {
  console.log('\n🗑️  Checking for orphaned stories to delete...');

  const existingDocs = await db.collection('stories').listDocuments();
  const existingIds = existingDocs.map(doc => doc.id);
  const orphanedIds = existingIds.filter(id => !validStoryIds.includes(id));

  if (orphanedIds.length === 0) {
    console.log('  ✅ No orphaned stories found');
    return [];
  }

  console.log(`  ⚠️  Found ${orphanedIds.length} orphaned stories to delete:`);
  for (const id of orphanedIds) {
    console.log(`    🗑️  ${id}`);
  }

  if (DRY_RUN) {
    console.log('  🔍 [DRY RUN] Would delete above stories');
    return orphanedIds;
  }

  // Delete in batches
  const batch = db.batch();
  for (const id of orphanedIds) {
    batch.delete(db.collection('stories').doc(id));
  }
  await batch.commit();

  console.log(`  ✅ Deleted ${orphanedIds.length} orphaned stories`);
  return orphanedIds;
}

/**
 * Update content version document
 * Replaces checksums entirely to ensure orphaned stories are removed
 */
async function updateContentVersion(storyChecksums) {
  if (DRY_RUN) {
    console.log('\n🔍 [DRY RUN] Would update content version...');
    return { version: 0, totalStories: Object.keys(storyChecksums).length };
  }

  console.log('\n📝 Updating content version...');

  const versionRef = db.collection('content_versions').doc('current');
  const versionDoc = await versionRef.get();

  let version = 1;
  if (versionDoc.exists) {
    version = (versionDoc.data().version || 0) + 1;
  }

  // Replace checksums entirely (not merge) to ensure orphaned stories are removed
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

    // Delete orphaned stories (stories in Firestore but not in source files)
    const validStoryIds = stories.map(s => s.id);
    const deletedIds = await deleteOrphanedStories(validStoryIds);

    // Update content version (replaces checksums entirely, removing deleted stories)
    const contentVersion = await updateContentVersion(storyChecksums);

    console.log('\n✨ Upload complete!');
    console.log(`   Mode: ${UPLOAD_MODE}`);
    console.log(`   Version: ${contentVersion.version}`);
    console.log(`   Stories: ${contentVersion.totalStories}`);
    if (deletedIds.length > 0) {
      console.log(`   Deleted: ${deletedIds.length} orphaned stories`);
    }
    console.log(`   Timestamp: ${contentVersion.lastUpdated.toDate().toISOString()}`);

  } catch (error) {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

main();

