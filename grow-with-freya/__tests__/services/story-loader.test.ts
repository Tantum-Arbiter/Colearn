/**
 * The story loader keeps a bundled book's own art and text, takes the CMS
 * translations over it, and never lets an empty CMS value wipe what the
 * book already carries.
 */

import type { Story, StoryPage } from '@/types/story';

jest.mock('@/data/stories', () => ({
  ALL_STORIES: [] as Story[],
  getAvailableStories: jest.fn(),
}));
jest.mock('@/services/cache-manager', () => ({
  CacheManager: { getStoriesWithResolvedUrls: jest.fn() },
}));
jest.mock('@/services/story-download-service', () => ({
  StoryDownloadService: { getHiddenBundledStoryIds: jest.fn() },
}));

import { StoryLoader } from '@/services/story-loader';
import { CacheManager } from '@/services/cache-manager';
import { StoryDownloadService } from '@/services/story-download-service';
import * as storiesData from '@/data/stories';

const bundledText = { '4-6': { en: 'Squirrel puts her boots on.', pl: 'Wiewiórka zakłada buty.' } };
const cmsText = { '4-6': { en: 'Squirrel puts her boots on.', de: 'Das Eichhörnchen zieht die Stiefel an.' } };

function page(id: string, overrides: Partial<StoryPage> = {}): StoryPage {
  return { id, pageNumber: 1, text: 'Squirrel puts her boots on.', backgroundImage: `bundled/${id}.webp`, ...overrides };
}

function story(id: string, overrides: Partial<Story> = {}): Story {
  return {
    id,
    title: 'Snowy Day',
    category: 'nature',
    isAvailable: true,
    isFree: true,
    isReferralReward: false,
    isPremium: false,
    pages: [page(`${id}-p1`, { localizedText: bundledText })],
    ...overrides,
  } as Story;
}

function setBundled(stories: Story[]) {
  const list = (storiesData as unknown as { ALL_STORIES: Story[] }).ALL_STORIES;
  list.splice(0, list.length, ...stories);
}

function setCms(stories: Story[] | null) {
  (CacheManager.getStoriesWithResolvedUrls as jest.Mock).mockResolvedValue(stories);
}

