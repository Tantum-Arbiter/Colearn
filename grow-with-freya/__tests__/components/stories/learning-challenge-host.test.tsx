import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { ENTRANCE_MS, LEAVE_MS } from '@/components/experience/engines/choose/choose-engine';
import { CELEBRATION } from '@/components/experience/experience-shell';
import { LearningChallengeHost } from '@/components/stories/learning-challenge-host';
import type { ChallengeResult } from '@/components/stories/learning-challenge-host';
import { motionDuration } from '@/constants/child-ui-motion';
import type { LearningChallenge } from '@/types/story';

jest.mock('@/hooks/use-steady-shared-value', () => ({
  useSteadySharedValue: (initial: number) => require('react').useState({ value: initial })[0],
}));

const page11: LearningChallenge = JSON.parse(JSON.stringify(require('../../../../contract-fixtures/stories/little-fox-meets-a-friend.json'))).pages[10].learningChallenge;
const fox: LearningChallenge = {
  ...page11,
  items: page11.items.map(({ outcome: _own, ...item }) => item),
  stateAfter: { image: 'file:///after.webp', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
};

const SCREEN = { width: 844, height: 390 };

function texts(node: ReactTestInstance): string[] {
  return node.children.flatMap((child) => (typeof child === 'string' ? [child] : texts(child)));
}

function renderHost(overrides: Partial<React.ComponentProps<typeof LearningChallengeHost>> = {}) {
  const outcomes: string[] = [];
  const handed: ChallengeResult[] = [];
  const view = render(
    <LearningChallengeHost
      challenge={fox}
      band="2-4"
      language="en"
      ageGroup="2-4"
      screen={SCREEN}
      isTablet={false}
      reduceMotion={false}
      onDone={(result) => {
        outcomes.push('completed');
        handed.push(result);
      }}
      {...overrides}
    />
  );
  const root = view.UNSAFE_root;
  const find = (testID: string) => root.findAll((node: ReactTestInstance) => node.props.testID === testID);
  const has = (testID: string) => find(testID).length > 0;
  const press = (testID: string) => fireEvent.press(root.findAll((node: ReactTestInstance) => node.props.testID === testID && typeof node.props.onPress === 'function')[0]);
  const prompt = () => texts(find('learning-challenge-prompt')[0]).join('');
  return { ...view, root, outcomes, handed, find, has, press, prompt };
}

describe('LearningChallengeHost: the intro', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('opens on the question itself, with the choices and nothing for the grown-up underneath', () => {
    const { has, prompt } = renderHost();

    expect(prompt()).toBe('What could Finn say softly?');
    expect(has('learning-challenge-grown-up')).toBe(false);
    expect(has('choose-card-say-hello')).toBe(true);
    expect(has('choose-card-ask-to-play')).toBe(true);
    expect(has('learning-phase-intro')).toBe(true);
  });

  it('keeps the same question while the child is choosing, however long they take', () => {
    const { prompt, has } = renderHost();

    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    expect(has('learning-phase-playing')).toBe(true);
    expect(prompt()).toBe('What could Finn say softly?');

    act(() => jest.advanceTimersByTime(60_000));
    expect(prompt()).toBe('What could Finn say softly?');
  });
});

