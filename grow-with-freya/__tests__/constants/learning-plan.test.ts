import { ALL_STORIES } from '@/data/stories';
import { ISLAND_WEEK } from '@/data/learning-plan';
import {
  PLAN_MODE_ICON,
  PLAN_STEP_ICON,
  PLAN_STEPS_PER_WEEK,
  currentStep,
  launchFor,
  localDayKey,
  previewable,
  stepStates,
  type LearningPlanProgress,
} from '@/constants/learning-plan';

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

  it('is the three books the app ships, read and recorded, the wombat`s picnic and the music practise', () => {
    const kinds = ISLAND_WEEK.steps.map((step) => step.kind);
    const stories = ISLAND_WEEK.steps.filter((step) => step.kind === 'story');

    expect(new Set(kinds)).toEqual(new Set(['story', 'music', 'game']));
    expect(new Set(stories.map((step) => step.storyId))).toEqual(new Set(['snuggle-little-wombat', 'hold-on-juni', 'my-turn-to-ding']));
    expect(new Set(stories.map((step) => step.mode))).toEqual(new Set(['read', 'record']));
    expect(ISLAND_WEEK.steps.every((step) => step.kind !== 'story' || step.mode !== undefined)).toBe(true);
  });

  it('lets a family meet the wombat, record his book, then count with him, and have Juni recorded before reading her book together', () => {
    const days = ISLAND_WEEK.steps;
    const firstOf = (storyId: string, mode: string) => days.findIndex((step) => step.storyId === storyId && step.mode === mode);
    const picnic = days.findIndex((step) => step.kind === 'game');

    expect(firstOf('snuggle-little-wombat', 'read')).toBeLessThan(firstOf('snuggle-little-wombat', 'record'));
    expect(firstOf('snuggle-little-wombat', 'record')).toBeLessThan(picnic);
    expect(days[picnic]).toMatchObject({ day: 3, packId: 'wombat-picnic', missionId: 'picnic', storyId: 'snuggle-little-wombat' });
    expect(firstOf('hold-on-juni', 'record')).toBeLessThan(firstOf('hold-on-juni', 'read'));
    expect(firstOf('hold-on-juni', 'narrate')).toBe(-1);
    expect(days[4].kind).toBe('music');
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

  it.each(ISLAND_WEEK.steps)('day $day says where it is, its kind of learning, what it builds, two skills and how long it takes', (step) => {
    expect(step.placeKey.startsWith('plan.places.')).toBe(true);
    expect(step.domainKey.startsWith('plan.domains.')).toBe(true);
    expect(step.aimKey).toMatch(/^plan\.units\.[a-zA-Z]+\.aim$/);
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

describe('previewable', () => {
  it.each([
    [{ kind: 'story', storyId: 'snuggle-little-wombat', mode: 'read' }, true],
    [{ kind: 'story', storyId: 'snuggle-little-wombat', mode: 'narrate' }, true],
    [{ kind: 'story', storyId: 'snuggle-little-wombat', mode: 'record' }, true],
    [{ kind: 'music', activityId: 'music-practise' }, false],
  ] as const)('can preview %o: %p, as only books have a card to show', (launch, expected) => {
    expect(previewable(launch)).toBe(expected);
  });
});

describe('the marks a day wears', () => {
  it('has an open book for a story, notes for music and sparkles for a game', () => {
    expect(PLAN_STEP_ICON).toEqual({ story: 'book', music: 'musical-notes', game: 'sparkles' });
  });

  it('has a speaker for listening along and a microphone for recording', () => {
    expect(PLAN_MODE_ICON).toEqual({ read: 'book', narrate: 'volume-medium', record: 'mic' });
  });
});

describe('launchFor', () => {
  it('launches a story day as the book it names, in the mode the day asks for', () => {
    expect(launchFor(ISLAND_WEEK.steps[0])).toEqual({ kind: 'story', storyId: 'snuggle-little-wombat', mode: 'read' });
    expect(launchFor(ISLAND_WEEK.steps[1])).toEqual({ kind: 'story', storyId: 'snuggle-little-wombat', mode: 'record' });
    expect(launchFor(ISLAND_WEEK.steps[3])).toEqual({ kind: 'story', storyId: 'hold-on-juni', mode: 'record' });
  });

  it('launches a game day as the mission of the pack it names', () => {
    expect(launchFor(ISLAND_WEEK.steps[2])).toEqual({ kind: 'game', packId: 'wombat-picnic', missionId: 'picnic' });
  });

  it('has nothing to launch for a game day missing its pack or its mission', () => {
    expect(launchFor({ ...ISLAND_WEEK.steps[2], packId: undefined })).toBeNull();
    expect(launchFor({ ...ISLAND_WEEK.steps[2], missionId: undefined })).toBeNull();
  });

  it('cannot preview a game day, only a story', () => {
    expect(previewable({ kind: 'game', packId: 'wombat-picnic', missionId: 'picnic' })).toBe(false);
    expect(previewable({ kind: 'story', storyId: 'snuggle-little-wombat', mode: 'read' })).toBe(true);
  });

  it('reads a story day together when no mode is named', () => {
    expect(launchFor({ ...ISLAND_WEEK.steps[0], mode: undefined })).toEqual({ kind: 'story', storyId: 'snuggle-little-wombat', mode: 'read' });
  });

  it('launches the music day as the practise', () => {
    expect(launchFor(ISLAND_WEEK.steps[4])).toEqual({ kind: 'music', activityId: 'music-practise' });
  });

  it('has nothing to launch for a story day that names no book', () => {
    expect(launchFor({ ...ISLAND_WEEK.steps[0], storyId: undefined })).toBeNull();
  });
});
