import { ALL_STORIES } from '@/data/stories';
import { FEELINGS_ACTIVITIES, NUMBERS_ACTIVITIES, SPELLING_ACTIVITIES } from '@/data/learning-activities';
import { ISLAND_WEEK } from '@/data/learning-plan';
import { FREE_PER_AGE_GROUP } from '@/data/learning-activities';
import {
  PLAN_STEPS_PER_WEEK,
  activityFor,
  currentStep,
  launchFor,
  localDayKey,
  previewActivity,
  previewable,
  stepStates,
  type LearningPlanProgress,
} from '@/constants/learning-plan';
import type { LearningPlanStep } from '@/types/learning-plan';

const NOTHING_DONE: LearningPlanProgress = { planId: ISLAND_WEEK.id, completed: {} };
const MORNING = new Date(2026, 9, 3, 8, 30);
const EVENING = new Date(2026, 9, 3, 20, 0);
const NEXT_MORNING = new Date(2026, 9, 4, 7, 0);
const AFTER_A_WEEK = new Date(2026, 9, 12, 9, 0);

function done(days: number[], at: Date): LearningPlanProgress {
  return {
    planId: ISLAND_WEEK.id,
    completed: Object.fromEntries(days.map((day) => [ISLAND_WEEK.steps[day - 1].id, at.toISOString()])),
  };
}

