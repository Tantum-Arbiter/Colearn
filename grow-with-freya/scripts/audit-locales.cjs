const fs = require('fs');
const path = require('path');

function extractKeys(obj, prefix) {
  prefix = prefix || '';
  const keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const localesDir = path.join(__dirname, '..', 'locales');
const locales = fs.readdirSync(localesDir).filter(d => {
  return fs.statSync(path.join(localesDir, d)).isDirectory();
}).sort();

console.log('Found locales:', locales.join(', '));
console.log('');

const allKeys = {};

for (const loc of locales) {
  const filePath = path.join(localesDir, loc, 'index.ts');
  if (!fs.existsSync(filePath)) {
    console.log(loc + ': NO index.ts FILE');
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  // Remove export default and trailing semicolons
  let cleaned = content.replace(/export default\s*/, '');
  // Remove trailing semicolons and whitespace
  cleaned = cleaned.replace(/;\s*$/, '');

  try {
    const obj = eval('(' + cleaned + ')');
    allKeys[loc] = extractKeys(obj);
  } catch (e) {
    console.log(loc + ': PARSE ERROR - ' + e.message.substring(0, 100));
    allKeys[loc] = [];
  }
}

const enKeys = new Set(allKeys['en'] || []);
console.log('English has ' + enKeys.size + ' translation keys');
console.log('');

for (const loc of locales) {
  if (loc === 'en') continue;
  if (!allKeys[loc]) continue;

  const locKeys = new Set(allKeys[loc]);
  const missing = [];
  const extra = [];

  enKeys.forEach(function(k) {
    if (!locKeys.has(k)) missing.push(k);
  });
  locKeys.forEach(function(k) {
    if (!enKeys.has(k)) extra.push(k);
  });

  if (missing.length === 0 && extra.length === 0) {
    console.log(loc + ': OK (' + locKeys.size + ' keys)');
  } else {
    console.log(loc + ': ' + locKeys.size + ' keys');
    if (missing.length > 0) {
      console.log('  MISSING (' + missing.length + '):');
      missing.forEach(function(k) { console.log('    - ' + k); });
    }
    if (extra.length > 0) {
      console.log('  EXTRA (' + extra.length + '):');
      extra.forEach(function(k) { console.log('    - ' + k); });
    }
  }
}
