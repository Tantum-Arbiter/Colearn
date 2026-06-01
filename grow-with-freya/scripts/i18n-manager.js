#!/usr/bin/env node
/**
 * i18n-manager — Unified internationalisation tool for CoLearn / Early Roots
 *
 * Manages ALL translatable content across three surfaces:
 *   1. Locale TS files   (grow-with-freya/locales/{lang}/index.ts)
 *   2. CMS story JSON    (scripts/cms-stories/{id}/story-data.json)
 *   3. Bundled story data (grow-with-freya/data/stories.ts)
 *
 * Sub-commands:
 *   audit    — Report missing translations across all surfaces
 *   sync     — Copy missing keys from English locale to all others (placeholder)
 *   apply    — Apply a translation JSON file to the appropriate surface(s)
 *   export   — Export all English strings to a JSON file for translation
 *
 * Usage:
 *   node scripts/i18n-manager.js audit
 *   node scripts/i18n-manager.js sync
 *   node scripts/i18n-manager.js export  --out translations-needed.json
 *   node scripts/i18n-manager.js apply   --file translations.json
 *
 * Translation JSON format (input to `apply`):
 * {
 *   "locale": {                         // ← Locale TS keys
 *     "games.wellDone": { "fr": "Bien joué !", "de": "Gut gemacht!" },
 *     "spelling.stories.owlCantSleep.title": { "fr": "Le Hibou..." }
 *   },
 *   "cms": {                            // ← CMS story-data.json pages
 *     "reading-story-1": {
 *       "pages": {
 *         "0": { "fr": "Jardin de Mots\n\nRemplir les Blancs" },
 *         "1": { "fr": "Page 1 en français..." }
 *       },
 *       "title": { "fr": "Jardin de Mots" },
 *       "description": { "fr": "Une douce aventure..." }
 *     }
 *   },
 *   "bundled": {                        // ← data/stories.ts localizedTitle
 *     "snuggle-little-wombat": {
 *       "title": { "fr": "Câlin Petit Wombat" },
 *       "description": { "fr": "Une histoire..." }
 *     }
 *   }
 * }
 */
const fs = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'locales');
const CMS_DIR = path.resolve(ROOT, '..', 'scripts', 'cms-stories');
const BUNDLED_FILE = path.join(ROOT, 'data', 'stories.ts');

const SUPPORTED_LOCALES = ['ar','da','de','es','fr','it','ja','la','nl','pl','pt','tr','zh'];
const LOCALE_NAMES = {ar:'Arabic',da:'Danish',de:'German',es:'Spanish',fr:'French',it:'Italian',ja:'Japanese',la:'Latin',nl:'Dutch',pl:'Polish',pt:'Portuguese',tr:'Turkish',zh:'Chinese'};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Read & eval a locale TS file into a plain object */
function parseLocaleFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const m = src.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
  if (!m) throw new Error(`Cannot parse ${filePath}`);
  return new Function('return ' + m[1])();
}

/** Collect all leaf key paths from an object */
function leafKeys(obj, prefix = '') {
  const out = [];
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      out.push(...leafKeys(obj[k], p));
    } else {
      out.push(p);
    }
  }
  return out;
}

