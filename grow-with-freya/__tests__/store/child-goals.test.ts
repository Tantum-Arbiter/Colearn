import type { PlanGoal } from '@/types/learning-plan';

const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

function resetStore() {
  useAppStore.getState().clearUserProfile();
  useAppStore.setState({ childGoals: [] });
}

describe('the goals a family chose', () => {
  beforeEach(resetStore);

  it('start empty, so a family who skipped the question gets the island week as it is', () => {
    expect(useAppStore.getState().childGoals).toEqual([]);
  });

  it('are kept in the order they were chosen, since the first weighs most', () => {
    useAppStore.getState().setChildGoals(['makeMusic', 'bigFeelings']);

    expect(useAppStore.getState().childGoals).toEqual(['makeMusic', 'bigFeelings']);
  });

  it('keep neither a goal named twice nor one the app does not know, and no more than three', () => {
    useAppStore.getState().setChildGoals(['bigFeelings', 'bigFeelings', 'nothing-of-the-sort' as PlanGoal, 'cosyStories', 'makeMusic', 'cosyStories']);

    expect(useAppStore.getState().childGoals).toEqual(['bigFeelings', 'cosyStories', 'makeMusic']);
  });

  it('can be cleared by choosing none', () => {
    useAppStore.getState().setChildGoals(['cosyStories']);
    useAppStore.getState().setChildGoals([]);

    expect(useAppStore.getState().childGoals).toEqual([]);
  });

  it('go with the child profile when it is cleared', () => {
    useAppStore.getState().setChildGoals(['cosyStories']);

    useAppStore.getState().clearUserProfile();

    expect(useAppStore.getState().childGoals).toEqual([]);
  });

  it('are persisted with the profile, never synced', () => {
    const source = require('fs').readFileSync(require('path').join(process.cwd(), 'store/app-store.ts'), 'utf8');
    const persisted = source.slice(source.indexOf('partialize:'), source.indexOf('onRehydrateStorage'));
    const synced = require('fs').readFileSync(require('path').join(process.cwd(), 'services/child-document.ts'), 'utf8');

    expect(persisted).toContain('childGoals: state.childGoals');
    expect(synced).not.toContain('childGoals');
  });
});
