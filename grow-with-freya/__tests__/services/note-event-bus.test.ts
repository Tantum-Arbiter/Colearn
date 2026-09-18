import { createNoteEventBus, type NoteEvent } from '@/services/note-event-bus';

const startC: NoteEvent = { note: 'C', phase: 'start', source: 'press' };

describe('createNoteEventBus', () => {
  it('delivers an emitted event to every subscriber', () => {
    const underTest = createNoteEventBus();
    const first = jest.fn();
    const second = jest.fn();
    underTest.subscribe(first);
    underTest.subscribe(second);

    underTest.emit(startC);

    expect(first).toHaveBeenCalledWith(startC);
    expect(second).toHaveBeenCalledWith(startC);
  });

  it('stops delivering to a listener once it unsubscribes', () => {
    const underTest = createNoteEventBus();
    const listener = jest.fn();
    const unsubscribe = underTest.subscribe(listener);

    unsubscribe();
    underTest.emit(startC);

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps delivering to the other listeners when one throws', () => {
    const underTest = createNoteEventBus();
    const survivor = jest.fn();
    underTest.subscribe(() => { throw new Error('boom'); });
    underTest.subscribe(survivor);

    expect(() => underTest.emit(startC)).not.toThrow();

    expect(survivor).toHaveBeenCalledWith(startC);
  });

  it('delivers events in the order they were emitted', () => {
    const underTest = createNoteEventBus();
    const seen: string[] = [];
    underTest.subscribe(event => seen.push(`${event.note}:${event.phase}`));

    underTest.emit(startC);
    underTest.emit({ note: 'C', phase: 'end', source: 'press' });

    expect(seen).toEqual(['C:start', 'C:end']);
  });
});
