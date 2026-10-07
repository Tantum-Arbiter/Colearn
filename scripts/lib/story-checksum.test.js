const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { storyChecksum, canonicalJson } = require('./story-checksum');

const FIXTURES = path.join(__dirname, '..', '..', 'contract-fixtures');
const readFixture = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
const story = () => readFixture('stories/reading-story-1.json');

test('is a 64-character SHA-256 hex digest', () => {
  assert.match(storyChecksum(story()), /^[0-9a-f]{64}$/);
});

test('does not depend on key order', () => {
  const original = story();
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  reordered.pages = original.pages.map((page) => Object.fromEntries(Object.entries(page).reverse()));

  assert.equal(storyChecksum(reordered), storyChecksum(original));
});

for (const field of ['checksum', 'createdAt', 'updatedAt', 'version']) {
  test(`ignores ${field}`, () => {
    const changed = { ...story(), [field]: 'something else' };

    assert.equal(storyChecksum(changed), storyChecksum(story()));
  });
}

const contentChanges = {
  title: (s) => { s.title = 'Another title'; },
  isFree: (s) => { s.isFree = !s.isFree; },
  isPremium: (s) => { s.isPremium = !s.isPremium; },
  isAvailable: (s) => { s.isAvailable = !s.isAvailable; },
  tags: (s) => { s.tags = [...(s.tags || []), 'bedtime']; },
  ageRange: (s) => { s.ageRange = '0-2'; },
  duration: (s) => { s.duration = (s.duration || 0) + 1; },
  coverImage: (s) => { s.coverImage = 'other.webp'; },
  author: (s) => { s.author = 'someone'; },
  category: (s) => { s.category = 'adventure'; },
  localizedTitle: (s) => { s.localizedTitle = { ...s.localizedTitle, pl: 'Inny tytuł' }; },
  'page text': (s) => { s.pages[1].text = 'Changed'; },
  'page translation': (s) => { s.pages[1].localizedText['4-6'].pl = 'Zmienione'; },
  'page background': (s) => { s.pages[1].backgroundImage = 'other.webp'; },
  'reading challenge': (s) => { s.pages[1].readingChallenge = { ...s.pages[1].readingChallenge, allowSkip: !s.pages[1].readingChallenge.allowSkip }; },
  'jigsaw puzzle': (s) => { s.pages[1].jigsawPuzzle = { rows: 3, cols: 3 }; },
  'page order': (s) => { s.pages.reverse(); },
  'a new field': (s) => { s.awards = [{ achievementId: 'theme-bedtime', trigger: 'finish' }]; },
};

for (const [name, change] of Object.entries(contentChanges)) {
  test(`changes when the ${name} changes`, () => {
    const changed = story();
    change(changed);

    assert.notEqual(storyChecksum(changed), storyChecksum(story()));
  });
}

test('writes canonical JSON with sorted keys at every level', () => {
  assert.equal(canonicalJson({ b: 1, a: { d: [2, { f: 1, e: 0 }], c: 'x' } }), '{"a":{"c":"x","d":[2,{"e":0,"f":1}]},"b":1}');
});

test('matches the checksums the gateway computes from the same stories', () => {
  const expected = readFixture('story-checksums.json');

  for (const [file, checksum] of Object.entries(expected)) {
    assert.equal(storyChecksum(readFixture(`stories/${file}`)), checksum, file);
  }
});
