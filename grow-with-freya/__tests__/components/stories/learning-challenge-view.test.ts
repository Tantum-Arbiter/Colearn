import { challengeView } from '@/components/stories/learning-challenge-view';
import type { LearningChallenge } from '@/types/story';

const fox: LearningChallenge = JSON.parse(JSON.stringify(require('../../../../contract-fixtures/stories/little-fox-meets-a-friend.json'))).pages[10].learningChallenge;

const threeItems: LearningChallenge = {
  ...fox,
  items: [...fox.items.slice(0, 2), { id: 'a-quiet-wave', image: 'assets/stories/x/page-11/challenge/a-quiet-wave.webp', label: { en: 'a quiet wave', pl: 'ciche machnięcie' } }],
  byAge: {
    '1-2': { gesture: 'tap', items: ['say-hello', 'ask-to-play'] },
    '2-4': { gesture: 'tap', items: ['say-hello', 'ask-to-play', 'a-quiet-wave'] },
    '4+': { gesture: 'tap', items: ['say-hello', 'ask-to-play', 'a-quiet-wave'] },
  },
};

describe('challengeView: the copy a child and grown-up read', () => {
  it('reads the book`s own lines for its band', () => {
    const view = challengeView(fox, '2-4', 'en', '2-4');

    expect(view.setupLine).toBe('Finn wants to say something gentle.');
    expect(view.instruction).toBe('What could Finn say softly?');
    expect(view.successLine).toBe('Gentle words helped Bramble feel safe.');
    expect(view.onSkip).toBe('Finn whispered a very quiet hello.');
    expect(view.parentPrompt).toBe('How do you say hello to someone new?');
    expect(view.hints).toEqual(['Finn wants Bramble to feel safe.', 'Tap something kind Finn could say.']);
  });

  it('falls back to English for a language the book has not been translated into yet', () => {
    const view = challengeView(fox, '2-4', 'pl', '2-4');

    expect(view.setupLine).toBe('Finn wants to say something gentle.');
  });

  it('a toddler reads the nearest level the book has', () => {
    const view = challengeView(fox, '1-2', 'en', '1-2');

    expect(view.title).toBe('Choose what to say');
  });
});

describe('challengeView: the choices for a band', () => {
  it('gives the band its own items, in the book`s order, with pictures and spoken labels', () => {
    const view = challengeView(threeItems, '1-2', 'en', '1-2');

    expect(view.choices.map((choice) => choice.id)).toEqual(['say-hello', 'ask-to-play']);
    expect(view.choices[0]).toEqual(expect.objectContaining({ id: 'say-hello', image: fox.items[0].image, label: 'Say hello' }));
  });

  it('labels follow the language when the item has it', () => {
    const view = challengeView(threeItems, '2-4', 'pl', '2-4');

    expect(view.choices[2].label).toBe('ciche machnięcie');
    expect(view.choices[0].label).toBe('Say hello');
  });

  it('an open challenge has no target', () => {
    expect(challengeView(fox, '2-4', 'en', '2-4').target).toBe('');
  });

  it('a guided target outside the band`s items is not asked for', () => {
    const guided = { ...threeItems, assessmentMode: 'guided_observable' as const, target: 'a-quiet-wave' };

    expect(challengeView(guided, '1-2', 'en', '1-2').target).toBe('');
    expect(challengeView(guided, '2-4', 'en', '2-4').target).toBe('a-quiet-wave');
  });

  it('carries the band`s gesture', () => {
    expect(challengeView(fox, '4+', 'en', '4-6').gesture).toBe('tap');
  });
});

