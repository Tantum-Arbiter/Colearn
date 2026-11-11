import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import fsSync from 'fs';
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
  assert.deepEqual(AGE_GROUPS, ['1-2', '2-4', '4-6']);
});

test('reports page text still keyed by the youngest group`s old name, 0-2', async () => {
  const keyedOld = story();
  keyedOld.pages[1].localizedText = { '0-2': ALL };

  const result = await fullValidation(keyedOld, options);

  assert.equal(result.valid, false);
  assert.ok(result.customErrors.some((error) => error.includes('"0-2"') && error.includes('1-2, 2-4, 4-6')), JSON.stringify(result.customErrors));
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

test('accepts the badges a book awards', async () => {
  const result = await fullValidation(story({ awards: [
    { achievementId: 'snowman-friend', trigger: 'finish' },
    { achievementId: 'snow-song', trigger: { challengePageId: 'snowy-1' } },
  ] }), options);

  assert.deepEqual(result.schemaErrors, []);
});

test('rejects an award with a trigger the app does not know', async () => {
  const result = await fullValidation(story({ awards: [{ achievementId: 'snowman-friend', trigger: 'open' }] }), options);

  assert.equal(result.valid, false);
});

const fox = () => JSON.parse(fsSync.readFileSync(path.join(import.meta.dirname, '..', '..', '..', '..', 'contract-fixtures', 'stories', 'little-fox-meets-a-friend.json'), 'utf8'));

test('learning challenges ride along: Little Fox passes the schema and catalogue checks', async () => {
  const result = await fullValidation(fox(), { storiesDir: null });

  assert.equal(result.valid, true, result.customErrors.join('\n'));
  assert.deepEqual(result.customErrors, []);
});

test('learning challenges ride along: a mechanic that disagrees with the catalogue is refused', async () => {
  const story = fox();
  story.pages[3].learningChallenge.family = 'tap_scene';

  const result = await fullValidation(story, { storiesDir: null });

  assert.equal(result.valid, false);
  assert.ok(result.customErrors.some((error) => /is a choose mechanic, not tap_scene/.test(error)));
});

const counting = () => {
  const story = fox();
  const challenge = story.pages[3].learningChallenge;
  Object.assign(challenge, { mechanicId: 'M01', family: 'tap_scene', adapter: 'multi_tap_count', assessmentMode: 'guided_observable', domain: 'maths', target: '' });
  challenge.items = challenge.items.map(({ image: _image, outcome: _outcome, ...item }, index) => ({ ...item, hotspot: { position: { x: 0.3 + index * 0.15, y: 0.3 }, size: { width: 0.1, height: 0.12 } } }));
  return story;
};

test('learning challenges ride along: a scene whose items are hotspots on the page passes', async () => {
  const result = await fullValidation(counting(), { storiesDir: null });

  assert.deepEqual(result.schemaErrors, []);
  assert.equal(result.valid, true, result.customErrors.join('\n'));
});

test('learning challenges ride along: a hotspot carries only a position and a size', async () => {
  const story = counting();
  story.pages[3].learningChallenge.items[0].hotspot.colour = 'gold';

  const result = await fullValidation(story, { storiesDir: null });

  assert.equal(result.valid, false);
  assert.ok(result.schemaErrors.length > 0);
});
