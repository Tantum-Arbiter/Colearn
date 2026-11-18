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

  const words = (page: Story['pages'] extends (infer P)[] | undefined ? P : never) => [page.text ?? '', ...Object.values(page.localizedText ?? {}).map((text) => text.en ?? '')];

  it('tells its story on fifteen pages: a bag of lanterns on the last post lights the bridges Nori finds', () => {
    const pages = load('the-lantern-bridge').pages!;

    expect(load('the-lantern-bridge').pageCount).toBe(15);
    expect(pages.map((page) => page.pageNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(pages.map((page) => [page.id, page.backgroundImage])).toEqual(pages.map((page) => [`the-lantern-bridge-${page.pageNumber}`, `assets/stories/the-lantern-bridge/page-${page.pageNumber}/background.webp`]));
    expect(pages.filter((page) => words(page).some((text) => /old tin|clink|scratched at his nose|blue|mud|broken|lanterns were out|too dark|counted the spots|\bpots\b/i.test(text))).map((page) => page.pageNumber)).toEqual([]);
    expect(pages.filter((page) => words(page).some((text) => /\bbag\b/i.test(text))).map((page) => page.pageNumber)).toEqual([7, 8]);
  });

  it('from page 5 Nori finds new bridges, and never goes back to one', () => {
    const pages = load('the-lantern-bridge').pages!.filter((page) => page.pageNumber >= 5);

    expect(pages.filter((page) => words(page).some((text) => /back on the bridge|rest of the bridge|start of the bridge|the bright bridge|over the bridge|the whole bridge|lights on the bridge\b/i.test(text))).map((page) => page.pageNumber)).toEqual([]);
    expect(pages.filter((page) => words(page).some((text) => /\bbridges\b|\ba (bright )?bridge\b|bridge after bridge|first little bridge/i.test(text))).map((page) => page.pageNumber)).toEqual([5, 6, 9, 11, 12]);
  });

  it('every page has its words for every band', () => {
    const missing = load('the-lantern-bridge').pages!.flatMap((page) => (['1-2', '2-4', '4-6'] as const).filter((band) => !page.localizedText?.[band]?.en).map((band) => `${page.pageNumber} ${band}`));

    expect(missing).toEqual([]);
  });

  it.each([
    [5, 'He set the two lights on the old wooden floor.\nThe first little bridge wasn\'t dark anymore!\n"A glowing light, a little spark,\nTo guide a friend across the dark!"'],
    [6, 'The next little bridges were dark as could be.\n"I need some more lanterns," said Nori. "Let\'s see!"\nHe walked down the path by the stream\'s gentle flow,\nPast three little posts standing all in a row.'],
    [7, 'On the very last pole hung a bag, old and brown.\nNori stood on his tiptoes and lifted it down.\nInside there were lanterns, all cosy and bright!\n"One for each hook, to light up the night!"'],
    [8, 'Now the path by the stream had a warm, golden glow,\nWith three little lanterns all hung in a row.\nNori peeked in the bag, and he gave a big grin:\nThere were still lots of lanterns tucked snugly within!'],
    [9, 'He found some new bridges and hung every light\nOn each little post, till the bridges glowed bright.\n"A glowing light, a little spark,\nTo guide a friend across the dark!"'],
    [10, '"Toby is here!" came a voice from the trees.\nNori said, "Toby! Come walk with me, please!"\nHe offered a paw or a lamp for the stroll,\nTo welcome his neighbour, the lovely old mole.'],
    [11, 'Toby held on and he gave a big smile.\nThey crossed a bright bridge, taking care all the while.\n"The dark isn\'t scary," said Toby with glee,\n"Because you are walking right next to me!"'],
    [12, '"Your lights are so pretty!" the little mole said,\n"On bridge after bridge, glowing yellow and red!"\nNori just giggled and gave a small bow:\n"The best part is having you here with me now."'],
    [13, 'They followed the path where the three lanterns glowed,\nTwo friends side by side on the warm, twinkly road.\nThe windows of Nori\'s home shone up ahead.\n"We\'re nearly there now, little Toby!" he said.'],
    [14, 'Nori felt warm, like a bug in a rug.\nHe gave his good neighbour a wonderful hug.\nThe lanterns were glowing, the welcome was grand.\nThey stepped on the mat, walking close, paw-in-hand.'],
    [15, 'They sat at the table for crumpets and tea,\nAs happy as two little neighbours could be.\n"A glowing light, a little spark,\nTo guide a friend across the dark!"'],
  ] as const)('page %i tells the new ending for the 2-4 band', (pageNumber, text) => {
    const page = load('the-lantern-bridge').pages!.find((each) => each.pageNumber === pageNumber)!;

    expect([page.text, page.localizedText?.['2-4']?.en]).toEqual([text, text]);
  });

  it.each([
    [6, '1-2', 'Walk, walk, walk, by the stream we go.\nOne, two, three posts in a row.'],
    [5, '4-6', 'He proudly set the two lights on the old wooden floor. The first little bridge wasn\'t scary or dark anymore! He smiled as he sang out his favourite remark: "A glowing light, a little spark, to guide a friend across the dark!"'],
    [6, '4-6', 'But the next little bridges were still as dark as could be. "I need some more lanterns," said Nori. "Let\'s go and see!" He walked down the path beside the stream\'s gentle flow, past three little lamp posts standing all in a row.'],
    [7, '1-2', 'A bag on the pole, old and brown.\nLanterns inside! Lift it down!'],
    [9, '1-2', 'Lights on the bridges, warm and bright.\nA little spark in the night!'],
    [9, '4-6', 'Nori found some new bridges, and he hung every single light on each little post, until every bridge glowed warm and bright. The flags shone yellow and red along the rails. "A glowing light, a little spark, to guide a friend across the dark!"'],
    [10, '4-6', '"Toby is here!" came a friendly voice from the trees. Nori hurried over and said, "Toby! Come walk with me, please!" He offered a paw and a glowing lamp for the stroll, to welcome his neighbour, the lovely old mole.'],
    [11, '1-2', 'Toby holds on with a smile.\nOver a bridge, step by step, all the while.'],
    [11, '4-6', 'Toby held on tightly and he gave a great big smile. They crossed a bright bridge together, taking care all the while. "The dark isn\'t scary," said Toby with glee, "because you are walking right next to me!"'],
    [12, '4-6', '"Your lights are so pretty!" the little mole said, gazing at bridge after bridge glowing yellow and twinkly red. Nori just giggled and gave a small, happy bow. "The very best part," he said, "is having you here with me now."'],
    [14, '4-6', 'Nori felt very warm inside, just like a bug in a rug. He gave his good neighbour a wonderful, happy hug. The lanterns were glowing, and the welcome was truly grand. They stepped on the mat, walking close, paw-in-hand.'],
  ] as const)('page %i tells the new ending for the %s band', (pageNumber, band, text) => {
    const page = load('the-lantern-bridge').pages!.find((each) => each.pageNumber === pageNumber)!;

    expect(page.localizedText?.[band]?.en).toBe(text);
  });

  it('the app ships every page it names, and the same fifteen pages as the CMS story', () => {
    const fs = jest.requireActual('fs');
    const path = jest.requireActual('path');
    const { theLanternBridge } = jest.requireActual('@/data/generated-stories/the-lantern-bridge');
    const cms = load('the-lantern-bridge');

    expect(cms.pages!.map((page) => page.backgroundImage).filter((image) => !fs.existsSync(path.join(__dirname, '../../', image!)))).toEqual([]);
    expect(fs.existsSync(path.join(__dirname, '../../assets/stories/the-lantern-bridge/page-16'))).toBe(false);
    expect(theLanternBridge.pageCount).toBe(15);
    expect(theLanternBridge.pages.filter((page: { pageNumber: number }) => page.pageNumber > 0).map((page: { id: string; pageNumber: number; text: string; localizedText?: unknown }) => [page.id, page.pageNumber, page.text, page.localizedText])).toEqual(cms.pages!.map((page) => [page.id, page.pageNumber, page.text, page.localizedText]));
  });

  it('teaches counting in the scene on pages 4 and 7, and helping a friend on page 10', () => {
    expect(load('the-lantern-bridge').pages!.filter((page) => page.interactionType === 'learning_challenge').map((page) => page.pageNumber)).toEqual([4, 7, 10]);
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

  it('page 10: each way to help Toby turns to its own rendered page, a whole page of its own', () => {
    const help = challenges()[2];

    expect(help.items.map((item) => [item.id, item.outcome?.stateAfter])).toEqual(['offer-a-paw', 'share-the-lamp'].map((id) => [id, {
      image: `assets/stories/the-lantern-bridge/page-10/outcomes/${id}.webp`,
      position: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
    }]));
    expect(help.stateAfter).toBeUndefined();
  });

  it('page 4 keeps its own painting: no spot leaves a picture of its own', () => {
    const [match] = challenges();

    expect(match.items.map((item) => item.outcome?.stateAfter).filter(Boolean)).toEqual([]);
    expect(match.stateAfter).toBeUndefined();
  });

  it('page 7: each hook leaves its own lantern on the painting, cut from page 8', () => {
    const count = challenges()[1];

    expect(count.items.map((item) => [item.id, item.outcome?.stateAfter])).toEqual([
      ['first-hook', { image: 'assets/stories/the-lantern-bridge/page-7/outcomes/first-hook.webp', position: { x: 0.3826, y: 0.2818 }, size: { width: 0.1554, height: 0.2219 } }],
      ['second-hook', { image: 'assets/stories/the-lantern-bridge/page-7/outcomes/second-hook.webp', position: { x: 0.529, y: 0.2808 }, size: { width: 0.1526, height: 0.2164 } }],
      ['third-hook', { image: 'assets/stories/the-lantern-bridge/page-7/outcomes/third-hook.webp', position: { x: 0.73, y: 0.2606 }, size: { width: 0.105, height: 0.1805 } }],
    ]);
    expect(count.stateAfter).toBeUndefined();
  });

  it('page 7: every lantern hangs from its own hook, reaching below it and clear of the other hooks', () => {
    const count = challenges()[1];
    const spans = count.items.map((item) => ({ id: item.id, hook: item.hotspot!, lantern: item.outcome!.stateAfter! }));
    const misplaced = spans.filter(({ hook, lantern }) => !(
      lantern.position.x < hook.position.x + hook.size.width
      && lantern.position.x + lantern.size.width > hook.position.x
      && lantern.position.y <= hook.position.y + hook.size.height
      && lantern.position.y + lantern.size.height > hook.position.y + hook.size.height
    )).map(({ id }) => id);
    const overAnother = spans.flatMap(({ id, lantern }) => spans
      .filter((other) => other.id !== id)
      .filter(({ hook }) => {
        const centre = hook.position.x + hook.size.width / 2;
        return centre > lantern.position.x && centre < lantern.position.x + lantern.size.width;
      })
      .map((other) => `${id} over ${other.id}`));

    expect(misplaced).toEqual([]);
    expect(overAnother).toEqual([]);
  });

  it('page 7 turns to page 8 by itself once the three lanterns are hung, and no other game turns its page', () => {
    expect(challenges().map((challenge) => challenge.advanceOnComplete)).toEqual([undefined, true, undefined]);
    expect(load('little-fox-meets-a-friend').pages!.filter((page) => page.learningChallenge?.advanceOnComplete !== undefined)).toEqual([]);
  });

  it('the app ships the three lanterns, and its own copy of the book hangs them in the same places', () => {
    const fs = jest.requireActual('fs');
    const path = jest.requireActual('path');
    const { theLanternBridge } = jest.requireActual('@/data/generated-stories/the-lantern-bridge');
    const count = challenges()[1];
    const bundled = theLanternBridge.pages.find((page: { pageNumber: number }) => page.pageNumber === 7).learningChallenge;
    const placed = (items: { id: string; outcome?: { stateAfter?: { position: unknown; size: unknown } } }[]) => items.map((item) => [item.id, item.outcome?.stateAfter?.position, item.outcome?.stateAfter?.size]);

    expect(count.items.map((item) => item.outcome?.stateAfter?.image).filter((image) => typeof image !== 'string' || !fs.existsSync(path.join(__dirname, '../..', image))).map(String)).toEqual([]);
    expect(placed(bundled.items)).toEqual(placed(count.items));
    expect(bundled.items.filter((item: { outcome?: { stateAfter?: { image?: unknown } } }) => item.outcome?.stateAfter?.image === undefined)).toEqual([]);
    expect(bundled.advanceOnComplete).toBe(true);
  });

  it('the app ships both pages Toby`s welcome leads to', () => {
    const fs = jest.requireActual('fs');
    const path = jest.requireActual('path');
    const named = challenges()[2].items.map((item) => item.outcome?.stateAfter?.image);

    expect(named).toHaveLength(2);
    expect(named.filter((image) => typeof image !== 'string' || !fs.existsSync(path.join(__dirname, '../..', image))).map(String)).toEqual([]);
  });

  it('page 10: every way to help offered to a band has its own story text for that band', () => {
    const help = challenges()[2];
    const offered = { '1-2': help.byAge?.['1-2']?.items, '2-4': help.byAge?.['2-4']?.items, '4-6': help.byAge?.['4+']?.items } as const;
    const missing = Object.entries(offered).flatMap(([band, ids]) => (ids ?? []).filter((id) => !help.items.find((item) => item.id === id)?.outcome?.storyText?.[band as '1-2']?.en).map((id) => `${band} ${id}`));

    expect(missing).toEqual([]);
  });

  it.each([
    ['offer-a-paw', 'Toby reached out and he held Nori\'s paw,\nThe warmest of welcomes a mole ever saw.\n"I\'m right here," said Nori. "We\'ll go nice and slow."\nAnd paw in paw, off down the path they did go.'],
    ['share-the-lamp', 'Nori held up his lamp, it was warm and was bright,\nAnd Toby stepped close so he walked in its light.\n"I\'ll light up the way, every step that we take,"\nSaid Nori, "and go nice and slow for your sake."'],
  ])('page 10: %s tells its own story for the 2-4 band', (id, text) => {
    const item = challenges()[2].items.find((each) => each.id === id)!;

    expect(item.outcome?.storyText?.['2-4']?.en).toBe(text);
  });

  it('page 4: each tap spot covers its own dot card on the grass, apart from the other', () => {
    const match = challenges()[0];

    expect(match.items.map((item) => [item.id, item.hotspot])).toEqual([
      ['two-dots', { position: { x: 0.39, y: 0.725 }, size: { width: 0.165, height: 0.14 } }],
      ['three-dots', { position: { x: 0.56, y: 0.74 }, size: { width: 0.155, height: 0.16 } }],
    ]);
  });

  it('page 7: the child hangs a lantern from the bag on each of the three hooks', () => {
    const count = challenges()[1];

    expect(count.items.map((item) => [item.id, item.label?.en])).toEqual([['first-hook', 'first hook'], ['second-hook', 'second hook'], ['third-hook', 'third hook']]);
    expect([
      count.copy.title?.['2-4']?.en,
      count.copy.setupLine?.['2-4']?.en,
      count.copy.instruction?.['2-4']?.en,
      count.copy.successLine?.['2-4']?.en,
      count.copy.onSkip?.['2-4']?.en,
      count.copy.parentPrompt?.['2-4']?.en,
      count.copy.hints?.map((hint) => hint['2-4']?.en),
    ]).toEqual([
      'Hang the lanterns',
      'Inside there were lanterns, all cosy and bright!',
      'Tap each empty hook to hang a lantern, as we count one, two, three.',
      '"One, two, three lanterns!" said Nori. "Now the path can glow!"',
      'Nori hung a lantern on each of the three hooks himself.',
      'How many lanterns did we hang altogether?',
      ['Look for the empty hooks at the top of the little lamp posts.', 'Tap each empty hook, one at a time, as we count.'],
    ]);
  });

  it('page 7: each tap spot sits on its own hook at the top of the three posts', () => {
    const count = challenges()[1];

    expect(count.items.map((item) => [item.id, item.hotspot])).toEqual([
      ['first-hook', { position: { x: 0.44, y: 0.27 }, size: { width: 0.11, height: 0.11 } }],
      ['second-hook', { position: { x: 0.585, y: 0.27 }, size: { width: 0.11, height: 0.11 } }],
      ['third-hook', { position: { x: 0.73, y: 0.27 }, size: { width: 0.115, height: 0.11 } }],
    ]);
  });

  it('page 6 walks Nori to the posts and leaves the game to page 7', () => {
    const page = load('the-lantern-bridge').pages!.find((each) => each.pageNumber === 6)!;

    expect([page.interactionType, page.learningChallenge]).toEqual(['none', undefined]);
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
  ])('%s page %i (%s) marks its sound effects', (slug, page, band, expected) => {
    expect(sounds(bands(slug).find((entry) => entry.page === page && entry.band === band)!.text)).toEqual(expected);
  });

  it('a sound word used as a plain noun or verb stays in the story style', () => {
    const fox = bands('little-fox-meets-a-friend').map(({ text }) => sounds(text)).flat();

    expect(fox).not.toEqual(expect.arrayContaining(['squeak', 'tapped', 'honk']));
  });
});
