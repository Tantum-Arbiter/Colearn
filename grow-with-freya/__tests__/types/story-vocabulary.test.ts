/**
 * The CMS schema is the source of the story vocabulary: a tag or category
 * the CMS can write must be one the app can show, and the app must not
 * offer one the CMS can never send.
 */

import { STORY_FILTER_TAGS, STORY_TAGS } from '@/types/story';
import en from '@/locales/en';

const schema = require('../../../scripts/story-schema.json');

function lookup(key: string): unknown {
  return key.split('.').reduce<any>((node, part) => (node == null ? undefined : node[part]), en);
}

describe('story vocabulary', () => {
  it('offers exactly the tags the CMS can write', () => {
    expect(Object.keys(STORY_FILTER_TAGS).sort()).toEqual([...schema.properties.tags.items.enum].sort());
  });

  it('knows exactly the categories the CMS can write', () => {
    expect(Object.keys(STORY_TAGS).sort()).toEqual([...schema.properties.category.enum].sort());
  });

  it.each(Object.values(STORY_FILTER_TAGS).map(tag => [tag.id, tag.labelKey]))('labels the tag %s with copy that exists', (_id, labelKey) => {
    expect(typeof lookup(labelKey)).toBe('string');
  });

  it.each(Object.values(STORY_TAGS).map(tag => [tag.category, tag.labelKey]))('labels the category %s with copy that exists', (_id, labelKey) => {
    expect(typeof lookup(labelKey)).toBe('string');
  });

  it.each(Object.entries(STORY_FILTER_TAGS))('keys the tag %s by its own id', (key, tag) => {
    expect(tag.id).toBe(key);
  });
});
