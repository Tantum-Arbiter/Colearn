#!/usr/bin/env node
/**
 * Validate all CMS stories against story-schema.json rules (no external deps).
 */
const fs = require('fs');
const path = require('path');

const VALID_CATEGORIES = ['personalized', 'bedtime', 'adventure', 'nature', 'friendship', 'learning', 'fantasy', 'music', 'activities', 'growing'];
const VALID_TAGS = ['calming', 'bedtime', 'adventure', 'learning', 'music', 'family-exercises', 'imagination-games', 'animals', 'friendship', 'nature', 'fantasy', 'counting', 'emotions', 'silly', 'rhymes'];
const ID_PATTERN = /^[a-z0-9-]+$/;

function validateStory(data, filename) {
  const errs = [];
  if (!data.id || typeof data.id !== 'string') errs.push('missing/invalid id');
  else if (!ID_PATTERN.test(data.id)) errs.push(`id "${data.id}" doesn't match kebab-case pattern`);
  if (!data.title || typeof data.title !== 'string') errs.push('missing/invalid title');
  if (!data.category || !VALID_CATEGORIES.includes(data.category)) errs.push(`invalid category: ${data.category}`);
  if (!Array.isArray(data.pages) || data.pages.length < 1) errs.push('missing/empty pages array');
  else {
    for (let i = 0; i < data.pages.length; i++) {
      const p = data.pages[i];
      if (!p.id || !ID_PATTERN.test(p.id)) errs.push(`page[${i}] invalid id: ${p.id}`);
      if (typeof p.pageNumber !== 'number') errs.push(`page[${i}] missing pageNumber`);
      if (!p.text || typeof p.text !== 'string') errs.push(`page[${i}] missing text`);
    }
  }
  if (data.tags && Array.isArray(data.tags)) {
    const bad = data.tags.filter(t => !VALID_TAGS.includes(t));
    if (bad.length > 0) errs.push(`invalid tags: ${bad.join(', ')}`);
  }
  return errs;
}

const dir = path.join(__dirname, 'cms-stories');
const dirs = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory());

let pass = 0, fail = 0;
const failures = [];
const ids = [];

for (const d of dirs) {
  const f = path.join(dir, d, 'story-data.json');
  if (!fs.existsSync(f)) continue;
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  ids.push(data.id);
  const errs = validateStory(data, d);
  if (errs.length === 0) { pass++; }
  else { fail++; failures.push({ story: d, errs }); }
}

console.log(`\nSchema Validation Results:`);
console.log(`  Pass: ${pass}`);
console.log(`  Fail: ${fail}`);
console.log(`  Total directories: ${dirs.length}`);

if (failures.length > 0) {
  console.log(`\nFirst 10 failures:`);
  failures.slice(0, 10).forEach(e => {
    console.log(`  ${e.story}: ${e.errs.join('; ')}`);
  });
}

// Check duplicate IDs
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log(`\nDuplicate IDs: ${dupes.length > 0 ? dupes.join(', ') : 'None'}`);

// Asset check -verify each story dir has cover images
let missingAssets = 0;
for (const d of dirs) {
  const coverDir = path.join(dir, d, 'cover');
  if (!fs.existsSync(coverDir)) { missingAssets++; continue; }
  const covers = fs.readdirSync(coverDir).filter(f => f.endsWith('.webp'));
  if (covers.length < 2) missingAssets++;
}
console.log(`\nAsset check (cover dir with 2 webp files):`);
console.log(`  OK: ${dirs.length - missingAssets}`);
console.log(`  Missing: ${missingAssets}`);

const exitCode = (fail > 0 || dupes.length > 0) ? 1 : 0;
if (exitCode === 0) console.log('\n✅ All stories valid!\n');
else console.log('\n❌ Validation failed!\n');
process.exit(exitCode);
