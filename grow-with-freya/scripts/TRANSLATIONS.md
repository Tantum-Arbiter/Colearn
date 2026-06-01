# Translation Tools

Scripts for managing translations across the Early Roots app. All scripts live in `grow-with-freya/scripts/` and operate on `grow-with-freya/locales/*/index.ts`.

**Supported locales:** `ar` `da` `de` `es` `fr` `it` `ja` `la` `nl` `pl` `pt` `tr` `zh`

---

## Quick Start

```bash
cd grow-with-freya

# 1. Check what's missing
node scripts/i18n-manager.js audit

# 2. After adding new English keys, sync placeholders to all locales
node scripts/i18n-manager.js sync

# 3. Export English strings for translation
node scripts/i18n-manager.js export --out translations.json

# 4. Fill in the JSON, then apply
node scripts/i18n-manager.js apply --file translations.json

# 5. Run tests to verify
npx jest __tests__/services/i18n.test.ts --no-coverage
```

---

## Scripts Overview

### `i18n-manager.js` — Unified management tool

The primary tool for day-to-day translation work. Manages all three content surfaces:

1. **Locale TS files** (`locales/*/index.ts`) — UI text, story narratives, bridge content
2. **CMS story JSON** (`scripts/cms-stories/*/story-data.json`) — reading story pages
3. **Bundled stories** (`data/stories.ts`) — localised titles/descriptions

| Command | Description |
|---|---|
| `audit` | Report missing/untranslated strings across all surfaces |
| `sync` | Copy missing keys from English → all locales (English placeholder) |
| `export --out <file>` | Export all English strings to JSON for translation |
| `apply --file <file>` | Apply a completed translation JSON to all surfaces |

#### Translation JSON format (for `apply`)

```json
{
  "locale": {
    "games.wellDone": { "fr": "Bien joué !", "de": "Gut gemacht!" },
    "spelling.stories.owlCantSleep.title": { "fr": "Le Hibou ne peut pas dormir" }
  },
  "cms": {
    "reading-story-1": {
      "pages": { "0": { "fr": "Page texte..." }, "1": { "fr": "..." } },
      "title": { "fr": "Titre" },
      "description": { "fr": "Description" }
    }
  },
  "bundled": {
    "snuggle-little-wombat": {
      "title": { "fr": "Câlin Petit Wombat" },
      "description": { "fr": "Une histoire douce..." }
    }
  }
}
```

---

### `translate-stories.js` — Spelling story translations

Bulk-translates **70 spelling stories** across all locales. Data is embedded in the script.

```bash
node scripts/translate-stories.js
```

**Data format:** Each story has 6 fields — `title`, `page1`–`page5`:

```js
S['owlCantSleep'] = {
  fr: ['Le Hibou ne peut pas dormir', 'Page 1 texte...', 'Page 2...', 'Page 3...', 'Page 4...', 'Page 5...'],
  de: ['Die Eule kann nicht schlafen', '...', '...', '...', '...', '...'],
  // ... all 13 locales
};
```

**To add a new spelling story:**
1. Add the English story to `locales/en/index.ts` under `spelling.stories.<key>`
2. Run `node scripts/i18n-manager.js sync` to create placeholders in all locales
3. Add a new `S['<key>']` block to `translate-stories.js` with translations for all 13 locales
4. Run `node scripts/translate-stories.js`
5. Run tests: `npx jest __tests__/services/i18n.test.ts --no-coverage`

---

### `translate-numbers.js` — Numbers story translations

Same pattern as `translate-stories.js` but for the **75 numbers stories**.

```bash
node scripts/translate-numbers.js
```

**To add a new numbers story:** Follow the same steps as spelling stories, but add the `S['<key>']` block to `translate-numbers.js` and add the English keys under `numbers.stories.<key>`.

---

### `translate-game-text.js` — Game UI translations

Translates game UI, learning section UI, bridge headers, and feelings activity text.

```bash
node scripts/translate-game-text.js
```

**Data format:** Flat key → locale map:

```js
const translations = {
  'games.wellDone': {
    ar: 'أحسنت!', da: 'Godt klaret!', de: 'Gut gemacht!', ...
  },
};
```

---

### `translate-all-content.js` — Bridge narrative translations

Translates bridge narrative content (narration, home, outdoors, creative, closing) for spelling, numbers, and feelings bridges.

```bash
node scripts/translate-all-content.js
```

**Data format:** Each bridge has 5 fields:

```js
B['spelling.abcAnimals'] = {
  fr: ['Narration...', 'Activité maison...', 'Activité extérieur...', 'Activité créative...', 'Conclusion...'],
  // ... all 13 locales
};
```

---

### Utility scripts

| Script | Purpose |
|---|---|
| `sync-i18n.js` | Standalone key sync (same as `i18n-manager.js sync`) |
| `find-untranslated.js` | Lists all keys still holding English text per locale |
| `fix-double-escape.js` | Fixes `\\'` → `\'` escaping bugs in locale files |
| `translate-remaining.js` | Patches misc UI keys (bedtimeRoutine, tutorials, etc.) |

---

## Workflow: Adding a New Story

1. **Add English content** to `locales/en/index.ts` under the appropriate section
2. **Sync placeholders**: `node scripts/i18n-manager.js sync`
3. **Add translations** to the appropriate script:
   - Spelling stories → `translate-stories.js`
   - Numbers stories → `translate-numbers.js`
   - Bridge narratives → `translate-all-content.js`
   - UI/misc keys → `translate-game-text.js` or `translate-remaining.js`
4. **Run the script** to apply translations
5. **Verify**: `node scripts/i18n-manager.js audit`
6. **Test**: `npx jest __tests__/services/i18n.test.ts --no-coverage`

## Workflow: Bulk Translation via JSON

For large batches or external translators:

1. `node scripts/i18n-manager.js export --out translations.json`
2. Send `translations.json` to translators — they fill in values per locale
3. `node scripts/i18n-manager.js apply --file translations.json`
4. `node scripts/i18n-manager.js audit` to verify
5. `npx jest __tests__/services/i18n.test.ts --no-coverage`

## Escaping

- Apostrophes in translations must be escaped as `\'` in the locale `.ts` files
- The translate scripts handle this automatically via their `esc()` functions
- If you see `SyntaxError: Unexpected token` after running a script, run `node scripts/fix-double-escape.js` to fix double-escaped apostrophes
