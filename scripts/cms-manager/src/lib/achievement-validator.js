import Ajv from 'ajv';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SUPPORTED_LANGUAGES } from './schema-validator.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(HERE, '..', '..', '..');
const FIXTURES = path.resolve(SCRIPTS, '..', 'contract-fixtures');

export const CMS_ACHIEVEMENTS_DIR = path.join(SCRIPTS, 'cms-achievements');
export const FORBIDDEN_PHRASES = JSON.parse(readFileSync(path.join(FIXTURES, 'badge-copy-forbidden.json'), 'utf8')).en;
export const BUNDLED_ART = new Set(JSON.parse(readFileSync(path.join(FIXTURES, 'badge-bundled-art.json'), 'utf8')).keys);

const CHALLENGE_INTERACTIONS = new Set(['music_challenge', 'jigsaw_puzzle', 'reading_challenge']);
const COPY_LINES = ['title', 'earned', 'next'];

const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(JSON.parse(readFileSync(path.join(SCRIPTS, 'achievement-schema.json'), 'utf8')));

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const FORBIDDEN = FORBIDDEN_PHRASES.map((phrase) => [phrase, new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i')]);

function schemaErrors(definition) {
  if (validateSchema(definition)) return [];
  return validateSchema.errors.map((error) => `${error.instancePath || '(root)'} ${error.message}`);
}

function checkCopy(copy, errors, warnings) {
  if (!copy || typeof copy !== 'object') return;
  const languagesByLine = COPY_LINES.map((line) => [line, Object.keys(copy[line] ?? {})]);
  const all = new Set(languagesByLine.flatMap(([, languages]) => languages));

  for (const code of all) {
    if (!SUPPORTED_LANGUAGES.includes(code)) errors.push(`copy: unknown language "${code}"`);
  }
  for (const [line, languages] of languagesByLine) {
    for (const code of all) {
      if (SUPPORTED_LANGUAGES.includes(code) && !languages.includes(code)) errors.push(`copy: ${line} has no ${code}, though other lines do`);
    }
    const english = copy[line]?.en;
    if (typeof english !== 'string') continue;
    for (const [phrase, pattern] of FORBIDDEN) {
      if (pattern.test(english)) errors.push(`copy: ${line} uses "${phrase}" — badges never press a child to return`);
    }
  }
  const missing = SUPPORTED_LANGUAGES.filter((code) => !all.has(code));
  if (missing.length > 0) warnings.push(`copy: no ${missing.join(', ')} translation; the app shows English there`);
}

function checkArt(art, errors) {
  if (typeof art !== 'string') return;
  if (!art.includes('/') && !BUNDLED_ART.has(art)) {
    errors.push(`art: "${art}" is neither a CMS asset path nor art the app carries (${[...BUNDLED_ART].join(', ')})`);
  }
}

export function validateAchievement(definition, { fileId } = {}) {
  const errors = schemaErrors(definition);
  const warnings = [];
  if (definition && typeof definition === 'object') {
    checkCopy(definition.copy, errors, warnings);
    checkArt(definition.art, errors);
    if (fileId && definition.id !== fileId) errors.push(`file name "${fileId}.json" does not match id "${definition.id}"`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

export async function loadAchievements(dir = CMS_ACHIEVEMENTS_DIR) {
  let names;
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const entries = [];
  for (const name of names.filter((file) => file.endsWith('.json')).sort()) {
    const raw = await fs.readFile(path.join(dir, name), 'utf8');
    try {
      entries.push({ file: name, data: JSON.parse(raw) });
    } catch (error) {
      entries.push({ file: name, data: null, parseError: error.message });
    }
  }
  return entries;
}

export async function validateAchievementFolder(dir = CMS_ACHIEVEMENTS_DIR) {
  const entries = await loadAchievements(dir);
  const seen = new Map();
  const results = entries.map(({ file, data, parseError }) => {
    if (parseError) return { file, valid: false, errors: [`not valid JSON: ${parseError}`], warnings: [] };
    const result = validateAchievement(data, { fileId: file.replace(/\.json$/, '') });
    if (seen.has(data.id)) {
      result.errors.push(`id "${data.id}" is also used by ${seen.get(data.id)}`);
      result.valid = false;
    }
    seen.set(data.id, file);
    return { file, ...result };
  });
  return { valid: results.every((result) => result.valid), results, definitions: entries.filter((e) => e.data).map((e) => e.data) };
}

export function validateStoryAwards(story, knownIds) {
  const errors = [];
  const pages = new Map((story.pages ?? []).map((page) => [page.id, page]));
  for (const award of story.awards ?? []) {
    if (!knownIds.has(award.achievementId)) {
      errors.push(`awards: "${award.achievementId}" is not defined in cms-achievements`);
    }
    if (typeof award.trigger === 'object' && award.trigger !== null) {
      const page = pages.get(award.trigger.challengePageId);
      if (!page) {
        errors.push(`awards: page "${award.trigger.challengePageId}" is not in ${story.id}`);
      } else if (!CHALLENGE_INTERACTIONS.has(page.interactionType)) {
        errors.push(`awards: page "${page.id}" has no challenge to complete`);
      }
    }
  }
  return errors;
}
