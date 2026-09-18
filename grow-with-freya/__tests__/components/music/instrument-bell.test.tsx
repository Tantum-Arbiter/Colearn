import React from 'react';
import { render, act } from '@testing-library/react-native';
import { withTiming, withSequence, withRepeat, cancelAnimation } from 'react-native-reanimated';
import { InstrumentBell, BELL_RELEASE_MS } from '@/components/music/instrument-bell';
import { createNoteEventBus } from '@/services/note-event-bus';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: jest.fn(() => false) }));

const bell = {
  image: { uri: 'test://bell.webp' } as unknown as number,
  frame: { x: 0.75, y: 0, width: 0.25, height: 1 },
  origin: { x: 0.76, y: 0.5 },
  scale: { x: 1.04, y: 1.07 },
};

const placement = { left: 600, top: 0, width: 200, height: 200, originX: 8.4, originY: 100.2 };

function renderBell(overrides: Partial<React.ComponentProps<typeof InstrumentBell>> = {}) {
  const noteEvents = createNoteEventBus();
  const utils = render(<InstrumentBell bell={bell} placement={placement} noteEvents={noteEvents} {...overrides} />);
  const image = utils.UNSAFE_queryAllByProps({ testID: 'instrument-bell' })[0];
  return { ...utils, noteEvents, image };
}

function flatStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

describe('InstrumentBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });

  it('draws the bell cutout exactly over its frame with whole-pixel transform origin', () => {
    const { image } = renderBell();

    expect(flatStyle(image.props.style)).toMatchObject({
      position: 'absolute',
      left: 600,
      top: 0,
      width: 200,
      height: 200,
      transformOrigin: '8px 100px',
    });
    expect(image.props.source).toEqual(bell.image);
  });

  it('never intercepts touches meant for the note buttons', () => {
    const { image } = renderBell();

    expect(flatStyle(image.props.style).pointerEvents).toBe('none');
  });

  it('swells when a note starts sounding', () => {
    const { noteEvents } = renderBell();

    act(() => noteEvents.emit({ note: 'C', phase: 'start', source: 'press' }));

    expect(withSequence).toHaveBeenCalled();
    expect(withRepeat).toHaveBeenCalled();
  });

  it('relaxes back only when the last sounding note ends', () => {
    const { noteEvents } = renderBell();
    act(() => noteEvents.emit({ note: 'C', phase: 'start', source: 'press' }));
    act(() => noteEvents.emit({ note: 'E', phase: 'start', source: 'press' }));
    (withTiming as jest.Mock).mockClear();

    act(() => noteEvents.emit({ note: 'C', phase: 'end', source: 'press' }));
    expect(withTiming).not.toHaveBeenCalledWith(0, expect.objectContaining({ duration: BELL_RELEASE_MS }));

    act(() => noteEvents.emit({ note: 'E', phase: 'end', source: 'press' }));
    expect(withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: BELL_RELEASE_MS }));
  });

  it('starts a fresh pulse for every consecutive note', () => {
    const { noteEvents } = renderBell();

    act(() => noteEvents.emit({ note: 'C', phase: 'start', source: 'melody' }));
    act(() => noteEvents.emit({ note: 'C', phase: 'end', source: 'melody' }));
    act(() => noteEvents.emit({ note: 'D', phase: 'start', source: 'melody' }));

    expect(withRepeat).toHaveBeenCalledTimes(2);
    expect((cancelAnimation as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('stays still for reduced-motion users while notes still sound', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const { noteEvents } = renderBell();
    (withSequence as jest.Mock).mockClear();

    act(() => noteEvents.emit({ note: 'C', phase: 'start', source: 'press' }));

    expect(withSequence).not.toHaveBeenCalled();
  });

  it('stops listening when unmounted', () => {
    const { noteEvents, unmount } = renderBell();
    unmount();
    (withSequence as jest.Mock).mockClear();

    act(() => noteEvents.emit({ note: 'C', phase: 'start', source: 'press' }));

    expect(withSequence).not.toHaveBeenCalled();
  });
});
