const fs = require('fs');
const path = require('path');

const CATALOGUE_PATH = path.join(__dirname, '..', 'learning', 'mechanics.json');
const BANDS = ['1-2', '2-4', '4+'];
const WINDOW = 3;
const EXPECTED_BY_AGE_RANGE = { '2-4': [3], '4-6': [4], '6-8': [5], '4+': [4, 5] };

function loadCatalogue(file = CATALOGUE_PATH) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function challengePages(story) {
  return (story.pages || [])
    .filter((page) => page.interactionType === 'learning_challenge' || page.learningChallenge)
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

const MAX_TIPS = 3;

function textGroups(label, text, languages, errors) {
  if (!text || typeof text !== 'object' || Object.keys(text).length === 0) {
    errors.push(`${label} is missing`);
    return;
  }
  for (const [group, byLanguage] of Object.entries(text)) {
    for (const code of languages) {
      if (typeof byLanguage?.[code] !== 'string' || byLanguage[code].trim() === '') errors.push(`${label} has no ${code} text for ${group}`);
    }
  }
}

function checkCadence(story, pages, errors, warnings) {
  const numbers = (story.pages || []).map((page) => page.pageNumber);
  const first = Math.min(...numbers);
  const last = Math.max(...numbers);
  const expected = EXPECTED_BY_AGE_RANGE[story.ageRange];
  if (!expected) warnings.push(`ageRange "${story.ageRange}" has no expected challenge count`);
  else if (!expected.includes(pages.length)) errors.push(`a ${story.ageRange} book carries ${expected.join(' or ')} challenges, not ${pages.length}`);

  const windows = new Set();
  let previous = null;
  for (const page of pages) {
    const n = page.pageNumber;
    if (n === first || n === last) errors.push(`page ${n}: a challenge never sits on the first or last page`);
    if (previous !== null && n - previous < 2) errors.push(`page ${n}: adjacent to the challenge on page ${previous}`);
    const window = Math.floor((n - first - 1) / WINDOW);
    if (windows.has(window)) errors.push(`page ${n}: a second challenge in the same ${WINDOW}-page window`);
    windows.add(window);
    previous = n;
  }
}

const EVERY_ITEM_ADAPTERS = ['multi_tap_count', 'difference_find'];

function onThePicture(hotspot) {
  const { x, y } = hotspot.position || {};
  const { width, height } = hotspot.size || {};
  if (![x, y, width, height].every((value) => typeof value === 'number' && Number.isFinite(value))) return false;
  return x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1;
}

function checkChallenge(page, catalogue, languages, errors) {
  const where = `page ${page.pageNumber}`;
  const challenge = page.learningChallenge;
  if (page.interactionType !== 'learning_challenge') errors.push(`${where}: has a learningChallenge but interactionType is "${page.interactionType}"`);
  if (!challenge) {
    errors.push(`${where}: interactionType is learning_challenge but there is no learningChallenge`);
    return null;
  }
  const mechanic = catalogue.mechanics[challenge.mechanicId];
  if (!mechanic) {
    errors.push(`${where}: mechanic "${challenge.mechanicId}" is not in catalogue version ${catalogue.version}`);
  } else {
    if (mechanic.family !== challenge.family) errors.push(`${where}: ${challenge.mechanicId} is a ${mechanic.family} mechanic, not ${challenge.family}`);
    if (mechanic.adapter !== challenge.adapter) errors.push(`${where}: ${challenge.mechanicId} uses the ${mechanic.adapter} adapter, not ${challenge.adapter}`);
    if (mechanic.assessment_mode !== challenge.assessmentMode) errors.push(`${where}: ${challenge.mechanicId} is ${mechanic.assessment_mode}, not ${challenge.assessmentMode}`);
    if (mechanic.audio_dependent !== challenge.audioDependent) errors.push(`${where}: ${challenge.mechanicId} audioDependent should be ${mechanic.audio_dependent}`);
    if (mechanic.domain !== challenge.domain) errors.push(`${where}: ${challenge.mechanicId} belongs to ${mechanic.domain}, not ${challenge.domain}`);
    const count = (challenge.items || []).length;
    if (count < mechanic.items.min || count > mechanic.items.max) errors.push(`${where}: ${challenge.mechanicId} takes ${mechanic.items.min}–${mechanic.items.max} items, not ${count}`);
  }
  if (!catalogue.families[challenge.family]) errors.push(`${where}: family "${challenge.family}" is not in the catalogue`);

  const ids = (challenge.items || []).map((item) => item.id);
  if (new Set(ids).size !== ids.length) errors.push(`${where}: item ids repeat`);
  for (const band of BANDS) {
    const forBand = challenge.byAge?.[band];
    if (!forBand || !Array.isArray(forBand.items) || forBand.items.length === 0) {
      errors.push(`${where}: byAge has no items for ${band}`);
      continue;
    }
    for (const id of forBand.items) if (!ids.includes(id)) errors.push(`${where}: byAge ${band} names unknown item "${id}"`);
  }
  if (EVERY_ITEM_ADAPTERS.includes(challenge.adapter)) {
    if (challenge.target) errors.push(`${where}: ${challenge.mechanicId} asks for every item, so it has no target`);
  } else if (challenge.assessmentMode === 'guided_observable') {
    if (!ids.includes(challenge.target)) errors.push(`${where}: a guided mechanic needs a target among its items`);
  } else if (challenge.target) {
    errors.push(`${where}: an open mechanic has no target`);
  }
  if (challenge.allowSkip !== true) errors.push(`${where}: allowSkip must be true; skipping is always offered`);

  const copy = challenge.copy || {};
  for (const field of ['title', 'setupLine', 'instruction', 'successLine', 'onSkip', 'parentPrompt']) textGroups(`${where}: copy.${field}`, copy[field], languages, errors);
  if (!Array.isArray(copy.hints) || copy.hints.length === 0) errors.push(`${where}: copy.hints is missing`);
  else copy.hints.forEach((hint, i) => textGroups(`${where}: copy.hints[${i}]`, hint, languages, errors));
  for (const item of challenge.items || []) {
    for (const code of languages) if (typeof item.label?.[code] !== 'string') errors.push(`${where}: item "${item.id}" has no ${code} label`);
    if (challenge.family === 'choose' && typeof item.image !== 'string') errors.push(`${where}: item "${item.id}" needs a picture`);
    if (challenge.family === 'tap_scene') {
      if (!item.hotspot) errors.push(`${where}: item "${item.id}" needs a hotspot`);
      else if (!onThePicture(item.hotspot)) errors.push(`${where}: item "${item.id}" hotspot is not on the picture`);
    }
    if (item.outcome?.successLine) textGroups(`${where}: item "${item.id}" outcome.successLine`, item.outcome.successLine, languages, errors);
    if (item.outcome && 'storyText' in item.outcome) textGroups(`${where}: item "${item.id}" outcome.storyText`, item.outcome.storyText, languages, errors);
    if (item.outcome && 'tips' in item.outcome) {
      const tips = Array.isArray(item.outcome.tips) ? item.outcome.tips : [];
      if (tips.length < 1 || tips.length > MAX_TIPS) errors.push(`${where}: item "${item.id}" has ${tips.length} tips; 1 to ${MAX_TIPS} fit beside the picture`);
      tips.forEach((tip, i) => textGroups(`${where}: item "${item.id}" outcome.tips[${i}]`, tip, languages, errors));
    }
  }
  return challenge;
}

function checkAssets(story, pages, storiesDir, warnings) {
  if (!storiesDir) return;
  const prefix = `assets/stories/${story.id}/`;
  for (const page of pages) {
    const challenge = page.learningChallenge;
    if (!challenge) continue;
    const references = (challenge.items || []).map((item) => [`item ${item.id}`, item.image]);
    for (const item of challenge.items || []) if (item.outcome?.stateAfter) references.push([`item ${item.id} stateAfter`, item.outcome.stateAfter.image]);
    if (challenge.stateAfter) references.push(['stateAfter', challenge.stateAfter.image]);
    for (const [owner, reference] of references) {
      if (typeof reference !== 'string' || !reference.startsWith(prefix)) continue;
      if (!fs.existsSync(path.join(storiesDir, story.id, reference.slice(prefix.length)))) warnings.push(`page ${page.pageNumber}: ${owner} ${reference} is not in the story folder`);
    }
  }
}

function validateLearningChallenges(story, catalogue, { languages = ['en'], storiesDir = null } = {}) {
  const errors = [];
  const warnings = [];
  const pages = challengePages(story);
  if (pages.length === 0) return { errors, warnings };

  checkCadence(story, pages, errors, warnings);
  const seen = new Map();
  for (const page of pages) {
    const challenge = checkChallenge(page, catalogue, languages, errors);
    if (!challenge) continue;
    if (seen.has(challenge.mechanicId)) errors.push(`page ${page.pageNumber}: mechanic ${challenge.mechanicId} already used on page ${seen.get(challenge.mechanicId)}`);
    seen.set(challenge.mechanicId, page.pageNumber);
  }
  checkAssets(story, pages, storiesDir, warnings);
  return { errors, warnings };
}

module.exports = { validateLearningChallenges, loadCatalogue, challengePages, CATALOGUE_PATH, EXPECTED_BY_AGE_RANGE };
