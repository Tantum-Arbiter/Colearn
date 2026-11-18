import { challengeAssetPaths, pageAssetPaths, withResolvedChallengeAssets } from '@/services/page-assets';
import type { LearningChallenge, StoryPage } from '@/types/story';

const book = JSON.parse(JSON.stringify(require('../../../contract-fixtures/stories/little-fox-meets-a-friend.json')));
const fox: StoryPage = book.pages[3];
const challenge: LearningChallenge = {
  ...(book.pages[7].learningChallenge as LearningChallenge),
  stateAfter: { image: 'assets/stories/little-fox-meets-a-friend/page-8/challenge/after.webp', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
};

describe('pageAssetPaths: every picture a page needs offline', () => {
  it('lists the background, and each choice`s cut-out with the page it leads to', () => {
    expect(pageAssetPaths(fox)).toEqual([
      'assets/stories/little-fox-meets-a-friend/page-4/background.webp',
      'assets/stories/little-fox-meets-a-friend/page-4/challenge/finn-says-sorry.webp',
      'assets/stories/little-fox-meets-a-friend/page-4/outcomes/finn-says-sorry.webp',
      'assets/stories/little-fox-meets-a-friend/page-4/challenge/finn-talks-softly.webp',
      'assets/stories/little-fox-meets-a-friend/page-4/outcomes/finn-talks-softly.webp',
      'assets/stories/little-fox-meets-a-friend/page-4/challenge/finn-stays-still.webp',
      'assets/stories/little-fox-meets-a-friend/page-4/outcomes/finn-stays-still.webp',
    ]);
  });

  it('a plain page lists its background, character and props only', () => {
    const page: StoryPage = { id: 'p', pageNumber: 1, text: '', backgroundImage: 'bg.webp', characterImage: 'c.webp', interactiveElements: [{ id: 'e', type: 'reveal', image: 'e.webp', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } }] };

    expect(pageAssetPaths(page)).toEqual(['bg.webp', 'c.webp', 'e.webp']);
  });

  it('a challenge without an after patch lists its items alone', () => {
    const { stateAfter: _none, ...shared } = challenge;
    const bare = { ...shared, items: shared.items.map(({ outcome: _own, ...item }) => item) };

    expect(challengeAssetPaths(bare)).toHaveLength(3);
    expect(challengeAssetPaths(undefined)).toEqual([]);
  });

  it('a choice`s own after picture travels too', () => {
    const own = { ...challenge, items: [{ ...challenge.items[0], outcome: { stateAfter: { ...challenge.stateAfter!, image: 'assets/stories/x/page-4/challenge/after-steps-back.webp' } } }] };

    expect(challengeAssetPaths(own)).toContain('assets/stories/x/page-4/challenge/after-steps-back.webp');
  });
});

describe('pageAssetPaths: a scene challenge', () => {
  it('a hotspot item has no picture of its own to download', () => {
    const scene = { ...challenge, items: [{ id: 'hook-1', label: { en: 'hook' }, hotspot: { position: { x: 0.3, y: 0.3 }, size: { width: 0.1, height: 0.1 } } }] };

    expect(challengeAssetPaths(scene)).toEqual([challenge.stateAfter!.image]);
  });
});

describe('withResolvedChallengeAssets: paths become local files', () => {
  it('resolves every item and the after patch, leaving the rest untouched', async () => {
    const resolved = await withResolvedChallengeAssets(challenge, async (path) => `file:///cache/${path}`);

    expect(resolved.items.map((item) => item.image)).toEqual(challenge.items.map((item) => `file:///cache/${item.image}`));
    expect(resolved.stateAfter?.image).toBe(`file:///cache/${challenge.stateAfter!.image}`);
    expect(resolved.copy).toBe(challenge.copy);
    expect(challenge.items[0].image).toMatch(/^assets\//);
  });

  it('leaves a hotspot item without a picture as it is', async () => {
    const scene = { ...challenge, items: [{ id: 'hook-1', label: { en: 'hook' }, hotspot: { position: { x: 0.3, y: 0.3 }, size: { width: 0.1, height: 0.1 } } }] };

    const resolved = await withResolvedChallengeAssets(scene, async (path) => `file:///cache/${path}`);

    expect(resolved.items[0]).toEqual(scene.items[0]);
  });
});