describe('LearningChallengeHost: choosing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('a choice shows the story`s own result and leaves the after picture to the page turn', () => {
    const { press, prompt, has, outcomes } = renderHost();
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    act(() => press('choose-card-ask-to-play'));

    expect(has('learning-phase-celebrating')).toBe(true);
    expect(prompt()).toBe('Gentle words helped Bramble feel safe.');
    expect(has('learning-challenge-after')).toBe(false);
    expect(outcomes).toEqual([]);

    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false)));

    expect(outcomes).toEqual(['completed']);
  });

  it('the veil over the page fades away with the cards once a choice is made, so the page turn starts from the page as it is', () => {
    const { press, find } = renderHost();
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    expect(find('learning-challenge-veil')).not.toHaveLength(0);
    expect(find('learning-challenge-veil')[0].props.exiting).toBeDefined();

    act(() => press('choose-card-ask-to-play'));

    expect(find('learning-challenge-veil')).toHaveLength(0);
  });

  it('keeps the chosen card in view, ringed, while the others dim', () => {
    const { press, root } = renderHost();
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    act(() => press('choose-card-ask-to-play'));

    const chosen = root.findAll((node: ReactTestInstance) => node.props.testID === 'choose-card-ask-to-play' && typeof node.props.onPress === 'function')[0];
    const other = root.findAll((node: ReactTestInstance) => node.props.testID === 'choose-card-say-hello' && typeof node.props.onPress === 'function')[0];
    expect(chosen.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(other.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('a choice with its own line shows that line, and its own after picture', () => {
    const withOutcomes = {
      ...fox,
      items: [
        { ...fox.items[0], outcome: { successLine: { '2-4': { en: 'A big hello can be a lot for a small hedgehog.' } } } },
        { ...fox.items[1], outcome: { stateAfter: { image: 'file:///after-wave.webp', position: { x: 0.3, y: 0.3 }, size: { width: 0.2, height: 0.2 } } } },
      ],
    };
    const { press, prompt, has, handed } = renderHost({ challenge: withOutcomes });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    act(() => press('choose-card-say-hello'));

    expect(prompt()).toBe('A big hello can be a lot for a small hedgehog.');
    expect(has('learning-challenge-after')).toBe(false);
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false)));
    expect(handed.map((result) => result.after)).toEqual([fox.stateAfter]);
  });

  it('a choice with its own after picture shows that picture', () => {
    const withOutcomes = {
      ...fox,
      items: [fox.items[0], { ...fox.items[1], outcome: { stateAfter: { image: 'file:///after-wave.webp', position: { x: 0.3, y: 0.3 }, size: { width: 0.2, height: 0.2 } } } }],
    };
    const { press, prompt, has, handed } = renderHost({ challenge: withOutcomes });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    act(() => press('choose-card-ask-to-play'));

    expect(prompt()).toBe('Gentle words helped Bramble feel safe.');
    expect(has('learning-challenge-after')).toBe(false);
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false)));
    expect(handed.map((result) => result.after?.image)).toEqual(['file:///after-wave.webp']);
  });

  it('the celebration says nothing of stars or scores', () => {
    const { press, root } = renderHost();
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    act(() => press('choose-card-say-hello'));

    expect(texts(root).join(' ')).not.toMatch(/experience\.wellDone|star|score/i);
  });

  it('reports once, even after a late rerender', () => {
    const { press, outcomes, rerender } = renderHost();
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => press('choose-card-ask-to-play'));
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false)));

    rerender(<LearningChallengeHost challenge={fox} band="2-4" language="en" ageGroup="2-4" screen={SCREEN} isTablet={false} reduceMotion={false} onDone={() => outcomes.push('completed')} />);

    expect(outcomes).toEqual(['completed']);
  });
});

describe('LearningChallengeHost: no skipping', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('offers no skip, even when the challenge allows one', () => {
    const { has } = renderHost({ challenge: { ...fox, allowSkip: true } });

    expect(has('learning-challenge-skip')).toBe(false);
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    expect(has('learning-challenge-skip')).toBe(false);
  });
});

describe('LearningChallengeHost: the page art`s frame', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const screen = { width: 874, height: 402 };
  const art = { left: 0, top: -126.75, width: 874, height: 655.5 };

  it('lays the cards in the art`s safe zone, not the screen`s', () => {
    const { find } = renderHost({ screen, art });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    const frame = find('choose-card-say-hello-frame')[0];
    const flat = Object.assign({}, ...[frame.props.style].flat(Infinity).filter(Boolean));
    expect(flat.left).toBeGreaterThanOrEqual(874 * 0.28 - 0.01);
    expect(flat.top + flat.height).toBeLessThanOrEqual(-126.75 + 655.5 * 0.6 + 0.01);
    const trayTop = 8 + 48 + 12;
    expect(flat.top + flat.height / 2).toBeCloseTo((trayTop + (-126.75 + 655.5 * 0.6)) / 2);
    expect(flat.top + flat.height / 2).not.toBeCloseTo((trayTop + 402 * 0.6) / 2);
  });
});

