#!/usr/bin/env node

/**
 * Upload asset checksums to Firestore
 * 
 * This script:
 * 1. Lists all assets in the GCS bucket
 * 2. Reads MD5 checksums from GCS object metadata (no file downloads)
 * 3. Updates Firestore asset_versions/current with checksums
 * 
 * Usage:
 *   node upload-assets-to-firestore.js
 * 
 * Environment variables:
 *   GCP_SA_KEY - GCP service account key (JSON)
 *   FIREBASE_PROJECT_ID - Firebase project ID
 */

const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

// Parse GCP service account key
let gcpKey;
try {
  const gcpKeyStr = process.env.GCP_SA_KEY;
  if (!gcpKeyStr) {
    console.error('Error: GCP_SA_KEY environment variable is required');
    process.exit(1);
  }

  // Try base64 decode first
  try {
    const decoded = Buffer.from(gcpKeyStr, 'base64').toString('utf8');
    gcpKey = JSON.parse(decoded);
  } catch {
    // Fall back to raw JSON
    gcpKey = JSON.parse(gcpKeyStr);
  }
} catch (error) {
  console.error('Error: GCP_SA_KEY is not valid JSON or base64:', error.message);
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('Error: FIREBASE_PROJECT_ID environment variable is required');
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(gcpKey),
  projectId: projectId,
});

const firestore = admin.firestore();
const storage = new Storage({
  projectId: projectId,
  credentials: gcpKey
});

/**
 * List all assets in the GCS bucket and read checksums from GCS object metadata.
 *
 * GCS automatically computes and stores an MD5 hash for every uploaded object.
 * We read this from file.metadata.md5Hash instead of downloading the entire file,
 * which scales to thousands of assets without downloading gigabytes of data.
 */
async function getAssetChecksums() {
  console.log('Listing assets from GCS bucket (using metadata checksums)...');

  const bucket = storage.bucket('colearnwithfreya-assets');
  const assetChecksums = {};
  let totalAssets = 0;
  let totalSizeBytes = 0;

  try {
    const [files] = await bucket.getFiles({ prefix: 'stories/' });

    console.log(`Found ${files.length} objects in bucket`);

    for (const file of files) {
      try {
        // Skip directory markers (zero-byte objects ending with /)
        if (file.name.endsWith('/')) continue;

        const path = file.name;
        const size = parseInt(file.metadata.size, 10) || 0;

        // Use GCS's built-in MD5 hash from object metadata (no file download needed)
        const md5Hash = file.metadata.md5Hash;
        if (!md5Hash) {
          console.warn(`  ⚠️  No md5Hash for ${path}, skipping`);
          continue;
        }

        // GCS returns md5Hash as base64 — convert to hex for consistency
        const checksum = Buffer.from(md5Hash, 'base64').toString('hex');

        assetChecksums[path] = checksum;
        totalAssets++;
        totalSizeBytes += size;

        if (totalAssets % 50 === 0) {
          console.log(`  Processed ${totalAssets} assets...`);
        }
      } catch (error) {
        console.error(`Error processing asset ${file.name}:`, error.message);
      }
    }

    console.log(`\nProcessed ${totalAssets} assets total (zero bytes downloaded)`);
    return { assetChecksums, totalAssets, totalSizeBytes };
  } catch (error) {
    console.error('Error listing assets from bucket:', error);
    throw error;
  }
}

/**
 * Update Firestore with asset checksums
 * Increments version number on each update for proper delta-sync
 */
async function updateAssetVersion(assetChecksums, totalAssets, totalSizeBytes) {
  console.log('\nUpdating Firestore asset_versions/current...');

  try {
    // Read current version to increment it
    const currentDoc = await firestore.collection('asset_versions').doc('current').get();
    const currentVersion = currentDoc.exists ? (currentDoc.data().version || 0) : 0;
    const newVersion = currentVersion + 1;

    const assetVersion = {
      id: 'current',
      version: newVersion,
      lastUpdated: admin.firestore.Timestamp.now(),
      assetChecksums: assetChecksums,
      totalAssets: totalAssets,
      totalSizeBytes: totalSizeBytes,
    };

    await firestore.collection('asset_versions').doc('current').set(assetVersion);
    console.log('✓ Asset version updated successfully');
    console.log(`  - Total assets: ${totalAssets}`);
    console.log(`  - Total size: ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Version: ${currentVersion} → ${newVersion}`);
  } catch (error) {
    console.error('Error updating asset version:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting asset checksum upload...\n');
    
    const { assetChecksums, totalAssets, totalSizeBytes } = await getAssetChecksums();
    await updateAssetVersion(assetChecksums, totalAssets, totalSizeBytes);
    
    console.log('\n✓ Asset upload complete');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Asset upload failed:', error);
    process.exit(1);
  }
}

main();

