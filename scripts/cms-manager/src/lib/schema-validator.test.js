import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fullValidation, SUPPORTED_LANGUAGES, AGE_GROUPS } from './schema-validator.js';
import { loadAllStories } from './story-loader.js';

const ALL = Object.fromEntries(SUPPORTED_LANGUAGES.map((code) => [code, `text in ${code}`]));

function story(overrides = {}) {
  return {
    id: 'snowy',
    title: 'Snowy Day',
    category: 'nature',
    localizedTitle: ALL,
    pages: [
      { id: 'snowy-cover', pageNumber: 0, type: 'cover', text: 'Snowy Day', localizedText: { '4-6': ALL } },
      { id: 'snowy-1', pageNumber: 1, type: 'story', text: 'It snowed.', localizedText: { '4-6': ALL } },
    ],
    ...overrides,
  };
}

const options = { storiesDir: null };

test('knows the 14 languages and three age groups the app reads', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 14);
  assert.deepEqual(AGE_GROUPS, ['0-2', '2-4', '4-6']);
});

test('passes a complete story with no warnings', async () => {
  const result = await fullValidation(story(), options);

  assert.deepEqual(result, { valid: true, schemaErrors: [], customErrors: [], warnings: [] });
});

test('reports a schema error with a readable detail', async () => {
  const result = await fullValidation(story({ category: 'spooky' }), options);

  assert.equal(result.valid, false);
  assert.match(result.schemaErrors[0].detail, /category/);
});

test('reports a missing required field', async () => {
  const { title, ...untitled } = story();

  const result = await fullValidation(untitled, options);

  assert.equal(result.valid, false);
  assert.ok(result.schemaErrors.some((e) => /title/.test(e.detail)));
});

test('refuses page text in the old flat shape', async () => {
  const flat = story();
  flat.pages[1].localizedText = { en: 'It snowed.' };

  const result = await fullValidation(flat, options);

  assert.equal(result.valid, false);
  assert.ok(result.customErrors.some((e) => /snowy-1.*age group "en"/.test(e)), result.customErrors.join('\n'));
});

test('refuses an unknown language in page text', async () => {
  const odd = story();
  odd.pages[1].localizedText = { '4-6': { ...ALL, xx: 'huh' } };

  const result = await fullValidation(odd, options);

  assert.ok(result.customErrors.some((e) => /snowy-1.*"xx"/.test(e)));
});

test('refuses an unknown language in the title', async () => {
  const result = await fullValidation(story({ localizedTitle: { ...ALL, klingon: 'x' } }), options);

  assert.ok(result.customErrors.some((e) => /localizedTitle.*"klingon"/.test(e)));
});

test('refuses two pages with the same id', async () => {
  const twice = story();
  twice.pages[1].id = 'snowy-cover';

  const result = await fullValidation(twice, options);

  assert.ok(result.customErrors.some((e) => /page id "snowy-cover"/.test(e)));
});

test('refuses two pages with the same number', async () => {
  const twice = story();
  twice.pages[1].pageNumber = 0;

  const result = await fullValidation(twice, options);

  assert.ok(result.customErrors.some((e) => /page number 0/.test(e)));
});

test('warns about a missing translation without failing', async () => {
  const partial = story();
  const { ja, ...noJapanese } = ALL;
  partial.pages[1].localizedText = { '4-6': noJapanese };

  const result = await fullValidation(partial, options);

  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((w) => /snowy-1.*4-6.*ja/.test(w)));
});

test('warns about an empty translation', async () => {
  const blank = story();
  blank.pages[1].localizedText = { '4-6': { ...ALL, pl: '' } };

  const result = await fullValidation(blank, options);

  assert.ok(result.warnings.some((w) => /snowy-1.*4-6.*pl/.test(w)));
});

test('warns when a referenced image is not in the story folder', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cms-stories-'));
  await fs.mkdir(path.join(dir, 'snowy', 'cover'), { recursive: true });
  await fs.writeFile(path.join(dir, 'snowy', 'cover', 'cover.webp'), 'x');
  const withImages = story({ coverImage: 'assets/stories/snowy/cover/cover.webp' });
  withImages.pages[1].backgroundImage = 'assets/stories/snowy/page-1/background.webp';

  const result = await fullValidation(withImages, { storiesDir: dir });

  assert.deepEqual(result.warnings, ['snowy-1: backgroundImage assets/stories/snowy/page-1/background.webp is not in the story folder']);
});

test('passes every story in the repository without errors', async () => {
  const stories = await loadAllStories();
  const failures = [];

  for (const s of stories) {
    const result = await fullValidation(s.data, { storiesDir: null });
    if (!result.valid) failures.push(`${s.id}: ${[...result.schemaErrors.map((e) => e.detail), ...result.customErrors].join('; ')}`);
  }

  assert.deepEqual(failures, []);
  assert.ok(stories.length > 100);
});
