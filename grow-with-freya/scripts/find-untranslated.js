#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LOCALES = ['ar','da','de','es','fr','it','ja','la','nl','pl','pt','tr','zh'];

function parseLocale(loc) {
  const content = fs.readFileSync(path.join(__dirname, '..', 'locales', loc, 'index.ts'), 'utf8');
  const obj = {};
  const lines = content.split('\n');
  const stack = [];
  for (const line of lines) {
    const indent = line.match(/^(\s*)/)[1].length;
    const kvMatch = line.match(/^\s+(\w+):\s*'(.*)'\s*,?\s*$/);
    if (kvMatch) {
      const fullKey = [...stack.map(s => s.key), kvMatch[1]].join('.');
      obj[fullKey] = kvMatch[2];
    }
    const blockMatch = line.match(/^\s+(\w+):\s*\{\s*$/);
    if (blockMatch) {
      stack.push({ key: blockMatch[1], indent });
    }
    if (line.trim() === '},' || line.trim() === '}') {
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    }
  }
  return obj;
}

const en = parseLocale('en');

for (const loc of LOCALES) {
  const locObj = parseLocale(loc);
  const untranslated = [];
  for (const [k, v] of Object.entries(en)) {
    if (locObj[k] === v && v.length > 3) {
      untranslated.push(k);
    }
  }
  if (untranslated.length > 0) {
    console.log(`\n${loc} (${untranslated.length} untranslated):`);
    untranslated.forEach(k => console.log(`  ${k}: ${en[k].substring(0, 70)}`));
  }
}
