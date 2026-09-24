const crypto = require('crypto');

const IGNORED_FIELDS = new Set(['checksum', 'createdAt', 'updatedAt', 'version']);

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function storyChecksum(story) {
  const content = Object.fromEntries(Object.entries(story).filter(([key]) => !IGNORED_FIELDS.has(key)));
  return crypto.createHash('sha256').update(canonicalJson(content), 'utf8').digest('hex');
}

module.exports = { canonicalJson, storyChecksum };
