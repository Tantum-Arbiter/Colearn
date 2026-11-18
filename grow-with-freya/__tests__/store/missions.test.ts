import type { EngineSave } from '@/types/game-pack';

const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

const GAME_RUN = { planId: 'island-week', stepId: 'day-3', launch: { kind: 'game', packId: 'wombat-picnic', missionId: 'picnic' } } as const;
const SAVE: EngineSave = { missionId: 'picnic', stage: 1, states: {}, placed: { 'berry-1': 'leaf' }, savedAt: '2026-10-17T10:00:00.000Z' };

function resetStore(): void {
  useAppStore.setState({
    learningPlanProgress: null,
    planRun: null,
    challengeCounts: {},
    gameSaves: {},
    currentChildId: null,
    userNickname: 'Freya',
  });
}

describe('finishing a mission', () => {
  beforeEach(resetStore);

  it('ticks the day off when the mission the child set off on is the one finished', () => {
    useAppStore.getState().beginPlanStep(GAME_RUN);

    useAppStore.getState().recordMissionFinished('wombat-picnic', 'picnic');

    const underTest = useAppStore.getState().learningPlanProgress;
    expect(Object.keys(underTest?.completed ?? {})).toEqual(['day-3']);
    expect(useAppStore.getState().planRun).toBeNull();
  });

  it.each([
    ['another pack', 'juni-rock-pool', 'picnic'],
    ['another mission of the same pack', 'wombat-picnic', 'picnic-again'],
  ])('leaves the day open when %s is finished instead', (_, packId, missionId) => {
    useAppStore.getState().beginPlanStep(GAME_RUN);

    useAppStore.getState().recordMissionFinished(packId, missionId);

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
    expect(useAppStore.getState().planRun).toEqual(GAME_RUN);
  });

  it('ticks nothing off when the child did not set off from the island', () => {
    useAppStore.getState().recordMissionFinished('wombat-picnic', 'picnic');

    expect(useAppStore.getState().learningPlanProgress).toBeNull();
  });

  it('counts the mission for the badges whether or not it was a plan day', () => {
    useAppStore.getState().recordMissionFinished('wombat-picnic', 'picnic');
    useAppStore.getState().beginPlanStep(GAME_RUN);
    useAppStore.getState().recordMissionFinished('wombat-picnic', 'picnic');

    expect(useAppStore.getState().challengeCounts.mission).toBe(2);
  });
});

describe('what a child has left half-done in a game', () => {
  beforeEach(resetStore);

  it('is kept under the child it belongs to', () => {
    useAppStore.setState({ currentChildId: 'child-1' });

    useAppStore.getState().saveGame('wombat-picnic', SAVE);

    expect(useAppStore.getState().gameSaves).toEqual({ 'child-1': { 'wombat-picnic': SAVE } });
  });

  it('is kept for the guest child on a device with no child id', () => {
    useAppStore.getState().saveGame('wombat-picnic', SAVE);

    expect(useAppStore.getState().gameSaves).toEqual({ guest: { 'wombat-picnic': SAVE } });
  });

  it('is told apart from another child`s save of the same game', () => {
    useAppStore.setState({ currentChildId: 'child-1' });
    useAppStore.getState().saveGame('wombat-picnic', SAVE);
    useAppStore.setState({ currentChildId: 'child-2' });

    expect(useAppStore.getState().gameSaveFor('wombat-picnic')).toBeNull();
    useAppStore.setState({ currentChildId: 'child-1' });
    expect(useAppStore.getState().gameSaveFor('wombat-picnic')).toEqual(SAVE);
  });

  it('is replaced by a later save and forgotten when cleared', () => {
    useAppStore.getState().saveGame('wombat-picnic', SAVE);
    const later = { ...SAVE, stage: 2 };

    useAppStore.getState().saveGame('wombat-picnic', later);
    expect(useAppStore.getState().gameSaveFor('wombat-picnic')).toEqual(later);

    useAppStore.getState().clearGameSave('wombat-picnic');
    expect(useAppStore.getState().gameSaveFor('wombat-picnic')).toBeNull();
    expect(useAppStore.getState().gameSaves).toEqual({ guest: {} });
  });

  it('clearing a save that was never made changes nothing', () => {
    const before = useAppStore.getState().gameSaves;

    useAppStore.getState().clearGameSave('wombat-picnic');

    expect(useAppStore.getState().gameSaves).toBe(before);
  });

  it('can all be forgotten at once, for every child, as a test seed does', () => {
    useAppStore.setState({ currentChildId: 'child-1' });
    useAppStore.getState().saveGame('wombat-picnic', SAVE);
    useAppStore.setState({ currentChildId: 'child-2' });
    useAppStore.getState().saveGame('wombat-picnic', SAVE);

    useAppStore.getState().clearAllGameSaves();

    expect(useAppStore.getState().gameSaves).toEqual({});
  });

  it('goes with the child profile when it is cleared', () => {
    useAppStore.getState().saveGame('wombat-picnic', SAVE);

    useAppStore.getState().clearUserProfile();

    expect(useAppStore.getState().gameSaves).toEqual({});
  });

  it('is persisted on the device and never synced', () => {
    const source = require('fs').readFileSync(require('path').join(process.cwd(), 'store/app-store.ts'), 'utf8');
    const persisted = source.slice(source.indexOf('partialize:'), source.indexOf('onRehydrateStorage'));
    const synced = require('fs').readFileSync(require('path').join(process.cwd(), 'services/child-document.ts'), 'utf8');

    expect(persisted).toContain('gameSaves: state.gameSaves');
    expect(synced).not.toContain('gameSaves');
  });
});
