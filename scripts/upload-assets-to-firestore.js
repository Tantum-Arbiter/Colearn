#!/usr/bin/env node

/**
 * Upload asset checksums to Firestore
 * 
 * This script:
 * 1. Lists all assets in the GCS bucket
 * 2. Calculates SHA-256 checksums for each asset
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
const crypto = require('crypto');

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
 * Calculate SHA-256 checksum of a buffer
 */
function calculateChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * List all assets in the GCS bucket and calculate checksums
 */
async function getAssetChecksums() {
  console.log('Listing assets from GCS bucket...');
  
  const bucket = storage.bucket('colearnwithfreya-assets');
  const assetChecksums = {};
  let totalAssets = 0;
  let totalSizeBytes = 0;

  try {
    const [files] = await bucket.getFiles({ prefix: 'stories/' });
    
    console.log(`Found ${files.length} assets in bucket`);

    for (const file of files) {
      try {
        // Download file content
        const [content] = await file.download();
        
        // Calculate checksum
        const checksum = calculateChecksum(content);
        const path = file.name;
        const size = parseInt(file.metadata.size, 10) || 0;

        assetChecksums[path] = checksum;
        totalAssets++;
        totalSizeBytes += size;

        if (totalAssets % 10 === 0) {
          console.log(`  Processed ${totalAssets} assets...`);
        }
      } catch (error) {
        console.error(`Error processing asset ${file.name}:`, error.message);
      }
    }

    console.log(`\nProcessed ${totalAssets} assets total`);
    return { assetChecksums, totalAssets, totalSizeBytes };
  } catch (error) {
    console.error('Error listing assets from bucket:', error);
    throw error;
  }
}

/**
 * Update Firestore with asset checksums
 */
async function updateAssetVersion(assetChecksums, totalAssets, totalSizeBytes) {
  console.log('\nUpdating Firestore asset_versions/current...');

  const assetVersion = {
    id: 'current',
    version: 1,
    lastUpdated: admin.firestore.Timestamp.now(),
    assetChecksums: assetChecksums,
    totalAssets: totalAssets,
    totalSizeBytes: totalSizeBytes,
  };

  try {
    await firestore.collection('asset_versions').doc('current').set(assetVersion);
    console.log('✓ Asset version updated successfully');
    console.log(`  - Total assets: ${totalAssets}`);
    console.log(`  - Total size: ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Version: ${assetVersion.version}`);
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