/** Get nested value by dot-path */
function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/** Set nested value by dot-path, creating intermediates */
function setPath(obj, p, val) {
  const parts = p.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

/** Serialize object → TypeScript source (export default { ... }) */
function serializeToTS(obj, indent = 2) {
  const lines = [];
  function ser(o, depth) {
    const pad = ' '.repeat(depth * indent);
    for (const [key, val] of Object.entries(o)) {
      const sk = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
      if (Array.isArray(val)) {
        lines.push(`${pad}${sk}: [`);
        for (const item of val) {
          if (typeof item === 'string') {
            lines.push(`${pad}  '${escStr(item)}',`);
          } else { lines.push(`${pad}  ${JSON.stringify(item)},`); }
        }
        lines.push(`${pad}],`);
      } else if (typeof val === 'object' && val !== null) {
        lines.push(`${pad}${sk}: {`);
        ser(val, depth + 1);
        lines.push(`${pad}},`);
      } else if (typeof val === 'string') {
        lines.push(`${pad}${sk}: '${escStr(val)}',`);
      } else {
        lines.push(`${pad}${sk}: ${JSON.stringify(val)},`);
      }
    }
  }
  lines.push('export default {');
  ser(obj, 1);
  lines.push('};\n');
  return lines.join('\n');
}

function escStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

// ── Sub-commands ─────────────────────────────────────────────────────────────
// (Continued in next section — kept under 150 lines per tool constraint)

// ── AUDIT ────────────────────────────────────────────────────────────────────
function cmdAudit() {
  console.log('🔍 Auditing translations across all surfaces...\n');
  let issues = 0;

  // 1. Locale TS files — check key parity
  console.log('── Locale TS files ──');
  const enObj = parseLocaleFile(path.join(LOCALES_DIR, 'en', 'index.ts'));
  const enKeys = leafKeys(enObj);
  for (const loc of SUPPORTED_LOCALES) {
    const locFile = path.join(LOCALES_DIR, loc, 'index.ts');
    if (!fs.existsSync(locFile)) { console.log(`  ${loc}: ❌ file missing`); issues++; continue; }
    const locObj = parseLocaleFile(locFile);
    const locKeySet = new Set(leafKeys(locObj));
    const missing = enKeys.filter(k => !locKeySet.has(k));
    const extra = [...locKeySet].filter(k => !enKeys.includes(k));
    // Count keys still holding English placeholder
    let untranslated = 0;
    for (const k of enKeys) {
      if (locKeySet.has(k)) {
        const enVal = getPath(enObj, k);
        const locVal = getPath(locObj, k);
        if (typeof enVal === 'string' && enVal === locVal && enVal.length > 3) untranslated++;
      }
    }
    if (missing.length === 0 && extra.length === 0 && untranslated === 0) {
      console.log(`  ${loc} (${LOCALE_NAMES[loc]}): ✅ ${enKeys.length} keys, all translated`);
    } else {
      const parts = [];
      if (missing.length) parts.push(`${missing.length} missing`);
      if (extra.length) parts.push(`${extra.length} extra`);
      if (untranslated) parts.push(`${untranslated} untranslated (English placeholder)`);
      console.log(`  ${loc} (${LOCALE_NAMES[loc]}): ⚠️  ${parts.join(', ')}`);
      issues += missing.length + extra.length;
    }
  }

  // 2. CMS story JSON — check localizedText coverage
  console.log('\n── CMS Story JSON ──');
  if (fs.existsSync(CMS_DIR)) {
    const storyDirs = fs.readdirSync(CMS_DIR).filter(f =>
      fs.statSync(path.join(CMS_DIR, f)).isDirectory()
    );
    let totalPages = 0, missingPages = 0;
    for (const dir of storyDirs) {
      const jp = path.join(CMS_DIR, dir, 'story-data.json');
      if (!fs.existsSync(jp)) continue;
      const data = JSON.parse(fs.readFileSync(jp, 'utf8'));
      for (const page of (data.pages || [])) {
        if (!page.text) continue;
        totalPages++;
        const lt = page.localizedText;
        if (!lt) { missingPages++; continue; }
        // Check all age groups have all locales
        const ageGroups = Object.keys(lt);
        for (const ag of ageGroups) {
          const missing = SUPPORTED_LOCALES.filter(l => !lt[ag][l]);
          if (missing.length) missingPages++;
        }
      }
    }
    console.log(`  ${storyDirs.length} stories, ${totalPages} pages, ${missingPages} pages with missing translations`);
    issues += missingPages;
  } else {
    console.log('  CMS directory not found (skipped)');
  }

  // 3. Bundled stories — check localizedTitle
  console.log('\n── Bundled Stories ──');
  if (fs.existsSync(BUNDLED_FILE)) {
    const src = fs.readFileSync(BUNDLED_FILE, 'utf8');
    const titleMatches = src.match(/localizedTitle:/g) || [];
    console.log(`  ${titleMatches.length} stories with localizedTitle entries`);
  } else {
    console.log('  Bundled file not found (skipped)');
  }

  console.log(`\n${issues === 0 ? '✅ No issues found!' : `⚠️  ${issues} issues found.`}`);
}

// ── SYNC ─────────────────────────────────────────────────────────────────────
function cmdSync() {
  console.log('🔄 Syncing missing keys from English to all locales...\n');
  const enObj = parseLocaleFile(path.join(LOCALES_DIR, 'en', 'index.ts'));
  const enKeys = leafKeys(enObj);
  let totalFixed = 0;

  for (const loc of SUPPORTED_LOCALES) {
    const locFile = path.join(LOCALES_DIR, loc, 'index.ts');
    if (!fs.existsSync(locFile)) continue;
    const locObj = parseLocaleFile(locFile);
    const locKeySet = new Set(leafKeys(locObj));
    const missing = enKeys.filter(k => !locKeySet.has(k));
    if (missing.length === 0) { console.log(`  ${loc}: ✅ all keys present`); continue; }
    for (const k of missing) setPath(locObj, k, getPath(enObj, k));
    fs.writeFileSync(locFile, serializeToTS(locObj), 'utf8');
    console.log(`  ${loc}: ➕ added ${missing.length} missing keys`);
    totalFixed += missing.length;
  }
  console.log(`\nDone. Added ${totalFixed} keys across ${SUPPORTED_LOCALES.length} locales.`);
}

// ── EXPORT ───────────────────────────────────────────────────────────────────
function cmdExport(outFile) {
  console.log('📤 Exporting English strings for translation...\n');
  const result = { locale: {}, cms: {}, bundled: {} };

  // 1. Locale TS — export all leaf keys
  const enObj = parseLocaleFile(path.join(LOCALES_DIR, 'en', 'index.ts'));
  const enKeys = leafKeys(enObj);
  for (const k of enKeys) {
    result.locale[k] = { en: getPath(enObj, k) };
  }
  console.log(`  Locale: ${enKeys.length} keys`);

  // 2. CMS stories — export page text, title, description
  if (fs.existsSync(CMS_DIR)) {
    const storyDirs = fs.readdirSync(CMS_DIR).filter(f =>
      fs.statSync(path.join(CMS_DIR, f)).isDirectory()
    );
    let pageCount = 0;
    for (const dir of storyDirs) {
      const jp = path.join(CMS_DIR, dir, 'story-data.json');
      if (!fs.existsSync(jp)) continue;
      const data = JSON.parse(fs.readFileSync(jp, 'utf8'));
      const entry = { pages: {} };
      if (data.title) entry.title = { en: data.title };
      if (data.description) entry.description = { en: data.description };
      for (const page of (data.pages || [])) {
        if (page.text) {
          entry.pages[String(page.pageNumber)] = { en: page.text };
          pageCount++;
        }
      }
      result.cms[data.id || dir] = entry;
    }
    console.log(`  CMS: ${storyDirs.length} stories, ${pageCount} pages`);
  }

  // 3. Bundled stories — export titles
  if (fs.existsSync(BUNDLED_FILE)) {
    const src = fs.readFileSync(BUNDLED_FILE, 'utf8');
    // Simple regex to extract story ids and titles
    const idMatches = [...src.matchAll(/id:\s*'([^']+)'/g)];
    const titleMatches = [...src.matchAll(/title:\s*'([^']+)'/g)];
    for (let i = 0; i < idMatches.length; i++) {
      const id = idMatches[i][1];
      const title = titleMatches[i] ? titleMatches[i][1] : '';
      result.bundled[id] = { title: { en: title } };
    }
    console.log(`  Bundled: ${idMatches.length} stories`);
  }

  const dest = outFile || path.join(ROOT, 'translations-needed.json');
  fs.writeFileSync(dest, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`\n✅ Exported to ${path.relative(process.cwd(), dest)}`);
}

// ── APPLY ────────────────────────────────────────────────────────────────────
function cmdApply(inputFile) {
  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('❌ Please provide a valid translation JSON file: --file <path>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  console.log('📥 Applying translations...\n');
  let totalChanges = 0;

  // 1. Locale TS updates
  if (data.locale && Object.keys(data.locale).length) {
    console.log('── Locale TS ──');
    for (const loc of SUPPORTED_LOCALES) {
      const locFile = path.join(LOCALES_DIR, loc, 'index.ts');
      if (!fs.existsSync(locFile)) continue;
      const locObj = parseLocaleFile(locFile);
      let changes = 0;
      for (const [key, translations] of Object.entries(data.locale)) {
        if (translations[loc] !== undefined) {
          setPath(locObj, key, translations[loc]);
          changes++;
        }
      }
      if (changes > 0) {
        fs.writeFileSync(locFile, serializeToTS(locObj), 'utf8');
        console.log(`  ${loc}: ${changes} keys updated`);
        totalChanges += changes;
      }
    }
  }

  // 2. CMS story JSON updates
  if (data.cms && Object.keys(data.cms).length) {
    console.log('\n── CMS Story JSON ──');
    for (const [storyId, storyData] of Object.entries(data.cms)) {
      // Find the story directory
      let storyDir = null;
      if (fs.existsSync(CMS_DIR)) {
        const dirs = fs.readdirSync(CMS_DIR);
        storyDir = dirs.find(d => {
          const jp = path.join(CMS_DIR, d, 'story-data.json');
          if (!fs.existsSync(jp)) return false;
          const sd = JSON.parse(fs.readFileSync(jp, 'utf8'));
          return sd.id === storyId || d === storyId;
        });
      }
      if (!storyDir) { console.log(`  ⚠️  ${storyId}: story not found, skipping`); continue; }

      const jp = path.join(CMS_DIR, storyDir, 'story-data.json');
      const sd = JSON.parse(fs.readFileSync(jp, 'utf8'));
      let changes = 0;

      // Update title
      if (storyData.title) {
        if (!sd.localizedTitle) sd.localizedTitle = {};
        for (const [lang, text] of Object.entries(storyData.title)) {
          if (lang !== 'en') { sd.localizedTitle[lang] = text; changes++; }
        }
      }

      // Update description
      if (storyData.description) {
        if (!sd.localizedDescription) sd.localizedDescription = {};
        for (const [lang, text] of Object.entries(storyData.description)) {
          if (lang !== 'en') { sd.localizedDescription[lang] = text; changes++; }
        }
      }

      // Update pages
      if (storyData.pages) {
        for (const [pageNum, translations] of Object.entries(storyData.pages)) {
          const page = sd.pages.find(p => String(p.pageNumber) === pageNum);
          if (!page) continue;
          if (!page.localizedText) page.localizedText = {};
          // Determine age groups — use existing or default to "4-6"
          const ageGroups = Object.keys(page.localizedText).length > 0
            ? Object.keys(page.localizedText)
            : ['4-6'];
          for (const ag of ageGroups) {
            if (!page.localizedText[ag]) page.localizedText[ag] = { en: page.text };
            for (const [lang, text] of Object.entries(translations)) {
              if (lang !== 'en') { page.localizedText[ag][lang] = text; changes++; }
            }
          }
        }
      }

      if (changes > 0) {
        fs.writeFileSync(jp, JSON.stringify(sd, null, 2) + '\n');
        console.log(`  ✅ ${storyId}: ${changes} fields updated`);
        totalChanges += changes;
      }
    }
  }

  // 3. Bundled story data (data/stories.ts) — localizedTitle updates
  if (data.bundled && Object.keys(data.bundled).length) {
    console.log('\n── Bundled Stories ──');
    if (fs.existsSync(BUNDLED_FILE)) {
      let src = fs.readFileSync(BUNDLED_FILE, 'utf8');
      let changes = 0;
      for (const [storyId, fields] of Object.entries(data.bundled)) {
        if (fields.title) {
          for (const [lang, text] of Object.entries(fields.title)) {
            if (lang === 'en') continue;
            // Find and update localizedTitle entry for this story
            const escaped = text.replace(/'/g, "\\'");
            const regex = new RegExp(
              `(id:\\s*'${storyId}'[\\s\\S]*?localizedTitle:\\s*\\{[\\s\\S]*?)${lang}:\\s*'[^']*'`,
              ''
            );
            if (regex.test(src)) {
              src = src.replace(regex, `$1${lang}: '${escaped}'`);
              changes++;
            }
          }
        }
      }
      if (changes > 0) {
        fs.writeFileSync(BUNDLED_FILE, src, 'utf8');
        console.log(`  ✅ ${changes} fields updated in stories.ts`);
        totalChanges += changes;
      }
    }
  }

  console.log(`\n✅ Total: ${totalChanges} translations applied.`);
}

// ── CLI Dispatcher ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = args[0];

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

switch (cmd) {
  case 'audit':
    cmdAudit();
    break;
  case 'sync':
    cmdSync();
    break;
  case 'export':
    cmdExport(getArg('--out'));
    break;
  case 'apply':
    cmdApply(getArg('--file'));
    break;
  default:
    console.log(`
i18n-manager — Unified internationalisation tool for CoLearn

Usage:
  node scripts/i18n-manager.js <command> [options]

Commands:
  audit                         Report missing translations across all surfaces
  sync                          Copy missing keys from English → all locales (placeholder)
  export  --out <file.json>     Export all English strings to JSON for translation
  apply   --file <file.json>    Apply translations from JSON to all surfaces

Surfaces managed:
  1. Locale TS files   (locales/*/index.ts)    — UI, stories, bridges
  2. CMS story JSON    (cms-stories/*/story-data.json) — story pages
  3. Bundled stories    (data/stories.ts)       — localizedTitle/Description

Supported locales: ${SUPPORTED_LOCALES.join(', ')}
`);
    if (cmd && cmd !== 'help' && cmd !== '--help') process.exit(1);
}
