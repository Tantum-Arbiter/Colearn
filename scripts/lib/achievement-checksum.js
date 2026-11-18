const crypto = require('crypto');
const { canonicalJson } = require('./story-checksum');

const IGNORED_FIELDS = new Set(['checksum', 'createdAt', 'updatedAt']);

function achievementChecksum(definition) {
  const content = Object.fromEntries(Object.entries(definition).filter(([key]) => !IGNORED_FIELDS.has(key)));
  return crypto.createHash('sha256').update(canonicalJson(content), 'utf8').digest('hex');
}

function planUpload(local, remoteChecksums, { prune = false } = {}) {
  const checksums = {};
  const writes = [];
  for (const definition of local) {
    const checksum = achievementChecksum(definition);
    checksums[definition.id] = checksum;
    if (remoteChecksums[definition.id] !== checksum) writes.push(definition);
  }
  const localIds = new Set(local.map((definition) => definition.id));
  const orphans = Object.keys(remoteChecksums).filter((id) => !localIds.has(id)).sort();
  if (!prune) {
    for (const id of orphans) checksums[id] = remoteChecksums[id];
  }
  return { writes, deletes: prune ? orphans : [], kept: prune ? [] : orphans, checksums };
}

module.exports = { achievementChecksum, planUpload };
