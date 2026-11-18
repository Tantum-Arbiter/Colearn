/**
 * A book's description is never longer than Snuggle Little Wombat's. That
 * length fits the library's featured tile as it is drawn, beside the cover and
 * above the progress bar and Read Now, without running into either (operator,
 * 2026-11-13). Every language of every book the app ships is held to it, each
 * against Wombat's description in that same language, since a translation
 * takes more or fewer words than the English. Japanese and Chinese leave no
 * spaces between words, so they are measured in characters.
 */

import fs from 'fs';
import path from 'path';
import { ALL_STORIES } from '@/data/stories';
import { BUNDLED_STORIES } from '@/data/bundled-stories';
import { GENERATED_STORIES } from '@/data/generated-stories';
import type { Story } from '@/types/story';

const WOMBAT = 'A gentle bedtime story about a little wombat getting ready for sleep with cozy snuggles and sweet dreams.';
const MAX_WORDS = 18;
const UNSPACED = new Set(['ja', 'zh']);
const ASSET_STORIES = path.join(__dirname, '../../assets/stories');

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

function lengthIn(language: string, text: string): number {
  return UNSPACED.has(language) ? Array.from(text.replace(/\s+/g, '')).length : wordCount(text);
}

interface Description {
  where: string;
  language: string;
  text: string;
}

function descriptionsOf(where: string, story: Pick<Story, 'description' | 'localizedDescription'>): Description[] {
  const own = story.description ? [{ where: `${where} description`, language: 'en', text: story.description }] : [];
  const localized = Object.entries(story.localizedDescription ?? {}).map(([language, text]) => ({
    where: `${where} description (${language})`,
    language,
    text: text ?? '',
  }));
  return [...own, ...localized];
}

function wombatIn(language: string): string | undefined {
  const wombat = BUNDLED_STORIES.find((story) => story.id === 'snuggle-little-wombat');
  const localized = ALL_STORIES.find((story) => story.id === 'snuggle-little-wombat')?.localizedDescription as Record<string, string> | undefined;
  return language === 'en' ? wombat?.description : localized?.[language];
}

function assetDescriptions(): Description[] {
  return fs
    .readdirSync(ASSET_STORIES)
    .map((folder) => path.join(ASSET_STORIES, folder, 'story-data.json'))
    .filter((file) => fs.existsSync(file))
    .flatMap((file) => descriptionsOf(path.relative(ASSET_STORIES, file), JSON.parse(fs.readFileSync(file, 'utf8'))));
}

const SHIPPED: Description[] = [
  ...[...ALL_STORIES, ...BUNDLED_STORIES, ...GENERATED_STORIES].flatMap((story) => descriptionsOf(story.id, story)),
  ...assetDescriptions(),
];

describe('counting the words of a description', () => {
  it.each([
    ['nothing', '', 0],
    ['only spaces', '   ', 0],
    ['one word', 'Wombat', 1],
    ['words with stray spaces and a line break', '  Nori  the\ndormouse ', 3],
    ["a word with an apostrophe as one word", "Papa's tummy", 2],
    ['punctuation riding on a word', 'Wait, Finn!', 2],
  ])('should count %s', (_label, text, words) => {
    expect(wordCount(text)).toBe(words);
  });

  it.each([
    ['English in words', 'en', 'a little wombat', 3],
    ['German in words', 'de', 'ein kleiner Wombat', 3],
    ['Japanese in characters', 'ja', '小さな ウォンバット', 9],
    ['Chinese in characters', 'zh', '小袋熊。', 4],
  ])('should measure %s', (_label, language, text, length) => {
    expect(lengthIn(language, text)).toBe(length);
  });
});

describe('the length of a book description', () => {
  it("should be set by Snuggle Little Wombat's description", () => {
    const wombat = BUNDLED_STORIES.find((story) => story.id === 'snuggle-little-wombat');

    expect(wombat?.description).toBe(WOMBAT);
    expect(wordCount(WOMBAT)).toBe(MAX_WORDS);
  });

  it('should have the wombat in every language a book carries, to measure it against', () => {
    const languages = new Set(SHIPPED.map((description) => description.language));

    languages.forEach((language) => expect(wombatIn(language)).toEqual(expect.any(String)));
    expect(languages.has('ja')).toBe(true);
  });

  it('should be checked on every book the app ships, in every language it carries', () => {
    const ids = new Set(SHIPPED.map((description) => description.where.split(' ')[0]));

    ['snuggle-little-wombat', 'hold-on-juni', 'my-turn-to-ding', 'little-fox-meets-a-friend', 'the-lantern-bridge'].forEach((id) =>
      expect(ids.has(id)).toBe(true)
    );
    expect(SHIPPED.some((description) => description.where.includes('(en)'))).toBe(true);
    expect(SHIPPED.some((description) => description.where.startsWith('hold-on-juni/story-data.json'))).toBe(true);
  });

  it.each(SHIPPED.map((description) => [description.where, description.language, description.text] as const))(
    'should run no longer than the wombat: %s',
    (_where, language, text) => {
      expect(lengthIn(language, text)).toBeLessThanOrEqual(lengthIn(language, wombatIn(language) ?? ''));
    }
  );
});