describe('the island week', () => {
  it('has seven days, numbered in order', () => {
    expect(ISLAND_WEEK.steps).toHaveLength(PLAN_STEPS_PER_WEEK);
    expect(ISLAND_WEEK.steps.map((step) => step.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(ISLAND_WEEK.steps.map((step) => step.id)).size).toBe(7);
  });

  it('mixes stories with the words, numbers, feelings and music activities the app has', () => {
    const kinds = ISLAND_WEEK.steps.map((step) => step.kind);

    expect(kinds.filter((kind) => kind === 'story').length).toBeGreaterThanOrEqual(2);
    expect(new Set(kinds)).toEqual(new Set(['story', 'words', 'numbers', 'feelings', 'music']));
  });

  it.each(ISLAND_WEEK.steps.filter((step) => step.kind === 'story'))('day $day opens a book the app ships', (step) => {
    const story = ALL_STORIES.find((candidate) => candidate.id === step.storyId);

    expect(story).toBeDefined();
    expect(story?.isAvailable).toBe(true);
    expect((story?.pages?.length ?? 0) > 0).toBe(true);
  });

  it('starts the week with a book that costs nothing', () => {
    const first = ISLAND_WEEK.steps[0];
    const story = ALL_STORIES.find((candidate) => candidate.id === first.storyId);

    expect(first.kind).toBe('story');
    expect(story?.isPremium).not.toBe(true);
  });

  it.each(ISLAND_WEEK.steps.filter((step) => step.kind === 'words' || step.kind === 'numbers'))(
    'day $day names a game for every age, each among the free ones of its age group',
    (step) => {
      const pool = step.kind === 'words' ? SPELLING_ACTIVITIES : NUMBERS_ACTIVITIES;

      (['1-2', '2-4', '4+'] as const).forEach((age) => {
        const id = step.activityByAge?.[age];
        const activity = pool.find((candidate) => candidate.id === id);
        const ofAge = pool.filter((candidate) => candidate.ageRanges.includes(age));

        expect(activity).toBeDefined();
        expect(activity?.gameType).toBe('spelling');
        expect(activity?.ageRanges).toContain(age);
        expect(ofAge.findIndex((candidate) => candidate.id === id)).toBeLessThan(FREE_PER_AGE_GROUP);
      });
    }
  );

  it('counts the feelings game done in any of its three themes', () => {
    const step = ISLAND_WEEK.steps.find((candidate) => candidate.kind === 'feelings');

    expect(step?.activityIds).toEqual(['emotion-faces', 'animal-feelings', 'my-feelings']);
    step?.activityIds?.forEach((id) => {
      expect(FEELINGS_ACTIVITIES.some((candidate) => candidate.id === id)).toBe(true);
    });
  });

  it.each(ISLAND_WEEK.steps)('day $day says where it is, its kind of learning, what it builds, two skills and how long it takes', (step) => {
    expect(step.placeKey.startsWith('plan.places.')).toBe(true);
    expect(step.domainKey.startsWith('plan.domains.')).toBe(true);
    expect(step.aimKey).toBe(`plan.islandWeek.${step.id}.aim`);
    expect(step.skills).toHaveLength(2);
    expect(new Set(step.skills).size).toBe(2);
    expect(step.minutes[0]).toBeGreaterThan(0);
    expect(step.minutes[1]).toBeGreaterThan(step.minutes[0]);
    expect(step.minutes[1]).toBeLessThanOrEqual(10);
  });

  it.each(ISLAND_WEEK.steps.filter((step) => step.kind === 'story'))(
    'day $day takes about as long as its book says it does',
    (step) => {
      const book = ALL_STORIES.find((story) => story.id === step.storyId);
      if (typeof book?.duration === 'number') {
        expect(book.duration).toBeGreaterThanOrEqual(step.minutes[0]);
        expect(book.duration).toBeLessThanOrEqual(step.minutes[1]);
      }
    }
  );

  it('ends the week at the bridge with a story, not at bedtime, since the book is a daytime bus ride', () => {
    const last = ISLAND_WEEK.steps[ISLAND_WEEK.steps.length - 1];

    expect(last.storyId).toBe('my-turn-to-ding');
    expect(last.placeKey).toBe('plan.places.storyBridge');
    expect(last.skills).toContain('patience');
  });
});

describe('localDayKey', () => {
  it('keys a moment by its local calendar day', () => {
    expect(localDayKey(new Date(2026, 9, 3, 0, 5))).toBe('2026-10-03');
    expect(localDayKey(new Date(2026, 9, 3, 23, 55))).toBe('2026-10-03');
    expect(localDayKey(new Date(2026, 0, 9, 12))).toBe('2026-01-09');
  });

  it('reads a stored moment back on the same day it was stored', () => {
    const stored = new Date(2026, 9, 3, 23, 30).toISOString();

    expect(localDayKey(new Date(stored))).toBe('2026-10-03');
  });
});

describe('stepStates', () => {
  it('opens the first day and locks the rest before anything is done', () => {
    expect(stepStates(ISLAND_WEEK, NOTHING_DONE, MORNING)).toEqual(['open', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
  });

  it('marks a finished day done, and holds the next until tomorrow', () => {
    expect(stepStates(ISLAND_WEEK, done([1], MORNING), EVENING)).toEqual(['done', 'tomorrow', 'locked', 'locked', 'locked', 'locked', 'locked']);
  });

  it('opens the next day the following morning', () => {
    expect(stepStates(ISLAND_WEEK, done([1], EVENING), NEXT_MORNING)).toEqual(['done', 'open', 'locked', 'locked', 'locked', 'locked', 'locked']);
  });

  it('opens a day the moment the day turns, local time', () => {
    const lateFinish = new Date(2026, 9, 3, 23, 59);
    const justAfterMidnight = new Date(2026, 9, 4, 0, 1);

    expect(stepStates(ISLAND_WEEK, done([1], lateFinish), justAfterMidnight)[1]).toBe('open');
  });

  it('keeps a missed day open, however long ago it opened', () => {
    expect(stepStates(ISLAND_WEEK, done([1, 2], MORNING), AFTER_A_WEEK)).toEqual(['done', 'done', 'open', 'locked', 'locked', 'locked', 'locked']);
  });

  it('opens only one day at a time, whatever the gaps', () => {
    const states = stepStates(ISLAND_WEEK, done([1, 2, 3], MORNING), AFTER_A_WEEK);

    expect(states.filter((state) => state === 'open')).toHaveLength(1);
    expect(states.filter((state) => state === 'tomorrow')).toHaveLength(0);
  });

  it('has every day done at the end of the week', () => {
    expect(stepStates(ISLAND_WEEK, done([1, 2, 3, 4, 5, 6, 7], MORNING), AFTER_A_WEEK)).toEqual(Array(7).fill('done'));
  });

  it('ignores a day done out of order, as a later version of the data might hold', () => {
    expect(stepStates(ISLAND_WEEK, done([3], MORNING), EVENING)).toEqual(['open', 'locked', 'done', 'locked', 'locked', 'locked', 'locked']);
  });

  it('ignores progress kept for a different plan', () => {
    const other: LearningPlanProgress = { planId: 'some-other-plan', completed: { [ISLAND_WEEK.steps[0].id]: MORNING.toISOString() } };

    expect(stepStates(ISLAND_WEEK, other, EVENING)[0]).toBe('open');
  });

  it.each(['not a date', '', '2026-13-45T00:00:00.000Z'])('treats a completion stamped %p as done long ago', (stamp) => {
    const broken: LearningPlanProgress = { planId: ISLAND_WEEK.id, completed: { [ISLAND_WEEK.steps[0].id]: stamp } };

    expect(stepStates(ISLAND_WEEK, broken, MORNING).slice(0, 2)).toEqual(['done', 'open']);
  });

  it('has no progress at all when none was ever kept', () => {
    expect(stepStates(ISLAND_WEEK, null, MORNING)[0]).toBe('open');
  });
});

describe('currentStep', () => {
  it('is the open day', () => {
    expect(currentStep(ISLAND_WEEK, done([1], EVENING), NEXT_MORNING)?.day).toBe(2);
  });

  it('is the day waiting for tomorrow when today is done', () => {
    expect(currentStep(ISLAND_WEEK, done([1], MORNING), EVENING)?.day).toBe(2);
  });

  it('is nothing once the week is done', () => {
    expect(currentStep(ISLAND_WEEK, done([1, 2, 3, 4, 5, 6, 7], MORNING), AFTER_A_WEEK)).toBeNull();
  });
});

describe('activityFor', () => {
  const words = ISLAND_WEEK.steps.find((step) => step.kind === 'words') as LearningPlanStep;

  it.each([
    [6, '1-2'],
    [23, '1-2'],
    [24, '2-4'],
    [47, '2-4'],
    [48, '4+'],
    [80, '4+'],
  ])('at %i months picks the game for the %s band', (months, age) => {
    expect(activityFor(words, months)).toBe(words.activityByAge?.[age as '1-2' | '2-4' | '4+']);
  });

  it('picks for the youngest when the age is not known', () => {
    expect(activityFor(words, null)).toBe(words.activityByAge?.['1-2']);
    expect(activityFor(words, Number.NaN)).toBe(words.activityByAge?.['1-2']);
  });

  it('has nothing to pick for a story day', () => {
    expect(activityFor(ISLAND_WEEK.steps[0], 30)).toBeNull();
  });
});

describe('previewable', () => {
  it.each([
    [{ kind: 'story', storyId: 'snuggle-little-wombat' }, true],
    [{ kind: 'spelling', activityId: 'wombat-spelling' }, true],
    [{ kind: 'feelings', activityIds: ['emotion-faces'] }, false],
    [{ kind: 'music', activityId: 'music-practise' }, false],
  ] as const)('can preview %o: %p, as only books and the spelling and numbers games have a card to show', (launch, expected) => {
    expect(previewable(launch)).toBe(expected);
  });
});

describe('previewActivity', () => {
  it('describes a game for its preview card just as the learning screen does', () => {
    const game = SPELLING_ACTIVITIES.find((candidate) => candidate.id === 'wombat-spelling');

    expect(previewActivity('wombat-spelling')).toEqual({
      id: game?.id,
      nameKey: game?.nameKey,
      descKey: game?.descKey,
      ageKey: game?.ageKey,
      icon: game?.icon,
      color: game?.color,
    });
  });

  it('finds every game a words or numbers day can open, at every age', () => {
    ISLAND_WEEK.steps
      .flatMap((step) => Object.values(step.activityByAge ?? {}))
      .forEach((activityId) => expect(previewActivity(activityId)?.id).toBe(activityId));
  });

  it('is nothing for an activity the app does not have', () => {
    expect(previewActivity('no-such-game')).toBeNull();
  });
});

describe('launchFor', () => {
  const byKind = (kind: LearningPlanStep['kind']) => ISLAND_WEEK.steps.find((step) => step.kind === kind) as LearningPlanStep;

  it('launches a story day as the book it names', () => {
    expect(launchFor(ISLAND_WEEK.steps[0], 30)).toEqual({ kind: 'story', storyId: ISLAND_WEEK.steps[0].storyId });
  });

  it.each(['words', 'numbers'] as const)('launches a %s day as the spelling game for the child`s age', (kind) => {
    const step = byKind(kind);

    expect(launchFor(step, 30)).toEqual({ kind: 'spelling', activityId: step.activityByAge?.['2-4'] });
  });

  it('launches a feelings day as the feelings game, whichever theme the child picks', () => {
    const step = byKind('feelings');

    expect(launchFor(step, 50)).toEqual({ kind: 'feelings', activityIds: step.activityIds });
  });

  it('launches a music day as practise', () => {
    expect(launchFor(byKind('music'), 30)).toEqual({ kind: 'music', activityId: 'music-practise' });
  });
});
