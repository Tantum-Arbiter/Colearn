import { act, renderHook } from '@testing-library/react-native';
import { JOURNEY_CLOCK_MS, useJourneySteps } from '@/components/home/use-journey-steps';
import { ISLAND_WEEK } from '@/data/learning-plan';
import type { LearningPlanProgress } from '@/constants/learning-plan';

let mockProgress: LearningPlanProgress | null = null;
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector({ learningPlanProgress: mockProgress }),
}));

function done(days: number[], at: string): LearningPlanProgress {
  return { planId: ISLAND_WEEK.id, completed: Object.fromEntries(days.map((day) => [`day-${day}`, at])) };
}

describe('useJourneySteps', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 3, 9, 0));
    mockProgress = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the first five steps of the island week to a child who has done nothing, the first one open', () => {
    const { result } = renderHook(() => useJourneySteps(true));

    expect(result.current.map((step) => step.day)).toEqual([1, 2, 3, 4, 5]);
    expect(result.current.map((step) => step.state)).toEqual(['open', 'locked', 'locked', 'locked', 'locked']);
  });

  it('says what kind of step each one is, as the island does', () => {
    const { result } = renderHook(() => useJourneySteps(true));

    expect(result.current.map((step) => step.kind)).toEqual(ISLAND_WEEK.steps.slice(0, 5).map((step) => step.kind));
    expect(result.current.map((step) => step.id)).toEqual(ISLAND_WEEK.steps.slice(0, 5).map((step) => step.id));
  });

  it('holds the next step until tomorrow once today`s is done, and opens it the day after', () => {
    mockProgress = done([1], new Date(2026, 9, 3, 8, 0).toISOString());
    const today = renderHook(() => useJourneySteps(true));

    expect(today.result.current.map((step) => step.state)).toEqual(['done', 'tomorrow', 'locked', 'locked', 'locked']);

    mockProgress = done([1], new Date(2026, 9, 2, 8, 0).toISOString());
    const dayAfter = renderHook(() => useJourneySteps(true));

    expect(dayAfter.result.current.map((step) => step.state)).toEqual(['done', 'open', 'locked', 'locked', 'locked']);
  });

  it('moves along the week with the child, keeping the step in hand in view', () => {
    mockProgress = done([1, 2, 3], new Date(2026, 9, 1, 8, 0).toISOString());
    const { result } = renderHook(() => useJourneySteps(true));

    expect(result.current.map((step) => step.day)).toEqual([3, 4, 5, 6, 7]);
    expect(result.current.map((step) => step.state)).toEqual(['done', 'open', 'locked', 'locked', 'locked']);
  });

  it('counts nothing from another plan`s progress', () => {
    mockProgress = { planId: 'some-other-week', completed: { 'day-1': new Date(2026, 9, 1).toISOString() } };
    const { result } = renderHook(() => useJourneySteps(true));

    expect(result.current.map((step) => step.state)).toEqual(['open', 'locked', 'locked', 'locked', 'locked']);
  });

  it('opens tomorrow`s step when midnight passes with the home screen left showing', () => {
    mockProgress = done([1], new Date(2026, 9, 3, 8, 0).toISOString());
    jest.setSystemTime(new Date(2026, 9, 3, 23, 59, 30));
    const { result } = renderHook(() => useJourneySteps(true));
    expect(result.current[1].state).toBe('tomorrow');

    act(() => {
      jest.advanceTimersByTime(JOURNEY_CLOCK_MS);
    });

    expect(result.current[1].state).toBe('open');
  });

  it('keeps no clock running while the home screen is away, and looks again on coming back', () => {
    mockProgress = done([1], new Date(2026, 9, 3, 8, 0).toISOString());
    jest.setSystemTime(new Date(2026, 9, 3, 23, 59, 30));
    const { result, rerender } = renderHook(({ active }: { active: boolean }) => useJourneySteps(active), {
      initialProps: { active: false },
    });

    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      jest.advanceTimersByTime(JOURNEY_CLOCK_MS * 3);
    });
    expect(result.current[1].state).toBe('tomorrow');

    rerender({ active: true });

    expect(result.current[1].state).toBe('open');
  });

  it('hands back the very same steps while nothing about them has changed, so the home screen is not redrawn each minute', () => {
    const { result } = renderHook(() => useJourneySteps(true));
    const before = result.current;

    act(() => {
      jest.advanceTimersByTime(JOURNEY_CLOCK_MS * 2);
    });

    expect(result.current).toBe(before);
  });

  it('stops its clock when the home screen is closed', () => {
    const { unmount } = renderHook(() => useJourneySteps(true));
    expect(jest.getTimerCount()).toBe(1);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
