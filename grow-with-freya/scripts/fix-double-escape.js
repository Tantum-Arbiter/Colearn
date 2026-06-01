#!/usr/bin/env node
/**
 * Fix double-escaped apostrophes (\\') → (\') in locale files.
 * These cause SyntaxErrors in TypeScript.
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['ar','da','de','es','fr','it','ja','la','nl','pl','pt','tr','zh'];
const LOCALES_DIR = path.join(__dirname, '..', 'locales');

let totalFixed = 0;

for (const loc of LOCALES) {
  const filePath = path.join(LOCALES_DIR, loc, 'index.ts');
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  // Replace \\' with \' (double backslash-quote → single backslash-quote)
  const fixed = content.replace(/\\\\'/g, "\\'");
  if (fixed !== content) {
    const count = (content.match(/\\\\'/g) || []).length;
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log(loc + ': fixed ' + count + ' double-escaped apostrophes');
    totalFixed += count;
  }
}

console.log('\nDone! Fixed ' + totalFixed + ' total double-escaped apostrophes.');