describe('challengeView: a choice`s own response', () => {
  const withOutcomes: LearningChallenge = {
    ...fox,
    items: [
      { ...fox.items[0], outcome: { successLine: { '2-4': { en: 'Maybe Bramble feels shy.' } } } },
      { ...fox.items[1], outcome: { stateAfter: { image: 'assets/stories/x/page-11/challenge/after-wave.webp', position: { x: 0.3, y: 0.3 }, size: { width: 0.2, height: 0.2 } } } },
    ],
  };

  it('carries the line and after picture a choice brings, and leaves them off a choice that shares the challenge`s', () => {
    const view = challengeView(withOutcomes, '2-4', 'en', '2-4');

    expect(view.choices[0].successLine).toBe('Maybe Bramble feels shy.');
    expect(view.choices[0].stateAfter).toBeUndefined();
    expect(view.choices[1].successLine).toBeUndefined();
    expect(view.choices[1].stateAfter?.image).toBe('assets/stories/x/page-11/challenge/after-wave.webp');
  });

  it('carries a choice`s tips in the child`s language and band, and none for a choice without', () => {
    const withTips: LearningChallenge = {
      ...fox,
      items: [{ ...fox.items[0], outcome: { tips: [{ '2-4': { en: 'Smile and wave gently.', pl: 'Uśmiechnij się i pomachaj.' } }, { '2-4': { en: 'Let her come to you.' } }] } }, { ...fox.items[1], outcome: undefined }],
    };

    expect(challengeView(withTips, '2-4', 'pl', '2-4').choices[0].tips).toEqual(['Uśmiechnij się i pomachaj.', 'Let her come to you.']);
    expect(challengeView(withTips, '2-4', 'en', '2-4').choices[1].tips).toBeUndefined();
  });

  it('a choice without an outcome falls back to the shared line', () => {
    const bare = { ...fox, items: fox.items.map(({ outcome: _own, ...item }) => item) };

    expect(challengeView(bare, '2-4', 'en', '2-4').choices.every((choice) => choice.successLine === undefined)).toBe(true);
  });
});

const hooks: LearningChallenge = {
  ...fox,
  mechanicId: 'M01',
  family: 'tap_scene',
  adapter: 'multi_tap_count',
  assessmentMode: 'guided_observable',
  domain: 'maths',
  target: '',
  items: [
    { id: 'hook-1', label: { en: 'first hook' }, hotspot: { position: { x: 0.3, y: 0.3 }, size: { width: 0.06, height: 0.1 } } },
    { id: 'hook-2', label: { en: 'second hook' }, hotspot: { position: { x: 0.45, y: 0.3 }, size: { width: 0.06, height: 0.1 } }, outcome: { successLine: { '2-4': { en: 'Two!' } } } },
    { id: 'hook-3', label: { en: 'third hook' }, hotspot: { position: { x: 0.6, y: 0.3 }, size: { width: 0.06, height: 0.1 } } },
  ],
  byAge: {
    '1-2': { gesture: 'tap', items: ['hook-1', 'hook-2', 'hook-3'] },
    '2-4': { gesture: 'tap', items: ['hook-1', 'hook-2', 'hook-3'] },
    '4+': { gesture: 'tap', items: ['hook-1', 'hook-2', 'hook-3'] },
  },
};

describe('challengeView: a scene played on the page itself', () => {
  it('gives each hotspot item as a spot, with its spoken label and its own line', () => {
    const view = challengeView(hooks, '2-4', 'en', '2-4');

    expect(view.spots.map((spot) => spot.id)).toEqual(['hook-1', 'hook-2', 'hook-3']);
    expect(view.spots[1]).toEqual({ id: 'hook-2', label: 'second hook', hotspot: hooks.items[1].hotspot, successLine: 'Two!' });
  });

  it('a scene item has no picture card to choose', () => {
    expect(challengeView(hooks, '2-4', 'en', '2-4').choices).toEqual([]);
  });

  it('a choose challenge has no spots', () => {
    expect(challengeView(fox, '2-4', 'en', '2-4').spots).toEqual([]);
  });

  it('keeps the band`s own items for the scene too', () => {
    const toddler = { ...hooks, byAge: { ...hooks.byAge, '1-2': { gesture: 'tap' as const, items: ['hook-1', 'hook-2'] } } };

    expect(challengeView(toddler, '1-2', 'en', '1-2').spots.map((spot) => spot.id)).toEqual(['hook-1', 'hook-2']);
  });

  it('a guided target among the spots is asked for', () => {
    const find = { ...hooks, adapter: 'small_set_choice', target: 'hook-2' };

    expect(challengeView(find, '2-4', 'en', '2-4').target).toBe('hook-2');
  });
});
