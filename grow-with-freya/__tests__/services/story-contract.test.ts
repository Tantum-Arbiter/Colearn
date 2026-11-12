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

import { StoryLoader } from '@/services/story-loader';
import { CacheManager } from '@/services/cache-manager';
import * as storiesData from '@/data/stories';
import { getLocalizedText } from '@/types/story';
import { storyWords, wordText } from '@/components/stories/sound-words';

const FIXTURES = ['reading-story-1', 'music-story-1', 'little-fox-meets-a-friend', 'the-lantern-bridge'];

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

  it('shows a Polish toddler the Polish text of a book written for 4-6, or its English until it is translated', () => {
    const page = load(name).pages![1];
    const toddler = page.localizedText!['1-2'] ?? page.localizedText!['4-6']!;

    expect(getLocalizedText(undefined, page.text, 'pl', page.localizedText, '1-2')).toBe(toddler.pl ?? toddler.en);
  });

  it('reaches the reader with every page interaction, challenge included, when it has no bundled book', async () => {
    const cms = load(name);
    (storiesData as unknown as { ALL_STORIES: Story[] }).ALL_STORIES.splice(0, Infinity);
    (CacheManager.getStoriesWithResolvedUrls as jest.Mock).mockResolvedValue([cms]);

    const [underTest] = await StoryLoader.getStories();

    underTest.pages!.forEach((page, i) => {
      expect(page.interactionType).toBe(cms.pages![i].interactionType);
      expect(page.learningChallenge).toEqual(cms.pages![i].learningChallenge);
    });
  });
});