describe('LearningChallengeHost: a choice that teaches', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const tips = ['Smile and wave gently.', 'Let her come to you.', 'Wait. There is no rush.'];
  const withTips: LearningChallenge = {
    ...fox,
    items: [fox.items[0], { ...fox.items[1], label: { en: 'Shy' }, outcome: { successLine: { '2-4': { en: 'When a friend feels shy, you can help:' } }, tips: tips.map((tip) => ({ '2-4': { en: tip } })) } }],
  };

  function chosen(overrides: Partial<React.ComponentProps<typeof LearningChallengeHost>> = {}) {
    const host = renderHost({ challenge: withTips, ...overrides });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => host.press('choose-card-ask-to-play'));
    return host;
  }

  it('puts the cards away and the band with them, showing no tips of its own', () => {
    const { has, root } = chosen();

    expect(root.findAll((node: ReactTestInstance) => Array.isArray(node.props.choices) && node.props.leaving === true).length).toBeGreaterThan(0);
    expect(has('learning-challenge-prompt')).toBe(false);
    expect(has('learning-challenge-tips')).toBe(false);
    expect(has('learning-challenge-continue')).toBe(false);
  });

  it('hands its picture, name, heading and things to do to the page once the cards have gone', () => {
    const { outcomes, handed } = chosen();

    act(() => jest.advanceTimersByTime(LEAVE_MS - 1));
    expect(outcomes).toEqual([]);
    act(() => jest.advanceTimersByTime(1));

    expect(outcomes).toEqual(['completed']);
    expect(handed).toEqual([{ tips: { picture: fox.items[1].image, label: 'Shy', heading: 'When a friend feels shy, you can help:', tips }, storyText: null, after: fox.stateAfter }]);
  });

  it('under Reduce Motion hands them over at once', () => {
    const { outcomes } = chosen({ reduceMotion: true });

    act(() => jest.advanceTimersByTime(0));

    expect(outcomes).toEqual(['completed']);
  });

  it('a choice with no tips of its own still resolves by itself and hands no tips over', () => {
    const { press, outcomes, handed } = renderHost({ challenge: withTips });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    act(() => press('choose-card-say-hello'));
    act(() => jest.advanceTimersByTime(LEAVE_MS));
    expect(outcomes).toEqual([]);
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false)));

    expect(outcomes).toEqual(['completed']);
    expect(handed).toEqual([{ tips: null, storyText: null, after: fox.stateAfter }]);
  });

  it('a choice with its own story text hands that over too, with tips or without', () => {
    const waved = { '2-4': { en: 'Finn waved.' } };
    const told = { '2-4': { en: 'Finn told her softly.' } };
    const withStory: LearningChallenge = {
      ...withTips,
      items: [{ ...withTips.items[0], outcome: { storyText: waved } }, { ...withTips.items[1], outcome: { ...withTips.items[1].outcome, storyText: told } }],
    };
    const plain = renderHost({ challenge: withStory });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => plain.press('choose-card-say-hello'));
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false)));
    const teaching = renderHost({ challenge: withStory });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => teaching.press('choose-card-ask-to-play'));
    act(() => jest.advanceTimersByTime(LEAVE_MS));

    expect(plain.handed).toEqual([{ tips: null, storyText: waved, after: fox.stateAfter }]);
    expect(teaching.handed.map((result) => result.storyText)).toEqual([told]);
  });
});

describe('LearningChallengeHost: the picture a choice leaves on the page', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const ownPage = { image: 'file:///asked-to-play.webp', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } };

  function choose(challenge: LearningChallenge, card: string) {
    const host = renderHost({ challenge });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    act(() => host.press(card));
    act(() => jest.advanceTimersByTime(LEAVE_MS + motionDuration(CELEBRATION, false)));
    return host;
  }

  it('hands over the chosen choice`s own page, so it can stay on screen', () => {
    const own: LearningChallenge = { ...fox, items: [fox.items[0], { ...fox.items[1], outcome: { stateAfter: ownPage } }] };

    const { handed } = choose(own, 'choose-card-ask-to-play');

    expect(handed.map((result) => result.after)).toEqual([ownPage]);
  });

  it('a choice with no page of its own hands over the picture the whole challenge ends on', () => {
    const own: LearningChallenge = { ...fox, items: [fox.items[0], { ...fox.items[1], outcome: { stateAfter: ownPage } }] };

    const { handed } = choose(own, 'choose-card-say-hello');

    expect(handed.map((result) => result.after)).toEqual([fox.stateAfter]);
  });

  it('with no picture anywhere, hands over none', () => {
    const { handed } = choose({ ...fox, stateAfter: undefined }, 'choose-card-say-hello');

    expect(handed.map((result) => result.after)).toEqual([null]);
  });
});

