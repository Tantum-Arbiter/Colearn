import { act, renderHook } from '@testing-library/react-native';
import { useLearningPlan } from '@/hooks/use-learning-plan';
import { ISLAND_WEEK } from '@/data/learning-plan';
import { ISLAND_TRAIL, ISLAND_TRAIL_PHONE } from '@/constants/island-trail';
import type { LearningPlanProgress } from '@/constants/learning-plan';

let mockProgress: LearningPlanProgress | null = null;
let mockAge: number | null = 30;
const mockBeginPlanStep = jest.fn();
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ learningPlanProgress: mockProgress, childAgeInMonths: mockAge, beginPlanStep: mockBeginPlanStep }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/data/stories', () => ({
  ALL_STORIES: [
    { id: 'snuggle-little-wombat', title: 'Snuggle Little Wombat', localizedTitle: { en: 'Snuggle Little Wombat', fr: 'Câlin Petit Wombat' }, coverImage: { uri: 'file:///wombat.webp' }, isAvailable: true },
    { id: 'hold-on-juni', title: 'Hold On, Juni', isAvailable: true },
    { id: 'my-turn-to-ding', title: 'My Turn to Ding', isAvailable: true },
  ],
}));

function done(days: number[], at: string): LearningPlanProgress {
  return { planId: ISLAND_WEEK.id, completed: Object.fromEntries(days.map((day) => [`day-${day}`, at])) };
}

describe('useLearningPlan', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 3, 9, 0));
    mockProgress = null;
    mockAge = 30;
    mockBeginPlanStep.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lays the seven days along the trail, in order', () => {
    const { result } = renderHook(() => useLearningPlan(true));

    expect(result.current.steps).toHaveLength(7);
    result.current.steps.forEach((view, index) => {
      expect(view.step).toBe(ISLAND_WEEK.steps[index]);
      expect(view.point).toEqual(ISLAND_TRAIL[index]);
    });
  });

  it('puts each step on the trail it is given, so a phone can have a trail of its own', () => {
    const { result } = renderHook(() => useLearningPlan(true, ISLAND_TRAIL_PHONE));

    result.current.steps.forEach((view, index) => {
      expect(view.point).toEqual(ISLAND_TRAIL_PHONE[index]);
    });
  });

  it('opens the first day for a child who has done nothing yet', () => {
    const { result } = renderHook(() => useLearningPlan(true));

    expect(result.current.steps.map((view) => view.state)).toEqual(['open', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
    expect(result.current.current?.step.day).toBe(1);
    expect(result.current.doneCount).toBe(0);
    expect(Object.keys(result.current)).not.toContain('allDone');
  });

  it('names a story day by its book, in the language in use, with its cover', () => {
    const { result } = renderHook(() => useLearningPlan(true));

    const first = result.current.steps[0];

    expect(first.title).toBe('Snuggle Little Wombat');
    expect(first.picture).toEqual({ uri: 'file:///wombat.webp' });
  });

  it('names a words day by the game for the child`s age', () => {
    mockAge = 60;
    const { result } = renderHook(() => useLearningPlan(true));

    expect(result.current.steps[1].title).toBe('learning.wordBuilder');
    expect(result.current.steps[1].launch).toEqual({ kind: 'spelling', activityId: 'word-builder' });
  });

  it('names the feelings and music days for what they are', () => {
    const { result } = renderHook(() => useLearningPlan(true));

    expect(result.current.steps[3].title).toBe('emotions.title');
    expect(result.current.steps[4].title).toBe('menu.practise');
  });

  it('counts the days done and finds the one that is next', () => {
    mockProgress = done([1, 2], '2026-10-01T08:00:00.000Z');
    const { result } = renderHook(() => useLearningPlan(true));

    expect(result.current.doneCount).toBe(2);
    expect(result.current.current?.step.day).toBe(3);
    expect(result.current.current?.state).toBe('open');
  });

  it('holds the next day for tomorrow when today`s is done', () => {
    mockProgress = done([1], new Date(2026, 9, 3, 8, 0).toISOString());
    const { result } = renderHook(() => useLearningPlan(true));

    expect(result.current.current?.step.day).toBe(2);
    expect(result.current.current?.state).toBe('tomorrow');
  });

  it('notices the day turning while the island is showing', () => {
    mockProgress = done([1], new Date(2026, 9, 3, 8, 0).toISOString());
    const { result } = renderHook(() => useLearningPlan(true));
    expect(result.current.current?.state).toBe('tomorrow');

    act(() => {
      jest.setSystemTime(new Date(2026, 9, 4, 0, 0, 30));
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current.current?.state).toBe('open');
  });

  it('does not keep looking at the clock while the island is away', () => {
    renderHook(() => useLearningPlan(false));

    expect(jest.getTimerCount()).toBe(0);
  });

  it('is all done, with nothing next, at the end of the week', () => {
    mockProgress = done([1, 2, 3, 4, 5, 6, 7], '2026-10-01T08:00:00.000Z');
    const { result } = renderHook(() => useLearningPlan(true));

    expect(result.current.current).toBeNull();
    expect(result.current.doneCount).toBe(7);
  });

  it('sets the child off on an open day, remembering what to wait for', () => {
    const { result } = renderHook(() => useLearningPlan(true));

    const launch = result.current.start(result.current.steps[0]);

    expect(launch).toEqual({ kind: 'story', storyId: 'snuggle-little-wombat' });
    expect(mockBeginPlanStep).toHaveBeenCalledWith({ planId: 'island-week', stepId: 'day-1', launch });
  });

  it.each(['locked', 'tomorrow', 'done'])('sets nobody off on a day that is %s', (state) => {
    mockProgress = state === 'locked' ? null : state === 'done' ? done([1], '2026-10-01T08:00:00.000Z') : done([1], new Date(2026, 9, 3, 8, 0).toISOString());
    const { result } = renderHook(() => useLearningPlan(true));
    const view = result.current.steps.find((candidate) => candidate.state === state);

    expect(view).toBeDefined();
    expect(result.current.start(view!)).toBeNull();
    expect(mockBeginPlanStep).not.toHaveBeenCalled();
  });
});