describe('the CMS story little-fox-meets-a-friend', () => {
  it('carries three choose challenges, each with two or three pictured items and a skip line', () => {
    const challenges = load('little-fox-meets-a-friend').pages!.filter((page) => page.interactionType === 'learning_challenge').map((page) => page.learningChallenge!);

    expect(challenges.map((challenge) => challenge.mechanicId)).toEqual(['E06', 'E02', 'L11']);
    expect(challenges.every((challenge) => challenge.family === 'choose' && challenge.items.length >= 2 && challenge.items.length <= 3 && challenge.allowSkip)).toBe(true);
    expect(challenges[0].items.every((item) => item.outcome?.successLine)).toBe(true);
    expect(challenges.every((challenge) => getLocalizedText(undefined, '', 'en', challenge.copy.onSkip, '2-4') !== '')).toBe(true);
  });

  it('page 4 asks what Finn should do after his loud hello, with three ways to help Bramble and real tips for each', () => {
    const page4 = load('little-fox-meets-a-friend').pages![3].learningChallenge!;
    const en = (text: { '2-4'?: { en: string } } | undefined) => text?.['2-4']?.en;

    expect([page4.mechanicId, page4.adapter, page4.target]).toEqual(['E06', 'comfort_choice', '']);
    expect(en(page4.copy.title)).toBe('What should Finn do?');
    expect(en(page4.copy.instruction)).toBe('What should Finn do to help Bramble?');
    expect(page4.items.map((item) => [item.id, item.label.en])).toEqual([
      ['finn-says-sorry', 'Say sorry'],
      ['finn-talks-softly', 'Talk softly'],
      ['finn-stays-still', 'Stay still'],
    ]);
    expect(page4.items.map((item) => item.outcome?.tips?.length)).toEqual([3, 3, 3]);
    expect(page4.byAge?.['1-2']?.items).toEqual(['finn-talks-softly', 'finn-stays-still']);
  });

  const page4Story = [
    ['finn-says-sorry', '2-4', '"Sorry, Bramble, I was loud,"\nSaid Finn, his fox head gently bowed.\nA tiny nose peeped out to see,\nAnd Finn kept still as still could be.'],
    ['finn-talks-softly', '2-4', '"It\'s only me," Finn whispered low,\nIn his quietest voice, so soft and slow.\nA tiny nose peeped out to see\nA gentle fox, calm as could be.'],
    ['finn-stays-still', '2-4', 'Finn stayed so still, he did not shout.\nHe gave her time to peek about.\nA tiny nose came poking through.\nShe wasn\'t ready yet. He knew.'],
    ['finn-talks-softly', '1-2', 'Finn whispers, "It\'s only me." Bramble peeks out.'],
    ['finn-stays-still', '1-2', 'Finn stays very still. Bramble peeks out.'],
    ['finn-says-sorry', '4-6', 'Finn\'s ears drooped. "Sorry, Bramble," he said in his gentlest voice. "I was too loud." Beneath the brambles, the prickly ball wiggled, and a small black nose peeped out to see if he meant it.'],
    ['finn-talks-softly', '4-6', 'Finn crouched low and spoke in his quietest voice. "It\'s only me, Bramble. You\'re safe." Beneath the brambles, the prickly ball loosened just a little, and a small black nose peeped out.'],
    ['finn-stays-still', '4-6', 'Finn stayed as still as a tree stump and didn\'t say a word. He gave Bramble all the time she needed. After a while, a small black nose peeped out from the prickly ball, sniffing the quiet air.'],
  ] as const;

  it.each(page4Story)('page 4: %s tells its own story for the %s band', (id, band, text) => {
    const item = load('little-fox-meets-a-friend').pages![3].learningChallenge!.items.find((each) => each.id === id)!;

    expect(item.outcome?.storyText?.[band]?.en).toBe(text);
  });

  const ownPages = [
    [4, ['finn-says-sorry', 'finn-talks-softly', 'finn-stays-still']],
    [8, ['finn-steps-back', 'finn-waits-nearby', 'finn-leaves-a-berry']],
    [11, ['say-hello', 'ask-to-play', 'say-ill-wait']],
  ] as const;

  it.each(ownPages)('page %i: every choice turns to its own rendered page, a whole page of its own', (pageNumber, ids) => {
    const challenge = load('little-fox-meets-a-friend').pages!.find((page) => page.pageNumber === pageNumber)!.learningChallenge!;

    expect(challenge.items.map((item) => [item.id, item.outcome?.stateAfter])).toEqual(ids.map((id) => [id, {
      image: `assets/stories/little-fox-meets-a-friend/page-${pageNumber}/outcomes/${id}.webp`,
      position: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
    }]));
    expect(challenge.stateAfter).toBeUndefined();
  });

  it('the app ships every chosen page it names', () => {
    const fs = jest.requireActual('fs');
    const path = jest.requireActual('path');
    const named = load('little-fox-meets-a-friend').pages!.flatMap((page) => page.learningChallenge?.items.map((item) => item.outcome?.stateAfter?.image) ?? []);

    expect(named).toHaveLength(9);
    expect(named.filter((image) => typeof image !== 'string' || !fs.existsSync(path.join(__dirname, '../..', image))).map(String)).toEqual([]);
  });

  it.each([4, 8, 11])('page %i: every choice offered to a band has its own story text for that band', (pageNumber) => {
    const challenge = load('little-fox-meets-a-friend').pages!.find((page) => page.pageNumber === pageNumber)!.learningChallenge!;
    const offered = { '1-2': challenge.byAge?.['1-2']?.items, '2-4': challenge.byAge?.['2-4']?.items, '4-6': challenge.byAge?.['4+']?.items } as const;
    const missing = Object.entries(offered).flatMap(([band, ids]) => (ids ?? []).filter((id) => !challenge.items.find((item) => item.id === id)?.outcome?.storyText?.[band as '1-2']?.en).map((id) => `${band} ${id}`));

    expect(missing).toEqual([]);
  });

  const laterStory = [
    [8, 'finn-steps-back', '2-4', 'Finn took one big step to the side,\nTo leave a path both clear and wide.\nHe did not call. He did not creep.\nAnd Bramble took another peep.'],
    [8, 'finn-waits-nearby', '2-4', 'Finn sat down beside the way,\nAnd found some daisies there to play.\nHe did not stare. He did not shout.\nAnd Bramble\'s nose came peeping out.'],
    [8, 'finn-leaves-a-berry', '2-4', 'Finn placed a pinecone on the track,\nA gift for her, then he stepped back.\nHe smiled and let the present be.\nWould Bramble come out now to see?'],
    [11, 'say-hello', '2-4', '"Hello, Bramble," Finn said low,\nWith one small wave, so soft and slow.\nNo pinecone shout, no booming cheer,\nJust one kind fox, still standing here.'],
    [11, 'ask-to-play', '2-4', '"Would you like to play with me?"\nFinn asked so softly by the tree.\n"If not, that\'s fine. It\'s still okay.\nWe can play another day."'],
    [11, 'say-ill-wait', '2-4', '"I\'ll wait for you," Finn said with care,\n"I\'ll be right here, just over there."\nHe sat down with a little smile.\nHe could wait a little while.'],
  ] as const;

  it.each(laterStory)('page %i: %s tells its own story for the %s band', (pageNumber, id, band, text) => {
    const item = load('little-fox-meets-a-friend').pages!.find((page) => page.pageNumber === pageNumber)!.learningChallenge!.items.find((each) => each.id === id)!;

    expect(item.outcome?.storyText?.[band]?.en).toBe(text);
  });

  it('carries no song, so the reader never asks for an instrument', () => {
    const pages = load('little-fox-meets-a-friend').pages!;

    expect(pages.filter((page) => page.interactionType === 'music_challenge' || page.musicChallenge)).toEqual([]);
  });
});

