import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createStoryStore, CMS_STORIES_DIR } from './story-loader.js';

let dir;
let store;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cms-stories-'));
  store = createStoryStore(dir);
});

async function writeStory(id, data, assets = []) {
  await fs.mkdir(path.join(dir, id), { recursive: true });
  await fs.writeFile(path.join(dir, id, 'story-data.json'), typeof data === 'string' ? data : JSON.stringify(data));
  for (const asset of assets) {
    await fs.mkdir(path.dirname(path.join(dir, id, asset)), { recursive: true });
    await fs.writeFile(path.join(dir, id, asset), 'x');
  }
}

test('points at the repository\'s cms-stories directory by default', () => {
  assert.equal(path.basename(CMS_STORIES_DIR), 'cms-stories');
  assert.equal(path.basename(path.dirname(CMS_STORIES_DIR)), 'scripts');
});

test('loads one story by id', async () => {
  await writeStory('snowy', { id: 'snowy', title: 'Snowy' });

  assert.deepEqual(await store.loadStory('snowy'), { id: 'snowy', data: { id: 'snowy', title: 'Snowy' } });
});

test('returns null for a story that does not exist', async () => {
  assert.equal(await store.loadStory('missing'), null);
});

test('loads every story directory in name order, and skips loose files', async () => {
  await writeStory('b-story', { id: 'b-story' });
  await writeStory('a-story', { id: 'a-story' });
  await fs.writeFile(path.join(dir, 'upload-manifest.json'), '{}');

  const stories = await store.loadAllStories();

  assert.deepEqual(stories.map((s) => s.id), ['a-story', 'b-story']);
});

test('keeps a story whose JSON is broken, with no data and the parse error', async () => {
  await writeStory('broken', '{ not json');

  const [story] = await store.loadAllStories();

  assert.equal(story.id, 'broken');
  assert.equal(story.data, null);
  assert.match(story.error, /JSON/);
});

test('skips a directory with no story-data.json', async () => {
  await fs.mkdir(path.join(dir, 'empty'));

  assert.deepEqual(await store.loadAllStories(), []);
});

test('saves a story as two-space JSON with a trailing newline', async () => {
  await store.saveStory('snowy', { id: 'snowy', title: 'Łódź 🌙' });

  const written = await fs.readFile(path.join(dir, 'snowy', 'story-data.json'), 'utf8');
  assert.equal(written, '{\n  "id": "snowy",\n  "title": "Łódź 🌙"\n}\n');
});

test('says whether a story exists', async () => {
  await writeStory('snowy', { id: 'snowy' });

  assert.equal(await store.storyExists('snowy'), true);
  assert.equal(await store.storyExists('missing'), false);
});

test('lists a story\'s assets with the path GCS will hold them under', async () => {
  await writeStory('snowy', { id: 'snowy' }, ['cover/cover.webp', 'page-1/background.webp', 'page-1/props/owl.webp']);

  const assets = await store.getStoryAssets('snowy');

  assert.deepEqual(assets, [
    { relativePath: 'cover/cover.webp', gcsPath: 'stories/snowy/cover/cover.webp' },
    { relativePath: 'page-1/background.webp', gcsPath: 'stories/snowy/page-1/background.webp' },
    { relativePath: 'page-1/props/owl.webp', gcsPath: 'stories/snowy/page-1/props/owl.webp' },
  ]);
});

test('leaves story-data.json and hidden files out of the assets', async () => {
  await writeStory('snowy', { id: 'snowy' }, ['.DS_Store', 'cover/.DS_Store', 'cover/cover.webp']);

  const assets = await store.getStoryAssets('snowy');

  assert.deepEqual(assets.map((a) => a.relativePath), ['cover/cover.webp']);
});

test('has no assets for a story that does not exist', async () => {
  assert.deepEqual(await store.getStoryAssets('missing'), []);
});
