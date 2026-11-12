import { SHELL_EVENTS, SHELL_PHASES, shellReducer, type ShellEvent, type ShellPhase, type ShellState } from '@/components/experience/shell-state';

function at(phase: ShellPhase, extra: Partial<ShellState> = {}): ShellState {
  return { phase, startedAt: 1000, left: false, skipped: false, completedAt: null, ...extra };
}

const STEP: [ShellPhase, ShellEvent, ShellPhase][] = [
  ['loading', 'loaded', 'intro'],
  ['intro', 'introDone', 'playing'],
  ['playing', 'pause', 'paused'],
  ['paused', 'resume', 'playing'],
  ['playing', 'complete', 'celebrating'],
  ['celebrating', 'celebrated', 'bridge'],
  ['bridge', 'finish', 'done'],
  ['playing', 'skip', 'skipped'],
  ['skipped', 'celebrated', 'done'],
];

describe('shellReducer: the way through', () => {
  it.each(STEP)('%s + %s → %s', (from, event, to) => {
    expect(shellReducer(at(from), { type: event, at: 2000 }).phase).toBe(to);
  });

  it('goes the whole way from loading to done', () => {
    const phases = ['loaded', 'introDone', 'complete', 'celebrated', 'finish'].reduce<ShellState[]>(
      (states, event) => [...states, shellReducer(states[states.length - 1], { type: event as ShellEvent, at: 2000 })],
      [at('loading')]
    );

    expect(phases.map((state) => state.phase)).toEqual(['loading', 'intro', 'playing', 'celebrating', 'bridge', 'done']);
    expect(phases[phases.length - 1].left).toBe(false);
  });

  it('remembers when the mission was completed', () => {
    const state = shellReducer(at('playing'), { type: 'complete', at: 7000 });

    expect(state.completedAt).toBe(7000);
  });
});

describe('shellReducer: skipping', () => {
  it.each(['intro', 'playing', 'paused'] as const)('skip while %s shows the skipped resolution and records no completion', (phase) => {
    const state = shellReducer(at(phase), { type: 'skip', at: 2000 });

    expect(state.phase).toBe('skipped');
    expect(state.skipped).toBe(true);
    expect(state.completedAt).toBeNull();
  });

  it('the skipped resolution ends the challenge without a bridge', () => {
    const state = shellReducer(at('skipped', { skipped: true }), { type: 'celebrated', at: 2000 });

    expect(state.phase).toBe('done');
    expect(state.left).toBe(false);
    expect(state.skipped).toBe(true);
  });

  it('completing cannot overturn a skip', () => {
    const skipped = at('skipped', { skipped: true });

    expect(shellReducer(skipped, { type: 'complete', at: 2000 })).toBe(skipped);
  });
});

describe('shellReducer: leaving', () => {
  it.each(['loading', 'intro', 'playing', 'paused'] as const)('back while %s is done, having left', (phase) => {
    const state = shellReducer(at(phase), { type: 'back', at: 2000 });

    expect(state.phase).toBe('done');
    expect(state.left).toBe(true);
  });

  it('back while skipped is done, and still counts as skipped', () => {
    const state = shellReducer(at('skipped', { skipped: true }), { type: 'back', at: 2000 });

    expect(state.phase).toBe('done');
    expect(state.left).toBe(false);
    expect(state.skipped).toBe(true);
  });

  it.each(['celebrating', 'bridge'] as const)('back while %s is done, and still counts as completed', (phase) => {
    const state = shellReducer(at(phase, { completedAt: 1500 }), { type: 'back', at: 2000 });

    expect(state.phase).toBe('done');
    expect(state.left).toBe(false);
    expect(state.completedAt).toBe(1500);
  });

  it.each(['loading', 'intro', 'playing', 'paused'] as const)('the day`s screen time running out while %s is done, having left', (phase) => {
    const state = shellReducer(at(phase), { type: 'limitReached', at: 2000 });

    expect(state.phase).toBe('done');
    expect(state.left).toBe(true);
  });

  it.each(['celebrating', 'bridge', 'skipped'] as const)('the day`s screen time running out while %s lets the celebration and bridge finish', (phase) => {
    const state = shellReducer(at(phase, { completedAt: 1500 }), { type: 'limitReached', at: 2000 });

    expect(state.phase).toBe(phase);
  });

  it('a pack that fails to load is done, having left', () => {
    const state = shellReducer(at('loading'), { type: 'failed', at: 2000 });

    expect(state.phase).toBe('done');
    expect(state.left).toBe(true);
  });
});

describe('shellReducer: every other pairing changes nothing', () => {
  const allowed = new Set([
    ...STEP.map(([from, event]) => `${from}:${event}`),
    ...['loading', 'intro', 'playing', 'paused', 'celebrating', 'bridge', 'skipped'].map((phase) => `${phase}:back`),
    ...['loading', 'intro', 'playing', 'paused'].map((phase) => `${phase}:limitReached`),
    'loading:failed',
    'intro:pause',
    'intro:complete',
    'paused:complete',
    'intro:skip',
    'paused:skip',
  ]);
  const others = SHELL_PHASES.flatMap((phase) => SHELL_EVENTS.map((event) => [phase, event] as const)).filter(([phase, event]) => !allowed.has(`${phase}:${event}`));

  it.each(others)('%s + %s stays put', (phase, event) => {
    const before = at(phase);

    const after = shellReducer(before, { type: event, at: 2000 });

    expect(after).toBe(before);
  });

  it('pausing during the intro waits, and resuming carries on, playing', () => {
    const paused = shellReducer(at('intro'), { type: 'pause', at: 2000 });
    const resumed = shellReducer(paused, { type: 'resume', at: 3000 });

    expect(paused.phase).toBe('paused');
    expect(resumed.phase).toBe('playing');
  });

  it('completing during the intro or while paused still celebrates, since the child may have done it already', () => {
    expect(shellReducer(at('intro'), { type: 'complete', at: 2000 }).phase).toBe('celebrating');
    expect(shellReducer(at('paused'), { type: 'complete', at: 2000 }).phase).toBe('celebrating');
  });

  it('nothing moves a shell that is done', () => {
    const done = at('done', { left: true });

    SHELL_EVENTS.forEach((event) => expect(shellReducer(done, { type: event, at: 2000 })).toBe(done));
  });
});
