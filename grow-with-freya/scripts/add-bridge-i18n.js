#!/usr/bin/env node
/**
 * Script to add the bridge i18n section from English to all other locale files.
 * Run from grow-with-freya directory: node scripts/add-bridge-i18n.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');

// Read the bridge block from English file
const enContent = fs.readFileSync(path.join(LOCALES_DIR, 'en', 'index.ts'), 'utf8');
const bridgeStart = enContent.indexOf('  bridge: {');
if (bridgeStart === -1) {
  console.error('Could not find bridge section in English locale');
  process.exit(1);
}

// Extract just the bridge section by tracking braces
const remaining = enContent.substring(bridgeStart);
const lines = remaining.split('\n');
let depth = 0;
let endLine = lines.length;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  depth += (l.match(/{/g) || []).length;
  depth -= (l.match(/}/g) || []).length;
  if (depth === 0 && i > 0) {
    endLine = i + 1;
    break;
  }
}
const bridgeSection = lines.slice(0, endLine).join('\n');
console.log(`Extracted bridge section: ${endLine} lines`);

// Locales to update
const locales = ['ar','da','de','es','fr','it','ja','la','nl','pl','pt','tr','zh'];

locales.forEach(locale => {
  const filePath = path.join(LOCALES_DIR, locale, 'index.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // If bridge already exists, replace it
  if (content.includes('bridge:')) {
    // Find the start of the bridge section and replace everything from there to the closing '};'
    const bridgeStart = content.indexOf('  bridge:');
    if (bridgeStart === -1) {
      console.log(`${locale}: could not find bridge section start, skipping`);
      return;
    }
    // Replace from bridge start to end of file export
    const before = content.substring(0, bridgeStart);
    content = before + bridgeSection + '\n};\n';
    fs.writeFileSync(filePath, content);
    console.log(`${locale}: updated bridge section`);
    return;
  }

  // Find the last '};' which closes the default export
  const lastClose = content.lastIndexOf('};');
  if (lastClose === -1) {
    console.log(`${locale}: could not find closing };`);
    return;
  }

  // Insert the bridge section before the closing };
  const before = content.substring(0, lastClose);
  const after = content.substring(lastClose);
  const newContent = before + bridgeSection + '\n' + after;

  fs.writeFileSync(filePath, newContent);
  console.log(`${locale}: added bridge section (${endLine} lines)`);
});

console.log('Done!');
