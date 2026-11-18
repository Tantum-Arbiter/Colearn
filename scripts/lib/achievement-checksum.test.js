const { test } = require('node:test');
const assert = require('node:assert/strict');
const { achievementChecksum, planUpload } = require('./achievement-checksum');

const calm = {
  id: 'theme-calming',
  version: 1,
  status: 'active',
  family: 'theme',
  category: 'calm',
  rule: { kind: 'finishedWithTag', tags: ['calming'], target: 2 },
  art: 'assets/badges/calming.webp',
  copy: { title: { en: 'Calm Collector' }, earned: { en: 'You finished two calming books' }, next: { en: 'Finish two calming books' } },
};

test('does not depend on the order of keys', () => {
  const reordered = { copy: calm.copy, art: calm.art, rule: { target: 2, tags: ['calming'], kind: 'finishedWithTag' }, category: 'calm', family: 'theme', status: 'active', version: 1, id: 'theme-calming' };

  assert.equal(achievementChecksum(reordered), achievementChecksum(calm));
});

test('changes when the version changes, so a re-scored badge reaches the app', () => {
  assert.notEqual(achievementChecksum({ ...calm, version: 2 }), achievementChecksum(calm));
});

for (const [field, value] of [
  ['status', 'retired'],
  ['rule', { kind: 'finishedWithTag', tags: ['calming'], target: 3 }],
  ['art', 'assets/badges/calming-2.webp'],
  ['copy', { ...calm.copy, title: { en: 'Calm Friend' } }],
  ['points', 5],
]) {
  test(`changes when ${field} changes`, () => {
    assert.notEqual(achievementChecksum({ ...calm, [field]: value }), achievementChecksum(calm));
  });
}

test('ignores the bookkeeping fields the upload adds', () => {
  assert.equal(achievementChecksum({ ...calm, checksum: 'x', createdAt: 1, updatedAt: 2 }), achievementChecksum(calm));
});

test('writes only what changed, and keeps every checksum for the index', () => {
  const other = { ...calm, id: 'theme-animals' };
  const underTest = planUpload([calm, other], { 'theme-calming': achievementChecksum(calm), 'theme-animals': 'old' });

  assert.deepEqual(underTest.writes.map((d) => d.id), ['theme-animals']);
  assert.deepEqual(Object.keys(underTest.checksums).sort(), ['theme-animals', 'theme-calming']);
  assert.equal(underTest.checksums['theme-animals'], achievementChecksum(other));
});

test('keeps a badge that is no longer in the folder unless asked to prune, since earned badges must stay visible', () => {
  const underTest = planUpload([calm], { 'theme-calming': achievementChecksum(calm), gone: 'sum' });

  assert.deepEqual(underTest.deletes, []);
  assert.deepEqual(underTest.kept, ['gone']);
  assert.equal(underTest.checksums.gone, 'sum');
});

test('prunes badges no longer in the folder when asked', () => {
  const underTest = planUpload([calm], { 'theme-calming': achievementChecksum(calm), gone: 'sum' }, { prune: true });

  assert.deepEqual(underTest.deletes, ['gone']);
  assert.equal('gone' in underTest.checksums, false);
});