describe('StoryLoader merging bundled books with the CMS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    StoryLoader.invalidateCache();
    (StoryDownloadService.getHiddenBundledStoryIds as jest.Mock).mockResolvedValue(new Set());
    setBundled([story('snowy')]);
  });

  it('should take the CMS translations for a bundled book and keep its bundled art', async () => {
    setCms([story('snowy', { pages: [page('snowy-p1', { localizedText: cmsText, backgroundImage: 'remote.webp' })] })]);

    const underTest = await StoryLoader.getStories();

    expect(underTest[0].pages?.[0].localizedText).toEqual(cmsText);
    expect(underTest[0].pages?.[0].backgroundImage).toBe('bundled/snowy-p1.webp');
  });

  it.each([
    ['an empty object', {}],
    ['missing', undefined],
    ['null', null],
  ])('should keep the bundled page text when the CMS page text is %s', async (_label, cmsPageText) => {
    setCms([story('snowy', { pages: [page('snowy-p1', { localizedText: cmsPageText as never })] })]);

    const underTest = await StoryLoader.getStories();

    expect(underTest[0].pages?.[0].localizedText).toEqual(bundledText);
  });

  it.each([
    ['every CMS age group is empty', { '4-6': {} }],
    ['every CMS translation is an empty string', { '4-6': { en: '', pl: '' } }],
  ])('should keep the bundled page text when %s', async (_label, cmsPageText) => {
    setCms([story('snowy', { pages: [page('snowy-p1', { localizedText: cmsPageText as never })] })]);

    const underTest = await StoryLoader.getStories();

    expect(underTest[0].pages?.[0].localizedText).toEqual(bundledText);
  });

  it.each([
    ['localizedTitle', { en: 'Snowy Day', pl: 'Śnieżny dzień' }],
    ['localizedDescription', { en: 'A walk in the snow', pl: 'Spacer po śniegu' }],
  ] as const)('should take the CMS %s when it has text', async (field, value) => {
    setCms([story('snowy', { [field]: value })]);

    const underTest = await StoryLoader.getStories();

    expect(underTest[0][field]).toEqual(value);
  });

  it.each(['localizedTitle', 'localizedDescription'] as const)(
    'should keep the bundled %s when the CMS one is an empty object',
    async (field) => {
      const bundledValue = { en: 'Bundled', pl: 'Z pakietu' };
      setBundled([story('snowy', { [field]: bundledValue })]);
      setCms([story('snowy', { [field]: {} })]);

      const underTest = await StoryLoader.getStories();

      expect(underTest[0][field]).toEqual(bundledValue);
    },
  );

  it('should match a CMS page by id before position', async () => {
    const reordered = [
      page('other', { localizedText: { '4-6': { en: 'Wrong page' } } }),
      page('snowy-p1', { localizedText: cmsText }),
    ];
    setCms([story('snowy', { pages: reordered })]);

    const underTest = await StoryLoader.getStories();

    expect(underTest[0].pages?.[0].localizedText).toEqual(cmsText);
  });

  it('should fall back to the CMS page at the same position when no id matches', async () => {
    setCms([story('snowy', { pages: [page('renamed', { localizedText: cmsText })] })]);

    const underTest = await StoryLoader.getStories();

    expect(underTest[0].pages?.[0].localizedText).toEqual(cmsText);
  });

  it('should keep a bundled page that the CMS book does not have', async () => {
    setBundled([story('snowy', { pages: [page('snowy-p1', { localizedText: bundledText }), page('snowy-p2', { localizedText: bundledText })] })]);
    setCms([story('snowy', { pages: [page('snowy-p1', { localizedText: cmsText })] })]);

    const underTest = await StoryLoader.getStories();

    expect(underTest[0].pages?.[1].localizedText).toEqual(bundledText);
  });

  it('should add CMS-only books after the bundled ones', async () => {
    setCms([story('cms-only'), story('snowy')]);

    const underTest = await StoryLoader.getStories();

    expect(underTest.map(s => s.id)).toEqual(['snowy', 'cms-only']);
  });

  it('should leave out a bundled book the family has removed', async () => {
    setBundled([story('snowy'), story('kept')]);
    (StoryDownloadService.getHiddenBundledStoryIds as jest.Mock).mockResolvedValue(new Set(['snowy']));
    setCms([]);

    const underTest = await StoryLoader.getStories();

    expect(underTest.map(s => s.id)).toEqual(['kept']);
  });

  it.each([
    ['no CMS data', null],
    ['an empty CMS list', []],
  ])('should return the bundled books when there is %s', async (_label, cms) => {
    setCms(cms);

    const underTest = await StoryLoader.getStories();

    expect(underTest.map(s => s.id)).toEqual(['snowy']);
  });

  it('should fall back to the bundled books when the cache cannot be read', async () => {
    (CacheManager.getStoriesWithResolvedUrls as jest.Mock).mockRejectedValue(new Error('corrupt cache'));

    const underTest = await StoryLoader.getStories();

    expect(underTest.map(s => s.id)).toEqual(['snowy']);
  });

  it('should load once when two screens ask at the same time', async () => {
    setCms([]);

    const [first, second] = await Promise.all([StoryLoader.getStories(), StoryLoader.getStories()]);

    expect(first).toBe(second);
    expect(CacheManager.getStoriesWithResolvedUrls).toHaveBeenCalledTimes(1);
  });

  it('should serve the cached list without reading storage again', async () => {
    setCms([]);
    await StoryLoader.getStories();

    await StoryLoader.getStories();

    expect(CacheManager.getStoriesWithResolvedUrls).toHaveBeenCalledTimes(1);
  });

  it('should read storage again after the cache is invalidated', async () => {
    setCms([]);
    await StoryLoader.getStories();
    StoryLoader.invalidateCache();

    await StoryLoader.getStories();

    expect(CacheManager.getStoriesWithResolvedUrls).toHaveBeenCalledTimes(2);
  });
});
