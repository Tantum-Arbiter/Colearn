import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CMS_STORIES_DIR } from './story-loader.js';

const SCHEMA_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'story-schema.json');

export const SUPPORTED_LANGUAGES = ['en', 'pl', 'es', 'de', 'fr', 'it', 'pt', 'ja', 'ar', 'tr', 'nl', 'da', 'la', 'zh'];
export const AGE_GROUPS = ['0-2', '2-4', '4-6'];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8')));

function schemaErrors(data) {
  if (validateSchema(data)) return [];
  return validateSchema.errors.map((error) => {
    const where = error.instancePath || '(root)';
    const extra = error.params?.allowedValues ? ` (${error.params.allowedValues.join(', ')})` : '';
    const missing = error.params?.missingProperty ? ` "${error.params.missingProperty}"` : '';
    return { path: where, detail: `${where} ${error.message}${missing}${extra}` };
  });
}

function checkLanguages(label, text, errors, warnings, requireAll) {
  if (!text || typeof text !== 'object') return;
  for (const [code, value] of Object.entries(text)) {
    if (!SUPPORTED_LANGUAGES.includes(code)) {
      errors.push(`${label}: unknown language "${code}"`);
    } else if (typeof value === 'string' && value.trim() === '') {
      warnings.push(`${label}: empty ${code} text`);
    }
  }
  if (requireAll) {
    const missing = SUPPORTED_LANGUAGES.filter((code) => !(code in text));
    if (missing.length > 0) warnings.push(`${label}: no ${missing.join(', ')} translation`);
  }
}

function checkPages(data, errors, warnings) {
  const ids = new Set();
  const numbers = new Set();
  for (const page of data.pages || []) {
    if (ids.has(page.id)) errors.push(`page id "${page.id}" is used twice`);
    ids.add(page.id);
    if (numbers.has(page.pageNumber)) errors.push(`page number ${page.pageNumber} is used twice`);
    numbers.add(page.pageNumber);

    if (!page.localizedText) continue;
    for (const [group, text] of Object.entries(page.localizedText)) {
      if (!AGE_GROUPS.includes(group)) {
        errors.push(`${page.id}: localizedText has age group "${group}"; page text is keyed by ${AGE_GROUPS.join(', ')}`);
        continue;
      }
      checkLanguages(`${page.id} ${group}`, text, errors, warnings, true);
    }
  }
}

function checkAssets(data, storiesDir, warnings) {
  if (!storiesDir) return;
  const prefix = `assets/stories/${data.id}/`;
  const references = [['story', 'coverImage', data.coverImage]];
  for (const page of data.pages || []) {
    references.push([page.id, 'backgroundImage', page.backgroundImage], [page.id, 'characterImage', page.characterImage]);
  }
  for (const [owner, field, reference] of references) {
    if (typeof reference !== 'string' || !reference.startsWith(prefix)) continue;
    const local = path.join(storiesDir, data.id, reference.slice(prefix.length));
    if (!fs.existsSync(local)) warnings.push(`${owner}: ${field} ${reference} is not in the story folder`);
  }
}

export async function fullValidation(data, { storiesDir = CMS_STORIES_DIR } = {}) {
  const errors = [];
  const warnings = [];
  const schema = schemaErrors(data);

  if (data && typeof data === 'object') {
    checkLanguages('localizedTitle', data.localizedTitle, errors, warnings, false);
    checkLanguages('localizedDescription', data.localizedDescription, errors, warnings, false);
    checkPages(data, errors, warnings);
    checkAssets(data, storiesDir, warnings);
  }

  return {
    valid: schema.length === 0 && errors.length === 0,
    schemaErrors: schema,
    customErrors: errors,
    warnings,
  };
}
