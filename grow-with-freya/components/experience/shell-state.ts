export const SHELL_PHASES = ['loading', 'intro', 'playing', 'paused', 'celebrating', 'bridge', 'done'] as const;

export const SHELL_EVENTS = ['loaded', 'failed', 'introDone', 'pause', 'resume', 'complete', 'celebrated', 'finish', 'back', 'limitReached'] as const;

export type ShellPhase = (typeof SHELL_PHASES)[number];

export type ShellEvent = (typeof SHELL_EVENTS)[number];

export interface ShellState {
  phase: ShellPhase;
  startedAt: number;
  left: boolean;
  completedAt: number | null;
}

export interface ShellAction {
  type: ShellEvent;
  at: number;
}

export function startingShell(at: number): ShellState {
  return { phase: 'loading', startedAt: at, left: false, completedAt: null };
}

const UNDER_WAY: readonly ShellPhase[] = ['loading', 'intro', 'playing', 'paused'];

export function shellReducer(state: ShellState, action: ShellAction): ShellState {
  const { phase } = state;
  if (phase === 'done') return state;

  switch (action.type) {
    case 'loaded':
      return phase === 'loading' ? { ...state, phase: 'intro' } : state;
    case 'failed':
      return phase === 'loading' ? { ...state, phase: 'done', left: true } : state;
    case 'introDone':
      return phase === 'intro' ? { ...state, phase: 'playing' } : state;
    case 'pause':
      return phase === 'playing' || phase === 'intro' ? { ...state, phase: 'paused' } : state;
    case 'resume':
      return phase === 'paused' ? { ...state, phase: 'playing' } : state;
    case 'complete':
      return phase === 'playing' || phase === 'intro' || phase === 'paused' ? { ...state, phase: 'celebrating', completedAt: action.at } : state;
    case 'celebrated':
      return phase === 'celebrating' ? { ...state, phase: 'bridge' } : state;
    case 'finish':
      return phase === 'bridge' ? { ...state, phase: 'done' } : state;
    case 'back':
      return { ...state, phase: 'done', left: UNDER_WAY.includes(phase) };
    case 'limitReached':
      return UNDER_WAY.includes(phase) ? { ...state, phase: 'done', left: true } : state;
  }
}