describe('LearningChallengeHost: a scene played on the page itself', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const ART = { left: -40, top: 0, width: 924, height: 693 };
  const hooks: LearningChallenge = {
    ...fox,
    mechanicId: 'M01',
    family: 'tap_scene',
    adapter: 'multi_tap_count',
    assessmentMode: 'guided_observable',
    domain: 'maths',
    target: '',
    stateAfter: undefined,
    items: [
      { id: 'hook-1', label: { en: 'first hook' }, hotspot: { position: { x: 0.3, y: 0.3 }, size: { width: 0.1, height: 0.12 } } },
      { id: 'hook-2', label: { en: 'second hook' }, hotspot: { position: { x: 0.45, y: 0.3 }, size: { width: 0.1, height: 0.12 } } },
      { id: 'hook-3', label: { en: 'third hook' }, hotspot: { position: { x: 0.6, y: 0.3 }, size: { width: 0.1, height: 0.12 } } },
    ],
    byAge: {
      '1-2': { gesture: 'tap', items: ['hook-1', 'hook-2', 'hook-3'] },
      '2-4': { gesture: 'tap', items: ['hook-1', 'hook-2', 'hook-3'] },
      '4+': { gesture: 'tap', items: ['hook-1', 'hook-2', 'hook-3'] },
    },
  };

  it('puts a spot on each hotspot of the art, and no cards', () => {
    const { find, has } = renderHost({ challenge: hooks, art: ART });
    const placed = find('scene-spot-hook-2-frame')[0];

    expect(has('choose-engine')).toBe(false);
    expect(placed.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ left: -40 + 0.45 * 924, top: 0.3 * 693 })]));
  });

  it('counting every spot plays the story`s own result, then ends as completed', () => {
    const { press, prompt, has, outcomes } = renderHost({ challenge: hooks, art: ART });

    press('scene-spot-hook-1');
    press('scene-spot-hook-2');
    expect(has('learning-phase-celebrating')).toBe(false);
    press('scene-spot-hook-3');

    expect(has('learning-phase-celebrating')).toBe(true);
    expect(prompt()).toBe('Gentle words helped Bramble feel safe.');
    expect(has('scene-spot-hook-3-mark')).toBe(true);
    act(() => jest.advanceTimersByTime(motionDuration(CELEBRATION, false) + 50));
    expect(outcomes).toEqual(['completed']);
  });

  it('a spot with its own line shows that line when found', () => {
    const find = {
      ...hooks,
      adapter: 'small_set_choice',
      mechanicId: 'M08',
      target: 'hook-2',
      items: hooks.items.map((item) => (item.id === 'hook-2' ? { ...item, outcome: { successLine: { '2-4': { en: 'Two lights!' } } } } : item)),
    };
    const { press, prompt } = renderHost({ challenge: find, art: ART });

    press('scene-spot-hook-1');
    expect(prompt()).toBe('What could Finn say softly?');
    press('scene-spot-hook-2');

    expect(prompt()).toBe('Two lights!');
  });
});

describe('LearningChallengeHost: cards on a tablet', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function card(find: (testID: string) => ReactTestInstance[]) {
    const frame = find('choose-card-say-hello-frame')[0];
    return Object.assign({}, ...[frame.props.style].flat(Infinity).filter(Boolean));
  }

  it('on its side, the cards are big and sit in the middle of the screen', () => {
    const screen = { width: 1210, height: 834 };
    const art = { left: 0, top: (834 - 1210 * 0.75) / 2, width: 1210, height: 1210 * 0.75 };
    const phoneSized = renderHost({ screen, art, isTablet: false });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    const before = card(phoneSized.find);
    phoneSized.unmount();

    const { find } = renderHost({ screen, art, isTablet: true });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    const after = card(find);
    expect(after.width).toBeGreaterThan(before.width * 1.35);
    expect(after.top + after.height / 2).toBeCloseTo(screen.height / 2);
  });

  it('upright, the cards keep the size they had from the cover-fit art, whatever frame the picture is shown in', () => {
    const screen = { width: 834, height: 1210 };
    const cover = { left: (834 - 1210 / 0.75) / 2, top: 0, width: 1210 / 0.75, height: 1210 };
    const whole = { left: 0, top: (1210 - 834 * 0.75) / 2, width: 834, height: 834 * 0.75 };
    const asBefore = renderHost({ screen, art: cover, isTablet: false });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));
    const before = card(asBefore.find);
    asBefore.unmount();

    const { find } = renderHost({ screen, art: whole, trayArt: cover, isTablet: true });
    act(() => jest.advanceTimersByTime(ENTRANCE_MS));

    expect(card(find)).toEqual(before);
  });
});

