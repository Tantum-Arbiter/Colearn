import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatStoryData } from './story-format.js';
import checksumModule from '../../../lib/story-checksum.js';

const { storyChecksum } = checksumModule;

function story(overrides = {}) {
  return {
    id: 'snowy',
    title: 'Snowy Day',
    category: 'nature',
    isAvailable: true,
    isPremium: false,
    version: 1,
    author: 'earlyroots',
    tags: [],
    duration: 2,
    pages: [
      { id: 'snowy-cover', pageNumber: 0, text: 'Snowy Day' },
      { id: 'snowy-1', pageNumber: 1, text: 'It snowed.' },
    ],
    ...overrides,
  };
}

function withChecksum(data) {
  return { ...data, checksum: storyChecksum(data) };
}

test('leaves an already formatted story alone', () => {
  const input = withChecksum(story());

  const { formatted, changes } = formatStoryData(input);

  assert.deepEqual(changes, []);
  assert.deepEqual(formatted, input);
});

test('keeps a withdrawn story withdrawn', () => {
  const input = withChecksum(story({ isAvailable: false }));

  const { formatted, changes } = formatStoryData(input);

  assert.equal(formatted.isAvailable, false);
  assert.deepEqual(changes, []);
});

test('keeps a premium story premium, and a free story free', () => {
  const { formatted } = formatStoryData(story({ isPremium: true, isFree: true }));

  assert.equal(formatted.isPremium, true);
  assert.equal(formatted.isFree, true);
});

for (const [field, value] of [['isAvailable', true], ['isPremium', false], ['version', 1], ['author', 'earlyroots'], ['tags', []]]) {
  test(`fills in a missing ${field}`, () => {
    const input = story();
    delete input[field];

    const { formatted, changes } = formatStoryData(input);

    assert.deepEqual(formatted[field], value);
    assert.ok(changes.some((c) => c.includes(field)), changes.join('; '));
  });
}

test('sets duration to the number of pages', () => {
  const { formatted, changes } = formatStoryData(story({ duration: 9 }));

  assert.equal(formatted.duration, 2);
  assert.ok(changes.some((c) => c.includes('duration')));
});

test('renames page ids to the story id convention', () => {
  const input = story();
  input.pages[1].id = 'page-one';

  const { formatted } = formatStoryData(input);

  assert.deepEqual(formatted.pages.map((p) => p.id), ['snowy-cover', 'snowy-1']);
});

test('computes the checksum after every other change, with the shared algorithm', () => {
  const input = story({ duration: 9 });
  input.pages[1].id = 'page-one';

  const { formatted } = formatStoryData(input);

  assert.equal(formatted.checksum, storyChecksum(formatted));
});

test('does not change the input', () => {
  const input = story({ duration: 9 });
  const copy = JSON.parse(JSON.stringify(input));

  formatStoryData(input);

  assert.deepEqual(input, copy);
});
