# Agent Operating Rules — `scripts` (CMS Pipeline & Tooling)

> Read this **after** the root `../CLAUDE.md`.
> Heterogeneous tooling: Node.js story/CMS pipeline + Python utilities (`code-to-word`, `image-trace-venv`).
> **None of this runs in production.** These are operator tools that mutate Firestore / GCS / local content.

---

## 1. Communication

- Be concise. No flattery. Match root CLAUDE.md.

---

## 2. What Lives Here

| Group | Location | Purpose |
|---|---|---|
| Story generation | `generate-story-files.js`, `generate-mock-stories.js`, `generate-bundled-stories-ts.js` | Author + emit story JSON |
| CMS stories (data) | `cms-stories/<story-id>/` | Source-of-truth story content |
| Translation pipeline | `translate-all-cms-stories.js`, `apply-all-translations.js`, `translation-dictionary*.js`, `scan-and-translate-all-stories.js` | Apply hand-curated translation dictionaries (see also `../grow-with-freya/scripts/i18n-manager.js`) |
| Upload | `upload-stories-to-firestore.js`, `upload-assets-to-firestore.js` (run via `package.json` scripts) | Push to Firestore + GCS |
| Schema | `story-schema.json`, `story-catalog.json` | Validation contracts |
| CMS Manager | `cms-manager/` | Local CLI (`@earlyroots/cms-manager`) for validate / format / prepare / import |
| Python tools | `code-to-word/`, `image-trace-venv/` | Standalone Python utilities — each owns its venv |

---

## 3. Safety Rails (read first)

- **Every script that writes to Firestore or GCS must support a dry-run.** If it doesn't, **add `--dry-run` before invoking it**. Never run an unfamiliar upload script blind.
- **Default target is the emulator / dev project** — never production. Production credentials are not on this repo.
- **Never commit credential JSON files** (`*-service-account.json`, `firebase-adminsdk*.json`). The `.gitignore` covers common patterns; double-check before staging.
- **Idempotency is the bar.** Scripts must be safe to re-run. Check existence before creating; merge rather than overwrite where the data model allows.
- **Schema-first writes.** Story uploads must validate against `story-schema.json` before any Firestore call.
- **CMS pipeline output is reviewed before upload.** Run `cms-manager validate` and `cms-manager prepare` first; humans approve the diff; then `import`.

---

## 4. Editing Rules

### Node.js scripts
- **CommonJS** (`require/module.exports`) is the existing convention for the standalone scripts. `cms-manager/` is **ESM** (`"type": "module"`). Match whichever directory you're in.
- **No comments** in code; descriptive names instead.
- Use `fs.promises` and `async/await`; no callback-style fs.
- Top-level argv parsing — prefer `commander` (already used in `cms-manager`) for anything beyond 2 flags.
- Console output: emoji prefixes (`✅`, `⚠️`, `❌`, `📥`, `📚`) are the existing convention — match it for parity in operator workflows.

### Python tools
- Each Python tool owns a **separate venv** (`code-to-word/venv`, `image-trace-venv`). **Never** install across tools.
- **Type hints everywhere.** `pydantic` or `dataclasses` over raw dicts.
- `with` statements for files and subprocesses.

### Dependencies
- Add Node deps with `npm install --save <pkg>` in the directory that needs them (`scripts/` or `scripts/cms-manager/`) — never hand-edit `package.json`.
- Add Python deps via `pip install <pkg> && pip freeze > requirements.txt` inside the appropriate venv.

---

## 5. Test-Driven Workflow (adapted)

CMS scripts don't ship as a library — they run once per operator action. TDD here means:

1. **Author / modify a small fixture in `cms-stories/`** before changing transformation logic.
2. Run the script with `--dry-run` against the fixture; verify the diff against a known-good expected file.
3. Only after local validation, run against the dev Firestore.
4. Promote to staging / prod only with explicit human approval and emulator parity confirmed.

There is **no formal test suite for `scripts/`** today — flag this if it becomes a problem; don't silently introduce one without approval.

---

## 6. Evidence-Based Analysis

```
File: scripts/<relative path>
Lines X-Y:
    <exact snippet>
```
For broken uploads, also capture: exact command run, target project, response from Firestore/GCS, and which fixture / story-id is affected.

---

## 7. Refactoring

- **Translation dictionaries (`translation-dictionary*.js`)** are append-only by convention — splitting them was deliberate. Don't merge or reorder without approval.
- **Always ask** before deleting a story directory in `cms-stories/` — it may be referenced by Firestore documents already uploaded.

---

## 8. Commits

```
<message>

References: colearn#<issue-number>
```
Never push without explicit permission. **Never run an upload as part of a commit hook.**

---

## 9. Commands

```bash
# Story uploads (from this directory)
npm run upload-cms-stories          # cms-stories/ → Firestore
npm run upload-bundled-stories      # bundled-stories.ts → Firestore
npm run upload-all-stories          # both modes
npm run upload-assets               # assets → GCS

# Generators
npm run generate-stories            # story file scaffolding
npm run generate-bundled-ts         # emit grow-with-freya/data/stories.ts

# CMS Manager CLI (from scripts/cms-manager/)
npm run validate                    # JSON schema validation
npm run format                      # canonicalise story JSON
npm run prepare                     # build Firestore/GCS payloads
npm run import                      # push to target project
npm run list                        # inventory

# i18n (from grow-with-freya/)
node scripts/i18n-manager.js audit
node scripts/i18n-manager.js export --out translations-needed.json
node scripts/i18n-manager.js apply  --file translations.json
```
