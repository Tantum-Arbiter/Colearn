import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { validateAchievement, validateAchievementFolder, loadAchievements, FORBIDDEN_PHRASES, validateStoryAwards } from './achievement-validator.js';

function badge(overrides = {}) {
  return {
    id: 'theme-calming',
    version: 1,
    status: 'active',
    family: 'theme',
    category: 'calm',
    rule: { kind: 'finishedWithTag', tags: ['calming'], target: 2 },
    art: 'assets/badges/calming.webp',
    copy: {
      title: { en: 'Calm Collector', pl: 'Spokojny zbieracz' },
      earned: { en: 'You finished two calming books together', pl: 'Dwie spokojne książki' },
      next: { en: 'Two calming books make this one', pl: 'Dwie spokojne książki' },
    },
    ...overrides,
  };
}

const errorsOf = (definition, options) => validateAchievement(definition, options).errors;

test('passes a complete badge', () => {
  const underTest = validateAchievement(badge());

  assert.equal(underTest.valid, true);
  assert.deepEqual(underTest.errors, []);
});

test('reads the shared forbidden-phrase list', () => {
  assert.ok(FORBIDDEN_PHRASES.includes('come back'));
});

for (const [label, overrides] of [
  ['a missing rule', { rule: undefined }],
  ['an unknown rule kind', { rule: { kind: 'moonPhase', target: 1 } }],
  ['a rule with no target', { rule: { kind: 'finishedCount' } }],
  ['an unknown family', { family: 'streaks' }],
  ['a version below 1', { version: 0 }],
  ['an id with capitals', { id: 'Theme-Calming' }],
  ['a title with no English', { copy: { ...badge().copy, title: { pl: 'x' } } }],
  ['an extra field the app would ignore', { colour: 'red' }],
]) {
  test(`rejects ${label}`, () => {
    assert.notDeepEqual(errorsOf(badge(overrides)), []);
  });
}

test('rejects an unknown language', () => {
  const underTest = errorsOf(badge({ copy: { ...badge().copy, title: { en: 'Calm', xx: 'y' } } }));

  assert.match(underTest.join('\n'), /unknown language "xx"/);
});

test('rejects copy whose lines are not translated alike, so no language shows a half-English badge', () => {
  const underTest = errorsOf(badge({ copy: { ...badge().copy, next: { en: 'Two calming books make this one' } } }));

  assert.match(underTest.join('\n'), /next has no pl/);
});

for (const phrase of ['Come back tomorrow!', 'Hurry, before it is gone', 'Keep your streak going', 'Don\'t miss the next one']) {
  test(`rejects pressure in the copy: "${phrase}"`, () => {
    const underTest = errorsOf(badge({ copy: { ...badge().copy, next: { en: phrase, pl: 'x' } } }));

    assert.match(underTest.join('\n'), /next uses "/);
  });
}

test('matches forbidden words whole, so "window" is not "win"', () => {
  assert.deepEqual(errorsOf(badge({ copy: { ...badge().copy, earned: { en: 'You looked out of the window together', pl: 'x' } } })), []);
});

test('warns when a badge is not translated into every language the app speaks', () => {
  assert.match(validateAchievement(badge()).warnings.join('\n'), /no es/);
});

test('rejects a file whose name is not its id', () => {
  assert.match(errorsOf(badge(), { fileId: 'theme-other' }).join('\n'), /file name/);
});

test('rejects bundled art the app does not carry, but accepts a CMS asset', () => {
  assert.deepEqual(errorsOf(badge({ art: 'moon' })), []);
  assert.match(errorsOf(badge({ art: 'rocket' })).join('\n'), /art/);
});

async function folder(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'badges-'));
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(dir, name), typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

test('loads every badge in the folder, ignoring other files', async () => {
  const dir = await folder({ 'theme-calming.json': badge(), 'README.md': '# badges' });

  const underTest = await loadAchievements(dir);

  assert.deepEqual(underTest.map((entry) => entry.data.id), ['theme-calming']);
});

test('reports a file that is not JSON rather than crashing', async () => {
  const dir = await folder({ 'broken.json': '{nope' });

  const underTest = await validateAchievementFolder(dir);

  assert.equal(underTest.valid, false);
  assert.match(underTest.results[0].errors.join('\n'), /not valid JSON/);
});

test('rejects two badges with one id', async () => {
  const dir = await folder({ 'theme-calming.json': badge(), 'copy.json': badge() });

  const underTest = await validateAchievementFolder(dir);

  assert.equal(underTest.valid, false);
});

test('passes an empty folder', async () => {
  const underTest = await validateAchievementFolder(await folder({}));

  assert.equal(underTest.valid, true);
});

test('accepts a story award for finishing, and for a page that has a challenge', () => {
  const story = {
    id: 'snowy',
    pages: [{ id: 'snowy-4', interactionType: 'music_challenge' }],
    awards: [{ achievementId: 'snowman-friend', trigger: 'finish' }, { achievementId: 'snow-song', trigger: { challengePageId: 'snowy-4' } }],
  };

  assert.deepEqual(validateStoryAwards(story, new Set(['snowman-friend', 'snow-song'])), []);
});

test('rejects a story award for a page with no challenge, or a page that does not exist', () => {
  const story = {
    id: 'snowy',
    pages: [{ id: 'snowy-2', interactionType: 'none' }],
    awards: [{ achievementId: 'a', trigger: { challengePageId: 'snowy-2' } }, { achievementId: 'a', trigger: { challengePageId: 'snowy-9' } }],
  };

  assert.equal(validateStoryAwards(story, new Set(['a'])).length, 2);
});

test('rejects a story award naming a badge the CMS does not define', () => {
  const story = { id: 'snowy', pages: [], awards: [{ achievementId: 'nobody', trigger: 'finish' }] };

  assert.match(validateStoryAwards(story, new Set()).join('\n'), /nobody/);
});
