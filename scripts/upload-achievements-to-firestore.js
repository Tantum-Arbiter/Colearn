#!/usr/bin/env node

/**
 * Upload badge definitions from cms-achievements/ to Firestore.
 *
 * Writes achievement_definitions/{id} for each changed badge and the checksum index
 * content_versions/current.achievementChecksums that delta sync compares against.
 * A dry run unless --apply is passed. Badges removed from the folder stay in Firestore
 * unless --prune is also passed; retire a badge with "status": "retired" instead.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:8082 node upload-achievements-to-firestore.js [--apply] [--prune]
 *   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/key.json node upload-achievements-to-firestore.js [--apply]
 */

const admin = require('firebase-admin');
const path = require('path');
const { pathToFileURL } = require('url');
const { planUpload } = require('./lib/achievement-checksum');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'apt-icon-472307-b7';
const APPLY = process.argv.includes('--apply');
const PRUNE = process.argv.includes('--prune');

function credentials() {
  if (process.env.FIRESTORE_EMULATOR_HOST) return null;
  if (process.env.GCP_SA_KEY) {
    const raw = process.env.GCP_SA_KEY;
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      return JSON.parse(raw);
    }
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) return require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
  console.error('❌ No credentials: set FIRESTORE_EMULATOR_HOST, FIREBASE_SERVICE_ACCOUNT_KEY_PATH or GCP_SA_KEY');
  process.exit(1);
}

async function main() {
  const validator = await import(pathToFileURL(path.join(__dirname, 'cms-manager/src/lib/achievement-validator.js')).href);
  const folder = await validator.validateAchievementFolder();
  if (!folder.valid) {
    for (const result of folder.results.filter((r) => !r.valid)) {
      console.error(`❌ ${result.file}\n   ${result.errors.join('\n   ')}`);
    }
    process.exit(1);
  }

  const account = credentials();
  admin.initializeApp(account ? { credential: admin.credential.cert(account), projectId: PROJECT_ID } : { projectId: PROJECT_ID });
  const db = admin.firestore();
  const versionRef = db.collection('content_versions').doc('current');
  const current = await versionRef.get();
  const remoteChecksums = (current.exists && current.data().achievementChecksums) || {};

  const plan = planUpload(folder.definitions, remoteChecksums, { prune: PRUNE });
  console.log(`${APPLY ? '⬆️ ' : '🔍 Dry run:'} ${plan.writes.length} to write, ${plan.deletes.length} to delete, ${plan.kept.length} kept though not in the folder`);
  plan.writes.forEach((definition) => console.log(`   write  ${definition.id} v${definition.version}`));
  plan.deletes.forEach((id) => console.log(`   delete ${id}`));
  plan.kept.forEach((id) => console.log(`   keep   ${id}`));

  if (!APPLY) {
    console.log('\nNothing written. Pass --apply to upload.');
    return;
  }

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const definition of plan.writes) {
    batch.set(db.collection('achievement_definitions').doc(definition.id), { ...definition, updatedAt: now });
  }
  for (const id of plan.deletes) {
    batch.delete(db.collection('achievement_definitions').doc(id));
  }
  batch.set(versionRef, { achievementChecksums: plan.checksums }, { mergeFields: ['achievementChecksums'] });
  await batch.commit();
  console.log('✅ Badge definitions uploaded');
}

main().catch((error) => {
  console.error('❌ Upload failed:', error.message);
  process.exit(1);
});
