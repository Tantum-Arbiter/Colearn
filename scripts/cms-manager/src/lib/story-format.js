import checksumModule from '../../../lib/story-checksum.js';

const { storyChecksum } = checksumModule;

const DEFAULTS = [
  ['isAvailable', () => true],
  ['isPremium', () => false],
  ['version', () => 1],
  ['author', () => 'earlyroots'],
  ['tags', () => []],
];

export function formatStoryData(data) {
  const changes = [];
  const formatted = JSON.parse(JSON.stringify(data));

  for (const [field, value] of DEFAULTS) {
    if (formatted[field] === undefined || formatted[field] === null) {
      formatted[field] = value();
      changes.push(`Set ${field} to ${JSON.stringify(formatted[field])}`);
    }
  }

  if (formatted.pages && formatted.duration !== formatted.pages.length) {
    formatted.duration = formatted.pages.length;
    changes.push(`Updated duration to ${formatted.pages.length}`);
  }

  (formatted.pages || []).forEach((page, index) => {
    const expectedId = index === 0 ? `${formatted.id}-cover` : `${formatted.id}-${index}`;
    if (page.id !== expectedId) {
      page.id = expectedId;
      changes.push(`Normalized page ${index} ID to ${expectedId}`);
    }
  });

  const checksum = storyChecksum(formatted);
  if (formatted.checksum !== checksum) {
    formatted.checksum = checksum;
    changes.push('Updated checksum');
  }

  return { formatted, changes };
}
