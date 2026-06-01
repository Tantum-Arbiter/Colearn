#!/usr/bin/env node
/**
 * Sync i18n keys: copy missing keys from English locale to all other locales.
 * Missing keys get the English value as a placeholder.
 * 
 * Usage: node scripts/sync-i18n.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const EN_FILE = path.join(LOCALES_DIR, 'en', 'index.ts');

// Read a locale TS file and extract the object literal as a string
function readLocaleFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Parse the TS default export object into a JS object
// We use a simple eval-based approach since these are plain object literals
function parseLocale(content) {
  // Extract everything between `export default {` and the final `};`
  const match = content.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error('Could not parse locale file');
  // Use Function constructor to evaluate the object literal
  const fn = new Function('return ' + match[1]);
  return fn();
}

// Get all leaf keys from an object
function getLeafKeys(obj, prefix = '') {
  const keys = [];
  for (const key of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getLeafKeys(obj[key], p));
    } else {
      keys.push(p);
    }
  }
  return keys;
}

// Get a value from a nested object by dot-separated path
function getByPath(obj, pathStr) {
  return pathStr.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// Set a value in a nested object by dot-separated path, creating intermediate objects
function setByPath(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// Serialize an object back to a TypeScript source string
function serializeToTS(obj, indent = 2) {
  const lines = [];
  function serialize(o, depth) {
    const pad = ' '.repeat(depth * indent);
    const entries = Object.entries(o);
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      // Use identifier or quoted key
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
      if (Array.isArray(val)) {
        // Serialize arrays
        lines.push(`${pad}${safeKey}: [`);
        for (const item of val) {
          if (typeof item === 'string') {
            const esc = item.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            lines.push(`${pad}  '${esc}',`);
          } else {
            lines.push(`${pad}  ${JSON.stringify(item)},`);
          }
        }
        lines.push(`${pad}],`);
      } else if (typeof val === 'object' && val !== null) {
        lines.push(`${pad}${safeKey}: {`);
        serialize(val, depth + 1);
        lines.push(`${pad}},`);
      } else if (typeof val === 'string') {
        // Escape backslashes, single quotes, and newlines
        const escaped = val
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        lines.push(`${pad}${safeKey}: '${escaped}',`);
      } else {
        lines.push(`${pad}${safeKey}: ${JSON.stringify(val)},`);
      }
    }
  }
  lines.push('export default {');
  serialize(obj, 1);
  lines.push('};\n');
  return lines.join('\n');
}

// Main
const enContent = readLocaleFile(EN_FILE);
const enObj = parseLocale(enContent);
const enKeys = getLeafKeys(enObj);

const localeDirs = fs.readdirSync(LOCALES_DIR).filter(d => {
  return d !== 'en' && fs.statSync(path.join(LOCALES_DIR, d)).isDirectory();
});

let totalFixed = 0;

for (const locale of localeDirs) {
  const locFile = path.join(LOCALES_DIR, locale, 'index.ts');
  if (!fs.existsSync(locFile)) continue;
  
  const locContent = readLocaleFile(locFile);
  const locObj = parseLocale(locContent);
  const locKeySet = new Set(getLeafKeys(locObj));
  
  const missing = enKeys.filter(k => !locKeySet.has(k));
  
  if (missing.length === 0) {
    console.log(`${locale}: ✓ all keys present`);
    continue;
  }
  
  console.log(`${locale}: adding ${missing.length} missing keys...`);
  
  for (const key of missing) {
    const enValue = getByPath(enObj, key);
    setByPath(locObj, key, enValue);
  }
  
  // Write back
  const newContent = serializeToTS(locObj);
  fs.writeFileSync(locFile, newContent, 'utf8');
  totalFixed += missing.length;
}

console.log(`\nDone. Added ${totalFixed} missing keys across ${localeDirs.length} locales.`);
