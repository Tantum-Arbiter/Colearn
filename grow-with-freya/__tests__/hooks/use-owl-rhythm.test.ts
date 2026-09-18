import { renderHook, act } from '@testing-library/react-native';

import { useOwlRhythm } from '@/hooks/use-owl-rhythm';
import {
  OWL_RHYTHM,
  blinkDuration,
  blinkShape,
  glanceHold,
  nextBlinkDelay,
  nextGlanceDelay,
  pickGlance,
} from '@/constants/owl-companion';

const ROLL = 0.5;
const FIRST_BLINK = nextBlinkDelay(ROLL, true);
const LATER_BLINK = nextBlinkDelay(ROLL);
const SHAPE = blinkShape(ROLL);
const FIRST_GLANCE = nextGlanceDelay(ROLL, true);
const GESTURE = pickGlance(ROLL);
const HOLD = glanceHold(ROLL);

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

function makeHandlers() {
  return {
    onBlink: jest.fn(),
    onGlance: jest.fn(),
    onRuffle: jest.fn(),
  };
}

describe('useOwlRhythm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(ROLL);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('does nothing while disabled', () => {
    const handlers = makeHandlers();
    renderHook(() => useOwlRhythm({ enabled: false, ...handlers }));

    advance(60000);

    expect(handlers.onBlink).not.toHaveBeenCalled();
    expect(handlers.onGlance).not.toHaveBeenCalled();
    expect(handlers.onRuffle).not.toHaveBeenCalled();
  });

  it('holds its eyes open through the first quiet moment', () => {
    const handlers = makeHandlers();
    renderHook(() => useOwlRhythm({ enabled: true, ...handlers }));

    advance(FIRST_BLINK - 1);

    expect(handlers.onBlink).not.toHaveBeenCalled();
  });

  it('blinks once the first quiet moment has passed', () => {
    const handlers = makeHandlers();
    renderHook(() => useOwlRhythm({ enabled: true, ...handlers }));

    advance(FIRST_BLINK);

    expect(handlers.onBlink).toHaveBeenCalledTimes(1);
    expect(handlers.onBlink).toHaveBeenCalledWith(SHAPE);
  });

  it('waits for the blink to finish before timing the next one', () => {
    const handlers = makeHandlers();
    renderHook(() => useOwlRhythm({ enabled: true, ...handlers }));

    advance(FIRST_BLINK + blinkDuration(SHAPE) + LATER_BLINK - 1);
    expect(handlers.onBlink).toHaveBeenCalledTimes(1);

    advance(1);
    expect(handlers.onBlink).toHaveBeenCalledTimes(2);
  });

  it('looks around after settling, and says how long to hold the look', () => {
    const handlers = makeHandlers();
    renderHook(() => useOwlRhythm({ enabled: true, ...handlers }));

    advance(FIRST_GLANCE);

    expect(handlers.onGlance).toHaveBeenCalledWith(GESTURE, HOLD);
  });

  it('waits for the look to return before timing the next', () => {
    const handlers = makeHandlers();
    renderHook(() => useOwlRhythm({ enabled: true, ...handlers }));

    advance(FIRST_GLANCE + HOLD + OWL_RHYTHM.glanceReturnMs + nextGlanceDelay(ROLL) - 1);
    expect(handlers.onGlance).toHaveBeenCalledTimes(1);

    advance(1);
    expect(handlers.onGlance).toHaveBeenCalledTimes(2);
  });

  it('ruffles its feathers only rarely', () => {
    const handlers = makeHandlers();
    renderHook(() => useOwlRhythm({ enabled: true, ...handlers }));

    advance(OWL_RHYTHM.ruffleFirstMs - 1);
    expect(handlers.onRuffle).not.toHaveBeenCalled();

    advance(1);
    expect(handlers.onRuffle).toHaveBeenCalledTimes(1);
  });

  it('falls still when disabled part way through', () => {
    const handlers = makeHandlers();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useOwlRhythm({ enabled, ...handlers }),
      { initialProps: { enabled: true } }
    );

    rerender({ enabled: false });
    advance(60000);

    expect(handlers.onBlink).not.toHaveBeenCalled();
    expect(handlers.onGlance).not.toHaveBeenCalled();
  });

  it('stops every timer on unmount', () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useOwlRhythm({ enabled: true, ...handlers }));

    unmount();
    advance(60000);

    expect(handlers.onBlink).not.toHaveBeenCalled();
    expect(handlers.onRuffle).not.toHaveBeenCalled();
  });

  it('calls the handler it was most recently given', () => {
    const first = makeHandlers();
    const second = makeHandlers();
    const { rerender } = renderHook(
      ({ handlers }: { handlers: ReturnType<typeof makeHandlers> }) =>
        useOwlRhythm({ enabled: true, ...handlers }),
      { initialProps: { handlers: first } }
    );

    rerender({ handlers: second });
    advance(FIRST_BLINK);

    expect(first.onBlink).not.toHaveBeenCalled();
    expect(second.onBlink).toHaveBeenCalledTimes(1);
  });
});
