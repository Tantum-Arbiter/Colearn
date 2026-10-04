/**
 * The store remembers which days of the learning plan are done, and which
 * activity the child set off on from the island, so that finishing it, by
 * whatever screen, ticks the day off.
 */

const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

const STORY_RUN = { planId: 'island-week', stepId: 'day-1', launch: { kind: 'story', storyId: 'snuggle-little-wombat' } } as const;
const GAME_RUN = { planId: 'island-week', stepId: 'day-2', launch: { kind: 'spelling', activityId: 'wombat-spelling' } } as const;

function resetStore(): void {
  useAppStore.setState({
    learningPlanProgress: null,
    planRun: null,
    storyProgress: {},
    finishedStoryIds: [],
    lastStoryCompletedAt: null,
  });
}

describe('setting off on a plan step', () => {
  beforeEach(resetStore);

  it('starts with nothing under way and nothing done', () => {
    expect(useAppStore.getState().planRun).toBeNull();
    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });

  it('remembers what the child set off on', () => {
    useAppStore.getState().beginPlanStep(STORY_RUN);

    expect(useAppStore.getState().planRun).toEqual(STORY_RUN);
  });

  it('forgets it when the child comes back without finishing', () => {
    useAppStore.getState().beginPlanStep(STORY_RUN);

    useAppStore.getState().leavePlanStep();

    expect(useAppStore.getState().planRun).toBeNull();
    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });
});

describe('finishing a story day', () => {
  beforeEach(resetStore);

  it('ticks the day off when the book the child set off on is finished', () => {
    useAppStore.getState().beginPlanStep(STORY_RUN);

    useAppStore.getState().markStoryCompleted('snuggle-little-wombat');

    const underTest = useAppStore.getState().learningPlanProgress;
    expect(underTest?.planId).toBe('island-week');
    expect(Object.keys(underTest?.completed ?? {})).toEqual(['day-1']);
    expect(Number.isNaN(new Date(underTest?.completed['day-1'] ?? '').getTime())).toBe(false);
    expect(useAppStore.getState().planRun).toBeNull();
  });

  it('still records the book itself as finished', () => {
    useAppStore.getState().beginPlanStep(STORY_RUN);

    useAppStore.getState().markStoryCompleted('snuggle-little-wombat');

    expect(useAppStore.getState().finishedStoryIds).toEqual(['snuggle-little-wombat']);
  });

  it('does not tick the day off for a different book', () => {
    useAppStore.getState().beginPlanStep(STORY_RUN);

    useAppStore.getState().markStoryCompleted('hold-on-juni');

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
    expect(useAppStore.getState().planRun).toEqual(STORY_RUN);
  });

  it('does not tick a day off for a book finished when nothing was set off on', () => {
    useAppStore.getState().markStoryCompleted('snuggle-little-wombat');

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });

  it('does not tick a story day off for a game', () => {
    useAppStore.getState().beginPlanStep(STORY_RUN);

    useAppStore.getState().recordActivityFinished('wombat-spelling');

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });
});

describe('finishing a game day', () => {
  beforeEach(resetStore);

  it('ticks the day off when the game the child set off on reports itself finished', () => {
    useAppStore.getState().beginPlanStep(GAME_RUN);

    useAppStore.getState().recordActivityFinished('wombat-spelling');

    expect(Object.keys(useAppStore.getState().learningPlanProgress?.completed ?? {})).toEqual(['day-2']);
    expect(useAppStore.getState().planRun).toBeNull();
  });

  it('does not tick the day off for a different game', () => {
    useAppStore.getState().beginPlanStep(GAME_RUN);

    useAppStore.getState().recordActivityFinished('abc-animals');

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });

  it('does not tick a game day off for a book', () => {
    useAppStore.getState().beginPlanStep(GAME_RUN);

    useAppStore.getState().markStoryCompleted('snuggle-little-wombat');

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });

  it('ticks a feelings day off for whichever theme the child played', () => {
    useAppStore.getState().beginPlanStep({ planId: 'island-week', stepId: 'day-4', launch: { kind: 'feelings', activityIds: ['emotion-faces', 'animal-feelings'] } });

    useAppStore.getState().recordActivityFinished('animal-feelings');

    expect(Object.keys(useAppStore.getState().learningPlanProgress?.completed ?? {})).toEqual(['day-4']);
  });

  it('does not tick a feelings day off for a theme that is not its own', () => {
    useAppStore.getState().beginPlanStep({ planId: 'island-week', stepId: 'day-4', launch: { kind: 'feelings', activityIds: ['emotion-faces'] } });

    useAppStore.getState().recordActivityFinished('my-feelings');

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });

  it('is nothing when no step is under way', () => {
    useAppStore.getState().recordActivityFinished('wombat-spelling');

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });
});

describe('the record of days done', () => {
  beforeEach(resetStore);

  it('keeps earlier days when a later one is done', () => {
    useAppStore.getState().beginPlanStep(STORY_RUN);
    useAppStore.getState().markStoryCompleted('snuggle-little-wombat');
    useAppStore.getState().beginPlanStep(GAME_RUN);

    useAppStore.getState().recordActivityFinished('wombat-spelling');

    expect(Object.keys(useAppStore.getState().learningPlanProgress?.completed ?? {}).sort()).toEqual(['day-1', 'day-2']);
  });

  it('keeps the first finish of a day, so doing it twice cannot move it to a later day', () => {
    useAppStore.setState({ learningPlanProgress: { planId: 'island-week', completed: { 'day-1': '2026-10-01T08:00:00.000Z' } } });
    useAppStore.getState().beginPlanStep(STORY_RUN);

    useAppStore.getState().markStoryCompleted('snuggle-little-wombat');

    expect(useAppStore.getState().learningPlanProgress?.completed['day-1']).toBe('2026-10-01T08:00:00.000Z');
  });

  it('starts afresh for a different plan', () => {
    useAppStore.setState({ learningPlanProgress: { planId: 'an-old-plan', completed: { 'day-1': '2026-10-01T08:00:00.000Z' } } });
    useAppStore.getState().beginPlanStep(STORY_RUN);

    useAppStore.getState().markStoryCompleted('snuggle-little-wombat');

    expect(useAppStore.getState().learningPlanProgress).toEqual({
      planId: 'island-week',
      completed: { 'day-1': expect.any(String) },
    });
  });

  it('can be set whole, or cleared, by the seam a test opens', () => {
    useAppStore.getState().setLearningPlanProgress({ planId: 'island-week', completed: { 'day-1': '2026-10-01T08:00:00.000Z', 'day-2': '2026-10-02T08:00:00.000Z' } });
    expect(Object.keys(useAppStore.getState().learningPlanProgress?.completed ?? {}).sort()).toEqual(['day-1', 'day-2']);

    useAppStore.getState().setLearningPlanProgress(null);
    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });

  it('persists the days done but not what is under way', () => {
    const source = require('fs').readFileSync(require('path').join(process.cwd(), 'store/app-store.ts'), 'utf8');
    const persisted = source.slice(source.indexOf('partialize:'), source.indexOf('onRehydrateStorage'));

    expect(persisted).toContain('learningPlanProgress: state.learningPlanProgress');
    expect(persisted).not.toContain('planRun');
  });
});
