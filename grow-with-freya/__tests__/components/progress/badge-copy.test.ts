/**
 * Badge copy never presses a child to come back (ACHIEVEMENTS-PLAN §8). The
 * bundled badges are held to the same forbidden-phrase list the CMS validator
 * uses, and the art keys a CMS badge may name are the art the app carries.
 */

import en from '@/locales/en';
import { ART } from '@/components/progress/badge-art';
import { BUNDLED_ACHIEVEMENTS } from '@/components/progress/achievements';

const forbidden: string[] = require('../../../../contract-fixtures/badge-copy-forbidden.json').en;
const bundledArt: string[] = require('../../../../contract-fixtures/badge-bundled-art.json').keys;

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const bundledCopy = BUNDLED_ACHIEVEMENTS.flatMap((definition) =>
  'titleKey' in definition.copy ? [definition.copy.titleKey, definition.copy.descriptionKey] : []);

describe('bundled badge copy', () => {
  it.each(bundledCopy)('%s exists in English', (key) => {
    expect(typeof lookup(key)).toBe('string');
  });

  it.each(bundledCopy)('%s uses none of the forbidden phrases', (key) => {
    const text = String(lookup(key));
    const found = forbidden.filter((phrase) => new RegExp(`\\b${escape(phrase)}\\b`, 'i').test(text));

    expect(found).toEqual([]);
  });

  it('asks for a finished first story, since the badge counts finished books, not opened ones', () => {
    expect(en.progress.badges.firstStory.description).toMatch(/finish/i);
    expect(en.progress.badges.firstStory.description).not.toMatch(/open/i);
  });

  it('catches a forbidden phrase when one is used', () => {
    expect(forbidden.some((phrase) => new RegExp(`\\b${escape(phrase)}\\b`, 'i').test('Come back tomorrow for more'))).toBe(true);
  });
});

describe('badge art', () => {
  it('offers the CMS exactly the art the app carries', () => {
    expect(Object.keys(ART).sort()).toEqual([...bundledArt].sort());
  });

  it('gives every bundled badge art the app carries', () => {
    BUNDLED_ACHIEVEMENTS.forEach((definition) => expect(bundledArt).toContain(definition.art));
  });
});