describe('the CMS story the-lantern-bridge', () => {
  const challenges = () => load('the-lantern-bridge').pages!.filter((page) => page.interactionType === 'learning_challenge').map((page) => page.learningChallenge!);

  it('teaches counting in the scene on pages 4 and 8, and helping a friend on page 11', () => {
    expect(challenges().map((challenge) => [challenge.mechanicId, challenge.family, challenge.domain])).toEqual([
      ['M08', 'tap_scene', 'maths'],
      ['M01', 'tap_scene', 'maths'],
      ['E02', 'choose', 'social'],
    ]);
  });

  it('marks every scene item on the page art and gives every choice a picture', () => {
    const [match, count, help] = challenges();
    const onArt = (item: { hotspot?: { position: { x: number; y: number }; size: { width: number; height: number } } }) =>
      !!item.hotspot && item.hotspot.position.x >= 0 && item.hotspot.position.y >= 0 && item.hotspot.position.x + item.hotspot.size.width <= 1 && item.hotspot.position.y + item.hotspot.size.height <= 1;

    expect([...match.items, ...count.items].every(onArt)).toBe(true);
    expect([...match.items, ...count.items].some((item) => item.image !== undefined)).toBe(false);
    expect(help.items.every((item) => typeof item.image === 'string' && item.hotspot === undefined)).toBe(true);
  });

  it('matching looks for the two dots; counting asks for all three hooks', () => {
    const [match, count] = challenges();

    expect(match.target).toBe('two-dots');
    expect(count.target).toBe('');
    expect(count.items).toHaveLength(3);
  });

  it('every way to help Toby comes with three things a child can do', () => {
    const help = challenges()[2];

    expect(help.items.map((item) => item.outcome?.tips?.length)).toEqual([3, 3]);
  });

  it('carries no song, so the reader never asks for an instrument', () => {
    const pages = load('the-lantern-bridge').pages!;

    expect(pages.filter((page) => page.interactionType === 'music_challenge' || page.musicChallenge)).toEqual([]);
  });
});

describe('sound words in the CMS stories', () => {
  const bands = (slug: string) => load(slug).pages!.flatMap((page) => Object.entries(page.localizedText ?? {}).map(([band, text]) => ({ page: page.pageNumber, band, text: text.en ?? '' })));
  const sounds = (text: string) => text.split('\n').flatMap((line) => storyWords(line).filter((word) => word.some((piece) => piece.sound)).map((word) => word.filter((piece) => piece.sound).map((piece) => piece.text).join('')));

  it.each(['little-fox-meets-a-friend', 'the-lantern-bridge'])('%s closes every mark, so no asterisk reaches the page', (slug) => {
    const printed = bands(slug).map(({ text }) => text.split('\n').map((line) => storyWords(line).map(wordText).join('')).join('\n'));

    expect(printed.filter((text) => text.includes('*'))).toEqual([]);
  });

  it.each<[string, number, string, string[]]>([
    ['little-fox-meets-a-friend', 1, '2-4', ['Splosh!', 'Splash!', 'Squelch']],
    ['little-fox-meets-a-friend', 6, '1-2', ['tap,', 'tap,', 'tap', 'Plonk!']],
    ['little-fox-meets-a-friend', 6, '4-6', ['Tap!', 'Tippy-tap!', 'PLONK!', 'HONK!']],
    ['little-fox-meets-a-friend', 15, '2-4', ['Smush!', 'Crunch!']],
    ['the-lantern-bridge', 3, '2-4', ['Whoosh!', 'pop']],
    ['the-lantern-bridge', 3, '4-6', ['whoosh!', 'pop!']],
    ['the-lantern-bridge', 10, '1-2', ['Bump']],
    ['the-lantern-bridge', 10, '4-6', ['wobble', 'bump!']],
  ])('%s page %i (%s) marks its sound effects', (slug, page, band, expected) => {
    expect(sounds(bands(slug).find((entry) => entry.page === page && entry.band === band)!.text)).toEqual(expected);
  });

  it('a sound word used as a plain noun or verb stays in the story style', () => {
    const fox = bands('little-fox-meets-a-friend').map(({ text }) => sounds(text)).flat();

    expect(fox).not.toEqual(expect.arrayContaining(['squeak', 'tapped', 'honk']));
  });
});
