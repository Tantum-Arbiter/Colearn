/**
 * A real CMS story, exactly as the CMS writes it and the gateway sends it,
 * keeps every translation when the app merges it over a bundled book.
 */

import type { Story } from '@/types/story';

jest.mock('@/data/stories', () => ({ ALL_STORIES: [] as Story[], getAvailableStories: jest.fn() }));
jest.mock('@/services/cache-manager', () => ({ CacheManager: { getStoriesWithResolvedUrls: jest.fn() } }));
jest.mock('@/services/story-download-service', () => ({
  StoryDownloadService: { getHiddenBundledStoryIds: jest.fn(() => Promise.resolve(new Set())) },
}));
jest.mock('@/services/story-sync-service', () => ({ StorySyncService: { syncStories: jest.fn(), getSyncStatus: jest.fn() } }));

import { StoryLoader } from '@/services/story-loader';
import { CacheManager } from '@/services/cache-manager';
import * as storiesData from '@/data/stories';
import { getLocalizedText } from '@/types/story';

const FIXTURES = ['reading-story-1', 'music-story-1'];

function load(name: string): Story {
  return JSON.parse(JSON.stringify(require(`../../../contract-fixtures/stories/${name}.json`)));
}

describe.each(FIXTURES)('the CMS story %s', (name) => {
  beforeEach(() => {
    StoryLoader.invalidateCache();
  });

  it('keeps every language on every page when merged over the bundled book', async () => {
    const cms = load(name);
    const bundled = { ...load(name), pages: cms.pages!.map(p => ({ ...p, localizedText: { '4-6': { en: p.text } } })) };
    (storiesData as unknown as { ALL_STORIES: Story[] }).ALL_STORIES.splice(0, Infinity, bundled);
    (CacheManager.getStoriesWithResolvedUrls as jest.Mock).mockResolvedValue([cms]);

    const [underTest] = await StoryLoader.getStories();

    underTest.pages!.forEach((page, i) => expect(page.localizedText).toEqual(cms.pages![i].localizedText));
  });

  it('shows a Polish toddler the Polish text of a book written for 4-6', () => {
    const page = load(name).pages![1];

    expect(getLocalizedText(undefined, page.text, 'pl', page.localizedText, '0-2')).toBe(page.localizedText!['4-6']!.pl);
  });
});
