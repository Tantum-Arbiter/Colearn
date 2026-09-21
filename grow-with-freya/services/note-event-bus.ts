export type NoteEventPhase = 'start' | 'end';
export type NoteEventSource = 'press' | 'preview' | 'melody';

export interface NoteEvent {
  note: string;
  phase: NoteEventPhase;
  source: NoteEventSource;
  durationMs?: number;
}

export type NoteEventListener = (event: NoteEvent) => void;

export interface NoteEventBus {
  subscribe: (listener: NoteEventListener) => () => void;
  emit: (event: NoteEvent) => void;
}

export function createNoteEventBus(): NoteEventBus {
  const listeners = new Set<NoteEventListener>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(event) {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch {
          continue;
        }
      }
    },
  };
}
